/**
 * First-run setup values entered through the wizard, stored as data/config.json
 * (mode 0600, on the data volume — gitignored). Holds the admin password hash,
 * the ZollTool source (URL + read token), the public base URL, and display
 * prefs, so the app configures itself with no hand-edited .env. Environment
 * variables still win when set (headless / secrets-manager provisioning).
 *
 * Its own data-dir resolution is duplicated (not imported from config.js) to
 * avoid an import cycle — config.js reads this store.
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.ZOLLEVENTS_DATA_DIR || join(projectRoot, 'data');
const FILE = join(DATA_DIR, 'config.json');

export function getSetup() {
  try {
    return JSON.parse(readFileSync(FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

/** Shallow-merge a patch into the stored setup (atomic write, 0600). */
export function saveSetup(patch) {
  const next = { ...getSetup(), ...patch };
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  renameSync(tmp, FILE);
  return next;
}

/** True once the wizard has created an admin — i.e. setup is complete. */
export function hasSetup() {
  return !!getSetup().adminHash;
}
