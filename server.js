require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

const starterData = {
  settings: {
    brandTitle: 'Cinergy Team Spotlight',
    location: 'Amarillo',
    theme: 'cinergy',
    tvMode: true,
    rotateSections: true,
    rotationSeconds: 12,
    backgroundType: 'gradient',
    backgroundVideo: '',
    backgroundImage: '',
    lastUpdatedBy: 'Management',
    lastUpdatedAt: new Date().toISOString()
  },
  ticker: [
    { level: 'info', text: 'Welcome to the team board — stay informed, stay guest-first, stay MAGICAL.' },
    { level: 'important', text: 'Check LTO talking points before each shift.' },
    { level: 'urgent', text: 'Safety first: report spills, loose cords, and guest hazards immediately.' }
  ],
  employee: {
    name: 'Employee Name',
    role: 'Games & Attractions',
    title: 'Employee of the Month',
    photo: '',
    quote: 'Guest First. Accountable. A Leader.',
    managerNote: 'This team member consistently brings positive energy, supports the team, and creates excellent guest moments.',
    achievements: [
      'Created memorable guest interactions',
      'Helped train new team members',
      'Kept the floor moving during busy weekends',
      'Modeled MAGICAL values every shift'
    ]
  },
  shiftFocus: {
    title: 'Today\'s Shift Focus',
    body: 'Fast recovery, clean areas, clear communication, and guest-first service.',
    bullets: ['Greet every guest', 'Recover high-traffic areas hourly', 'Communicate issues fast']
  },
  promotions: [
    { icon: '🍿', title: 'Featured LTO', subtitle: 'Limited Time Offer', body: 'Add the active LTO, team talking points, and upsell reminder here.', active: true },
    { icon: '🥤', title: 'Combo Push', subtitle: 'Food & Beverage', body: 'Highlight the offer the team should recommend this week.', active: true },
    { icon: '🎮', title: 'Arcade Promo', subtitle: 'Games', body: 'Post card deals, attraction promos, or redemption updates.', active: true }
  ],
  whatsNew: [
    { tag: 'Menu', title: 'New Menu Item', body: 'Add ingredients, launch date, and guest talking points.', active: true },
    { tag: 'Attractions', title: 'Updated Procedure', body: 'Add the new way of doing things in 2–3 simple steps.', active: true },
    { tag: 'Prizes', title: 'New Prize Drop', body: 'Add prize location, value tier, and merchandising notes.', active: true }
  ],
  events: [
    { date: 'This Week', title: 'Team Huddle', time: 'Before peak shifts', location: 'Back office', active: true },
    { date: 'Friday', title: 'LTO Launch Check', time: '4:00 PM', location: 'Concessions', active: true }
  ],
  recognition: [
    { type: 'Manager Shout-Out', name: 'Team Member', text: 'Great job jumping in during the rush and keeping the guest experience smooth.', active: true },
    { type: 'Guest Compliment', name: 'Guest Feedback', text: 'The team made our visit easy, fun, and memorable.', active: true }
  ],
  safety: {
    title: 'Safety Corner',
    body: 'Walk your area. Remove trip hazards. Report spills immediately. Use proper lifting technique.',
    active: true
  },
  kpis: [
    { label: 'Guest Focus', value: '96%', note: 'Goal: excellent service', active: true },
    { label: 'Game Uptime', value: '99%', note: 'Keep issues reported', active: true },
    { label: 'Recovery', value: 'Hourly', note: 'High-traffic zones', active: true },
    { label: 'Sales Focus', value: 'LTO', note: 'Recommend every time', active: true }
  ],
  values: [
    { key: 'M', word: 'Motivated', meaning: 'Bring energy and ownership to every shift.' },
    { key: 'A', word: 'Accountable', meaning: 'Own the task, the standard, and the result.' },
    { key: 'G', word: 'Guest First', meaning: 'Make every interaction easy, helpful, and memorable.' },
    { key: 'I', word: 'Informed', meaning: 'Know the updates before guests ask.' },
    { key: 'C', word: 'Committed', meaning: 'Follow through and support the team.' },
    { key: 'AL', word: 'A Leader', meaning: 'Set the example even when no one asks.' }
  ],
  wins: [
    { title: 'Wins This Week', items: ['Strong weekend recovery', 'Great guest compliments', 'Smooth attraction rotations'], active: true }
  ]
};

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/login', rateLimit({ windowMs: 60 * 1000, max: 8 }));

function readData() {
  if (!fs.existsSync(DATA_FILE)) writeData(starterData);
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Data file read error:', err);
    return starterData;
  }
}

function writeData(data) {
  const merged = { ...starterData, ...data };
  merged.settings = { ...starterData.settings, ...(data.settings || {}) };
  fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2));
}

function auth(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/api/content', (req, res) => res.json(readData()));
app.get('/api/session', auth, (req, res) => res.json({ ok: true, user: ADMIN_USER }));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || password !== ADMIN_PASS) return res.status(401).json({ error: 'Invalid login' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 12 * 60 * 60 * 1000 });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
});

app.post('/api/content', auth, (req, res) => {
  const data = req.body || {};
  data.settings = data.settings || {};
  data.settings.lastUpdatedAt = new Date().toISOString();
  data.settings.lastUpdatedBy = data.settings.lastUpdatedBy || 'Management';
  writeData(data);
  const saved = readData();
  io.emit('content:update', saved);
  res.json({ ok: true, savedAt: saved.settings.lastUpdatedAt });
});

io.on('connection', socket => {
  socket.emit('content:update', readData());
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
server.listen(PORT, () => console.log(`Cinergy Spotlight Pro running on :${PORT}`));
