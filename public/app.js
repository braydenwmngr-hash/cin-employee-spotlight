const $ = sel => document.querySelector(sel);
let currentData = null;
let valueIndex = 0;
let panelIndex = 0;
let rotationTimer = null;

function esc(v='') { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function activeItems(arr) { return (arr || []).filter(x => x.active !== false); }

function updateClock(){
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
  $('#dateLine').textContent = now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
}
setInterval(updateClock, 1000); updateClock();

function render(data, silent=false){
  currentData = data;
  const s = data.settings || {};
  $('#brandTitle').textContent = s.brandTitle || 'Cinergy Team Spotlight';
  $('#locationLine').textContent = `${s.location || 'Cinergy'} • Internal Operations Board`;

  document.body.classList.toggle('rotating', !!s.rotateSections);
  document.body.classList.toggle('tv-hide', !!s.tvMode);

  const bgVideo = $('#bgVideo'), bgImage = $('#bgImage');
  bgVideo.style.display = 'none'; bgImage.style.display = 'none';
  if (s.backgroundType === 'video' && s.backgroundVideo) { bgVideo.src = s.backgroundVideo; bgVideo.style.display = 'block'; }
  if (s.backgroundType === 'image' && s.backgroundImage) { bgImage.style.backgroundImage = `url('${s.backgroundImage}')`; bgImage.style.display = 'block'; }

  const ticker = activeItems(data.ticker);
  const tickerHtml = ticker.map(t => `<span class="ticker-item"><span class="badge ${esc(t.level || 'info')}">${esc(t.level || 'info')}</span>${esc(t.text)}</span>`).join('');
  $('#tickerTrack').innerHTML = tickerHtml + tickerHtml;

  const e = data.employee || {};
  $('#empTitle').textContent = e.title || 'Employee of the Month';
  $('#empName').textContent = e.name || 'Employee Name';
  $('#empRole').textContent = e.role || '';
  $('#empQuote').textContent = e.quote || '';
  $('#managerNote').textContent = e.managerNote || '';
  const photoWrap = document.querySelector('.hero-photo-wrap');
  if (e.photo) { $('#empPhoto').src = e.photo; $('#empPhoto').style.display = 'block'; photoWrap.classList.add('has-photo'); }
  else { $('#empPhoto').removeAttribute('src'); $('#empPhoto').style.display = 'none'; photoWrap.classList.remove('has-photo'); }
  $('#achievements').innerHTML = (e.achievements || []).slice(0,5).map(a => `<div class="achievement">${esc(a)}</div>`).join('');

  const f = data.shiftFocus || {};
  $('#focusTitle').textContent = f.title || 'Today\'s Shift Focus';
  $('#focusBody').textContent = f.body || '';
  $('#focusBullets').innerHTML = (f.bullets || []).slice(0,4).map(b => `<span class="pill">${esc(b)}</span>`).join('');

  $('#promotions').innerHTML = activeItems(data.promotions).slice(0,3).map(p => `<article class="promo-card"><div class="icon">${esc(p.icon || '🍿')}</div><small>${esc(p.subtitle || 'Promo')}</small><h4>${esc(p.title)}</h4><p>${esc(p.body)}</p></article>`).join('');
  $('#whatsNew').innerHTML = activeItems(data.whatsNew).slice(0,4).map(n => `<article class="list-item"><span class="tag">${esc(n.tag || 'New')}</span><h4>${esc(n.title)}</h4><p>${esc(n.body)}</p></article>`).join('');
  $('#recognition').innerHTML = activeItems(data.recognition).slice(0,3).map(r => `<article class="quote-item"><h4>${esc(r.type || 'Recognition')}</h4><p>“${esc(r.text)}”</p><strong>${esc(r.name)}</strong></article>`).join('');
  $('#events').innerHTML = activeItems(data.events).slice(0,4).map(ev => `<article class="event-item"><span class="tag">${esc(ev.date)}</span><h4>${esc(ev.title)}</h4><p>${esc(ev.time || '')}${ev.location ? ' • ' + esc(ev.location) : ''}</p></article>`).join('');
  $('#kpis').innerHTML = activeItems(data.kpis).slice(0,4).map(k => `<div class="kpi"><span>${esc(k.label)}</span><b>${esc(k.value)}</b><small>${esc(k.note || '')}</small></div>`).join('');

  const safety = data.safety || {};
  $('#safety').style.display = safety.active === false ? 'none' : 'block';
  $('#safety').innerHTML = `<b>${esc(safety.title || 'Safety Corner')}</b>${esc(safety.body || '')}`;
  const updated = s.lastUpdatedAt ? new Date(s.lastUpdatedAt).toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : 'recently';
  $('#lastUpdated').textContent = `Updated by ${s.lastUpdatedBy || 'Management'} • ${updated}`;

  showValue();
  setupRotation();
  if(!silent) showToast();
}

function showValue(){
  const values = currentData?.values || [];
  if (!values.length) return;
  const v = values[valueIndex % values.length];
  $('#valueFeature').innerHTML = `<div class="value-key">${esc(v.key)}</div><div class="value-word">${esc(v.word)}</div><p class="value-meaning">${esc(v.meaning)}</p>`;
}
setInterval(()=>{ valueIndex++; showValue(); }, 9000);

function setupRotation(){
  clearInterval(rotationTimer);
  const panels = [...document.querySelectorAll('.rotating-panel')];
  if (!currentData?.settings?.rotateSections) { panels.forEach(p => p.classList.remove('active-panel')); return; }
  function setPanel(){ panels.forEach((p,i)=>p.classList.toggle('active-panel', i === panelIndex % panels.length)); panelIndex++; }
  setPanel();
  rotationTimer = setInterval(setPanel, Math.max(6, Number(currentData.settings.rotationSeconds || 12)) * 1000);
}

function showToast(){ const t=$('#toast'); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1300); }

fetch('/api/content').then(r=>r.json()).then(d=>render(d,true));
const socket = io();
socket.on('content:update', data => render(data));
