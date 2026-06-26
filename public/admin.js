const $ = id => document.getElementById(id); let data;
function tick(){ $('clock').textContent = new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'}); } setInterval(tick,1000); tick();
async function fetchData(){ data = await fetch('/api/content').then(r=>r.json()); fill(); }
function fill(){
  $('month').value=data.month; $('empName').value=data.employee.name; $('empRole').value=data.employee.role; $('photo').value=data.employee.photo || ''; $('quote').value=data.employee.quote;
  $('highlights').value=data.employee.highlights.join('\n'); $('values').value=data.values.join('\n'); $('ticker').value=data.ticker;
  renderAnnouncements();
}
function renderAnnouncements(){
  $('annEditor').innerHTML = data.announcements.map((a,i)=>`<div class="annItem"><label>Tag<input data-i="${i}" data-k="tag" value="${a.tag}"></label><label>Title<input data-i="${i}" data-k="title" value="${a.title}"></label><label>Body<textarea data-i="${i}" data-k="body">${a.body}</textarea></label><label><input type="checkbox" data-i="${i}" data-k="active" ${a.active?'checked':''}> Active on board</label><button onclick="removeAnn(${i})">Remove</button></div>`).join('');
}
window.removeAnn = i => { data.announcements.splice(i,1); renderAnnouncements(); };
$('addAnn').onclick = () => { data.announcements.push({tag:'Update',title:'New Announcement',body:'Details go here.',active:true}); renderAnnouncements(); };
$('loginBtn').onclick = async () => {
  const res = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('username').value,password:$('password').value})});
  if(!res.ok){ $('loginMsg').textContent='Invalid login.'; return; }
  $('loginBox').hidden=true; $('editor').hidden=false; fetchData();
};
$('logout').onclick = async () => { await fetch('/api/logout',{method:'POST'}); location.reload(); };
$('saveBtn').onclick = async () => {
  document.querySelectorAll('[data-i]').forEach(el=>{ const i=+el.dataset.i,k=el.dataset.k; data.announcements[i][k]=el.type==='checkbox'?el.checked:el.value; });
  data.month=$('month').value; data.employee.name=$('empName').value; data.employee.role=$('empRole').value; data.employee.photo=$('photo').value; data.employee.quote=$('quote').value;
  data.employee.highlights=$('highlights').value.split('\n').map(x=>x.trim()).filter(Boolean); data.values=$('values').value.split('\n').map(x=>x.trim()).filter(Boolean); data.ticker=$('ticker').value;
  const res = await fetch('/api/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  $('saveMsg').textContent = res.ok ? 'Saved. The board will update on other computers within 30 seconds, or immediately on refresh.' : 'Save failed. Log in again.';
};
