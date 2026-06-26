// gemini.js — server-side Gemini client. Runs only on the backend, so the API
// key never reaches the browser. Forces structured JSON output via
// generationConfig.responseSchema instead of parsing free-form text.

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiError extends Error {
  constructor(message, { status, raw } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.raw = raw;
  }
}

export const TASKS = {
  explain_concept: {
    type: 'object',
    properties: {
      speech: {
        type: 'string',
        description:
          'Warm, simple spoken explanation in natural Hinglish (Devanagari for Hindi words, Latin letters for English/technical terms), 60-120 words.',
      },
      visual: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['steps', 'diagram', 'comparison', 'analogy'] },
          items: {
            type: 'array',
            minItems: 2,
            maxItems: 6,
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, detail: { type: 'string' } },
              required: ['label', 'detail'],
            },
          },
          analogy_caption: { type: 'string', description: 'One relatable everyday analogy, in Hinglish.' },
        },
        required: ['title', 'type', 'items'],
      },
    },
    required: ['speech', 'visual'],
  },

  generate_quiz: {
    type: 'object',
    properties: {
      intro_speech: { type: 'string', description: 'Short spoken intro announcing the quiz, in Hinglish.' },
      questions: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            question_text: { type: 'string' },
            question_speech: { type: 'string', description: 'How to read the question aloud, Hinglish.' },
            options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
            correct_index: { type: 'integer', description: 'Index 0-3 of the correct option.' },
            explanation_speech: { type: 'string', description: 'One short sentence read aloud after the answer, Hinglish.' },
          },
          required: ['question_text', 'question_speech', 'options', 'correct_index', 'explanation_speech'],
        },
      },
    },
    required: ['intro_speech', 'questions'],
  },

  translate_text: {
    type: 'object',
    properties: {
      detected_source_lang: { type: 'string', enum: ['hi', 'en', 'mixed'] },
      source_text_clean: { type: 'string', description: 'The source text, lightly cleaned of ASR artifacts, in its original script.' },
      translated_text: { type: 'string', description: 'Full translation into the target language.' },
      target_lang: { type: 'string', enum: ['hi', 'en'] },
    },
    required: ['detected_source_lang', 'source_text_clean', 'translated_text', 'target_lang'],
  },

  generate_activity: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      materials: { type: 'array', items: { type: 'string' }, description: 'Only commonly available classroom items.' },
      steps: {
        type: 'array',
        minItems: 2,
        maxItems: 8,
        items: {
          type: 'object',
          properties: {
            instruction_text: { type: 'string' },
            instruction_speech: { type: 'string', description: 'Hinglish spoken instruction for this step.' },
            duration_seconds: { type: 'integer', description: 'Seconds for this step, between 15 and 600.' },
          },
          required: ['instruction_text', 'instruction_speech', 'duration_seconds'],
        },
      },
    },
    required: ['title', 'materials', 'steps'],
  },

  classify_intent: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['concept', 'quiz', 'translate', 'activity', 'unknown'] },
      topic: { type: 'string' },
      num_questions: { type: 'integer' },
      target_lang: { type: 'string', enum: ['hi', 'en'] },
    },
    required: ['mode'],
  },
};

function buildSystemPrompt(kind, gradeLevel) {
  const grade = gradeLevel || 7;
  const base = `You are Loqwi, a calm and encouraging AI co-pilot helping a teacher run a live class in a Hindi/English (Hinglish) government-school classroom in Haryana, India. Students are roughly grade ${grade}. Always write spoken text in natural Hinglish: Devanagari script for Hindi words, plain Latin letters for English or technical terms, exactly as an Indian teacher would say them out loud (e.g. "Photosynthesis ek process hai jisme paudhe sunlight ka use karte hain"). Never romanize Hindi. Keep tone warm, patient, and age-appropriate. Never produce content unsafe for children. Respond ONLY with the requested JSON, matching the schema exactly — no extra commentary.`;

  switch (kind) {
    case 'explain_concept':
      return `${base} Task: simplify a concept the teacher names into a short spoken explanation plus a compact visual breakdown (steps, diagram items, a comparison, or an analogy) suitable for projecting on a classroom smart board. Favor concrete, local, relatable analogies (food, farming, cricket, school life). Keep speech short — it will be read aloud, not displayed as a wall of text.`;
    case 'generate_quiz':
      return `${base} Task: write a short oral quiz on the topic the teacher names. Questions must be answerable by ear (no "look at the diagram" questions). Keep each question and its four options short enough to read aloud and display on one screen. Vary the position of the correct answer across questions.`;
    case 'translate_text':
      return `${base} Task: you receive a transcript of something the teacher read aloud (it may contain speech-recognition errors — fix obvious mistranscriptions using context). Lightly clean it, then translate fully and accurately into the requested target language.`;
    case 'generate_activity':
      return `${base} Task: design a short, hands-on, low-prep classroom activity on the topic the teacher names, broken into timed steps the teacher can run hands-free while walking the room. Only require materials a government school classroom already has (notebook, pencil, chalk, blackboard, paper, things students carry).`;
    case 'classify_intent':
      return `You classify a teacher's short spoken classroom command into exactly one supported mode: "concept" (explain/simplify a topic), "quiz" (start a verbal quiz), "translate" (translate/transcribe a passage), "activity" (run a hands-on activity guide), or "unknown" if it clearly fits none of these. Extract the topic, requested question count, and target language when present. Respond ONLY with the requested JSON.`;
    default:
      return base;
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function runStructured(taskKind, userText, { gradeLevel } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError('Server is missing GEMINI_API_KEY.', { status: 500 });

  const schema = TASKS[taskKind];
  if (!schema) throw new GeminiError(`Unknown task kind: ${taskKind}`, { status: 400 });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const system = buildSystemPrompt(taskKind, gradeLevel);

  const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userText || '' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.6,
      },
    }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new GeminiError(body?.error?.message || `Gemini API error (${res.status})`, { status: res.status, raw: body });
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError('Gemini returned no content (it may have been blocked by safety filters).', { status: 502, raw: data });

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("Could not parse Gemini's structured response.", { status: 502, raw: text });
  }
}
