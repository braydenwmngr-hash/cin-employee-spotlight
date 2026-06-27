const { useEffect, useMemo, useState } = React;
const { createRoot } = ReactDOM;

const socket = io();
const empty = v => Array.isArray(v) ? v.filter(x => x?.active !== false) : [];
const uid = () => Math.random().toString(36).slice(2, 10);

function useContent() {
  const [content, setContent] = useState(null);
  useEffect(() => {
    fetch('/api/content').then(r => r.json()).then(setContent);
    socket.on('content:update', setContent);
    return () => socket.off('content:update', setContent);
  }, []);
  return [content, setContent];
}

function Board() {
  const [content] = useContent();
  const [slide, setSlide] = useState(0);
  const [clock, setClock] = useState(new Date());
  const [showAdmin, setShowAdmin] = useState(true);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!content?.settings?.rotationSeconds) return;
    const t = setInterval(() => setSlide(s => (s + 1) % 4), content.settings.rotationSeconds * 1000);
    return () => clearInterval(t);
  }, [content?.settings?.rotationSeconds]);
  useEffect(() => {
    const onMove = () => { setShowAdmin(true); clearTimeout(window.__adm); window.__adm = setTimeout(() => setShowAdmin(false), 5500); };
    onMove(); window.addEventListener('mousemove', onMove); window.addEventListener('touchstart', onMove);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('touchstart', onMove); };
  }, []);
  if (!content) return <div className="loading">Loading Cinergy Spotlight…</div>;
  const { settings, spotlight, safety } = content;
  const tickerText = empty(content.ticker).map(t => `${t.priority?.toUpperCase() || 'INFO'} • ${t.text}`).join('   ✦   ');
  const activeValue = content.magical?.[clock.getSeconds() % (content.magical?.length || 1)] || {};
  return <main className="board">
    {settings.backgroundVideo ? <video className="bg-media" src={settings.backgroundVideo} autoPlay muted loop playsInline /> : null}
    {settings.backgroundImage ? <div className="bg-media image" style={{ backgroundImage:`url(${settings.backgroundImage})` }} /> : null}
    <div className="ambient"></div>
    <header className="ticker"><strong>LIVE TEAM WIRE</strong><span>{tickerText || 'No active announcements.'}</span></header>
    <section className="topbar">
      <div><p className="eyebrow">{settings.locationName}</p><h1>{settings.boardTitle}</h1></div>
      <div className="time"><b>{clock.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</b><span>{clock.toLocaleDateString([], {weekday:'long', month:'short', day:'numeric'})}</span></div>
    </section>
    <section className="grid">
      <article className="hero card">
        <div className="photo">{spotlight.photo ? <img src={spotlight.photo} /> : <span>🏆</span>}</div>
        <div className="hero-text"><p className="eyebrow">{spotlight.title}</p><h2>{spotlight.name}</h2><h3>{spotlight.department}</h3><blockquote>“{spotlight.quote}”</blockquote><p>{spotlight.managerNote}</p><ul>{(spotlight.achievements||[]).map((a,i)=><li key={i}>{a}</li>)}</ul></div>
      </article>
      <aside className="right-stack">
        {slide === 0 && <Panel title="LTO + Promotions" items={empty(content.promos)} mode="promo" />}
        {slide === 1 && <Panel title="What’s New" items={empty(content.whatsNew)} mode="new" />}
        {slide === 2 && <Panel title="Recognition Wall" items={empty(content.recognition)} mode="recognition" />}
        {slide === 3 && <Panel title="Team Resources" items={empty(content.resources)} mode="resource" />}
      </aside>
      <section className="bottom-row">
        <Mini title="Upcoming / Shift Focus" items={empty(content.events).slice(0,3).map(e => `${e.date} ${e.time} — ${e.title}`)} />
        <article className="card value"><p className="eyebrow">MAGICAL VALUE</p><h2><span>{activeValue.letter}</span> {activeValue.word}</h2><p>{activeValue.note}</p></article>
        <article className="card safety"><p className="eyebrow">{safety?.title}</p><p>{safety?.body}</p></article>
        <Mini title="KPI Snapshot" items={empty(content.kpis).slice(0,3).map(k => `${k.label}: ${k.value}`)} />
      </section>
    </section>
    <footer>Updated {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'recently'} • Live updates enabled</footer>
    <a className={`admin-fab ${showAdmin ? 'show' : ''}`} href="/admin">Admin</a>
  </main>
}
function Panel({title, items, mode}) { return <article className="card panel"><p className="eyebrow">{title}</p>{items.slice(0,3).map((it,i)=><div className={`panel-item ${mode}`} key={it.id||i}>{it.image ? <img src={it.image}/> : <div className="icon">{mode==='promo'?'🍿':mode==='recognition'?'⭐':mode==='resource'?'📄':'🆕'}</div>}<div><b>{it.label || it.type || it.name || it.from}</b><h3>{it.title || it.name}</h3><p>{it.body}</p>{it.file ? <a className="resource-link" href={it.file} target="_blank" rel="noreferrer">Open PDF / File</a> : null}</div></div>)}</article>}
function Mini({title, items}) { return <article className="card mini"><p className="eyebrow">{title}</p>{items.map((x,i)=><div key={i} className="mini-line">{x}</div>)}</article>}

