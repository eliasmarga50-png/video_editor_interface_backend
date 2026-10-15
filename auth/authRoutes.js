const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const store = require('./userStore');
const { requireAuth } = require('./authMiddleware');

if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET is not set');
}

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

async function issueTokens(user) {
  const accessToken = jwt.sign({ role: user.role }, process.env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TTL,
  });

  const refreshToken = crypto.randomBytes(48).toString('hex');
  await store.saveRefresh(sha256(refreshToken), {
    userId: user.id,
    expiresAt: Date.now() + REFRESH_TTL_MS,
  });

  return { accessToken, refreshToken };
}

function validateSignup({ name, email, password }) {
  if (typeof name !== 'string' || name.trim().length < 2) return 'Enter your name.';
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include a letter and a number.';
  }
  return null;
}

// POST /auth/signup
router.post('/signup', limiter, async (req, res) => {
  const error = validateSignup(req.body || {});
  if (error) return res.status(400).json({ message: error });

  const email = req.body.email.trim().toLowerCase();
  if (await store.findByEmail(email)) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(req.body.password, 12);
  // Role is always 'user' here: clients can never choose their own role.
  const user = await store.create({ name: req.body.name.trim(), email, passwordHash });

  return res.status(201).json({ ...(await issueTokens(user)), user: publicUser(user) });
});

// Hash used to keep timing similar when the email is unknown.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

// POST /auth/login
router.post('/login', limiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await store.findByEmail(email.trim().toLowerCase());
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !ok) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  return res.json({ ...(await issueTokens(user)), user: publicUser(user) });
});

// POST /auth/refresh  (refresh tokens rotate: each one works once)
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (typeof refreshToken !== 'string') {
    return res.status(400).json({ message: 'refreshToken is required.' });
  }

  const record = await store.takeRefresh(sha256(refreshToken));
  if (!record || record.expiresAt < Date.now()) {
    return res.status(401).json({ message: 'Session expired.' });
  }

  const user = await store.findById(record.userId);
  if (!user) return res.status(401).json({ message: 'Session expired.' });

  return res.json(await issueTokens(user));
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (typeof refreshToken === 'string') await store.deleteRefresh(sha256(refreshToken));
  return res.status(204).end();
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await store.findById(req.user.id);
  if (!user) return res.status(401).json({ message: 'Account not found.' });
  return res.json({ user: publicUser(user) });
});

module.exports = router;