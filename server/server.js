import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStructured, TASKS } from './gemini.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // No .env file present — fine on hosts (Render/Railway/etc.) that inject env vars directly.
}

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '256kb' }));

const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  // Vite's dev server runs on a different port than this API during development.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.DEV_ORIGIN || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

// Minimal in-memory rate limit so a publicly deployed key can't be trivially
// hammered. Per-process only — fine for a single small instance, not a
// substitute for real auth/billing controls in a larger production rollout.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 60;
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a while.' });
  }
  recent.push(now);
  hits.set(ip, recent);
  next();
}

app.get('/api/health', (req, res) => res.json({ ok: true, hasKey: !!process.env.GEMINI_API_KEY }));

app.post('/api/assistant', rateLimit, async (req, res) => {
  const { taskKind, userText, gradeLevel } = req.body || {};
  if (!taskKind || !TASKS[taskKind]) {
    return res.status(400).json({ error: `Unknown taskKind. Expected one of: ${Object.keys(TASKS).join(', ')}` });
  }
  try {
    const data = await runStructured(taskKind, userText, { gradeLevel });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Assistant request failed.' });
  }
});

const distDir = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(distDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Loqwi server listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Warning: GEMINI_API_KEY is not set. /api/assistant will fail until it is configured in server/.env');
  }
});
