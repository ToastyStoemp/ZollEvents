/**
 * The Shopify embed widget. A merchant drops this into any page/section:
 *
 *   <div id="zollevents-events" data-past="true" data-limit="8"></div>
 *   <script src="https://YOUR-ZOLLEVENTS-HOST/embed.js" async></script>
 *
 * It fetches the live events JSON and renders a self-contained, theme-agnostic
 * list into the target(s). Auto-updates whenever events change in ZollTool.
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
  var range = function (start, end) {
    var s = new Date(start + 'T00:00:00'), e = new Date((end || start) + 'T00:00:00');
    if (isNaN(s)) return '';
    var sd = s.getDate(), ed = e.getDate(), sm = MON[s.getMonth()], em = MON[e.getMonth()], sy = s.getFullYear(), ey = e.getFullYear();
    if (start === (end || start)) return sd + ' ' + sm + ' ' + sy;
    if (sy === ey && sm === em) return sd + '–' + ed + ' ' + sm + ' ' + sy;
    if (sy === ey) return sd + ' ' + sm + ' – ' + ed + ' ' + em + ' ' + sy;
    return sd + ' ' + sm + ' ' + sy + ' – ' + ed + ' ' + em + ' ' + ey;
  };
  var place = function (ev) { return [ev.city, ev.country].filter(Boolean).map(esc).join(', '); };

  if (!document.getElementById('gue-style')) {
    var st = document.createElement('style');
    st.id = 'gue-style';
    st.textContent =
      '.gue{font-family:inherit;color:inherit;line-height:1.4}' +
      '.gue h3.gue-h{font-size:1.1em;margin:0 0 .6em;font-weight:700}' +
      '.gue-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}' +
      '.gue-card{border:1px solid rgba(128,128,128,.25);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:4px}' +
      '.gue-name{font-weight:700;font-size:1.02em}' +
      '.gue-date{font-size:.9em;opacity:.85}' +
      '.gue-meta{font-size:.85em;opacity:.7}' +
      '.gue-badge{align-self:flex-start;font-size:.66em;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:6px;background:rgba(52,211,153,.16);color:#0a8a5f;margin-top:2px}' +
      '.gue-link{margin-top:6px;font-size:.85em;font-weight:600;text-decoration:none;color:inherit;border-bottom:1px solid currentColor;align-self:flex-start}' +
      '.gue-past{list-style:none;padding:0;margin:.4em 0 0}' +
      '.gue-past li{font-size:.9em;opacity:.75;padding:3px 0;border-top:1px solid rgba(128,128,128,.18)}' +
      '.gue-empty{opacity:.7;font-size:.9em}';
    document.head.appendChild(st);
  }

  var card = function (ev) {
    var now = ev.status === 'active' ? '<span class="gue-badge">Happening now</span>' : '';
    var booth = ev.booth ? '<div class="gue-meta">Booth ' + esc(ev.booth) + '</div>' : '';
    var blurb = ev.blurb ? '<div class="gue-meta">' + esc(ev.blurb) + '</div>' : '';
    var loc = place(ev) ? '<div class="gue-meta">' + place(ev) + '</div>' : '';
    var link = ev.link ? '<a class="gue-link" href="' + esc(ev.link) + '" target="_blank" rel="noopener">Event details →</a>' : '';
    return '<div class="gue-card">' + now + '<div class="gue-name">' + esc(ev.name) + '</div>' +
      '<div class="gue-date">' + range(ev.start, ev.end) + '</div>' + loc + booth + blurb + link + '</div>';
  };

  fetch(BASE + '/api/events.json').then(function (r) { return r.json(); }).then(function (data) {
    var up = data.upcoming || [], past = data.past || [];
    targets.forEach(function (el) {
      var limit = parseInt(el.getAttribute('data-limit') || '0', 10);
      var showPast = el.getAttribute('data-past') === 'true';
      var heading = el.getAttribute('data-heading');
      var shown = limit > 0 ? up.slice(0, limit) : up;
      var html = '<div class="gue">';
      if (heading) html += '<h3 class="gue-h">' + esc(heading) + '</h3>';
      html += shown.length
        ? '<div class="gue-grid">' + shown.map(card).join('') + '</div>'
        : '<div class="gue-empty">No upcoming events right now — check back soon.</div>';
      if (showPast && past.length) {
        html += '<h3 class="gue-h" style="margin-top:1em">Past events</h3><ul class="gue-past">' +
          past.map(function (ev) { return '<li>' + esc(ev.name) + ' · ' + range(ev.start, ev.end) + (place(ev) ? ' · ' + place(ev) : '') + '</li>'; }).join('') + '</ul>';
      }
      html += '</div>';
      el.innerHTML = html;
    });
  }).catch(function () {
    targets.forEach(function (el) { el.innerHTML = '<div class="gue gue-empty">Events are unavailable right now.</div>'; });
  });
}

export function embedScript(base) {
  return ';(' + widget.toString() + ')(' + JSON.stringify(base) + ');\n';
}
