import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { userStore, type UserRecord } from '../../infrastructure/user-store.js';

export const authRouter = Router();

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const publicUser = (u: UserRecord) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

async function issueTokens(user: UserRecord) {
  const accessToken = jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TTL,
  });

  const refreshToken = crypto.randomBytes(48).toString('hex');
  await userStore.saveRefresh(sha256(refreshToken), {
    userId: user.id,
    expiresAt: Date.now() + REFRESH_TTL_MS,
  });

  return { accessToken, refreshToken };
}

function validateSignup(body: Record<string, unknown>): string | null {
  const { name, email, password } = body;
  if (typeof name !== 'string' || name.trim().length < 2) return 'Enter your name.';
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include a letter and a number.';
  }
  return null;
}

// POST /api/v1/auth/signup
authRouter.post('/signup', async (req, res) => {
  const error = validateSignup(req.body ?? {});
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const email = (req.body.email as string).trim().toLowerCase();
  if (await userStore.findByEmail(email)) {
    res.status(409).json({ message: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await userStore.create({
    name: (req.body.name as string).trim(),
    email,
    passwordHash,
  });

  const tokens = await issueTokens(user);
  res.status(201).json({ ...tokens, user: publicUser(user) });
});

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const user = await userStore.findByEmail(email.trim().toLowerCase());
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !ok) {
    res.status(401).json({ message: 'Incorrect email or password.' });
    return;
  }

  const tokens = await issueTokens(user);
  res.json({ ...tokens, user: publicUser(user) });
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== 'string') {
    res.status(400).json({ message: 'refreshToken is required.' });
    return;
  }

  const record = await userStore.takeRefresh(sha256(refreshToken));
  if (!record || record.expiresAt < Date.now()) {
    res.status(401).json({ message: 'Session expired.' });
    return;
  }

  const user = await userStore.findById(record.userId);
  if (!user) {
    res.status(401).json({ message: 'Session expired.' });
    return;
  }

  const tokens = await issueTokens(user);
  res.json(tokens);
});

// POST /api/v1/auth/logout
authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken === 'string') {
    await userStore.deleteRefresh(sha256(refreshToken));
  }
  res.status(204).end();
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  const user = await userStore.findById(req.user.id);
  if (!user) {
    res.status(401).json({ message: 'Account not found.' });
    return;
  }
  res.json({ user: publicUser(user) });
});