function Login({onLogin}) { const [u,setU]=useState('admin'), [p,setP]=useState(''), [err,setErr]=useState(''); async function submit(e){e.preventDefault(); setErr(''); const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})}); if(r.ok) onLogin(); else setErr('Invalid login. Check ADMIN_USER and ADMIN_PASS in Render.');} return <div className="admin-shell login"><form onSubmit={submit} className="login-card"><h1>Cinergy CMS</h1><p>Manage the live employee spotlight board.</p><input value={u} onChange={e=>setU(e.target.value)} placeholder="Username"/><input value={p} onChange={e=>setP(e.target.value)} placeholder="Password" type="password"/><button>Log In</button>{err && <em>{err}</em>}<a href="/">Back to board</a></form></div> }

function Admin() {
  const [content, setContent] = useContent(); const [authed,setAuthed]=useState(null); const [status,setStatus]=useState(''); const [tab,setTab]=useState('Spotlight');
  useEffect(()=>{fetch('/api/session').then(r=>setAuthed(r.ok));},[]);
  if (authed === false) return <Login onLogin={()=>setAuthed(true)} />;
  if (!content) return <div className="loading">Loading CMS…</div>;
  async function save(){setStatus('Saving…'); const r=await fetch('/api/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(content)}); setStatus(r.ok?'Saved & pushed live ✅':'Unauthorized — log out/in again'); if(r.ok){const j=await r.json(); setContent(j.content)}}
  async function logout(){await fetch('/api/logout',{method:'POST'}); location.href='/admin';}
  async function upload(file, cb){ if(!file) return; const fd=new FormData(); fd.append('file',file); const r=await fetch('/api/upload',{method:'POST',body:fd}); const j=await r.json(); if(j.file) cb(j.file.url, j.file); else alert(j.error || 'Upload failed'); }
  const tabs = ['Spotlight','Ticker','Promos','What’s New','Recognition','Events','Resources / PDFs','Safety + KPIs','Settings'];
  return <div className="cms"><aside><h2>Cinergy CMS</h2>{tabs.map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}<button onClick={save} className="save">Save & Push Live</button><button onClick={logout}>Log Out</button><a href="/">View Board</a><p>{status}</p></aside><section className="editor"><h1>{tab}</h1>{tab==='Spotlight'&&<SpotlightEditor c={content} set={setContent} upload={upload}/>} {tab==='Ticker'&&<ListEditor c={content} set={setContent} field="ticker" fields={['priority','text']}/>} {tab==='Promos'&&<ListEditor c={content} set={setContent} field="promos" fields={['label','title','body','image']} upload={upload}/>} {tab==='What’s New'&&<ListEditor c={content} set={setContent} field="whatsNew" fields={['type','title','body']}/>} {tab==='Recognition'&&<ListEditor c={content} set={setContent} field="recognition" fields={['from','name','body']}/>} {tab==='Events'&&<ListEditor c={content} set={setContent} field="events" fields={['date','time','title','location']}/>} {tab==='Resources / PDFs'&&<ListEditor c={content} set={setContent} field="resources" fields={['type','title','body','file']} upload={upload}/>} {tab==='Safety + KPIs'&&<SafetyKpis c={content} set={setContent}/>} {tab==='Settings'&&<Settings c={content} set={setContent} upload={upload}/>}</section><section className="preview"><BoardPreview content={content}/></section></div>
}
function update(set, fn){ set(c=>{const n=structuredClone(c); fn(n); return n;});}
function Field({label,value,onChange,textarea}){return <label>{label}{textarea?<textarea value={value||''} onChange={e=>onChange(e.target.value)}/>:<input value={value||''} onChange={e=>onChange(e.target.value)}/>}</label>}
function SpotlightEditor({c,set,upload}){const s=c.spotlight; return <div className="form-grid"><Field label="Name" value={s.name} onChange={v=>update(set,n=>n.spotlight.name=v)}/><Field label="Title" value={s.title} onChange={v=>update(set,n=>n.spotlight.title=v)}/><Field label="Department" value={s.department} onChange={v=>update(set,n=>n.spotlight.department=v)}/><Field label="Quote" value={s.quote} onChange={v=>update(set,n=>n.spotlight.quote=v)}/><Field label="Manager Note" value={s.managerNote} textarea onChange={v=>update(set,n=>n.spotlight.managerNote=v)}/><label>Photo Upload<input type="file" accept="image/*" onChange={e=>upload(e.target.files[0],url=>update(set,n=>n.spotlight.photo=url))}/></label><Field label="Achievements, one per line" value={(s.achievements||[]).join('\n')} textarea onChange={v=>update(set,n=>n.spotlight.achievements=v.split('\n').filter(Boolean))}/></div>}
function ListEditor({c,set,field,fields,upload}){const list=c[field]||[]; return <div>{list.map((item,i)=><div className="edit-card" key={item.id||i}><label className="check"><input type="checkbox" checked={item.active!==false} onChange={e=>update(set,n=>n[field][i].active=e.target.checked)}/> Active</label>{fields.map(f=><Field key={f} label={f} value={item[f]} textarea={f==='body'||f==='text'} onChange={v=>update(set,n=>n[field][i][f]=v)}/>)}{fields.includes('image')&&upload?<label>Upload image/video<input type="file" accept="image/*,video/*" onChange={e=>upload(e.target.files[0],url=>update(set,n=>n[field][i].image=url))}/></label>:null}{fields.includes('file')&&upload?<label>Upload PDF / file<input type="file" accept="application/pdf,image/*,video/*" onChange={e=>upload(e.target.files[0],url=>update(set,n=>n[field][i].file=url))}/></label>:null}<button onClick={()=>update(set,n=>n[field].splice(i,1))}>Remove</button></div>)}<button onClick={()=>update(set,n=>{ if(!n[field]) n[field]=[]; n[field].push({id:uid(),active:true})})}>+ Add Item</button></div>}
function SafetyKpis({c,set}){return <><div className="edit-card"><Field label="Safety Title" value={c.safety?.title} onChange={v=>update(set,n=>n.safety.title=v)}/><Field label="Safety Body" value={c.safety?.body} textarea onChange={v=>update(set,n=>n.safety.body=v)}/></div><ListEditor c={c} set={set} field="kpis" fields={['label','value','note']}/><ListEditor c={c} set={set} field="magical" fields={['letter','word','note']}/></>}
function Settings({c,set,upload}){return <div className="form-grid"><Field label="Location Name" value={c.settings.locationName} onChange={v=>update(set,n=>n.settings.locationName=v)}/><Field label="Board Title" value={c.settings.boardTitle} onChange={v=>update(set,n=>n.settings.boardTitle=v)}/><Field label="Rotation Seconds" value={c.settings.rotationSeconds} onChange={v=>update(set,n=>n.settings.rotationSeconds=Number(v)||12)}/><Field label="Background Image URL" value={c.settings.backgroundImage} onChange={v=>update(set,n=>n.settings.backgroundImage=v)}/><label>Upload Background Image<input type="file" accept="image/*" onChange={e=>upload(e.target.files[0],url=>update(set,n=>n.settings.backgroundImage=url))}/></label><Field label="Background Video URL" value={c.settings.backgroundVideo} onChange={v=>update(set,n=>n.settings.backgroundVideo=v)}/><label>Upload Background Video<input type="file" accept="video/*" onChange={e=>upload(e.target.files[0],url=>update(set,n=>n.settings.backgroundVideo=url))}/></label></div>}
function BoardPreview(){return <div className="mini-preview"><p>Live preview updates after Save. Use “View Board” for full TV mode.</p></div>}
function App(){return location.pathname.startsWith('/admin')?<Admin/>:<Board/>}

createRoot(document.getElementById('root')).render(<App />);
