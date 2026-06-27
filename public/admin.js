let data = null;
const $ = id => document.getElementById(id);
const qsa = s => [...document.querySelectorAll(s)];
qsa('nav button').forEach(btn=>btn.onclick=()=>showTab(btn.dataset.tab));
$('loginBtn').onclick = login; $('logoutBtn').onclick = logout; $('saveBtn').onclick = save; $('addAnnBtn').onclick = addAnn; $('uploadBtn').onclick = upload; $('resetBtn').onclick = resetDemo;
checkSession();
async function checkSession(){ const r = await fetch('/api/session'); if(r.ok) loadAdmin(); else showLogin(); }
function showLogin(){ $('loginPanel').hidden=false; $('adminPanel').hidden=true; }
async function login(){ const r = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('loginUser').value,password:$('loginPass').value})}); if(!r.ok){$('loginMsg').textContent='Invalid login';return;} loadAdmin(); }
async function logout(){ await fetch('/api/logout',{method:'POST'}); location.reload(); }
async function loadAdmin(){ $('loginPanel').hidden=true; $('adminPanel').hidden=false; const r=await fetch('/api/admin/content'); if(!r.ok){showLogin();return;} data=await r.json(); fill(); loadAudit(); }
function showTab(tab){ qsa('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); qsa('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+tab)); $('adminTitle').textContent = tab[0].toUpperCase()+tab.slice(1); }
function fill(){
  $('statusBox').innerHTML = `<p>Active announcements: ${(data.announcements||[]).length}</p><p>Resources/PDFs: ${(data.resources||[]).length}</p><p>Theme: ${(data.settings||{}).theme}</p><p>Last updated: ${data.settings?.lastUpdated ? new Date(data.settings.lastUpdated).toLocaleString() : 'Not yet'}</p>`;
  const f=data.focus||{}; $('focusTitleInput').value=f.title||''; $('focusBodyInput').value=f.body||''; $('focusPointsInput').value=(f.points||[]).join('\n');
  $('recognitionInput').value=(data.recognition||[]).map(r=>`${r.name||''} | ${r.text||''}`).join('\n');
  $('eventsInput').value=(data.events||[]).map(e=>`${e.date||''} | ${e.title||''} | ${e.detail||''}`).join('\n');
  const e=data.employee||{}; $('empNameInput').value=e.name||''; $('empRoleInput').value=e.role||''; $('empMonthInput').value=e.month||''; $('empPhotoInput').value=e.photo||''; $('empQuoteInput').value=e.quote||''; $('empAchievementsInput').value=(e.achievements||[]).join('\n'); $('managerNoteInput').value=e.managerNote||'';
  renderAnnouncements(); renderResources();
  const s=data.settings||{}; $('brandInput').value=s.brandTitle||''; $('subInput').value=s.subtitle||''; $('themeInput').value=s.theme||'auto'; $('bgUrlInput').value=s.background?.url||''; $('bgTypeInput').value=s.background?.type||'none'; $('bgOpacityInput').value=s.background?.opacity??.18;
  $('tickerInput').value=(data.ticker||[]).map(t=>`${t.priority||'normal'} | ${t.text||''}`).join('\n'); $('safetyTitleInput').value=data.safety?.title||''; $('safetyBodyInput').value=data.safety?.body||'';
}
function collect(){
  data.focus={title:$('focusTitleInput').value,body:$('focusBodyInput').value,points:lines($('focusPointsInput').value)};
  data.recognition=lines($('recognitionInput').value).map(l=>{const [name,...rest]=l.split('|'); return {id:uid(),type:'Recognition',name:name.trim(),text:rest.join('|').trim()};});
  data.events=lines($('eventsInput').value).map(l=>{const [date,title,...rest]=l.split('|'); return {id:uid(),date:(date||'').trim(),title:(title||'').trim(),detail:rest.join('|').trim()};});
  data.employee={name:$('empNameInput').value,role:$('empRoleInput').value,month:$('empMonthInput').value,photo:$('empPhotoInput').value,quote:$('empQuoteInput').value,achievements:lines($('empAchievementsInput').value),managerNote:$('managerNoteInput').value};
  data.announcements = qsa('.ann-edit').map(el=>({id:el.dataset.id||uid(), category:el.querySelector('.ann-category').value, priority:el.querySelector('.ann-priority').value, title:el.querySelector('.ann-title').value, summary:el.querySelector('.ann-summary').value, points:lines(el.querySelector('.ann-points').value), startDate:el.querySelector('.ann-start').value, endDate:el.querySelector('.ann-end').value, active:el.querySelector('.ann-active').checked, fileUrl:el.querySelector('.ann-file').value}));
  data.settings=data.settings||{}; data.settings.brandTitle=$('brandInput').value; data.settings.subtitle=$('subInput').value; data.settings.theme=$('themeInput').value; data.settings.background={type:$('bgTypeInput').value,url:$('bgUrlInput').value,opacity:Number($('bgOpacityInput').value),blur:10}; data.settings.showAdminButton=true;
  data.ticker=lines($('tickerInput').value).map(l=>{const [priority,...rest]=l.split('|'); return {id:uid(),priority:(priority||'normal').trim(),text:rest.join('|').trim()||priority};});
  data.safety={title:$('safetyTitleInput').value,body:$('safetyBodyInput').value,points:[]};
}
async function save(){ collect(); const r=await fetch('/api/admin/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); if(!r.ok){alert('Save failed. You may need to log in again.'); return;} alert('Saved and pushed live!'); loadAdmin(); }
function renderAnnouncements(){ $('annEditor').innerHTML=(data.announcements||[]).map(a=>annHtml(a)).join(''); qsa('.remove-ann').forEach(b=>b.onclick=()=>{b.closest('.ann-edit').remove();}); }
function annHtml(a={}){ return `<div class="ann-edit" data-id="${a.id||uid()}"><div class="row"><input class="ann-category" value="${esc(a.category||'LTO')}" placeholder="Category"><select class="ann-priority"><option ${sel(a.priority,'normal')}>normal</option><option ${sel(a.priority,'important')}>important</option><option ${sel(a.priority,'urgent')}>urgent</option></select><label><input class="ann-active" type="checkbox" ${a.active!==false?'checked':''}> Active</label></div><input class="ann-title" value="${esc(a.title||'')}" placeholder="Title"><textarea class="ann-summary" placeholder="Summary">${esc(a.summary||'')}</textarea><textarea class="ann-points" placeholder="Talking points, one per line">${esc((a.points||[]).join('\n'))}</textarea><div class="row"><input class="ann-start" type="date" value="${a.startDate||''}"><input class="ann-end" type="date" value="${a.endDate||''}"><input class="ann-file" value="${esc(a.fileUrl||'')}" placeholder="PDF/media URL"></div><button type="button" class="remove-ann">Remove</button></div>`; }
function addAnn(){ $('annEditor').insertAdjacentHTML('beforeend',annHtml({category:'LTO',priority:'normal',active:true,points:[]})); qsa('.remove-ann').forEach(b=>b.onclick=()=>{b.closest('.ann-edit').remove();}); }
async function upload(){ const file=$('fileInput').files[0]; if(!file){alert('Choose a file first'); return;} const fd=new FormData(); fd.append('file',file); fd.append('title',$('fileTitle').value || file.name); fd.append('category',$('fileCategory').value); $('uploadMsg').textContent='Uploading...'; const r=await fetch('/api/admin/upload',{method:'POST',body:fd}); const j=await r.json(); if(!r.ok){$('uploadMsg').textContent=j.error||'Upload failed';return;} $('uploadMsg').textContent='Uploaded!'; await loadAdmin(); if(j.resource?.draft){ data.announcements.unshift(j.resource.draft); renderAnnouncements(); showTab('announcements'); alert('PDF text was imported. A draft announcement was added at the top. Review it, activate it, then Save & Push Live.'); } }
function renderResources(){ $('resourceList').innerHTML=(data.resources||[]).map(r=>`<div class="library-card"><strong>${esc(r.title)}</strong><p>${esc(r.category)} • ${esc(r.mime)}</p><a class="file-link" href="${r.url}" target="_blank">Open File</a><button type="button" onclick="copyUrl('${r.url}')">Copy URL</button>${r.extractedText?`<pre>${esc(r.extractedText.slice(0,1000))}</pre>`:''}</div>`).join(''); }
window.copyUrl = url => { navigator.clipboard.writeText(url); alert('Copied: '+url); };
async function loadAudit(){ const r=await fetch('/api/admin/audit'); if(!r.ok)return; const rows=await r.json(); $('auditList').innerHTML=rows.slice(0,20).map(a=>`<p>${new Date(a.at).toLocaleString()} — ${esc(a.action)}</p>`).join(''); }
async function resetDemo(){ if(!confirm('Reset demo content?')) return; await fetch('/api/admin/reset-demo',{method:'POST'}); loadAdmin(); }
function lines(v){ return String(v||'').split('\n').map(x=>x.trim()).filter(Boolean); }
function uid(){ return Math.random().toString(36).slice(2,10); }
function esc(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function sel(a,b){ return (a||'normal')===b?'selected':''; }
