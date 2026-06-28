import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGroundingFact } from './groundingFacts.js';

test('returns a fact for a known topic keyword', () => {
  const fact = findGroundingFact('Topic: photosynthesis');
  assert.ok(fact);
  assert.match(fact, /chlorophyll/i);
});

test('matches case-insensitively and as a substring of a longer prompt', () => {
  const fact = findGroundingFact("Topic: gravity\nFollow-up request: explain GRAVITY again simpler");
  assert.ok(fact);
  assert.match(fact, /Newton/i);
});

test('returns null for a topic with no curated entry', () => {
  assert.equal(findGroundingFact('Topic: the history of jazz music'), null);
});

test('returns null for empty/missing input', () => {
  assert.equal(findGroundingFact(''), null);
  assert.equal(findGroundingFact(undefined), null);
});

test('matches fractions topic used by the quiz few-shot example', () => {
  const fact = findGroundingFact('Topic: fraction addition');
  assert.ok(fact);
  assert.match(fact, /numerator/i);
});
