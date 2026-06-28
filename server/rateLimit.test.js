import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from './rateLimit.js';

// No UPSTASH_REDIS_REST_URL/TOKEN are set in the test environment, so these
// exercise the in-memory fallback path that local dev and Render/Railway-
// style single-process hosts actually use.

test('allows requests under the limit', async () => {
  const { allowed } = await checkRateLimit('test-ip-allow');
  assert.equal(allowed, true);
});

test('blocks a key once it exceeds the per-window request cap', async () => {
  const key = 'test-ip-flood';
  let lastResult;
  for (let i = 0; i < 61; i++) {
    lastResult = await checkRateLimit(key);
  }
  assert.equal(lastResult.allowed, false);
  assert.equal(lastResult.remaining, 0);
});

test('rate limits are tracked independently per key', async () => {
  const flooded = 'test-ip-flood'; // already exhausted by the previous test
  const fresh = 'test-ip-fresh';
  const a = await checkRateLimit(flooded);
  const b = await checkRateLimit(fresh);
  assert.equal(a.allowed, false);
  assert.equal(b.allowed, true);
});
