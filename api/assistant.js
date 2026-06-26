// Vercel serverless function — same logic as server/server.js's /api/assistant
// route, for deployments where Vercel hosts the app instead of a long-running
// Node process. Set GEMINI_API_KEY as a Vercel project environment variable
// (Project Settings → Environment Variables); there is no .env file here.
import { runStructured, TASKS } from '../server/gemini.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
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
