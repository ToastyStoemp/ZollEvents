/**
 * The Shopify embed widget. A merchant drops this into any page/section:
 *
 *   <div id="zollevents-events" data-limit="8"></div>
 *   <script src="https://YOUR-ZOLLEVENTS-HOST/embed.js" async></script>
 *
 * A clean, self-contained "where to find us" card: a light panel, one row per
 * upcoming event with a small date chip, the event name, its dates, and — the
 * point of the whole thing — the country / city it's in (plus hall & booth so
 * visitors can find the stand). Only upcoming events; auto-updates from ZollTool.
 *
 * Options: `data-limit` (max events shown, 0/absent = all), `data-heading`
 * (title text, default "Upcoming events").
 *
 * The widget function is stringified and served with the service's public base
 * URL baked in, so the embedded script always knows where to fetch from.
 */

function widget(BASE) {
  var targets = document.querySelectorAll('#zollevents-events, [data-zollevents-events]');
  if (!targets.length) return;
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var d0 = function (s) { var d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; };
  // "Fri, Sep 4 - Sun, Sep 6, 2026" (year once; both years only if it spans one).
  var fmt = function (start, end) {
    var s = d0(start), e = d0(end || start);
    if (!s) return '';
    var sPart = WD[s.getDay()] + ', ' + MON[s.getMonth()] + ' ' + s.getDate();
    if (!e || e.getTime() === s.getTime()) return sPart + ', ' + s.getFullYear();
    if (s.getFullYear() !== e.getFullYear()) sPart += ', ' + s.getFullYear();
    return sPart + ' – ' + WD[e.getDay()] + ', ' + MON[e.getMonth()] + ' ' + e.getDate() + ', ' + e.getFullYear();
  };

  var CAL = '<svg class="zev-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4.5" width="18" height="17" rx="2"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6"/><line x1="16" y1="2.5" x2="16" y2="6"/></svg>';
  var PIN = '<svg class="zev-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  if (!document.getElementById('zev-style')) {
    var st = document.createElement('style');
    st.id = 'zev-style';
    st.textContent =
      '.zev{--zev-fg:#1f2d3a;--zev-muted:#77716b;--zev-chip:#e6a83c;--zev-chip-fg:#ffffff;--zev-line:#efe4bf;' +
        '--zev-head-bg:#f6c85f;--zev-head-fg:#1f2d3a;--zev-body-bg:#fdf8e2;' +
        '--zev-now-fg:#4e8a3f;--zev-now-bg:#e2f0d4;--zev-now-border:#a9cf8e;' +
        'font-family:inherit;color:var(--zev-fg);background:var(--zev-body-bg);border:1px solid var(--zev-line);border-radius:12px;overflow:hidden;max-width:640px;margin:0 auto}' +
      '.zev *{box-sizing:border-box}' +
      '.zev-head{padding:15px 18px 12px;background:var(--zev-head-bg);color:var(--zev-head-fg);border-bottom:1px solid rgba(0,0,0,.12);font-weight:700;font-size:1.05em}' +
      '.zev-row{display:flex;gap:14px;align-items:flex-start;padding:14px 18px}' +
      '.zev-row + .zev-row{border-top:1px solid var(--zev-line)}' +
      '.zev-chip{flex:none;width:52px;height:52px;background:var(--zev-chip);color:var(--zev-chip-fg);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}' +
      '.zev-d{font-size:1.4em;font-weight:700}' +
      '.zev-m{font-size:.58em;letter-spacing:.1em;margin-top:3px;color:var(--zev-chip-fg);opacity:.9}' +
      '.zev-body{min-width:0;flex:1}' +
      '.zev-name{font-weight:700;font-size:1.02em}' +
      '.zev-meta{display:flex;align-items:center;gap:7px;color:var(--zev-muted);font-size:.86em;margin-top:5px}' +
      '.zev-ic{flex:none;opacity:.7}' +
      '.zev-loc{color:var(--zev-fg)}' +
      '.zev-now{display:inline-block;font-size:.6em;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--zev-now-fg);background:var(--zev-now-bg);border:1px solid var(--zev-now-border);border-radius:4px;padding:1px 6px;margin-left:8px;vertical-align:middle}' +
      '.zev-link{display:inline-flex;align-items:center;gap:5px;margin-top:8px;font-size:.85em;font-weight:600;color:var(--zev-fg);text-decoration:none;border-bottom:1px solid currentColor}' +
      '.zev-empty{padding:20px 18px;color:var(--zev-muted);font-size:.9em}';
    document.head.appendChild(st);
  }

  var row = function (ev) {
    var s = d0(ev.start);
    var chip = '<div class="zev-chip"><span class="zev-d">' + (s ? s.getDate() : '') + '</span>' +
      '<span class="zev-m">' + (s ? MON[s.getMonth()].toUpperCase() : '') + '</span></div>';
    var now = ev.status === 'active' ? '<span class="zev-now">Now</span>' : '';
    // Where — the point of the widget: country/city, then hall & booth if known.
    var loc = [ev.city, ev.country].filter(Boolean).map(esc).join(', ');
    if (ev.flag) loc = loc ? ev.flag + ' ' + loc : ev.flag; // ev.flag is an emoji, safe as-is
    var extra = [];
    if (ev.hall) extra.push('Hall ' + esc(ev.hall));
    if (ev.booth) extra.push('Booth ' + esc(ev.booth));
    var where = loc || '';
    if (extra.length) where = where ? where + ' · ' + extra.join(' · ') : extra.join(' · ');
    var locLine = where ? '<div class="zev-meta">' + PIN + '<span class="zev-loc">' + where + '</span></div>' : '';
    var link = ev.link ? '<a class="zev-link" href="' + esc(ev.link) + '" target="_blank" rel="noopener">Event details →</a>' : '';
    return '<div class="zev-row">' + chip + '<div class="zev-body">' +
      '<div class="zev-name">' + esc(ev.name) + now + '</div>' +
      '<div class="zev-meta">' + CAL + '<span>' + fmt(ev.start, ev.end) + '</span></div>' +
      locLine + link + '</div></div>';
  };

  fetch(BASE + '/api/events.json').then(function (r) { return r.json(); }).then(function (data) {
    var up = data.upcoming || [];
    targets.forEach(function (el) {
      var limit = parseInt(el.getAttribute('data-limit') || '0', 10);
      var heading = el.getAttribute('data-heading') || 'Upcoming events';
      var shown = limit > 0 ? up.slice(0, limit) : up;
      var body = shown.length ? shown.map(row).join('')
        : '<div class="zev-empty">No upcoming events right now — check back soon.</div>';
      el.innerHTML = '<div class="zev"><div class="zev-head">' + esc(heading) + '</div>' + body + '</div>';
      var mw = el.getAttribute('data-max-width');
      if (mw) { var c = el.querySelector('.zev'); if (c) c.style.maxWidth = /^[0-9]+$/.test(mw) ? mw + 'px' : mw; }
    });
  }).catch(function () {
    targets.forEach(function (el) { el.innerHTML = '<div class="zev"><div class="zev-empty">Events are unavailable right now.</div></div>'; });
  });
}

export function embedScript(base) {
  return ';(' + widget.toString() + ')(' + JSON.stringify(base) + ');\n';
}
