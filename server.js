require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  '/api/login',
  rateLimit({
    windowMs: 60 * 1000,
    max: 8
  })
);

const starterData = {
  month: 'July 2026',
  employee: {
    name: 'Employee Name',
    role: 'Games & Attractions',
    photo: '',
    quote: 'Guest First. Accountable. A Leader.',
    highlights: [
      'Crushed guest service scores',
      'Helped train new team members',
      'Kept the floor moving during busy weekends'
    ]
  },
  announcements: [
    {
      tag: 'LTO',
      title: 'New Limited Time Offer',
      body: 'Add the newest LTO details here so the team sees it before shift.',
      active: true
    },
    {
      tag: 'New Item',
      title: 'New Menu / Prize Item',
      body: 'Post item details, talking points, and launch date.',
      active: true
    },
    {
      tag: 'Process',
      title: 'New Way of Doing Things',
      body: 'Explain the updated process clearly with the top 2–3 steps.',
      active: true
    }
  ],
  values: [
    'Motivated',
    'Accountable',
    'Guest First',
    'Informed',
    'Committed',
    'A Leader'
  ],
  ticker:
    'Remember: clean area, fast recovery, positive energy, and guest-first service.'
};

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(starterData, null, 2));
  }

  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function auth(req, res, next) {
  try {
    jwt.verify(req.cookies.token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/content', (req, res) => {
  res.json(readData());
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const valid = username === ADMIN_USER && password === ADMIN_PASS;

  if (!valid) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.post('/api/content', auth, (req, res) => {
  writeData(req.body);
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cinergy Spotlight running on :${PORT}`);
});
