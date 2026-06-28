// rateLimit.js — protects the server-held Gemini key from abuse. Uses
// Upstash Redis (works across stateless serverless invocations — required
// for the Vercel deployment, where each function instance has its own
// memory) when UPSTASH_REDIS_REST_URL/TOKEN are configured, and falls back
// to a simple in-memory counter for local dev or single-process hosts
// (Render/Railway/etc.) where Upstash isn't set up.

const WINDOW_SECONDS = 60 * 60; // 1 hour
const MAX_REQUESTS = 60;

let upstashLimiter = null;
let upstashInitAttempted = false;

async function getUpstashLimiter() {
  if (upstashInitAttempted) return upstashLimiter;
  upstashInitAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');
    const redis = new Redis({ url, token });
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${WINDOW_SECONDS} s`),
      prefix: 'loqwi:ratelimit',
    });
  } catch (err) {
    console.error('Failed to initialize Upstash rate limiter, falling back to in-memory:', err.message);
    upstashLimiter = null;
  }
  return upstashLimiter;
}

const memoryHits = new Map();

function checkMemory(key) {
  const now = Date.now();
  const windowMs = WINDOW_SECONDS * 1000;
  const recent = (memoryHits.get(key) || []).filter((t) => now - t < windowMs);
  const allowed = recent.length < MAX_REQUESTS;
  if (allowed) {
    recent.push(now);
    memoryHits.set(key, recent);
  }
  return { allowed, remaining: Math.max(0, MAX_REQUESTS - recent.length) };
}

/** Returns { allowed, remaining }. `key` is typically the client IP. */
export async function checkRateLimit(key) {
  const limiter = await getUpstashLimiter();
  if (limiter) {
    const { success, remaining } = await limiter.limit(key);
    return { allowed: success, remaining };
  }
  return checkMemory(key);
}
