/** Server-rendered HTML: the public events page and the admin overlay editor. */

const h = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function range(start, end) {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end || start}T00:00:00`);
  if (isNaN(s)) return '';
  const sd = s.getDate(), ed = e.getDate(), sm = MON[s.getMonth()], em = MON[e.getMonth()], sy = s.getFullYear(), ey = e.getFullYear();
  if (start === (end || start)) return `${sd} ${sm} ${sy}`;
  if (sy === ey && sm === em) return `${sd}–${ed} ${sm} ${sy}`;
  if (sy === ey) return `${sd} ${sm} – ${ed} ${em} ${sy}`;
  return `${sd} ${sm} ${sy} – ${ed} ${em} ${ey}`;
}
const place = (ev) => {
  const loc = [ev.city, ev.country].filter(Boolean).map(h).join(', ');
  // ev.flag is an emoji (regional-indicator pair) — safe to inject unescaped.
  return ev.flag ? (loc ? `${ev.flag} ${loc}` : ev.flag) : loc;
};

const STYLE = `
:root{--bg:#f7f8fa;--surface:#fff;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#10b981;--accent-ink:#065f46}
@media(prefers-color-scheme:dark){:root{--bg:#0b1220;--surface:#111a2e;--text:#e8edf6;--muted:#93a1b8;--border:#22304d;--accent:#34d399;--accent-ink:#a7f3d0}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.5;padding:0 20px 64px}
.wrap{max-width:960px;margin:0 auto}
header.hero{padding:56px 0 28px;text-align:center}
.hero .org{font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent-ink);font-weight:700}
.hero h1{font-size:2.2rem;font-weight:800;letter-spacing:-.02em;margin:8px 0 14px}
.sub-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;align-items:center}
.btn{display:inline-block;background:var(--accent);color:#03251b;text-decoration:none;font-weight:700;font-size:.85rem;padding:10px 18px;border-radius:10px}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border);font-weight:600}
.feedurl{font-size:.72rem;color:var(--muted);word-break:break-all}
h2.sec{font-size:1.05rem;font-weight:700;margin:36px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:5px}
.badge{align-self:flex-start;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:6px;background:rgba(16,185,129,.16);color:var(--accent-ink);font-weight:700}
.name{font-weight:700;font-size:1.08rem}
.date{color:var(--text);font-weight:600;font-size:.92rem}
.meta{color:var(--muted);font-size:.85rem}
.card a.link{margin-top:6px;align-self:flex-start;font-size:.82rem;font-weight:700;color:var(--accent-ink);text-decoration:none;border-bottom:1px solid currentColor}
.past{list-style:none}
.past li{padding:10px 0;border-top:1px solid var(--border);color:var(--muted);font-size:.9rem}
.empty{color:var(--muted);font-size:.92rem;padding:8px 0}
footer{margin-top:48px;text-align:center;color:var(--muted);font-size:.72rem}
`;

function card(ev) {
  const now = ev.status === 'active' ? '<span class="badge">Happening now</span>' : '';
  const loc = place(ev) ? `<div class="meta">${place(ev)}</div>` : '';
  const bh = [ev.hall ? `Hall ${h(ev.hall)}` : '', ev.booth ? `Booth ${h(ev.booth)}` : ''].filter(Boolean).join(' · ');
  const booth = bh ? `<div class="meta">${bh}</div>` : '';
  const blurb = ev.blurb ? `<div class="meta">${h(ev.blurb)}</div>` : '';
  const link = ev.link ? `<a class="link" href="${h(ev.link)}" target="_blank" rel="noopener">Event details →</a>` : '';
  return `<div class="card">${now}<div class="name">${h(ev.name)}</div><div class="date">${range(ev.start, ev.end)}</div>${loc}${booth}${blurb}${link}</div>`;
}

export function publicPage({ config, upcoming, past }) {
  const host = config.publicBaseUrl.replace(/^https?:\/\//, '');
  const webcal = `webcal://${host}/events.ics`;
  const icsUrl = `${config.publicBaseUrl}/events.ics`;
  const upHtml = upcoming.length
    ? `<div class="grid">${upcoming.map(card).join('')}</div>`
    : `<div class="empty">No upcoming events right now — check back soon.</div>`;
  const pastHtml = config.showPast && past.length
    ? `<h2 class="sec">Past events</h2><ul class="past">${past.map((ev) => `<li>${h(ev.name)} · ${range(ev.start, ev.end)}${place(ev) ? ` · ${place(ev)}` : ''}</li>`).join('')}</ul>`
    : '';
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(config.orgName)} — Events</title>
<meta name="description" content="${h(config.orgName)} — ${h(config.tagline)}. Upcoming conventions and events.">
<style>${STYLE}</style></head><body><div class="wrap">
<header class="hero">
  <div class="org">${h(config.orgName)}</div>
  <h1>${h(config.tagline)}</h1>
  <div class="sub-row">
    <a class="btn" href="${h(webcal)}">＋ Subscribe (calendar)</a>
    <span class="feedurl">or add by URL: ${h(icsUrl)}</span>
  </div>
</header>
<main>
  <h2 class="sec">Upcoming events</h2>
  ${upHtml}
  ${pastHtml}
</main>
<footer>Events update automatically from our sales system.</footer>
</div></body></html>`;
}

// ── Admin overlay editor (client-driven; talks to /api/admin/*) ──────────────
export function adminPage() {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ZollEvents — Admin</title>
<style>${STYLE}
.login{max-width:340px;margin:80px auto;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px}
label{display:block;font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px}
input,textarea{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:.88rem;padding:8px 10px}
.row{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:12px}
.row h3{font-size:1rem;margin-bottom:2px}
.row .sub{color:var(--muted);font-size:.8rem;margin-bottom:10px}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fields .full{grid-column:1/-1}
.chk{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:.85rem}
.chk input{width:auto}
.bar{position:sticky;top:0;background:var(--bg);padding:14px 0;display:flex;gap:10px;align-items:center;z-index:5}
.msg{font-size:.82rem;color:var(--muted)}
</style></head><body><div class="wrap">
<div id="app"><div class="empty" style="padding:60px 0;text-align:center">Loading…</div></div>
</div>
<script>
var app=document.getElementById('app');
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmtRange(s,e){var d=new Date(s+'T00:00:00');if(isNaN(d))return '';return s+(e&&e!==s?' → '+e:'');}
function val(id){var el=document.getElementById(id);return el?el.value:'';}
async function boot(){
  var setup=await fetch('/api/setup').then(r=>r.json()).catch(function(){return {needsSetup:false};});
  if(setup.needsSetup){renderSetup();return;}
  var me=await fetch('/api/admin/me').then(r=>r.json()).catch(function(){return {admin:false};});
  if(!me.admin){renderLogin();return;}
  // re-fetch setup (now authed) to get the editable site settings
  var s2=await fetch('/api/setup').then(r=>r.json()).catch(function(){return {};});
  var data=await fetch('/api/admin/data').then(r=>r.json());
  data._settings=s2.settings||{};
  renderEditor(data);
}
function renderSetup(err){
  app.innerHTML='<div class="login" style="max-width:460px"><h2 style="margin-bottom:6px">Welcome — first-time setup</h2>'+
    '<div class="msg" style="margin-bottom:14px">Configure ZollEvents once here. Everything is editable later from the admin.</div>'+
    '<label>Admin password *</label><input id="su_pw" type="password" autocomplete="new-password">'+
    '<label>ZollTool server URL</label><input id="su_url" placeholder="https://sync.example.com">'+
    '<label>ZollTool API token (zt_…)</label><input id="su_token" type="password" placeholder="zt_…">'+
    '<label>Public base URL (the public HTTPS origin)</label><input id="su_base" placeholder="https://events.example.com">'+
    '<label>Organisation name</label><input id="su_org" placeholder="Phuong Ninjin">'+
    '<label>Tagline</label><input id="su_tag" placeholder="Where to find us">'+
    '<button class="btn" style="width:100%;margin-top:16px" onclick="submitSetup()">Save &amp; continue</button>'+
    (err?'<div class="msg" style="color:#e11d48;margin-top:8px">'+esc(err)+'</div>':'')+'</div>';
  var pw=document.getElementById('su_pw');if(pw)pw.focus();
}
async function submitSetup(){
  var body={adminPassword:val('su_pw'),zolltoolUrl:val('su_url'),apiToken:val('su_token'),
    publicBaseUrl:val('su_base'),orgName:val('su_org'),tagline:val('su_tag')};
  var r=await fetch('/api/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  if(r.ok){boot();}
  else{var e=await r.json().catch(function(){return {};});renderSetup(e.error||'Setup failed');}
}
function renderLogin(err){
  app.innerHTML='<div class="login"><h2 style="margin-bottom:6px">Admin</h2>'+
    '<div class="msg" style="margin-bottom:10px">Edit per-event hall, booth &amp; links, and the Instagram bio.</div>'+
    '<label>Password</label><input id="pw" type="password">'+
    '<button class="btn" style="width:100%;margin-top:14px" onclick="login()">Log in</button>'+
    (err?'<div class="msg" style="color:#e11d48;margin-top:8px">'+esc(err)+'</div>':'')+'</div>';
  var pw=document.getElementById('pw');pw.focus();pw.addEventListener('keydown',function(e){if(e.key==='Enter')login();});
}
async function login(){
  var pw=document.getElementById('pw').value;
  var r=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pw})});
  if(r.ok)boot();else renderLogin('Wrong password.');
}
var _settings={},_site={};
function renderEditor(data){
  var ov=(data.overlay&&data.overlay.events)||{};
  _settings=(data.overlay&&data.overlay.settings)||{};
  _site=data._settings||{};
  var events=(data.events||[]).filter(function(e){return !e.deletedAt;}).sort(function(a,b){return (b.dateStart||'').localeCompare(a.dateStart||'');});
  var rows=events.map(function(e){
    var o=ov[e.id]||{};
    var loc=[e.venue&&e.venue.city,e.venue&&e.venue.country].filter(Boolean).map(esc).join(', ');
    return '<div class="row" data-id="'+esc(e.id)+'"><h3>'+esc(e.name||'Event')+'</h3>'+
      '<div class="sub">'+fmtRange(e.dateStart,e.dateEnd)+(loc?' · '+loc:'')+' · '+esc(e.status||'')+'</div>'+
      '<div class="fields">'+
      '<div><label>Hall</label><input data-f="hall" value="'+esc(o.hall||'')+'"></div>'+
      '<div><label>Booth</label><input data-f="booth" value="'+esc(o.booth||'')+'"></div>'+
      '<div><label>Convention Instagram (@handle)</label><input data-f="igHandle" value="'+esc(o.igHandle||'')+'" placeholder="animemesse"></div>'+
      '<div><label>Event link</label><input data-f="link" value="'+esc(o.link||'')+'" placeholder="https://…"></div>'+
      '<div class="full"><label>Blurb</label><input data-f="blurb" value="'+esc(o.blurb||'')+'"></div>'+
      '<div class="full"><label>Hero image URL (optional)</label><input data-f="hero" value="'+esc(o.hero||'')+'"></div>'+
      '</div><label class="chk"><input type="checkbox" data-f="hidden" '+(o.hidden?'checked':'')+'> Hide from public page & feeds</label></div>';
  }).join('');
  app.innerHTML='<div class="bar"><button class="btn" onclick="save()">Save changes</button>'+
    '<a class="btn ghost" href="/" target="_blank">View page</a>'+
    '<button class="btn ghost" onclick="logout()">Log out</button>'+
    '<span id="msg" class="msg"></span></div>'+
    sitePanel(_site)+igPanel()+(rows||'<div class="empty">No events yet.</div>');
  document.querySelectorAll('.row[data-id] [data-f]').forEach(function(i){i.addEventListener('input',schedulePreview);});
  refreshPreview();
}
function sitePanel(s){
  s=s||{};var lock=s.envLocked||{};
  function line(id,label,value,ph,locked,type){
    return '<div class="full"><label>'+label+(locked?' <span class="msg">(set by env)</span>':'')+'</label>'+
      '<input id="'+id+'" type="'+(type||'text')+'" value="'+esc(value||'')+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+(locked?' disabled':'')+'></div>';
  }
  return '<div class="row"><h3>⚙ Site settings</h3>'+
    '<div class="sub">Source, branding, and the public URL. Fields pinned by an environment variable are read-only.</div>'+
    '<div class="fields">'+
      line('st_url','ZollTool server URL',s.zolltoolUrl,'https://sync.example.com',lock.zolltoolUrl)+
      '<div class="full"><label>ZollTool API token'+(lock.apiToken?' <span class="msg">(set by env)</span>':'')+'</label>'+
        '<input id="st_token" type="password" placeholder="'+(s.hasToken?'•••••••• (unchanged)':'zt_…')+'"'+(lock.apiToken?' disabled':'')+'></div>'+
      line('st_base','Public base URL',s.publicBaseUrl,'https://events.example.com',lock.publicBaseUrl)+
      line('st_org','Organisation name',s.orgName,'Phuong Ninjin',lock.orgName)+
      line('st_tag','Tagline',s.tagline,'Where to find us',lock.tagline)+
      '<div class="full"><label>Change admin password (optional)</label><input id="st_pw" type="password" autocomplete="new-password" placeholder="leave blank to keep current"></div>'+
    '</div>'+
    '<div style="margin-top:10px"><button class="btn" type="button" onclick="saveSite()">Save settings</button> <span id="siteMsg" class="msg"></span></div></div>';
}
async function saveSite(){
  var body={};
  [['st_url','zolltoolUrl'],['st_base','publicBaseUrl'],['st_org','orgName'],['st_tag','tagline']].forEach(function(p){
    var el=document.getElementById(p[0]);if(el&&!el.disabled)body[p[1]]=el.value.trim();
  });
  var tok=document.getElementById('st_token');if(tok&&!tok.disabled&&tok.value.trim())body.apiToken=tok.value.trim();
  var pw=val('st_pw');if(pw)body.adminPassword=pw;
  var m=document.getElementById('siteMsg');m.textContent='Saving…';
  var r=await fetch('/api/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  if(r.ok){m.textContent='Saved ✓';var st=document.getElementById('st_pw');if(st)st.value='';}
  else{var e=await r.json().catch(function(){return {};});m.textContent=e.error||'Save failed';}
}
function igPanel(){
  var origin=location.origin;
  return '<div class="row" style="border-color:var(--accent)">'+
    '<h3>📸 Instagram bio</h3>'+
    '<div class="sub">Auto-composed from the current / next event. Instagram has no API to set a bio, so <b>copy</b> this into your profile — or point a phone Shortcut at <code>'+esc(origin)+'/instagram.txt</code> to fetch it.</div>'+
    '<div class="fields">'+
      '<div class="full"><label>Template</label><textarea id="igTemplate" rows="5" oninput="schedulePreview()">'+esc(_settings.igBioTemplate||'')+'</textarea>'+
        '<div class="msg" style="margin-top:4px">Tokens: {event} · {event_handle} · {event_booth} · {event_hall} · {event_dates} · {event_name} · {event_city} · {event_country}. Leave blank to use the default.</div></div>'+
      '<div class="full"><label>Fallback line (when no upcoming event)</label><input id="igFallback" value="'+esc(_settings.igBioFallback||'')+'" oninput="schedulePreview()" placeholder="e.g. Online only 🛒"></div>'+
    '</div>'+
    '<label style="margin-top:10px">Live preview</label>'+
    '<pre id="igPreview" style="white-space:pre-wrap;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:11px 13px;font:inherit;font-size:.92rem;min-height:60px;margin-top:0"></pre>'+
    '<div style="display:flex;gap:12px;align-items:center;margin-top:10px">'+
      '<button class="btn" type="button" onclick="copyBio()">Copy bio</button>'+
      '<span id="igCount" class="msg"></span><span id="igMsg" class="msg"></span>'+
    '</div></div>';
}
function collectEvents(){
  var out={};
  document.querySelectorAll('.row[data-id]').forEach(function(row){
    var id=row.getAttribute('data-id'),rec={};
    row.querySelectorAll('[data-f]').forEach(function(inp){
      var f=inp.getAttribute('data-f');
      rec[f]=inp.type==='checkbox'?inp.checked:inp.value.trim();
    });
    if(rec.hall||rec.booth||rec.igHandle||rec.link||rec.blurb||rec.hero||rec.hidden)out[id]=rec;
  });
  return out;
}
var _pvTimer,_igBio='';
function schedulePreview(){clearTimeout(_pvTimer);_pvTimer=setTimeout(refreshPreview,300);}
async function refreshPreview(){
  var tmpl=(document.getElementById('igTemplate')||{}).value||'';
  var fb=(document.getElementById('igFallback')||{}).value||'';
  var r=await fetch('/api/admin/instagram/preview',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({igBioTemplate:tmpl,igBioFallback:fb,events:collectEvents()})}).then(function(r){return r.json();}).catch(function(){return null;});
  if(!r)return;
  _igBio=r.bio||'';
  var pre=document.getElementById('igPreview');if(pre)pre.textContent=_igBio||'(empty)';
  var cc=document.getElementById('igCount');
  if(cc){var n=_igBio.length;cc.textContent=n+' / 150 chars';cc.style.color=n>150?'#e11d48':'var(--muted)';}
}
async function copyBio(){
  var msg=document.getElementById('igMsg');
  try{await navigator.clipboard.writeText(_igBio);msg.textContent='Copied ✓';}
  catch(e){msg.textContent='Copy failed — select the preview & copy manually';}
  setTimeout(function(){if(msg)msg.textContent='';},2500);
}
async function save(){
  var out=collectEvents();
  var settings=Object.assign({},_settings,{
    igBioTemplate:(document.getElementById('igTemplate')||{}).value||'',
    igBioFallback:(document.getElementById('igFallback')||{}).value||'',
  });
  document.getElementById('msg').textContent='Saving…';
  var r=await fetch('/api/admin/overlay',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({events:out,settings:settings})});
  if(r.ok){_settings=settings;document.getElementById('msg').textContent='Saved ✓';refreshPreview();}
  else document.getElementById('msg').textContent='Save failed';
}
async function logout(){await fetch('/api/admin/logout',{method:'POST'});boot();}
boot();
</script></body></html>`;
}
