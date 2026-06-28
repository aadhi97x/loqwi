// Vercel serverless function — same logic as server/server.js's /api/assistant
// route, for deployments where Vercel hosts the app instead of a long-running
// Node process. Set GEMINI_API_KEY (and ideally UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN for real rate limiting — see rateLimit.js) as
// Vercel project environment variables; there is no .env file here.
import { runStructured, TASKS } from '../server/gemini.js';
import { checkRateLimit } from '../server/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  try {
    const { allowed } = await checkRateLimit(ip);
    if (!allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a while.' });
    }
  } catch (err) {
    console.error('Rate limit check failed, allowing request:', err.message);
  }

  const { taskKind, userText, gradeLevel } = req.body || {};
  if (!taskKind || !TASKS[taskKind]) {
    return res.status(400).json({ error: `Unknown taskKind. Expected one of: ${Object.keys(TASKS).join(', ')}` });
  }

  try {
    const data = await runStructured(taskKind, userText, { gradeLevel });
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Assistant request failed.' });
  }
}
