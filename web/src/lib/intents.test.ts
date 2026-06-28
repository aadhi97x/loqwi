import { describe, it, expect } from 'vitest';
import {
  classifyLocal,
  stripWakeWord,
  hasWakeWord,
  parseSpokenOption,
  CONTROL_WORDS,
  TRANSLATE_NOW_RE,
  FOLLOWUP_RE,
} from './intents';

describe('classifyLocal', () => {
  it('detects a concept request and extracts the topic', () => {
    const result = classifyLocal('samjhao gravity');
    expect(result.confident).toBe(true);
    expect(result.mode).toBe('concept');
    expect(result.topic).toBe('gravity');
  });

  it('detects a quiz request and extracts topic + question count', () => {
    const result = classifyLocal('quiz on fractions paanch sawaal');
    expect(result.mode).toBe('quiz');
    expect(result.numQuestions).toBe(5);
    expect(result.topic).toContain('fractions');
  });

  it('falls back to a default question count when none is spoken', () => {
    const result = classifyLocal('quiz on photosynthesis');
    expect(result.numQuestions).toBe(5);
  });

  it('detects an explicit digit count for a quiz', () => {
    const result = classifyLocal('quiz on history 3 questions');
    expect(result.numQuestions).toBe(3);
  });

  it('detects a translate request and target language hint', () => {
    const result = classifyLocal('is paragraph ko english mein translate karo');
    expect(result.mode).toBe('translate');
    expect(result.targetLang).toBe('en');
    expect(result.topic).not.toMatch(/\bkaro\b/i);
  });

  it('strips the "karo" verb out of a one-shot translate + content utterance', () => {
    const result = classifyLocal('is paragraph ka translate karo: the sun gives us light and heat');
    expect(result.mode).toBe('translate');
    expect(result.topic).not.toMatch(/\bkaro\b/i);
    expect(result.topic).toContain('the sun gives us light and heat');
  });

  it('detects an activity request', () => {
    const result = classifyLocal('activity shuru karo fraction addition ke liye');
    expect(result.mode).toBe('activity');
    expect(result.topic).not.toMatch(/\b(shuru|karo)\b/i);
  });

  it('returns unconfident "unknown" for ambiguous text', () => {
    const result = classifyLocal('aaj weather kaisa hai');
    expect(result.confident).toBe(false);
    expect(result.mode).toBe('unknown');
  });

  it('strips the wake word before classifying', () => {
    const result = classifyLocal('hey loqwi samjhao friction');
    expect(result.mode).toBe('concept');
    expect(result.topic).toBe('friction');
  });
});

describe('wake word helpers', () => {
  it('detects the wake word case-insensitively', () => {
    expect(hasWakeWord('Hey Loqwi quiz on fractions')).toBe(true);
    expect(hasWakeWord('quiz on fractions')).toBe(false);
  });

  it('strips the wake word and surrounding whitespace', () => {
    expect(stripWakeWord('hey loqwi samjhao gravity')).toBe('samjhao gravity');
  });
});

describe('parseSpokenOption', () => {
  it('recognizes spoken option letters', () => {
    expect(parseSpokenOption('the answer is A')).toBe(0);
    expect(parseSpokenOption('B')).toBe(1);
    expect(parseSpokenOption('option C')).toBe(2);
    expect(parseSpokenOption('chautha')).toBe(3);
  });

  it('returns null when no option is clearly named', () => {
    expect(parseSpokenOption('I am not sure')).toBeNull();
  });
});

describe('CONTROL_WORDS', () => {
  it('matches next/back/pause/resume/stop in Hindi and English', () => {
    expect(CONTROL_WORDS.next.test('agla sawaal')).toBe(true);
    expect(CONTROL_WORDS.back.test('repeat please')).toBe(true);
    expect(CONTROL_WORDS.pause.test('ruk jao')).toBe(true);
    expect(CONTROL_WORDS.resume.test('chalu karo')).toBe(true);
    expect(CONTROL_WORDS.stop.test('band karo')).toBe(true);
  });
});

describe('TRANSLATE_NOW_RE', () => {
  it('matches short explicit translate-trigger phrases only', () => {
    expect(TRANSLATE_NOW_RE.test('translate karo')).toBe(true);
    expect(TRANSLATE_NOW_RE.test('ab translate kar do')).toBe(true);
    expect(TRANSLATE_NOW_RE.test('anuvad karo')).toBe(true);
  });

  it('does not match dictation that merely contains the word translate', () => {
    const dictation = 'the teacher asked us to translate this paragraph for homework tonight';
    expect(TRANSLATE_NOW_RE.test(dictation)).toBe(false);
  });
});

describe('FOLLOWUP_RE', () => {
  it('matches common follow-up phrasings', () => {
    expect(FOLLOWUP_RE.test('isko aur simple karke samjhao')).toBe(true);
    expect(FOLLOWUP_RE.test('one more example do')).toBe(true);
  });

  it('does not match an unrelated fresh command', () => {
    expect(FOLLOWUP_RE.test('quiz on fractions')).toBe(false);
  });
});
