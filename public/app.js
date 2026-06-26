const $ = id => document.getElementById(id);
const socket = io();
let firstLoad = true;

function safeList(items) { return Array.isArray(items) ? items : []; }
function text(value, fallback = '') { return value || fallback; }

function setClock() {
  const now = new Date();
  $('clock').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
setInterval(setClock, 1000);
setClock();

async function loadWeather() {
  try {
    const res = await fetch('/api/weather');
    const w = await res.json();
    $('weather').textContent = `${w.city || 'Weather'} · ${w.temp}${w.temp === '--' ? '' : '°'} · ${w.description || ''}`;
  } catch {
    $('weather').textContent = 'Weather unavailable';
  }
}
loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);

function render(data) {
  $('subtitle').textContent = data.brand?.subtitle || 'Employee Spotlight + Team Command Center';

  const video = $('bgVideo');
  const bgImage = $('bgImage');
  if (data.brand?.backgroundVideo) {
    if (video.src !== data.brand.backgroundVideo) video.src = data.brand.backgroundVideo;
    video.style.display = 'block';
  } else {
    video.style.display = 'none';
  }
  if (data.brand?.backgroundImage) {
    bgImage.style.backgroundImage = `url('${data.brand.backgroundImage}')`;
  } else {
    bgImage.style.backgroundImage = '';
  }

  const ticker = safeList(data.ticker).join('   •   ');
  $('tickerText').textContent = ticker || 'Add ticker updates in admin.';

  const emp = data.employee || {};
  $('empName').textContent = text(emp.name, 'Employee Name');
  $('empMeta').textContent = `${text(emp.month, 'This Month')} · ${text(emp.role, 'Team Member')}`;
  $('empQuote').textContent = text(emp.quote, 'Guest First. Accountable. A Leader.');
  $('achievements').innerHTML = safeList(emp.achievements).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  const photo = $('empPhoto');
  if (emp.photo) {
    photo.style.backgroundImage = `url('${emp.photo}')`;
    photo.innerHTML = '';
  } else {
    photo.style.backgroundImage = '';
    photo.innerHTML = '<span>Add Photo</span>';
  }

  $('ltos').innerHTML = safeList(data.ltos).filter(x => x.active !== false).map(item => `
    <article class="promo-card">
      <span class="tag">${escapeHtml(item.label || 'LTO')}</span>
      <h3>${escapeHtml(item.title || '')}</h3>
      <p>${escapeHtml(item.detail || '')}</p>
      ${item.image ? `<div class="promo-img" style="background-image:url('${item.image}')"></div>` : ''}
    </article>
  `).join('');

  $('whatsNew').innerHTML = safeList(data.whatsNew).map(item => `
    <article class="new-card">
      <div class="type">${escapeHtml(item.type || 'Update')}</div>
      <h3>${escapeHtml(item.title || '')}</h3>
      <p>${escapeHtml(item.body || '')}</p>
    </article>
  `).join('');

  $('birthdays').innerHTML = safeList(data.birthdays).map(item => `
    <div class="mini-item"><small>${escapeHtml(item.type || 'Birthday')}</small><strong>${escapeHtml(item.name || '')}</strong><div>${escapeHtml(item.date || '')}</div></div>
  `).join('');

  $('events').innerHTML = safeList(data.events).map(item => `
    <div class="mini-item"><small>${escapeHtml(item.date || '')} · ${escapeHtml(item.time || '')}</small><strong>${escapeHtml(item.title || '')}</strong><div>${escapeHtml(item.location || '')}</div></div>
  `).join('');

  $('shoutouts').innerHTML = safeList(data.shoutouts).map(item => `
    <div class="shoutout"><small>${escapeHtml(item.from || 'Manager')}</small><strong>${escapeHtml(item.to || 'Team')}</strong><p>${escapeHtml(item.body || '')}</p></div>
  `).join('');

  $('values').innerHTML = safeList(data.values).map(v => `<div class="value-chip">${escapeHtml(v)}</div>`).join('');

  if (!firstLoad) showToast();
  firstLoad = false;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

function showToast() {
  const toast = $('liveToast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

async function initialLoad() {
  const res = await fetch('/api/content');
  render(await res.json());
}

socket.on('content:update', render);
initialLoad();
