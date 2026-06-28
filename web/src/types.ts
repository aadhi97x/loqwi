// types.ts — shapes shared across hooks/components. These mirror the
// responseSchema objects enforced server-side in server/gemini.js, so a
// drift between frontend expectations and backend output would show up as a
// type error here rather than a runtime crash in the browser.

export interface AppConfig {
  gradeLevel: number;
  recognitionLang: 'hi-IN' | 'en-IN';
  voiceHi: string;
  voiceEn: string;
}

export type MicState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
export type Mode = 'idle' | 'concept' | 'quiz' | 'translate' | 'activity';
export type RouteSource = 'local' | 'ai' | 'manual' | null;
export type Theme = 'dark' | 'daylight';
export type Speaker = 'user' | 'ai';

export interface Caption {
  text: string;
  interim: boolean;
  speaker: Speaker;
}

export interface ConfirmRequest {
  message: string;
  onConfirm: () => void;
}

// ---------- Concept ----------

export interface ConceptVisualItem {
  label: string;
  detail: string;
}

export interface ConceptVisual {
  title: string;
  type: 'steps' | 'diagram' | 'comparison' | 'analogy';
  items: ConceptVisualItem[];
  analogy_caption?: string;
}

export interface ConceptData {
  speech: string;
  visual: ConceptVisual;
}

export interface ConceptState {
  data: ConceptData;
  topic: string;
}

// ---------- Quiz ----------

export interface QuizQuestion {
  question_text: string;
  question_speech: string;
  options: string[];
  correct_index: number;
  explanation_speech: string;
}

export interface QuizGenerateResult {
  intro_speech: string;
  questions: QuizQuestion[];
}

export interface QuizRevealed {
  selectedIndex: number;
  correctIndex: number;
}

export interface QuizState {
  questions: QuizQuestion[];
  index: number;
  score: number;
  awaitingAnswer: boolean;
  revealed: QuizRevealed | null;
  finished: boolean;
  total?: number;
}

// ---------- Translate ----------

export interface TranslateResult {
  detected_source_lang: 'hi' | 'en' | 'mixed';
  source_text_clean: string;
  translated_text: string;
  target_lang: 'hi' | 'en';
}

export interface TranslateState {
  buffer: string;
  result: TranslateResult | null;
  targetLangHint: string | null;
}

// ---------- Activity ----------

export interface ActivityStep {
  instruction_text: string;
  instruction_speech: string;
  duration_seconds: number;
}

export interface ActivityGenerateResult {
  title: string;
  materials: string[];
  steps: ActivityStep[];
}

export interface ActivityState {
  data: ActivityGenerateResult;
  index: number;
  secondsLeft: number;
  totalSeconds: number;
  paused: boolean;
}

// ---------- classify_intent ----------

export interface ClassifyIntentResult {
  mode: 'concept' | 'quiz' | 'translate' | 'activity' | 'unknown';
  topic?: string;
  num_questions?: number;
  target_lang?: 'hi' | 'en';
}

export type TaskKind =
  'explain_concept' | 'generate_quiz' | 'translate_text' | 'generate_activity' | 'classify_intent';

// ---------- Local intent routing ----------

export interface LocalIntent {
  mode: 'concept' | 'quiz' | 'translate' | 'activity' | 'unknown';
  topic: string;
  numQuestions: number | null;
  targetLang: string | null;
  confident: boolean;
}

export interface DispatchOptions {
  numQuestions?: number | null;
  targetLang?: string | null | undefined;
}

// ---------- Toasts ----------

export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  at: number;
}
