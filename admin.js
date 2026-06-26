const $ = (id) => document.getElementById(id);
let data = null;

function esc(value = '') { return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c])); }
function lines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}

$('loginBtn').onclick = async () => {
  $('loginStatus').textContent = 'Checking...';
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ username: $('loginUser').value, password: $('loginPass').value }) });
    await load();
  } catch (error) { $('loginStatus').textContent = error.message; }
};

$('logoutBtn').onclick = async () => { await api('/api/logout', { method: 'POST' }); location.reload(); };

async function load() {
  data = await api('/api/content');
  $('loginBox').classList.add('hidden');
  $('adminApp').classList.remove('hidden');
  renderForm();
}

function renderForm() {
  $('brandTitle').value = data.brand?.dashboardTitle || '';
  $('brandSubtitle').value = data.brand?.subtitle || '';
  const emp = data.employee || {};
  $('empMonth').value = emp.month || '';
  $('empName').value = emp.name || '';
  $('empRole').value = emp.role || '';
  $('empDepartment').value = emp.department || '';
  $('empPhoto').value = emp.photo || '';
  $('empQuote').value = emp.quote || '';
  $('empHighlights').value = (emp.highlights || []).join('\n');
  $('tickerMessages').value = Array.isArray(data.ticker) ? data.ticker.join('\n') : data.ticker || '';
  renderStats(); renderAnnouncements(); renderShoutouts(); renderEvents(); renderValues();
}

function renderStats() {
  $('statsEditor').innerHTML = (data.employee.stats || []).map((s, i) => `
    <div class="row-item admin-grid">
      <label>Value<input data-stat-value="${i}" value="${esc(s.value)}"></label>
      <label>Label<input data-stat-label="${i}" value="${esc(s.label)}"></label>
      <div class="row-actions full"><button class="danger" onclick="removeStat(${i})">Remove</button></div>
    </div>`).join('');
}
window.removeStat = (i) => { data.employee.stats.splice(i, 1); renderStats(); };
$('addStat').onclick = () => { data.employee.stats.push({ label: 'New Stat', value: '0' }); renderStats(); };

function renderAnnouncements() {
  $('announcementsEditor').innerHTML = (data.announcements || []).map((a, i) => `
    <div class="row-item admin-grid three">
      <label>Type<input data-ann-type="${i}" value="${esc(a.type || a.tag || '')}"></label>
      <label>Priority<select data-ann-priority="${i}"><option ${a.priority==='high'?'selected':''}>high</option><option ${a.priority==='medium'?'selected':''}>medium</option><option ${a.priority==='low'?'selected':''}>low</option></select></label>
      <label>Active<select data-ann-active="${i}"><option value="true" ${a.active!==false?'selected':''}>true</option><option value="false" ${a.active===false?'selected':''}>false</option></select></label>
      <label class="full">Title<input data-ann-title="${i}" value="${esc(a.title)}"></label>
      <label class="full">Body<textarea data-ann-body="${i}">${esc(a.body)}</textarea></label>
      <div class="row-actions full"><button class="danger" onclick="removeAnnouncement(${i})">Remove</button></div>
    </div>`).join('');
}
window.removeAnnouncement = (i) => { data.announcements.splice(i, 1); renderAnnouncements(); };
$('addAnnouncement').onclick = () => { data.announcements.push({ type: 'Update', title: 'New Announcement', body: 'Add details here.', priority: 'medium', active: true }); renderAnnouncements(); };

function renderShoutouts() {
  $('shoutoutsEditor').innerHTML = (data.shoutouts || []).map((s, i) => `
    <div class="row-item admin-grid">
      <label>Name<input data-shout-name="${i}" value="${esc(s.name)}"></label>
      <label>Message<input data-shout-text="${i}" value="${esc(s.text)}"></label>
      <div class="row-actions full"><button class="danger" onclick="removeShoutout(${i})">Remove</button></div>
    </div>`).join('');
}
window.removeShoutout = (i) => { data.shoutouts.splice(i, 1); renderShoutouts(); };
$('addShoutout').onclick = () => { data.shoutouts.push({ name: 'Team Member', text: 'Add shout-out here.' }); renderShoutouts(); };

