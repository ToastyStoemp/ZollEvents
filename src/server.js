import { createServer } from 'node:http';
import { config, sourceConfigured } from './config.js';
import { fetchEvents } from './zolltool.js';
import { getOverlay, saveOverlay } from './overlay.js';
import { splitEvents, allEvents } from './events.js';
import { buildIcs } from './ics.js';
import { embedScript } from './embed.js';
import { publicPage, adminPage } from './page.js';
import { buildBio, currentEvent } from './instagram.js';
import { isAdmin, passwordOk, setAdminCookie, clearAdminCookie } from './auth.js';

/**
 * ZollEvents: reads ZollTool events (via a scoped zt_ token) and republishes
 * them as a public page, a Shopify embed widget, and an iCal feed. Only
 * sanitized display fields are exposed — never transactions.
 */

const MAX_BODY = 256 * 1024;
const TRUST_PROXY = process.env.ZOLLEVENTS_TRUST_PROXY === '1';

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function html(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}
async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const c of req) {
    total += c.length;
    if (total > MAX_BODY) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}
function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Tiny per-IP limiter for the admin login (fixed window).
const loginHits = new Map();
function loginThrottled(ip) {
  const now = Date.now();
  const w = loginHits.get(ip);
  if (!w || now >= w.reset) {
    loginHits.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  w.n += 1;
  return w.n > 10;
}

/** Fetch + normalize everything the outputs need. */
async function load() {
  const raw = await fetchEvents();
  const overlay = getOverlay();
  const { upcoming, past } = splitEvents(raw, overlay, { pastLimit: config.pastLimit });
  return { raw, overlay, upcoming, past };
}

const PUBLIC_CORS = { 'access-control-allow-origin': '*' };

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname;
    const method = req.method;

    if (method === 'GET' && (path === '/health' || path === '/api/health')) {
      return send(res, 200, { ok: true, source: sourceConfigured() });
    }

    // ── Public outputs ──
    if (method === 'GET' && path === '/') {
      const { upcoming, past } = await load();
      return html(res, 200, publicPage({ config, upcoming, past }));
    }
    if (method === 'GET' && path === '/api/events.json') {
      const { upcoming, past } = await load();
      return send(res, 200, { org: config.orgName, upcoming, past }, { ...PUBLIC_CORS, 'cache-control': 'public, max-age=300' });
    }
    // Instagram bio text (composed from the current/next event). Public: this
    // is your public bio anyway, and a phone Shortcut can fetch it to paste.
    if (method === 'GET' && (path === '/instagram.txt' || path === '/instagram')) {
      const { upcoming, overlay } = await load();
      const bio = buildBio({ upcoming, settings: overlay.settings || {} });
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300', ...PUBLIC_CORS });
      return res.end(bio);
    }
    if (method === 'GET' && path === '/api/instagram.json') {
      const { upcoming, overlay } = await load();
      const bio = buildBio({ upcoming, settings: overlay.settings || {} });
      const ev = currentEvent(upcoming);
      return send(res, 200, { bio, event: ev ? { id: ev.id, name: ev.name } : null }, { ...PUBLIC_CORS, 'cache-control': 'public, max-age=300' });
    }
    if (method === 'GET' && path === '/embed.js') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=600', ...PUBLIC_CORS });
      return res.end(embedScript(config.publicBaseUrl));
    }
    if (method === 'GET' && (path === '/events.ics' || path === '/calendar.ics')) {
      const { raw, overlay } = await load();
      const ics = buildIcs(allEvents(raw, overlay), { calName: `${config.orgName} events`, baseUrl: config.publicBaseUrl });
      res.writeHead(200, { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': 'inline; filename="events.ics"', ...PUBLIC_CORS });
      return res.end(ics);
    }

    // ── Admin ──
    if (method === 'GET' && path === '/admin') return html(res, 200, adminPage());
    if (method === 'GET' && path === '/api/admin/me') return send(res, 200, { admin: isAdmin(req) });
    if (method === 'POST' && path === '/api/admin/login') {
      const ip = clientIp(req);
      if (loginThrottled(ip)) return send(res, 429, { error: 'Too many attempts — try again shortly.' });
      const body = await readBody(req);
      if (!passwordOk(body.password)) return send(res, 401, { error: 'Wrong password' });
      setAdminCookie(res);
      return send(res, 200, { ok: true });
    }
    if (method === 'POST' && path === '/api/admin/logout') {
      clearAdminCookie(res);
      return send(res, 200, { ok: true });
    }
    if (path.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return send(res, 401, { error: 'Not authenticated' });
      if (method === 'GET' && path === '/api/admin/data') {
        return send(res, 200, { events: await fetchEvents(), overlay: getOverlay() });
      }
      if (method === 'PUT' && path === '/api/admin/overlay') {
        const body = await readBody(req);
        const current = getOverlay();
        saveOverlay({ events: body.events || {}, settings: body.settings || current.settings });
        return send(res, 200, { ok: true });
      }
      // Render a bio preview from an unsaved template + the current events, so
      // the editor can show the live result without saving first.
      if (method === 'POST' && path === '/api/admin/instagram/preview') {
        const body = await readBody(req);
        const raw = await fetchEvents();
        const overlay = { events: body.events || getOverlay().events, settings: {} };
        const { upcoming } = splitEvents(raw, overlay, { pastLimit: 0 });
        const settings = {
          igBioTemplate: typeof body.igBioTemplate === 'string' ? body.igBioTemplate : undefined,
          igBioFallback: typeof body.igBioFallback === 'string' ? body.igBioFallback : undefined,
        };
        const ev = currentEvent(upcoming);
        return send(res, 200, { bio: buildBio({ upcoming, settings }), event: ev ? { id: ev.id, name: ev.name } : null });
      }
    }

    return send(res, 404, { error: 'Not found' });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    send(res, status, { error: err.message || 'Server error' });
  }
});

server.requestTimeout = 20_000;
server.headersTimeout = 15_000;

server.listen(config.port, () => {
  console.log(`\nZollEvents → ${config.publicBaseUrl}  (listening on :${config.port})`);
  console.log(`  source:   ${sourceConfigured() ? config.zolltoolUrl : 'NOT configured (set ZOLLTOOL_URL + ZOLLTOOL_API_TOKEN)'}`);
  console.log(`  admin:    ${config.adminPassword ? 'enabled at /admin' : 'disabled (set ADMIN_PASSWORD to edit event extras)'}`);
  console.log(`  outputs:  /  ·  /embed.js  ·  /events.ics\n`);
});
