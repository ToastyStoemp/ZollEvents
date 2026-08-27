/**
 * The Shopify embed widget. A merchant drops this into any page/section:
 *
 *   <div id="zollevents-events" data-past="true" data-limit="5"></div>
 *   <script src="https://YOUR-ZOLLEVENTS-HOST/embed.js" async></script>
 *
 * It fetches the live events JSON and renders a self-contained calendar-style
 * list into the target(s): a header bar (TODAY badge · prev/next · title), a red
 * accent line, a left date chip per event, and calendar/clock/pin meta rows.
 * `data-limit` is the number of events per page (arrows page through the rest);
 * `data-past="true"` also lists past events; `data-heading` overrides the title.
 * Auto-updates whenever events change in ZollTool.
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
  // "Fri, Sep 4 - Sun, Sep 6, 2026" (year once at the end; both years if it spans one).
  var fmt = function (start, end) {
    var s = d0(start), e = d0(end || start);
    if (!s) return '';
    var sPart = WD[s.getDay()] + ', ' + MON[s.getMonth()] + ' ' + s.getDate();
    if (!e || e.getTime() === s.getTime()) return sPart + ', ' + s.getFullYear();
    if (s.getFullYear() !== e.getFullYear()) sPart += ', ' + s.getFullYear();
    return sPart + ' - ' + WD[e.getDay()] + ', ' + MON[e.getMonth()] + ' ' + e.getDate() + ', ' + e.getFullYear();
  };
  var place = function (ev) { return [ev.city, ev.country].filter(Boolean).map(esc).join(', '); };

  var CAL = '<svg class="zev-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4.5" width="18" height="17" rx="2"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6"/><line x1="16" y1="2.5" x2="16" y2="6"/></svg>';
  var CLK = '<svg class="zev-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7.5 12 12 15 14"/></svg>';
  var PIN = '<svg class="zev-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  if (!document.getElementById('zev-style')) {
    var st = document.createElement('style');
    st.id = 'zev-style';
    st.textContent =
      '.zev{--zev-head:#5b4f4d;--zev-accent:#e0392b;--zev-chip:#8a7c79;--zev-bg:#ededed;--zev-title:#4a4340;--zev-meta:#6f6b69;--zev-div:#dad6d3;' +
        'font-family:inherit;background:var(--zev-bg);border-radius:8px;overflow:hidden;max-width:100%;box-shadow:0 1px 4px rgba(0,0,0,.14)}' +
      '.zev *{box-sizing:border-box}' +
      '.zev-head{display:flex;align-items:center;gap:10px;background:var(--zev-head);color:#fff;padding:13px 18px;border-bottom:3px solid var(--zev-accent)}' +
      '.zev-today{display:inline-flex;align-items:center;gap:8px;color:rgba(255,255,255,.82);font-size:.72em;letter-spacing:.09em;text-transform:uppercase;font-weight:600}' +
      '.zev-todaynum{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 5px;border:1px solid rgba(255,255,255,.5);border-radius:6px;font-size:1.15em;font-weight:700;letter-spacing:0}' +
      '.zev-nav{background:none;border:0;color:#fff;opacity:.6;font-size:1.3em;line-height:1;cursor:pointer;padding:2px 5px;border-radius:4px}' +
      '.zev-nav:hover:not([disabled]){opacity:1;background:rgba(255,255,255,.12)}' +
      '.zev-nav[disabled]{opacity:.25;cursor:default}' +
      '.zev-htitle{font-weight:700;font-size:1.02em;margin-left:4px}' +
      '.zev-row{display:flex;gap:14px;align-items:flex-start;padding:15px 18px;border-bottom:1px solid var(--zev-div)}' +
      '.zev-row:last-child{border-bottom:0}' +
      '.zev-chip{flex:none;width:56px;height:56px;background:var(--zev-chip);color:#fff;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}' +
      '.zev-d{font-size:1.55em;font-weight:700}' +
      '.zev-m{font-size:.6em;letter-spacing:.1em;margin-top:3px;opacity:.95}' +
      '.zev-body{min-width:0;flex:1}' +
      '.zev-title{font-weight:700;font-size:1.05em;color:var(--zev-title);margin-bottom:6px}' +
      '.zev-meta{display:flex;align-items:center;gap:7px;color:var(--zev-meta);font-size:.85em;margin-top:3px}' +
      '.zev-ic{flex:none;opacity:.85}' +
      '.zev-badge{display:inline-block;font-size:.6em;text-transform:uppercase;letter-spacing:.05em;font-weight:700;color:#fff;background:var(--zev-accent);padding:2px 7px;border-radius:4px;margin-left:8px;vertical-align:middle}' +
      '.zev-link{display:inline-flex;align-items:center;gap:5px;margin-top:8px;font-size:.85em;font-weight:600;color:var(--zev-title);text-decoration:none;border-bottom:1px solid currentColor}' +
      '.zev-sub{padding:12px 18px 2px;font-weight:700;color:var(--zev-title);font-size:.8em;text-transform:uppercase;letter-spacing:.06em;opacity:.75}' +
      '.zev-empty{padding:24px 18px;color:var(--zev-meta);font-size:.9em}';
    document.head.appendChild(st);
  }

  var row = function (ev) {
    var s = d0(ev.start);
    var chip = '<div class="zev-chip"><span class="zev-d">' + (s ? s.getDate() : '') + '</span>' +
      '<span class="zev-m">' + (s ? MON[s.getMonth()].toUpperCase() : '') + '</span></div>';
    var badge = ev.status === 'active' ? '<span class="zev-badge">Now</span>' : '';
    var bits = [];
    if (ev.hall) bits.push('Hall ' + esc(ev.hall));
    if (ev.booth) bits.push('Booth ' + esc(ev.booth));
    if (place(ev)) bits.push(place(ev));
    var locLine = bits.length ? '<div class="zev-meta">' + PIN + '<span>' + bits.join(' · ') + '</span></div>' : '';
    var link = ev.link ? '<a class="zev-link" href="' + esc(ev.link) + '" target="_blank" rel="noopener">Event details →</a>' : '';
    return '<div class="zev-row">' + chip + '<div class="zev-body">' +
      '<div class="zev-title">' + esc(ev.name) + badge + '</div>' +
      '<div class="zev-meta">' + CAL + '<span>' + fmt(ev.start, ev.end) + '</span></div>' +
      '<div class="zev-meta">' + CLK + '<span>All day</span></div>' +
      locLine + link + '</div></div>';
  };

  fetch(BASE + '/api/events.json').then(function (r) { return r.json(); }).then(function (data) {
    var up = data.upcoming || [], past = data.past || [];
    var today = new Date();
    targets.forEach(function (el) {
      var limit = parseInt(el.getAttribute('data-limit') || '0', 10);
      var pageSize = limit > 0 ? limit : 5;
      var showPast = el.getAttribute('data-past') === 'true';
      var heading = el.getAttribute('data-heading') || 'Upcoming events';
      var start = 0;
      var render = function () {
        var slice = up.slice(start, start + pageSize);
        var body = slice.length ? slice.map(row).join('')
          : '<div class="zev-empty">No upcoming events right now — check back soon.</div>';
        if (showPast && past.length) body += '<div class="zev-sub">Past events</div>' + past.map(row).join('');
        var canPrev = start > 0, canNext = start + pageSize < up.length;
        el.innerHTML = '<div class="zev"><div class="zev-head">' +
          '<span class="zev-today"><span class="zev-todaynum">' + today.getDate() + '</span>Today</span>' +
          '<button class="zev-nav" type="button" data-dir="-1"' + (canPrev ? '' : ' disabled') + '>‹</button>' +
          '<button class="zev-nav" type="button" data-dir="1"' + (canNext ? '' : ' disabled') + '>›</button>' +
          '<span class="zev-htitle">' + esc(heading) + '</span>' +
          '</div>' + body + '</div>';
        Array.prototype.forEach.call(el.querySelectorAll('.zev-nav'), function (b) {
          b.onclick = function () {
            var ns = start + parseInt(b.getAttribute('data-dir'), 10) * pageSize;
            if (ns >= 0 && ns < up.length) { start = ns; render(); }
          };
        });
      };
      render();
    });
  }).catch(function () {
    targets.forEach(function (el) { el.innerHTML = '<div class="zev"><div class="zev-empty">Events are unavailable right now.</div></div>'; });
  });
}

export function embedScript(base) {
  return ';(' + widget.toString() + ')(' + JSON.stringify(base) + ');\n';
}
