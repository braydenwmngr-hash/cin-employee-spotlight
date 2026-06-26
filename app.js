const $ = id => document.getElementById(id);
function tick(){ $('clock').textContent = new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'}); } setInterval(tick,1000); tick();
async function load(){
  const data = await fetch('/api/content').then(r=>r.json());
  $('month').textContent = data.month;
  $('empName').textContent = data.employee.name;
  $('empRole').textContent = data.employee.role;
  $('quote').textContent = `“${data.employee.quote}”`;
  $('photo').innerHTML = data.employee.photo ? `<img src="${data.employee.photo}" alt="${data.employee.name}">` : '★';
  $('highlights').innerHTML = data.employee.highlights.map(x=>`<li>${x}</li>`).join('');
  $('values').innerHTML = data.values.map(x=>`<div class="value">${x}</div>`).join('');
  $('announcements').innerHTML = data.announcements.filter(a=>a.active).map(a=>`<article class="card"><span class="tag">${a.tag}</span><h3>${a.title}</h3><p>${a.body}</p></article>`).join('');
  $('ticker').textContent = data.ticker;
}
load(); setInterval(load, 30000);
