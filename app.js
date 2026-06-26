const $ = (id) => document.getElementById(id);
let currentData = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
}

function setClock() {
  const now = new Date();
  $('dateNow').textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  $('timeNow').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
setInterval(setClock, 1000); setClock();

function render(data) {
  currentData = data;
  const emp = data.employee || {};
  $('dashboardTitle').textContent = data.brand?.dashboardTitle || 'Employee Spotlight';
  $('subtitle').textContent = data.brand?.subtitle || '';
  $('employeeName').textContent = emp.name || 'Employee Name';
  $('employeeRole').textContent = emp.role || 'Games & Attractions';
  $('employeeMonth').textContent = emp.month || '';
  $('employeeQuote').textContent = emp.quote || '';

  const photo = $('employeePhoto');
  if (emp.photo) {
    photo.className = 'portrait-photo';
    photo.style.backgroundImage = `url('${emp.photo}')`;
    photo.innerHTML = '';
  } else {
    photo.className = 'portrait-placeholder';
    photo.style.backgroundImage = '';
    photo.innerHTML = '<span>TEAM<br>SPOTLIGHT</span>';
  }

  $('employeeStats').innerHTML = (emp.stats || []).map(s => `
    <div class="stat-pill"><strong>${escapeHtml(s.value)}</strong><span>${escapeHtml(s.label)}</span></div>
  `).join('');

  $('highlightsList').innerHTML = (emp.highlights || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');

  $('announcementGrid').innerHTML = (data.announcements || []).filter(a => a.active !== false).map(a => `
    <article class="announcement-card priority-${escapeHtml(a.priority || 'medium')}">
      <div class="tag-row"><span>${escapeHtml(a.type || a.tag || 'Update')}</span><em>${escapeHtml(a.priority || 'medium')}</em></div>
      <h3>${escapeHtml(a.title)}</h3>
      <p>${escapeHtml(a.body)}</p>
    </article>
  `).join('');

  $('valuesGrid').innerHTML = (data.values || []).map(v => `
    <div class="value-card"><b>${escapeHtml(v.letter || '')}</b><strong>${escapeHtml(v.word || v)}</strong><span>${escapeHtml(v.note || '')}</span></div>
  `).join('');

  $('shoutoutsList').innerHTML = (data.shoutouts || []).map(s => `
    <div class="shout"><strong>${escapeHtml(s.name)}</strong><p>${escapeHtml(s.text)}</p></div>
  `).join('');

  $('eventsList').innerHTML = (data.events || []).map(e => `
    <div class="event"><span>${escapeHtml(e.date)}</span><strong>${escapeHtml(e.title)}</strong><em>${escapeHtml(e.time)}</em></div>
  `).join('');

  const ticker = Array.isArray(data.ticker) ? data.ticker.join('   •   ') : data.ticker || '';
  $('tickerText').textContent = `${ticker}   •   ${ticker}`;
}

async function load() {
  const res = await fetch('/api/content');
  render(await res.json());
}

load();

try {
  const stream = new EventSource('/api/stream');
  stream.onmessage = (event) => render(JSON.parse(event.data));
} catch {
  setInterval(load, 20000);
}
