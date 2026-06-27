let current = null;
let valueIndex = 0;
const $ = id => document.getElementById(id);
const socket = io();
socket.on('content:update', data => { current = data; render(data); toast(); });
setInterval(updateClock, 1000); updateClock();
setInterval(()=>{ if(current) rotateValue(current); }, 8000);

function updateClock(){ const d = new Date(); $('time').textContent = d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}); $('date').textContent = d.toLocaleDateString([], {weekday:'long', month:'short', day:'numeric'}); }
function autoTheme(){ const m = new Date().getMonth()+1; const day = new Date().getDate(); if(m===7 && day<=7) return 'fourth'; if(m===10) return 'halloween'; if(m===12) return 'christmas'; if([3,4,5].includes(m)) return 'spring'; if([6,7,8].includes(m)) return 'summer'; if([9,10,11].includes(m)) return 'fall'; return 'cinergy'; }
function render(data){
  const s = data.settings || {}; const theme = s.theme === 'auto' ? autoTheme() : (s.theme || 'cinergy'); document.body.className = 'display-page theme-' + theme;
  $('brandTitle').textContent = s.brandTitle || 'CINERGY GAMES & ATTRACTIONS'; $('subtitle').textContent = s.subtitle || 'Team Command Center';
  document.querySelector('.admin-float').style.display = s.showAdminButton === false ? 'none' : 'block';
  renderBg(s.background || {});
  const ticker = (data.ticker||[]).map(t=>`<span class="priority-${t.priority||'normal'}">${escape(t.priority||'Info').toUpperCase()} • ${escape(t.text||'')}</span>`).join(''); $('tickerTrack').innerHTML = ticker + ticker;
  const e = data.employee || {}; $('empPhoto').src = e.photo || ''; $('empMonth').textContent = e.month || 'Employee of the Month'; $('empName').textContent = e.name || ''; $('empRole').textContent = e.role || ''; $('empQuote').textContent = e.quote || ''; $('managerNote').textContent = e.managerNote || ''; $('empAchievements').innerHTML = (e.achievements||[]).map(x=>`<li>${escape(x)}</li>`).join('');
  const f = data.focus || {}; $('focusTitle').textContent = f.title || ''; $('focusBody').textContent = f.body || ''; $('focusPoints').innerHTML = (f.points||[]).map(x=>`<li>${escape(x)}</li>`).join('');
  rotateValue(data);
  const anns = (data.announcements||[]).slice(0,4); $('annCount').textContent = `${anns.length} active`; $('announcements').innerHTML = anns.map(a=>`<article class="ann-card"><span class="pill">${escape(a.category||'Update')} • ${escape(a.priority||'normal')}</span><h3>${escape(a.title||'')}</h3><p>${escape(a.summary||'')}</p>${(a.points||[]).slice(0,3).map(p=>`<p>• ${escape(p)}</p>`).join('')}${a.fileUrl?`<a class="file-link" href="${a.fileUrl}" target="_blank">Open PDF</a>`:''}</article>`).join('');
  $('recognition').innerHTML = (data.recognition||[]).slice(0,3).map(r=>`<div class="rec-card"><strong>${escape(r.name||r.type||'Recognition')}</strong><p>${escape(r.text||'')}</p></div>`).join('');
  $('events').innerHTML = (data.events||[]).slice(0,3).map(ev=>`<div class="event-item"><span>${escape(ev.date||'')}</span><b>${escape(ev.title||'')}</b></div>`).join('');
  const safety = data.safety || {}; $('safetyTitle').textContent = safety.title || ''; $('safetyBody').textContent = safety.body || '';
  $('kpis').innerHTML = (data.kpis||[]).slice(0,4).map(k=>`<div class="kpi"><b>${escape(k.value||'')}</b><span>${escape(k.label||'')}</span></div>`).join('');
  $('resources').innerHTML = (data.resources||[]).slice(0,3).map(r=>`<div class="resource-item"><span>${escape(r.title||'Resource')}</span><a href="${r.url}" target="_blank">Open</a></div>`).join('');
  $('updated').textContent = s.lastUpdated ? 'Updated • ' + new Date(s.lastUpdated).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Updated by management';
}
function rotateValue(data){ const vals = data.values || []; if(!vals.length) return; valueIndex = valueIndex % vals.length; $('valueWord').textContent = vals[valueIndex].word; $('valueDetail').textContent = vals[valueIndex].detail; valueIndex++; }
function renderBg(bg){ const el = $('bg'); el.innerHTML = ''; el.style.opacity = bg.opacity ?? .18; el.style.filter = `blur(${bg.blur ?? 10}px)`; if(!bg.url || bg.type==='none'){ el.style.backgroundImage=''; return; } if(bg.type==='video'){ const v = document.createElement('video'); v.src=bg.url; v.autoplay=true; v.muted=true; v.loop=true; v.playsInline=true; el.appendChild(v); } else { el.style.backgroundImage = `url('${bg.url}')`; } }
function toast(){ const t=$('toast'); t.classList.add('show-toast'); setTimeout(()=>t.classList.remove('show-toast'),900); }
function escape(s){ return String(s ?? '').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
fetch('/api/content').then(r=>r.json()).then(d=>{current=d;render(d)});