function renderEvents() {
  $('eventsEditor').innerHTML = (data.events || []).map((e, i) => `
    <div class="row-item admin-grid three">
      <label>Date<input data-event-date="${i}" value="${esc(e.date)}"></label>
      <label>Title<input data-event-title="${i}" value="${esc(e.title)}"></label>
      <label>Time<input data-event-time="${i}" value="${esc(e.time)}"></label>
      <div class="row-actions full"><button class="danger" onclick="removeEvent(${i})">Remove</button></div>
    </div>`).join('');
}
window.removeEvent = (i) => { data.events.splice(i, 1); renderEvents(); };
$('addEvent').onclick = () => { data.events.push({ date: 'Date', title: 'Event Title', time: 'Time' }); renderEvents(); };

function renderValues() {
  $('valuesEditor').innerHTML = (data.values || []).map((v, i) => `
    <div class="row-item admin-grid three">
      <label>Letter<input data-value-letter="${i}" value="${esc(v.letter || '')}"></label>
      <label>Word<input data-value-word="${i}" value="${esc(v.word || v || '')}"></label>
      <label>Note<input data-value-note="${i}" value="${esc(v.note || '')}"></label>
    </div>`).join('');
}

function collect() {
  data.brand = { dashboardTitle: $('brandTitle').value, subtitle: $('brandSubtitle').value };
  data.employee.month = $('empMonth').value;
  data.employee.name = $('empName').value;
  data.employee.role = $('empRole').value;
  data.employee.department = $('empDepartment').value;
  data.employee.photo = $('empPhoto').value;
  data.employee.quote = $('empQuote').value;
  data.employee.highlights = lines($('empHighlights').value);
  data.employee.stats = (data.employee.stats || []).map((_, i) => ({ value: document.querySelector(`[data-stat-value="${i}"]`).value, label: document.querySelector(`[data-stat-label="${i}"]`).value }));
  data.announcements = (data.announcements || []).map((_, i) => ({ type: document.querySelector(`[data-ann-type="${i}"]`).value, priority: document.querySelector(`[data-ann-priority="${i}"]`).value, active: document.querySelector(`[data-ann-active="${i}"]`).value === 'true', title: document.querySelector(`[data-ann-title="${i}"]`).value, body: document.querySelector(`[data-ann-body="${i}"]`).value }));
  data.shoutouts = (data.shoutouts || []).map((_, i) => ({ name: document.querySelector(`[data-shout-name="${i}"]`).value, text: document.querySelector(`[data-shout-text="${i}"]`).value }));
  data.events = (data.events || []).map((_, i) => ({ date: document.querySelector(`[data-event-date="${i}"]`).value, title: document.querySelector(`[data-event-title="${i}"]`).value, time: document.querySelector(`[data-event-time="${i}"]`).value }));
  data.values = (data.values || []).map((_, i) => ({ letter: document.querySelector(`[data-value-letter="${i}"]`).value, word: document.querySelector(`[data-value-word="${i}"]`).value, note: document.querySelector(`[data-value-note="${i}"]`).value }));
  data.ticker = lines($('tickerMessages').value);
}

$('photoUpload').onchange = () => {
  const file = $('photoUpload').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { $('empPhoto').value = reader.result; };
  reader.readAsDataURL(file);
};

$('saveBtn').onclick = async () => {
  $('saveStatus').textContent = 'Saving...';
  try {
    collect();
    const result = await api('/api/content', { method: 'POST', body: JSON.stringify(data) });
    $('saveStatus').textContent = `Saved live at ${new Date(result.savedAt).toLocaleTimeString()}`;
  } catch (error) { $('saveStatus').textContent = error.message; }
};

load().catch(() => {});
