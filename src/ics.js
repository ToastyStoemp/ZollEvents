/**
 * Builds an RFC 5545 iCalendar feed of the events (all-day VEVENTs). Subscribed
 * once in Google/Apple/Outlook via the feed URL, it stays in sync automatically.
 */

const pad = (n) => String(n).padStart(2, '0');

function ymd(dateStr) {
  return dateStr.replace(/-/g, ''); // "2026-08-01" → "20260801"
}
// iCal all-day DTEND is exclusive, so the calendar block ends the day after.
function ymdPlusDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function stampNow() {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
// Fold lines longer than 75 octets per the spec (continuation lines start with a space).
function fold(line) {
  if (line.length <= 75) return line;
  const out = [];
  let s = line;
  while (s.length > 75) {
    out.push(out.length ? ` ${s.slice(0, 74)}` : s.slice(0, 75));
    s = s.slice(out.length === 1 ? 75 : 74);
  }
  out.push(` ${s}`);
  return out.join('\r\n');
}

export function buildIcs(events, { calName, baseUrl }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GET UP GAMES//ZollEvents//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
    'X-PUBLISHED-TTL:PT6H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];
  const stamp = stampNow();
  for (const e of events) {
    const loc = [e.city, e.country].filter(Boolean).join(', ');
    const descParts = [e.blurb, e.booth && `Booth: ${e.booth}`, e.link].filter(Boolean);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@${(baseUrl || 'zollevents').replace(/^https?:\/\//, '')}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${ymd(e.start)}`);
    lines.push(`DTEND;VALUE=DATE:${ymdPlusDay(e.end)}`);
    lines.push(`SUMMARY:${esc(e.name)}`);
    if (loc) lines.push(`LOCATION:${esc(loc)}`);
    if (descParts.length) lines.push(`DESCRIPTION:${esc(descParts.join('\n'))}`);
    if (e.link) lines.push(`URL:${esc(e.link)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
