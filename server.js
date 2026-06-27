require('dotenv').config();
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'content.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const starterData = {
  settings: {
    brandTitle: 'CINERGY GAMES & ATTRACTIONS',
    subtitle: 'Team Command Center',
    theme: 'auto',
    accent: 'green',
    rotationSeconds: 12,
    tvCompact: true,
    background: { type: 'none', url: '', opacity: 0.18, blur: 10 },
    showAdminButton: true,
    lastUpdated: new Date().toISOString()
  },
  ticker: [
    { id: uid(), priority: 'important', text: 'Guest-first energy all shift. Keep attractions clean, safe, and ready.' }
  ],
  employee: {
    name: 'Employee Name',
    role: 'Games & Attractions',
    month: 'Employee of the Month',
    photo: '',
    quote: 'Motivated. Accountable. Guest First.',
    achievements: ['Delivered excellent guest service', 'Helped train new team members', 'Kept the floor moving during rushes'],
    managerNote: 'Add a short manager recognition note here.'
  },
  announcements: [
    { id: uid(), category: 'LTO', priority: 'important', title: 'New LTO Launch', summary: 'Upload the LTO flyer or type details here.', points: ['Know the offer', 'Use the correct talking points', 'Ask a manager if unsure'], startDate: '', endDate: '', active: true, fileUrl: '' },
    { id: uid(), category: 'What’s New', priority: 'normal', title: 'New Way of Doing Things', summary: 'Use this card for procedure changes and operational updates.', points: ['Keep it simple', 'Use clear steps', 'Make it team-friendly'], startDate: '', endDate: '', active: true, fileUrl: '' }
  ],
  focus: { title: 'Today’s Shift Focus', body: 'Clean area. Fast recovery. Positive energy. Guest-first service.', points: ['Greet every guest', 'Recover prizes hourly', 'Communicate issues early'] },
  recognition: [
    { id: uid(), type: 'Manager Shout-Out', name: 'Team Member', text: 'Great job helping guests and supporting the team during a busy shift.' }
  ],
  events: [
    { id: uid(), date: 'This Week', title: 'Team Updates', detail: 'Add meetings, launches, trainings, and reminders here.' }
  ],
  safety: { title: 'Safety Corner', body: 'Watch for slip hazards, use proper lifting, and report issues immediately.', points: ['Clean spills fast', 'Keep walkways clear', 'Ask for help lifting heavy items'] },
  kpis: [
    { id: uid(), label: 'Guest Energy', value: '100%' },
    { id: uid(), label: 'Floor Readiness', value: 'On Track' },
    { id: uid(), label: 'Safety Focus', value: 'Active' },
    { id: uid(), label: 'Team Goal', value: 'Win Today' }
  ],
  values: [
    { id: uid(), word: 'Motivated', detail: 'Bring energy before the rush starts.' },
    { id: uid(), word: 'Accountable', detail: 'Own your area and your guest interactions.' },
    { id: uid(), word: 'Guest First', detail: 'Make every guest feel seen, helped, and welcomed.' },
    { id: uid(), word: 'Informed', detail: 'Know the updates before guests ask.' },
    { id: uid(), word: 'Committed', detail: 'Finish strong and support the team.' },
    { id: uid(), word: 'A Leader', detail: 'Set the tone, even without a title.' }
  ],
  resources: []
};

