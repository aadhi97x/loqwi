// api.js — talks to our own backend only. The Gemini key lives server-side
// (server/.env); the browser never sees it. See server/gemini.js.

const STORAGE_KEY = 'loqwi:config:v1';

const DEFAULT_CONFIG = {
  gradeLevel: 7,
  recognitionLang: 'hi-IN',
  voiceHi: '',
  voiceEn: '',
};

export function getConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setConfig(partial) {
  const next = { ...getConfig(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export class ApiError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function runStructured(taskKind, userText) {
  const cfg = getConfig();
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ taskKind, userText, gradeLevel: cfg.gradeLevel }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new ApiError(body?.error || `Request failed (${res.status})`, { status: res.status });
  }
  return res.json();
}
