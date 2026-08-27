/**
 * Per-event public "extras" that ZollTool doesn't store — booth number, a link
 * to the convention's site, a short blurb, a hero image URL, and a hide flag —
 * plus a couple of display settings. Stored as one JSON file (data/overlay.json)
 * and edited from the admin page. Keyed by ZollTool event id.
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';

const FILE = join(config.dataDir, 'overlay.json');
const EMPTY = { events: {}, settings: {} };

export function getOverlay() {
  try {
    const o = JSON.parse(readFileSync(FILE, 'utf8'));
    return { events: o.events || {}, settings: o.settings || {} };
  } catch {
    return { ...EMPTY };
  }
}

export function saveOverlay(overlay) {
  mkdirSync(config.dataDir, { recursive: true });
  const clean = { events: overlay.events || {}, settings: overlay.settings || {} };
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(clean, null, 2));
  renameSync(tmp, FILE);
  return clean;
}
