require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Server } = require('socket.io');
const { v4: uuid } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-now';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'content.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const defaultContent = {
  settings: {
    locationName: 'Cinergy Amarillo',
    boardTitle: 'Team Spotlight',
    theme: 'cinergy',
    tvMode: true,
    rotationSeconds: 12,
    backgroundVideo: '',
    backgroundImage: '',
    updatedAt: new Date().toISOString()
  },
  ticker: [
    { id: uuid(), priority: 'info', text: 'Guest First energy all shift: smile, recover, communicate, and own the moment.', active: true },
    { id: uuid(), priority: 'important', text: 'Check LTO details before clocking in so every guest gets the same message.', active: true }
  ],
  spotlight: {
    name: 'Employee Name',
    title: 'Employee of the Month',
    department: 'Games & Attractions',
    photo: '',
    quote: 'Guest First. Accountable. A Leader.',
    managerNote: 'Recognized for consistency, positive energy, and making the floor better every shift.',
    achievements: ['Crushed guest service moments', 'Helped train new team members', 'Kept the floor moving during busy weekends']
  },
  promos: [
    { id: uuid(), label: 'LTO', title: 'Featured Limited-Time Offer', body: 'Add the current LTO, dates, upsell script, and what team members need to know.', image: '', active: true },
    { id: uuid(), label: 'Promo', title: 'Weekend Push', body: 'Highlight the offer or attraction the team should focus on this weekend.', image: '', active: true }
  ],
  whatsNew: [
    { id: uuid(), type: 'New Item', title: 'New Menu / Prize Item', body: 'Add launch details, talking points, and where to find it.', active: true },
    { id: uuid(), type: 'Process', title: 'Updated Procedure', body: 'Explain the new way of doing things in 2–3 clear steps.', active: true }
  ],
  recognition: [
    { id: uuid(), from: 'Manager Team', name: 'Team Member', body: 'Thanks for jumping in, recovering fast, and helping guests with positive energy.', active: true },
    { id: uuid(), from: 'Guest Compliment', name: 'Frontline Team', body: 'The team made our visit easy, fun, and memorable.', active: true }
  ],
  events: [
    { id: uuid(), date: 'This Week', time: 'All Day', title: 'Shift Focus', location: 'All Departments', active: true },
    { id: uuid(), date: 'Friday', time: '5:00 PM', title: 'Weekend Readiness Check', location: 'Games Floor', active: true }
  ],
  safety: { title: 'Safety Corner', body: 'Keep walkways clear, communicate spills immediately, and use proper lifting form.', active: true },
  kpis: [
    { id: uuid(), label: 'Guest Energy', value: 'A+', note: 'Every interaction matters', active: true },
    { id: uuid(), label: 'Recovery', value: 'Hourly', note: 'Reset before rushes', active: true },
    { id: uuid(), label: 'Communication', value: 'Fast', note: 'Radio early', active: true }
  ],
  magical: [
    { id: uuid(), letter: 'M', word: 'Motivated', note: 'Bring energy to the shift.' },
    { id: uuid(), letter: 'A', word: 'Accountable', note: 'Own the result.' },
    { id: uuid(), letter: 'G', word: 'Guest First', note: 'Make it easy and memorable.' },
    { id: uuid(), letter: 'I', word: 'Informed', note: 'Know the current info.' },
    { id: uuid(), letter: 'C', word: 'Committed', note: 'Finish strong.' },
    { id: uuid(), letter: 'AL', word: 'A Leader', note: 'Set the tone.' }
  ]
};

function safeRead() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultContent, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    const backup = `${DB_FILE}.broken-${Date.now()}`;
    fs.copyFileSync(DB_FILE, backup);
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultContent, null, 2));
    return defaultContent;
  }
}

function safeWrite(content) {
  content.settings = content.settings || {};
  content.settings.updatedAt = new Date().toISOString();
  const temp = `${DB_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(content, null, 2));
  fs.renameSync(temp, DB_FILE);
  return content;
}

function auth(req, res, next) {
  try {
    const token = req.cookies.cinergy_admin;
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${uuid()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/api/login', rateLimit({ windowMs: 60 * 1000, max: 10 }));

app.get('/api/content', (req, res) => res.json(safeRead()));
app.get('/api/session', auth, (req, res) => res.json({ ok: true, user: req.user.username }));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || password !== ADMIN_PASS) return res.status(401).json({ error: 'Invalid login' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
  res.cookie('cinergy_admin', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 12 * 60 * 60 * 1000 });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('cinergy_admin', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
});

app.post('/api/content', auth, (req, res) => {
  const saved = safeWrite(req.body);
  io.emit('content:update', saved);
  res.json({ ok: true, content: saved });
});

app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const file = { url: `/uploads/${req.file.filename}`, name: req.file.originalname, type: req.file.mimetype, size: req.file.size };
  io.emit('media:uploaded', file);
  res.json({ ok: true, file });
});

app.get('/api/media', auth, (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR).map(name => ({ name, url: `/uploads/${name}` })).sort((a,b)=>b.name.localeCompare(a.name));
  res.json(files);
});

io.on('connection', socket => {
  socket.emit('content:update', safeRead());
});

const dist = path.join(__dirname, 'dist');
if (fs.existsSync(dist)) app.use(express.static(dist));
app.use((req, res) => {
  const index = path.join(dist, 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(200).send('Run npm install && npm run build, then npm start.');
});

server.listen(PORT, () => console.log(`Cinergy Spotlight production app running on :${PORT}`));
