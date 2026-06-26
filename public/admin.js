const $ = id => document.getElementById(id);
let data = null;

const defaults = {
  brand: { subtitle: '', backgroundVideo: '', backgroundImage: '' },
  ticker: [], employee: { month:'', name:'', role:'', photo:'', quote:'', achievements:[] },
  ltos: [], whatsNew: [], birthdays: [], events: [], shoutouts: [], values: []
};

async function checkAuth() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('not logged in');
    showEditor();
  } catch {
    showLogin();
  }
}

function showLogin(msg = '') {
  $('loginPanel').classList.remove('hidden');
  $('editorPanel').classList.add('hidden');
  $('logoutBtn').style.display = 'none';
  $('loginMsg').textContent = msg;
}

async function showEditor() {
  $('loginPanel').classList.add('hidden');
  $('editorPanel').classList.remove('hidden');
  $('logoutBtn').style.display = 'inline-block';
  await loadContent();
}

async function login() {
  $('loginMsg').textContent = 'Logging in...';
  const res = await fetch('/api/login', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: $('username').value.trim(), password: $('password').value })
  });
  if (!res.ok) {
    $('loginMsg').textContent = 'Invalid login. Check ADMIN_USER and ADMIN_PASS in Render.';
    return;
  }
  $('password').value = '';
  await showEditor();
}

async function logout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  data = null;
  showLogin('Logged out.');
}

async function loadContent() {
  const res = await fetch('/api/content');
  data = mergeDefaults(await res.json());
  fillForm();
}

function mergeDefaults(raw) {
  return { ...defaults, ...raw, brand: { ...defaults.brand, ...(raw.brand || {}) }, employee: { ...defaults.employee, ...(raw.employee || {}) } };
}

function fillForm() {
  $('brandSubtitle').value = data.brand.subtitle || '';
  $('backgroundVideo').value = data.brand.backgroundVideo || '';
  $('backgroundImage').value = data.brand.backgroundImage || '';
  $('ticker').value = (data.ticker || []).join('\n');
  $('empMonth').value = data.employee.month || '';
  $('empNameInput').value = data.employee.name || '';
  $('empRole').value = data.employee.role || '';
  $('empPhotoInput').value = data.employee.photo || '';
  $('empQuoteInput').value = data.employee.quote || '';
  $('achievementsInput').value = (data.employee.achievements || []).join('\n');
  $('valuesInput').value = (data.values || []).join('\n');

  renderRepeater('ltosEditor', data.ltos, [
    ['label','Label'], ['title','Title'], ['detail','Details','textarea'], ['image','Image URL'], ['active','Active','checkbox']
  ]);
  renderRepeater('whatsNewEditor', data.whatsNew, [
    ['type','Type'], ['title','Title'], ['body','Body','textarea']
  ]);
  renderRepeater('birthdaysEditor', data.birthdays, [
    ['type','Type'], ['name','Name'], ['date','Date']
  ]);
  renderRepeater('eventsEditor', data.events, [
    ['date','Date'], ['time','Time'], ['title','Title'], ['location','Location']
  ]);
  renderRepeater('shoutoutsEditor', data.shoutouts, [
    ['from','From'], ['to','To'], ['body','Body','textarea']
  ]);
}

function renderRepeater(containerId, items, fields) {
  const container = $(containerId);
  container.innerHTML = (items || []).map((item, index) => `
    <div class="repeat-card" data-index="${index}">
      ${fields.map(([key,label,type]) => fieldHtml(containerId, index, key, label, type, item[key])).join('')}
      <button type="button" class="ghost-btn remove-btn" onclick="removeItem('${containerId}', ${index})">Remove</button>
    </div>
  `).join('');
}

function fieldHtml(containerId, index, key, label, type, value) {
  const id = `${containerId}_${index}_${key}`;
  if (type === 'textarea') return `<label class="full">${label}<textarea id="${id}" rows="3">${escapeHtml(value || '')}</textarea></label>`;
  if (type === 'checkbox') return `<label>${label}<select id="${id}"><option value="true" ${value !== false ? 'selected' : ''}>Yes</option><option value="false" ${value === false ? 'selected' : ''}>No</option></select></label>`;
  return `<label>${label}<input id="${id}" value="${escapeAttr(value || '')}" /></label>`;
}

