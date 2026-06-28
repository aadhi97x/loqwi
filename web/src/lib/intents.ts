// intents.js — fast, local (no network) Hinglish command routing.
//
// Real classrooms can't afford a network round-trip just to figure out *which*
// feature the teacher wants, so we try a cheap regex/keyword classifier first.
// Only genuinely ambiguous utterances fall back to the backend's classify_intent
// task (wired up by the caller).
import type { LocalIntent } from '../types';

const WAKE_WORD_RE = /\b(hey\s*loqwi|ok\s*loqwi|लोकवी|लोक्वी)\b/i;

const CONCEPT_RE =
  /\b(samjha[oa]?|samajha[oa]?|explain|kya\s+hai|kya\s+matlab|meaning\s+of|बताओ|समझाओ|समझा)\b/i;
const QUIZ_RE = /\b(quiz|prashn|sawaal|sawal|प्रश्न|सवाल|test\s+le|imtihan)\b/i;
const TRANSLATE_RE = /\b(translate|anuvad|tarjuma|अनुवाद)\b/i;
const ACTIVITY_RE = /\b(activity|gatividhi|गतिविधि|exercise\s+karo|practice\s+karo|kriya)\b/i;

// Explicit "do the translation now" trigger, distinct from TRANSLATE_RE above
// (which only decides whether to *enter* translate mode). Using a separate,
// narrower pattern here means dictation text that happens to contain the word
// "translate" is never accidentally swallowed as a command — only these exact
// short trigger phrases fire the translation.
export const TRANSLATE_NOW_RE =
  /^\s*(ab\s+)?(translate(\s+(karo|kar\s+do|this|now))?|anuvad\s+karo|tarjuma\s+karo)\s*[.!?]?\s*$/i;

// Follow-up requests on an already-explained concept ("make it simpler", "one
// more example") — only meaningful while concept mode already has a topic.
export const FOLLOWUP_RE =
  /\b(aur\s+simple|aur\s+asaan|isko\s+aur|phir\s+se\s+samjhao|dobara\s+samjhao|ek\s+example\s+(aur\s+)?do|more\s+example|one\s+more\s+example|simpler|explain\s+(it\s+)?again)\b/i;

const HI_NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  one: 1,
  do: 2,
  two: 2,
  teen: 3,
  three: 3,
  char: 4,
  chaar: 4,
  four: 4,
  paanch: 5,
  panch: 5,
  five: 5,
  che: 6,
  chhe: 6,
  six: 6,
  saat: 7,
  seven: 7,
  aath: 8,
  eight: 8,
  nau: 9,
  nine: 9,
  das: 10,
  ten: 10,
};

function extractNumber(text: string): number | null {
  const digitMatch = text.match(/\b(\d{1,2})\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);
  const lower = text.toLowerCase();
  for (const [word, value] of Object.entries(HI_NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) return value;
  }
  return null;
}

function stripTriggerWords(text: string, re: RegExp): string {
  return text
    .replace(re, ' ')
    .replace(
      /\b(question|questions|sawaal|sawal|प्रश्न|सवाल|quiz|on|topic|ke\s+upar|par|ka|ki|karo|kar\s+do|shuru|ab|now|please|pls)\b/gi,
      ' '
    )
    .replace(/\b\d{1,2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripWakeWord(text: string): string {
  return text.replace(WAKE_WORD_RE, '').trim();
}

export function hasWakeWord(text: string): boolean {
  return WAKE_WORD_RE.test(text);
}

/**
 * Local best-effort classification. `confident: false` means the caller
 * should consider a backend fallback (classify_intent) instead of acting on
 * this directly.
 */
export function classifyLocal(rawText: string): LocalIntent {
  const text = stripWakeWord(rawText);

  if (QUIZ_RE.test(text)) {
    return {
      mode: 'quiz',
      topic: stripTriggerWords(text, QUIZ_RE),
      numQuestions: extractNumber(text) || 5,
      targetLang: null,
      confident: true,
    };
  }
  if (TRANSLATE_RE.test(text)) {
    const targetLang = /\b(hindi|हिंदी)\b/i.test(text)
      ? 'hi'
      : /\b(english|अंग्रेजी)\b/i.test(text)
        ? 'en'
        : null;
    return {
      mode: 'translate',
      topic: stripTriggerWords(text, TRANSLATE_RE),
      numQuestions: null,
      targetLang,
      confident: true,
    };
  }
  if (ACTIVITY_RE.test(text)) {
    return {
      mode: 'activity',
      topic: stripTriggerWords(text, ACTIVITY_RE),
      numQuestions: null,
      targetLang: null,
      confident: true,
    };
  }
  if (CONCEPT_RE.test(text)) {
    return {
      mode: 'concept',
      topic: stripTriggerWords(text, CONCEPT_RE),
      numQuestions: null,
      targetLang: null,
      confident: true,
    };
  }
  return { mode: 'unknown', topic: text, numQuestions: null, targetLang: null, confident: false };
}

// ---------- Quiz answer parsing ----------

const OPTION_WORDS = [
  ['a', 'option a', 'pehla', 'pehela', 'पहला', 'first', 'ek', 'one', '1'],
  ['b', 'option b', 'doosra', 'dusra', 'दूसरा', 'second', 'do', 'two', '2'],
  ['c', 'option c', 'teesra', 'tisra', 'तीसरा', 'third', 'teen', 'three', '3'],
  ['d', 'option d', 'chautha', 'chotha', 'चौथा', 'fourth', 'char', 'four', '4'],
];

/** Returns 0-3 if the spoken text clearly picks an option, else null. */
export function parseSpokenOption(text: string): number | null {
  const lower = ` ${text.toLowerCase()} `;
  for (let i = 0; i < OPTION_WORDS.length; i++) {
    for (const word of OPTION_WORDS[i]) {
      const re = new RegExp(`[^a-z]${word}[^a-z]`, 'i');
      if (re.test(lower)) return i;
    }
  }
  return null;
}

export const CONTROL_WORDS = {
  next: /\b(next|agla|aage|आगे|अगला)\b/i,
  back: /\b(back|repeat|phir|dobara|दोबारा|फिर)\b/i,
  pause: /\b(pause|ruk|रुक|theharo|ठहरो)\b/i,
  resume: /\b(resume|continue|chalu|शुरू|jaari)\b/i,
  stop: /\b(stop|band|बंद|khatam|ख़त्म|exit)\b/i,
};