function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }
function readJson(file, fallback){ try { if (!fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } }
function writeJson(file, data){ fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function readData(){ if (!fs.existsSync(DATA_FILE)) writeJson(DATA_FILE, starterData); return readJson(DATA_FILE, starterData); }
function writeData(data){ data.settings = data.settings || {}; data.settings.lastUpdated = new Date().toISOString(); writeJson(DATA_FILE, data); }
function audit(action, meta={}){ const rows = readJson(AUDIT_FILE, []); rows.unshift({ id: uid(), action, meta, at: new Date().toISOString() }); writeJson(AUDIT_FILE, rows.slice(0,200)); }
function adminOnly(req, res, next){ try { req.user = jwt.verify(req.cookies.cinergy_token, JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Unauthorized' }); } }
function isActive(item){ const now = new Date(); if (item.active === false) return false; if (item.startDate && new Date(item.startDate) > now) return false; if (item.endDate && new Date(item.endDate + 'T23:59:59') < now) return false; return true; }
function publicData(){ const data = readData(); return { ...data, announcements: (data.announcements || []).filter(isActive), ticker: (data.ticker || []).filter(Boolean) }; }
function safeName(name){ return String(name || 'file').replace(/[^a-z0-9._-]/gi, '-').slice(0,120); }
function smartDraftFromText(text, fileUrl){
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const title = (sentences[0] || clean.slice(0,80) || 'Imported PDF').slice(0,90);
  const summary = sentences.slice(1,3).join(' ').slice(0,260) || clean.slice(0,260) || 'Review this imported PDF and add team-facing details.';
  const words = clean.match(/[A-Za-z][A-Za-z'-]{4,}/g) || [];
  const common = [...new Set(words.map(w => w.toLowerCase()).filter(w => !['there','their','about','which','should','would','could','please','because','important','information'].includes(w)))].slice(0,3);
  const points = [
    common[0] ? `Key focus: ${common[0]}` : 'Review the attached PDF before shift.',
    common[1] ? `Team talking point: ${common[1]}` : 'Ask a manager if a guest asks for details.',
    common[2] ? `Remember: ${common[2]}` : 'Use the correct process or offer details.'
  ];
  return { id: uid(), category: 'LTO', priority: 'normal', title, summary, points, startDate: '', endDate: '', active: false, fileUrl, imported: true };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + safeName(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const ok = /pdf|image|video/.test(file.mimetype) || /\.pdf$/i.test(file.originalname);
  cb(ok ? null : new Error('Only images, videos, and PDFs are allowed'), ok);
}});

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/login', rateLimit({ windowMs: 60 * 1000, max: 10 }));

app.get('/api/content', (req,res) => res.json(publicData()));
app.get('/api/admin/content', adminOnly, (req,res) => res.json(readData()));
app.get('/api/admin/audit', adminOnly, (req,res) => res.json(readJson(AUDIT_FILE, [])));
app.get('/api/session', (req,res) => { try { jwt.verify(req.cookies.cinergy_token, JWT_SECRET); res.json({ ok:true }); } catch { res.status(401).json({ ok:false }); } });
app.post('/api/login', (req,res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || password !== ADMIN_PASS) return res.status(401).json({ error: 'Invalid login' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
  res.cookie('cinergy_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 12 * 60 * 60 * 1000 });
  audit('login', { username });
  res.json({ ok: true });
});
app.post('/api/logout', (req,res) => { res.clearCookie('cinergy_token'); res.json({ ok:true }); });
app.post('/api/admin/content', adminOnly, (req,res) => { writeData(req.body); audit('content_saved', { by: req.user.username }); io.emit('content:update', publicData()); res.json({ ok:true, savedAt: new Date().toISOString() }); });
app.post('/api/admin/reset-demo', adminOnly, (req,res) => { writeData(starterData); audit('demo_reset'); io.emit('content:update', publicData()); res.json({ ok:true }); });
app.get('/api/admin/export', adminOnly, (req,res) => { res.setHeader('Content-Disposition', 'attachment; filename="cinergy-content-backup.json"'); res.json(readData()); });
app.post('/api/admin/upload', adminOnly, upload.single('file'), async (req,res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  const resource = { id: uid(), title: req.body.title || req.file.originalname, category: req.body.category || 'Resources', url: fileUrl, mime: req.file.mimetype, originalName: req.file.originalname, createdAt: new Date().toISOString(), extractedText: '', draft: null };
  if (req.file.mimetype === 'application/pdf' || /\.pdf$/i.test(req.file.originalname)) {
    try {
      const parsed = await pdfParse(fs.readFileSync(req.file.path));
      resource.extractedText = (parsed.text || '').slice(0, 12000);
      resource.draft = smartDraftFromText(resource.extractedText, fileUrl);
    } catch (e) {
      resource.extractedText = '';
      resource.draft = smartDraftFromText('', fileUrl);
    }
  }
  const data = readData();
  data.resources = data.resources || [];
  data.resources.unshift(resource);
  writeData(data);
  audit('file_uploaded', { file: req.file.originalname, type: req.file.mimetype });
  io.emit('content:update', publicData());
  res.json({ ok:true, resource });
});

app.get('/admin', (req,res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use((req,res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

io.on('connection', socket => { socket.emit('content:update', publicData()); });
server.listen(PORT, () => console.log(`Cinergy Ops Platform running on :${PORT}`));
