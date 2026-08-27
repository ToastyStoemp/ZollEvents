/**
 * Composes an Instagram bio (profile description) from the current/next event.
 *
 * Instagram's official API has NO endpoint to update a profile's bio, so this
 * only *generates* the text — the admin page previews + copies it, and
 * `/instagram.txt` exposes it for a phone Shortcut / automation to fetch. The
 * final paste into Instagram is manual by necessity.
 *
 * The bio is a template (editable in /admin, stored in overlay.settings) with
 * placeholders. `{event}` expands to a formatted one-liner for the current or
 * next event, e.g. "@animemesse, booth 5823, 17-19th July". Granular tokens
 * ({event_handle}, {event_booth}, {event_hall}, {event_dates}, …) are also
 * available for hand-crafted lines.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** 17 → "17th", 21 → "21st", etc. */
function ordinal(n) {
  const v = n % 100;
  const suffix = ['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th';
  return `${n}${suffix}`;
}

/** "2026-07-17" → Date at local midnight (null for blanks). */
function day(s) {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d) ? null : d;
}

/**
 * Instagram-style date range, ordinal on the closing day:
 *   single day      → "17th July"
 *   same month      → "17-19th July"
 *   across months   → "30th July - 2nd August"
 *   across years     → "30th December 2026 - 2nd January 2027"
 */
export function formatDateRange(start, end) {
  const s = day(start);
  const e = day(end || start);
  if (!s) return '';
  if (!e || s.getTime() === e.getTime()) return `${ordinal(s.getDate())} ${MONTHS[s.getMonth()]}`;
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) return `${s.getDate()}-${ordinal(e.getDate())} ${MONTHS[e.getMonth()]}`;
  const sameYear = s.getFullYear() === e.getFullYear();
  const sPart = `${ordinal(s.getDate())} ${MONTHS[s.getMonth()]}${sameYear ? '' : ` ${s.getFullYear()}`}`;
  const ePart = `${ordinal(e.getDate())} ${MONTHS[e.getMonth()]}${sameYear ? '' : ` ${e.getFullYear()}`}`;
  return `${sPart} - ${ePart}`;
}

const handleAt = (v) => (v ? `@${String(v).trim().replace(/^@+/, '')}` : '');

/** One-liner for an event: "@animemesse, booth 5823, 17-19th July". */
export function eventLine(ev) {
  if (!ev) return '';
  const who = ev.igHandle ? handleAt(ev.igHandle) : ev.name || '';
  const loc = [];
  if (ev.hall) loc.push(`hall ${ev.hall}`);
  if (ev.booth) loc.push(`booth ${ev.booth}`);
  const parts = [who];
  if (loc.length) parts.push(loc.join(' '));
  const dates = formatDateRange(ev.start, ev.end);
  if (dates) parts.push(dates);
  return parts.filter(Boolean).join(', ');
}

/** The event a bio should feature: the current or next upcoming one. */
export function currentEvent(upcoming = []) {
  return upcoming[0] || null;
}

export const DEFAULT_BIO_TEMPLATE = 'Artist\nBased in 🇩🇪🇧🇪\n📍 {event}\nShop Open 🟢';

/**
 * Render the bio. `upcoming` is the sorted-ascending upcoming list (index 0 is
 * the current/next event). Settings may hold `igBioTemplate` and a
 * `igBioFallback` line used for `{event}` when there is no upcoming event.
 */
export function buildBio({ upcoming = [], settings = {} } = {}) {
  const ev = currentEvent(upcoming);
  const template = settings.igBioTemplate || DEFAULT_BIO_TEMPLATE;
  const fallback = settings.igBioFallback || '';
  const line = eventLine(ev) || fallback;
  const tokens = {
    event: line,
    event_name: ev?.name || '',
    event_handle: ev ? handleAt(ev.igHandle) : '',
    event_booth: ev?.booth || '',
    event_hall: ev?.hall || '',
    event_dates: ev ? formatDateRange(ev.start, ev.end) : '',
    event_city: ev?.city || '',
    event_country: ev?.country || '',
  };
  return template
    .replace(/\{(\w+)\}/g, (m, key) => (key in tokens ? tokens[key] : m))
    .replace(/[ \t]+$/gm, '') // trim trailing spaces left by empty tokens
    .replace(/\n{3,}/g, '\n\n') // collapse blank runs from an empty {event}
    .trim();
}
