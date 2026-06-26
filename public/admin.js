let data = null;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function getPath(obj, path){ return path.split('.').reduce((o,k)=>o?.[k], obj); }
function setPath(obj, path, val){ const keys=path.split('.'); let o=obj; keys.slice(0,-1).forEach(k=>{ if(!o[k]) o[k]={}; o=o[k]; }); o[keys.at(-1)] = val; }
function boolVal(v){ if(v === 'true') return true; if(v === 'false') return false; return v; }

async function checkSession(){
  const r = await fetch('/api/session');
  if (r.ok) return showAdmin();
  $('#loginView').classList.remove('hidden');
}

async function showAdmin(){
  $('#loginView').classList.add('hidden');
  $('#adminView').classList.remove('hidden');
  await loadData();
}

async function loadData(){
  data = await fetch('/api/content').then(r=>r.json());
  bindFields(); renderEditors();
}

function bindFields(){
  $$('[data-path]').forEach(el=>{
    const v = getPath(data, el.dataset.path);
    el.value = typeof v === 'boolean' ? String(v) : (v ?? '');
    el.oninput = () => setPath(data, el.dataset.path, boolVal(el.value));
    el.onchange = () => setPath(data, el.dataset.path, boolVal(el.value));
  });
  $$('[data-list]').forEach(el=>{
    const arr = getPath(data, el.dataset.list) || [];
    el.value = arr.join('\n');
    el.oninput = () => setPath(data, el.dataset.list, el.value.split('\n').map(x=>x.trim()).filter(Boolean));
  });
}

function itemWrap(type, i, html){
  return `<div class="item-editor" data-type="${type}" data-index="${i}"><div class="item-head"><strong>${type} #${i+1}</strong><button class="small-btn danger" data-remove="${type}" data-index="${i}">Remove</button></div>${html}</div>`;
}
function input(type,i,key,label,textarea=false){
  const val = data[type]?.[i]?.[key] ?? '';
  return `<div class="field"><label>${label}</label>${textarea?`<textarea data-arr="${type}" data-index="${i}" data-key="${key}">${esc(val)}</textarea>`:`<input data-arr="${type}" data-index="${i}" data-key="${key}" value="${esc(val)}">`}</div>`;
}
function activeSelect(type,i){
  const val = data[type]?.[i]?.active !== false;
  return `<div class="field"><label>Active</label><select data-arr="${type}" data-index="${i}" data-key="active"><option value="true" ${val?'selected':''}>Show</option><option value="false" ${!val?'selected':''}>Hide</option></select></div>`;
}

