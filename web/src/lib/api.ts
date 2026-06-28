// api.js — talks to our own backend only. The Gemini key lives server-side
// (server/.env); the browser never sees it. See server/gemini.js.
import type {
  AppConfig,
  ConceptData,
  QuizGenerateResult,
  TranslateResult,
  ActivityGenerateResult,
  ClassifyIntentResult,
  TaskKind,
} from '../types';

const STORAGE_KEY = 'loqwi:config:v1';

const DEFAULT_CONFIG: AppConfig = {
  gradeLevel: 7,
  recognitionLang: 'hi-IN',
  voiceHi: '',
  voiceEn: '',
};

export function getConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setConfig(partial: Partial<AppConfig>): AppConfig {
  const next = { ...getConfig(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, { status }: { status: number }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function safeJson(res: Response): Promise<{ error?: string } | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries only on network failure or 5xx — a 4xx (bad request, validation
// error) won't succeed on retry, so we fail fast there instead of making the
// teacher wait through pointless backoff delays.
const RETRY_DELAYS_MS = [500, 1500];

// Overloads give callers a concrete result type per task kind instead of a
// loose `unknown`, without needing five near-identical wrapper functions.
export async function runStructured(
  taskKind: 'explain_concept',
  userText: string
): Promise<ConceptData>;
export async function runStructured(
  taskKind: 'generate_quiz',
  userText: string
): Promise<QuizGenerateResult>;
export async function runStructured(
  taskKind: 'translate_text',
  userText: string
): Promise<TranslateResult>;
export async function runStructured(
  taskKind: 'generate_activity',
  userText: string
): Promise<ActivityGenerateResult>;
export async function runStructured(
  taskKind: 'classify_intent',
  userText: string
): Promise<ClassifyIntentResult>;
export async function runStructured(taskKind: TaskKind, userText: string): Promise<unknown> {
  const cfg = getConfig();
  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskKind, userText, gradeLevel: cfg.gradeLevel }),
      });
      if (!res.ok) {
        const body = await safeJson(res);
        const err = new ApiError(body?.error || `Request failed (${res.status})`, {
          status: res.status,
        });
        if (res.status >= 500 && attempt < RETRY_DELAYS_MS.length) {
          lastError = err;
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw err;
      }
      return await res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // TypeError from fetch = network failure (offline, DNS, CORS, etc.).
      lastError = new ApiError(
        navigator.onLine === false
          ? 'You appear to be offline. Reconnect and try again.'
          : 'Network error reaching the server. Retrying…',
        { status: 0 }
      );
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
    }
  }
  throw lastError;
}

// ---------- Connectivity status ----------
// A tiny pub/sub so any component (e.g. a top bar banner) can reflect
// online/offline state without each one wiring its own window listeners.

let onlineListeners: ((online: boolean) => void)[] = [];

export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function subscribeOnline(fn: (online: boolean) => void) {
  onlineListeners.push(fn);
  fn(isOnline());
  return () => {
    onlineListeners = onlineListeners.filter((l) => l !== fn);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => onlineListeners.forEach((fn) => fn(true)));
  window.addEventListener('offline', () => onlineListeners.forEach((fn) => fn(false)));
}
