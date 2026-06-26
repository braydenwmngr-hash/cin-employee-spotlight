require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

const starterData = {
  brand: {
    location: 'Texas',
    subtitle: 'Employee Spotlight + Team Command Center',
    backgroundVideo: '',
    backgroundImage: ''
  },
  ticker: [
    'Guest First energy all day.',
    'Recover fast. Communicate faster.',
    'LTO knowledge check before shift.',
    'Celebrate wins. Coach the gaps.'
  ],
  employee: {
    month: 'July 2026',
    name: 'Employee Name',
    role: 'Games & Attractions',
    photo: '',
    quote: 'Guest First. Accountable. A Leader.',
    achievements: [
      'Crushed guest service scores',
      'Helped train new team members',
      'Kept the floor moving during busy weekends'
    ]
  },
  ltos: [
    { title: 'Limited Time Offer', label: 'LTO', detail: 'Add offer details, date range, talking points, and upsell notes.', image: '', active: true },
    { title: 'Featured Combo', label: 'Food & Beverage', detail: 'Highlight the item the team should promote this week.', image: '', active: true }
  ],
  whatsNew: [
    { type: 'Menu', title: 'New Item Launch', body: 'Explain the new item, what it includes, and how to describe it to guests.' },
    { type: 'Attractions', title: 'Updated Attraction Flow', body: 'Add the top 2–3 process steps for the team.' },
    { type: 'Operations', title: 'New Way of Doing Things', body: 'Keep this short, clear, and shift-ready.' }
  ],
  birthdays: [
    { name: 'Team Member', date: 'Jul 18', type: 'Birthday' },
    { name: 'Team Member', date: 'Jul 22', type: 'Work Anniversary' }
  ],
  events: [
    { date: 'Jul 12', time: '4:00 PM', title: 'Weekend Huddle', location: 'Games Desk' },
    { date: 'Jul 18', time: '6:00 PM', title: 'LTO Push Night', location: 'Floor' }
  ],
  shoutouts: [
    { from: 'Manager', to: 'Team Member', body: 'Great recovery and guest-first attitude during a busy rush.' },
    { from: 'Guest Compliment', to: 'Team', body: 'The team made the birthday party feel easy and fun.' }
  ],
  values: ['Motivated', 'Accountable', 'Guest First', 'Informed', 'Committed', 'A Leader']
};

app.use(express.json({ limit: '6mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/login', rateLimit({ windowMs: 60 * 1000, max: 12 }));

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(starterData, null, 2));
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function tokenFromReq(req) {
  return req.cookies?.token || '';
}

function verifyUser(req) {
  const token = tokenFromReq(req);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function auth(req, res, next) {
  const user = verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/api/content', (req, res) => res.json(readData()));

app.get('/api/me', (req, res) => {
  const user = verifyUser(req);
  if (!user) return res.status(401).json({ loggedIn: false });
  res.json({ loggedIn: true, username: user.username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid login' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/'
  });
  res.json({ ok: true, username });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  res.json({ ok: true });
});

app.post('/api/content', auth, (req, res) => {
  writeData(req.body);
  io.emit('content:update', req.body);
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

app.get('/api/weather', async (req, res) => {
  const key = process.env.WEATHER_API_KEY;
  const city = process.env.WEATHER_CITY || 'Amarillo,TX,US';
  if (!key) return res.json({ available: false, city: city.split(',')[0], temp: '--', description: 'Add WEATHER_API_KEY' });
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=imperial`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather request failed');
    const json = await response.json();
    res.json({
      available: true,
      city: json.name,
      temp: Math.round(json.main.temp),
      description: json.weather?.[0]?.description || 'Current weather'
    });
  } catch (err) {
    res.json({ available: false, city: city.split(',')[0], temp: '--', description: 'Weather unavailable' });
  }
});

io.on('connection', socket => {
  socket.emit('content:update', readData());
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

server.listen(PORT, () => console.log(`Cinergy Spotlight V2 running on :${PORT}`));