window.removeItem = function(containerId, index) {
  const key = keyForContainer(containerId);
  data[key].splice(index, 1);
  fillForm();
}

function keyForContainer(containerId) {
  return ({ ltosEditor:'ltos', whatsNewEditor:'whatsNew', birthdaysEditor:'birthdays', eventsEditor:'events', shoutoutsEditor:'shoutouts' })[containerId];
}

function readRepeater(containerId, fields) {
  const key = keyForContainer(containerId);
  return (data[key] || []).map((_, index) => {
    const obj = {};
    fields.forEach(([field,,type]) => {
      const el = $(`${containerId}_${index}_${field}`);
      obj[field] = type === 'checkbox' ? el.value === 'true' : el.value;
    });
    return obj;
  });
}

function collectData() {
  data.brand.subtitle = $('brandSubtitle').value;
  data.brand.backgroundVideo = $('backgroundVideo').value;
  data.brand.backgroundImage = $('backgroundImage').value;
  data.ticker = lines($('ticker').value);
  data.employee.month = $('empMonth').value;
  data.employee.name = $('empNameInput').value;
  data.employee.role = $('empRole').value;
  data.employee.photo = $('empPhotoInput').value;
  data.employee.quote = $('empQuoteInput').value;
  data.employee.achievements = lines($('achievementsInput').value);
  data.values = lines($('valuesInput').value);
  data.ltos = readRepeater('ltosEditor', [['label'],['title'],['detail','', 'textarea'],['image'],['active','', 'checkbox']]);
  data.whatsNew = readRepeater('whatsNewEditor', [['type'],['title'],['body','', 'textarea']]);
  data.birthdays = readRepeater('birthdaysEditor', [['type'],['name'],['date']]);
  data.events = readRepeater('eventsEditor', [['date'],['time'],['title'],['location']]);
  data.shoutouts = readRepeater('shoutoutsEditor', [['from'],['to'],['body','', 'textarea']]);
  return data;
}

async function save() {
  $('saveMsg').textContent = 'Saving...';
  const res = await fetch('/api/content', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(collectData())
  });
  if (res.status === 401) {
    $('saveMsg').textContent = 'Unauthorized. Log out, log back in, then save again.';
    showLogin('Session expired. Please log back in.');
    return;
  }
  if (!res.ok) { $('saveMsg').textContent = 'Save failed.'; return; }
  const out = await res.json();
  $('saveMsg').textContent = `Saved live at ${new Date(out.savedAt).toLocaleTimeString()}`;
}

function lines(value) { return value.split('\n').map(x => x.trim()).filter(Boolean); }
function escapeHtml(str) { return String(str || '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }
function escapeAttr(str) { return escapeHtml(str).replace(/`/g, '&#96;'); }

$('loginBtn').addEventListener('click', login);
$('password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('logoutBtn').addEventListener('click', logout);
$('saveBtn').addEventListener('click', save);

$('addLto').addEventListener('click', () => { data.ltos.push({ label:'LTO', title:'New Promo', detail:'Details here', image:'', active:true }); fillForm(); });
$('addNew').addEventListener('click', () => { data.whatsNew.push({ type:'Update', title:'New Update', body:'Details here' }); fillForm(); });
$('addBirthday').addEventListener('click', () => { data.birthdays.push({ type:'Birthday', name:'Team Member', date:'Date' }); fillForm(); });
$('addEvent').addEventListener('click', () => { data.events.push({ date:'Date', time:'Time', title:'Event', location:'Location' }); fillForm(); });
$('addShoutout').addEventListener('click', () => { data.shoutouts.push({ from:'Manager', to:'Team Member', body:'Shout-out details' }); fillForm(); });

checkAuth();
