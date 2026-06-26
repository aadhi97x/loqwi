// speech.js — Web Speech API wrapper: continuous/push-to-talk STT and script-aware bilingual TTS.
// Framework-agnostic; no React imports here on purpose so it can be unit-tested or reused elsewhere.

const DEVANAGARI_RE = /[ऀ-ॿ]/;
const NEUTRAL_RE = /[\s\d.,!?;:()\-"'…।]/;

const RecognitionImpl =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export const SpeechSupport = {
  stt: !!RecognitionImpl,
  tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
};

/**
 * Listener wraps SpeechRecognition. Chrome silently ends "continuous" sessions
 * after a pause in speech despite continuous=true; we paper over that by
 * auto-restarting on `end` whenever hands-free mode is active, so the mic
 * effectively never goes deaf while the teacher has it toggled on.
 */
export class Listener {
  constructor({ lang = 'hi-IN', continuous = false, onInterim, onFinal, onStart, onEnd, onError } = {}) {
    this.lang = lang;
    this.continuous = continuous;
    this.onInterim = onInterim || (() => {});
    this.onFinal = onFinal || (() => {});
    this.onStart = onStart || (() => {});
    this.onEnd = onEnd || (() => {});
    this.onError = onError || (() => {});
    this._recognition = null;
    this._active = false;
    this._wantRestart = false;
    this._stoppedByUser = true;
  }

  isSupported() {
    return SpeechSupport.stt;
  }

  isActive() {
    return this._active;
  }

  setLang(lang) {
    this.lang = lang;
    if (this._recognition) this._recognition.lang = lang;
  }

  setContinuous(continuous) {
    this.continuous = continuous;
  }

  start() {
    if (!SpeechSupport.stt) {
      this.onError({ error: 'unsupported' });
      return;
    }
    if (this._active) return;
    this._stoppedByUser = false;

    const rec = new RecognitionImpl();
    rec.lang = this.lang;
    rec.continuous = this.continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      this._active = true;
      this.onStart();
    };

    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) this.onInterim(interim);
      if (final.trim()) this.onFinal(final.trim());
    };

    rec.onerror = (e) => {
      this.onError(e);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this._wantRestart = false;
      }
    };

    rec.onend = () => {
      this._active = false;
      this.onEnd();
      if (this._wantRestart && !this._stoppedByUser) {
        setTimeout(() => this.start(), 200);
      }
    };

    this._recognition = rec;
    this._wantRestart = this.continuous;
    try {
      rec.start();
    } catch {
      // start() throws if called while already starting; ignore, onend/onerror will settle state.
    }
  }

  stop() {
    this._stoppedByUser = true;
    this._wantRestart = false;
    if (this._recognition) this._recognition.stop();
  }

  abort() {
    this._stoppedByUser = true;
    this._wantRestart = false;
    if (this._recognition) this._recognition.abort();
  }
}

// ---------- Text-to-speech ----------

let voicesReadyPromise = null;
export function ensureVoicesLoaded() {
  if (!SpeechSupport.tts) return Promise.resolve([]);
  if (voicesReadyPromise) return voicesReadyPromise;
  voicesReadyPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing && existing.length) {
      resolve(existing);
      return;
    }
    const handler = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(v);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices() || []), 1500);
  });
  return voicesReadyPromise;
}

function pickVoice(voices, prefix, preferred) {
  if (preferred) {
    const exact = voices.find((v) => v.name === preferred);
    if (exact) return exact;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) || null;
}

/**
 * Splits text into runs of Devanagari vs. Latin script so a Hinglish sentence
 * gets each run handed to the matching-language voice instead of one voice
 * mangling the other script. Neutral characters (spaces, digits, punctuation)
 * stick to whichever run they're inside so words aren't split mid-token.
 */
export function segmentByScript(text) {
  const segments = [];
  let current = '';
  let currentIsDevanagari = null;

  for (const ch of text) {
    const isNeutral = NEUTRAL_RE.test(ch);
    const isDeva = DEVANAGARI_RE.test(ch);
    if (currentIsDevanagari === null) {
      currentIsDevanagari = isNeutral ? false : isDeva;
      current = ch;
      continue;
    }
    if (isNeutral) {
      current += ch;
    } else if (isDeva === currentIsDevanagari) {
      current += ch;
    } else {
      segments.push({ text: current, devanagari: currentIsDevanagari });
      current = ch;
      currentIsDevanagari = isDeva;
    }
  }
  if (current) segments.push({ text: current, devanagari: currentIsDevanagari });

  const merged = [];
  for (const seg of segments) {
    const trimmedLen = seg.text.trim().length;
    if (merged.length && trimmedLen <= 2) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged.filter((s) => s.text.trim().length > 0);
}

// Monotonic session token — see speak() below for why this matters for barge-in.
let activeSession = 0;

export function stopSpeaking() {
  activeSession++;
  if (SpeechSupport.tts) window.speechSynthesis.cancel();
}

/**
 * Speaks text aloud, switching voice/lang per script run so Hinglish reads
 * naturally. Resolves once every segment has finished (or immediately if TTS
 * is unsupported / text is empty). The session token lets stopSpeaking()
 * invalidate an in-flight speak() so a barge-in ("stop") can't leave the
 * caller's await hanging or let a stale onend re-queue more utterances.
 */
export async function speak(text, { rate = 0.98, pitch = 1, voiceNamePrefs = {}, onSegmentStart } = {}) {
  if (!SpeechSupport.tts || !text || !text.trim()) return;
  const voices = await ensureVoicesLoaded();
  const hiVoice = pickVoice(voices, 'hi', voiceNamePrefs.hi);
  const enVoice =
    pickVoice(voices, 'en-in', voiceNamePrefs.en) || pickVoice(voices, 'en', voiceNamePrefs.en);

  const mySession = ++activeSession;
  window.speechSynthesis.cancel();
  const segments = segmentByScript(text);
  if (!segments.length) return;

  return new Promise((resolve) => {
    let i = 0;
    const speakNext = () => {
      if (mySession !== activeSession) {
        resolve();
        return;
      }
      if (i >= segments.length) {
        resolve();
        return;
      }
      const seg = segments[i++];
      const utter = new SpeechSynthesisUtterance(seg.text);
      utter.lang = seg.devanagari ? 'hi-IN' : 'en-IN';
      utter.voice = seg.devanagari ? hiVoice : enVoice;
      utter.rate = rate;
      utter.pitch = pitch;
      utter.onstart = () => onSegmentStart && onSegmentStart(seg);
      utter.onend = speakNext;
      utter.onerror = speakNext;
      window.speechSynthesis.speak(utter);
    };
    speakNext();
  });
}

export function listVoiceOptions(voices) {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().startsWith('en'))
    .map((v) => ({ name: v.name, lang: v.lang }));
}
