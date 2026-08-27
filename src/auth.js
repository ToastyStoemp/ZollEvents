/**
 * Minimal admin auth for the overlay editor: a single shared password (env
 * ADMIN_PASSWORD) and a stateless HMAC-signed session cookie. Overlay data is
 * public-facing anyway, so this just keeps the editor from being world-writable.
 */
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto';
import { config } from './config.js';
import { getSetup } from './setup-store.js';

/** Hash a password for storage: "scrypt$<saltHex>$<hashHex>". */
export function hashPassword(pw) {
  const salt = randomBytes(16);
  const dk = scryptSync(String(pw), salt, 32);
  return `scrypt$${salt.toString('hex')}$${dk.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  try {
    const [, saltHex, hashHex] = String(stored).split('$');
    const dk = scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 32);
    const want = Buffer.from(hashHex, 'hex');
    return want.length === dk.length && timingSafeEqual(want, dk);
  } catch {
    return false;
  }
}

const COOKIE = 'ze_admin';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sign(payload) {
  return b64url(createHmac('sha256', config.sessionSecret).update(payload).digest());
}

export function passwordOk(pw) {
  // Prefer the wizard's stored admin hash; fall back to an env ADMIN_PASSWORD
  // (headless / legacy) when the wizard hasn't been used.
  const setup = getSetup();
  if (setup.adminHash) return verifyPassword(pw, setup.adminHash);
  const a = Buffer.from(String(pw || ''));
  const b = Buffer.from(String(config.adminPassword || ''));
  return !!config.adminPassword && a.length === b.length && timingSafeEqual(a, b);
}

export function issueToken() {
  const payload = b64url(JSON.stringify({ exp: Date.now() + TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

export function tokenValid(token) {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return exp && Date.now() < exp;
  } catch {
    return false;
  }
}

export function parseCookies(req) {
  const out = {};
  for (const p of (req.headers.cookie || '').split(';')) {
    const eq = p.indexOf('=');
    if (eq > -1) out[p.slice(0, eq).trim()] = decodeURIComponent(p.slice(eq + 1).trim());
  }
  return out;
}
export const isAdmin = (req) => tokenValid(parseCookies(req)[COOKIE]);

/**
 * Is the request actually being served over HTTPS? Direct TLS, or — when the
 * app trusts its proxy — an `x-forwarded-proto: https` from the TLS terminator
 * (Caddy/nginx) in front of it. Used to decide the cookie's Secure flag from the
 * real transport, so a Secure cookie is never sent to an http client that would
 * silently drop it (which locks the admin out).
 */
function requestIsHttps(req) {
  if (req && req.socket && req.socket.encrypted) return true;
  const trustProxy = process.env.ZOLLEVENTS_TRUST_PROXY === '1';
  if (trustProxy && req) {
    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
    if (proto === 'https') return true;
  }
  return false;
}

export function setAdminCookie(res, req) {
  const secure = requestIsHttps(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${issueToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_MS / 1000}${secure}`);
}
export function clearAdminCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
