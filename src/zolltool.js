/**
 * Reads events from the ZollTool read API using a scoped `zt_` token. Cached
 * with a short TTL; on a fetch error the last good result is served so the
 * public page/feed stays up if ZollTool is briefly unreachable.
 */
import { config, sourceConfigured } from './config.js';

let cache = { at: 0, events: null };

/** Drop the cached events so the next fetch uses freshly-changed config. */
export function resetEventsCache() {
  cache = { at: 0, events: null };
}

export async function fetchEvents() {
  const now = Date.now();
  if (cache.events && now - cache.at < config.eventsTtlMs) return cache.events;
  if (!sourceConfigured()) return cache.events || [];
  try {
    const res = await fetch(`${config.zolltoolUrl}/api/data/events`, {
      headers: { authorization: `Bearer ${config.apiToken}`, accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`ZollTool events ${res.status}: ${await res.text()}`);
    const events = await res.json();
    cache = { at: now, events: Array.isArray(events) ? events : [] };
    return cache.events;
  } catch (err) {
    if (cache.events) {
      console.error(`[zollevents] event refresh failed, serving cached: ${err.message}`);
      return cache.events;
    }
    throw err;
  }
}
