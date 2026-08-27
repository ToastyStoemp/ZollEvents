/**
 * Minimal admin auth for the overlay editor: a single shared password (env
 * ADMIN_PASSWORD) and a stateless HMAC-signed session cookie. Overlay data is
 * public-facing anyway, so this just keeps the editor from being world-writable.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

const COOKIE = 'ze_admin';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sign(payload) {
  return b64url(createHmac('sha256', config.sessionSecret).update(payload).digest());
}

export function passwordOk(pw) {
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
export function setAdminCookie(res) {
  const secure = config.publicBaseUrl.startsWith('https') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${issueToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_MS / 1000}${secure}`);
}
export function clearAdminCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
