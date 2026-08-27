/**
 * Config + minimal .env loader (zero-dep). Only sets keys not already in the
 * real environment, so shell/CI wins.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getSetup } from './setup-store.js';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

(function loadDotEnv() {
  let raw;
  try {
    raw = readFileSync(join(projectRoot, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
})();

const port = Number(process.env.PORT || 4300);
const norm = (u) => (u ? u.trim().replace(/\/+$/, '') : '');

// Effective config layers three sources, highest priority first:
//   1. environment variables (for headless / secrets-manager provisioning)
//   2. values saved by the first-run setup wizard (data/config.json)
//   3. built-in defaults
// so the app runs with zero hand-edited .env, yet env still wins when present.
function compute() {
  const s = getSetup();
  return {
    port,
    projectRoot,
    // Source: ZollTool read API + a scoped zt_ token (ZollTool → Admin → API access).
    zolltoolUrl: norm(process.env.ZOLLTOOL_URL || s.zolltoolUrl),
    apiToken: process.env.ZOLLTOOL_API_TOKEN || s.apiToken || '',
    // Public origin this service is reachable at — used for absolute URLs in the
    // embed script and the iCal/webcal links. Defaults to localhost for dev.
    publicBaseUrl: norm(process.env.PUBLIC_BASE_URL || s.publicBaseUrl) || `http://localhost:${port}`,
    orgName: process.env.ORG_NAME || s.orgName || 'Phuong Ninjin',
    tagline: process.env.ORG_TAGLINE || s.tagline || 'Where to find us',
    showPast: process.env.SHOW_PAST != null ? process.env.SHOW_PAST !== '0' : s.showPast !== false,
    pastLimit: Number(process.env.PAST_LIMIT || s.pastLimit || 12),
    eventsTtlMs: Number(process.env.EVENTS_TTL_MS || 5 * 60 * 1000),
    // Admin auth: env password (legacy/headless) or the wizard's stored hash.
    adminPassword: process.env.ADMIN_PASSWORD || '',
    sessionSecret: process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || s.adminHash || 'zollevents-dev-secret',
    dataDir: process.env.ZOLLEVENTS_DATA_DIR || join(projectRoot, 'data'),
  };
}

export const config = compute();

/** Recompute config after the wizard saves new setup values (in-place). */
export function reloadConfig() {
  Object.assign(config, compute());
  return config;
}

export const sourceConfigured = () => !!(config.zolltoolUrl && config.apiToken);
