/**
 * Turns raw ZollTool SalesEvents + the local overlay into the sanitized,
 * public-facing shape used by every output (page, embed, iCal, JSON). Only
 * safe display fields are exposed — never transactions or financial data.
 */

import { countryFlag } from './flags.js';

function toDate(s) {
  return s ? new Date(`${s}T00:00:00`) : null;
}

/** Merge one raw event with its overlay extras into a public event. */
function publicOne(e, ovEvents, today) {
  const ov = ovEvents[e.id] || {};
  const start = e.dateStart;
  const end = e.dateEnd || e.dateStart;
  const endD = toDate(end);
  return {
    id: e.id,
    name: e.name || 'Event',
    start,
    end,
    city: e.venue?.city || '',
    country: e.venue?.country || '',
    flag: countryFlag(e.venue?.country || ''),
    status: e.status || '',
    link: ov.link || '',
    hall: ov.hall || '',
    booth: ov.booth || '',
    igHandle: ov.igHandle || '',
    blurb: ov.blurb || '',
    hero: ov.hero || '',
    hidden: !!ov.hidden,
    past: endD ? endD < today : false,
  };
}

/**
 * @returns { upcoming, past } — sorted (upcoming ascending, past descending),
 * hidden and date-less events removed, past truncated to `pastLimit`.
 */
export function splitEvents(rawEvents, overlay, { pastLimit = 12 } = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ovEvents = overlay.events || {};
  const list = (rawEvents || [])
    .filter((e) => !e.deletedAt && e.dateStart)
    .map((e) => publicOne(e, ovEvents, today))
    .filter((e) => !e.hidden);

  const upcoming = list.filter((e) => !e.past).sort((a, b) => a.start.localeCompare(b.start));
  const past = list
    .filter((e) => e.past)
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, pastLimit);
  return { upcoming, past };
}

/** All non-hidden dated events (both tenses) for the calendar feed. */
export function allEvents(rawEvents, overlay) {
  const { upcoming, past } = splitEvents(rawEvents, overlay, { pastLimit: Infinity });
  return [...upcoming, ...past];
}