function renderEditors(){
  $('#tickerEditor').innerHTML = (data.ticker||[]).map((_,i)=> itemWrap('ticker', i, `${input('ticker',i,'text','Ticker Text',true)}<div class="field"><label>Priority</label><select data-arr="ticker" data-index="${i}" data-key="level"><option value="info">Info</option><option value="important">Important</option><option value="urgent">Urgent</option></select></div>`)).join('');
  $('#promotionsEditor').innerHTML = (data.promotions||[]).map((_,i)=> itemWrap('promotions', i, `<div class="three-col">${input('promotions',i,'icon','Icon')}${input('promotions',i,'title','Title')}${input('promotions',i,'subtitle','Subtitle')}</div>${input('promotions',i,'body','Body',true)}${activeSelect('promotions',i)}`)).join('');
  $('#whatsNewEditor').innerHTML = (data.whatsNew||[]).map((_,i)=> itemWrap('whatsNew', i, `<div class="three-col">${input('whatsNew',i,'tag','Tag')}${input('whatsNew',i,'title','Title')}${activeSelect('whatsNew',i)}</div>${input('whatsNew',i,'body','Body',true)}`)).join('');
  $('#recognitionEditor').innerHTML = (data.recognition||[]).map((_,i)=> itemWrap('recognition', i, `<div class="three-col">${input('recognition',i,'type','Type')}${input('recognition',i,'name','Name')}${activeSelect('recognition',i)}</div>${input('recognition',i,'text','Text',true)}`)).join('');
  $('#eventsEditor').innerHTML = (data.events||[]).map((_,i)=> itemWrap('events', i, `<div class="three-col">${input('events',i,'date','Date')}${input('events',i,'title','Title')}${input('events',i,'time','Time')}</div>${input('events',i,'location','Location')}${activeSelect('events',i)}`)).join('');
  $('#kpisEditor').innerHTML = (data.kpis||[]).map((_,i)=> itemWrap('kpis', i, `<div class="three-col">${input('kpis',i,'label','Label')}${input('kpis',i,'value','Value')}${input('kpis',i,'note','Note')}</div>${activeSelect('kpis',i)}`)).join('');
  $('#valuesEditor').innerHTML = (data.values||[]).map((_,i)=> itemWrap('values', i, `<div class="three-col">${input('values',i,'key','Key')}${input('values',i,'word','Word')}${input('values',i,'meaning','Meaning')}</div>`)).join('');
  $('#winsEditor').innerHTML = (data.wins||[]).map((_,i)=> itemWrap('wins', i, `${input('wins',i,'title','Title')}${activeSelect('wins',i)}<div class="field"><label>Items — one per line</label><textarea data-arr-list="wins" data-index="${i}" data-key="items">${esc((data.wins[i].items||[]).join('\n'))}</textarea></div>`)).join('');

  $$('[data-arr]').forEach(el=>{
    if (el.dataset.key === 'level') el.value = data[el.dataset.arr][el.dataset.index][el.dataset.key] || 'info';
    el.oninput = el.onchange = () => { data[el.dataset.arr][el.dataset.index][el.dataset.key] = boolVal(el.value); };
  });
  $$('[data-arr-list]').forEach(el=>{
    el.oninput = () => { data[el.dataset.arr][el.dataset.index][el.dataset.key] = el.value.split('\n').map(x=>x.trim()).filter(Boolean); };
  });
  $$('[data-remove]').forEach(btn=>btn.onclick=()=>{ data[btn.dataset.remove].splice(Number(btn.dataset.index),1); renderEditors(); });
}

function defaultItem(type){
  const map = {
    ticker:{level:'info',text:'New update goes here.'},
    promotions:{icon:'🍿',title:'New Promotion',subtitle:'LTO',body:'Add details here.',active:true},
    whatsNew:{tag:'New',title:'New Update',body:'Add details here.',active:true},
    recognition:{type:'Manager Shout-Out',name:'Team Member',text:'Add recognition here.',active:true},
    events:{date:'Date',title:'Event Title',time:'Time',location:'Location',active:true},
    kpis:{label:'Metric',value:'100%',note:'Add note',active:true},
    values:{key:'M',word:'Motivated',meaning:'Add value meaning.'},
    wins:{title:'Wins This Week',items:['Add win here'],active:true}
  };
  return map[type];
}

$$('.nav-btn').forEach(btn=>btn.onclick=()=>{
  $$('.nav-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  $$('.editor-section').forEach(s=>s.classList.toggle('active', s.dataset.section === btn.dataset.tab));
});

$$('[data-add]').forEach(btn=>btn.onclick=()=>{ const t=btn.dataset.add; data[t] = data[t] || []; data[t].push(defaultItem(t)); renderEditors(); });

$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  $('#loginStatus').textContent = 'Logging in...';
  const r = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('#username').value,password:$('#password').value})});
  if(!r.ok){ $('#loginStatus').textContent = 'Invalid login. Check Render ADMIN_USER and ADMIN_PASS.'; return; }
  $('#loginStatus').textContent = '';
  showAdmin();
};

$('#logoutBtn').onclick = async () => { await fetch('/api/logout',{method:'POST'}); location.reload(); };
$('#saveBtn').onclick = async () => {
  $('#saveStatus').textContent = 'Saving...';
  const r = await fetch('/api/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!r.ok){ $('#saveStatus').textContent = 'Unauthorized. Log out, log back in, then try again.'; return; }
  const j = await r.json();
  $('#saveStatus').textContent = `Saved & pushed live • ${new Date(j.savedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
};

checkSession();
