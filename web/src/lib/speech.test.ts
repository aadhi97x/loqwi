import { describe, it, expect } from 'vitest';
import { segmentByScript, devanagariToRoman } from './speech';

describe('segmentByScript', () => {
  it('splits a Hinglish sentence into Devanagari and Latin runs', () => {
    // Mirrors the real shape of AI output: Hindi in actual Devanagari script,
    // English/technical terms in Latin letters (never romanized Hindi).
    const segments = segmentByScript(
      'Photosynthesis ek प्रक्रिया है जिसमें पौधे sunlight ka use karte hain'
    );
    expect(segments[0].devanagari).toBe(false);
    expect(segments[0].text).toContain('Photosynthesis');
    expect(segments.some((s) => s.devanagari === true)).toBe(true);
    expect(segments.some((s) => s.devanagari === false && s.text.includes('sunlight'))).toBe(true);
  });

  it('keeps punctuation and digits attached to the segment they appear in', () => {
    const segments = segmentByScript('Step 1: ek udaharan hai.');
    const joined = segments.map((s) => s.text).join('');
    expect(joined.replace(/\s+/g, ' ').trim()).toBe('Step 1: ek udaharan hai.');
  });

  it('returns a single segment for pure English text', () => {
    const segments = segmentByScript('This is a simple English sentence.');
    expect(segments).toHaveLength(1);
    expect(segments[0].devanagari).toBe(false);
  });

  it('returns a single segment for pure Devanagari text', () => {
    const segments = segmentByScript('यह एक हिंदी वाक्य है।');
    expect(segments).toHaveLength(1);
    expect(segments[0].devanagari).toBe(true);
  });

  it('drops segments that are entirely whitespace/punctuation', () => {
    const segments = segmentByScript('   ');
    expect(segments).toHaveLength(0);
  });
});

describe('devanagariToRoman', () => {
  // Used as a fallback only when the device has no Hindi TTS voice, so an
  // English voice reads approximate phonetics instead of mangling raw
  // Devanagari glyphs.
  it('transliterates a simple word with a matra', () => {
    expect(devanagariToRoman('गर्मी')).toBe('garmee');
  });

  it('applies the inherent "a" vowel when no matra or virama follows', () => {
    expect(devanagariToRoman('सूरज')).toBe('sooraja');
  });

  it('suppresses the inherent vowel on a virama-marked consonant', () => {
    expect(devanagariToRoman('सूर्य')).toBe('soorya');
  });

  it('passes through independent vowels, digits and danda punctuation', () => {
    expect(devanagariToRoman('अ १ ।')).toBe('a 1 .');
  });
});
