# Loqwi: Voice AI Teaching Assistant

Built for **CDF-NSCIF Freelancing Opp**
Problem Statement: a hands-free, Hinglish, voice-first AI co-pilot for a live classroom on a smart board.

Loqwi listens for a teacher's spoken (or typed) commands in Hindi/English code-switched speech ("Hinglish"), and handles these 2 requirements from the brief:

1. **Live Concept Simplification**: explains a topic in simple Hinglish with a generated on-screen visual (steps, diagram, comparison, or analogy).
2. **Voice-Triggered Quizzing**: generates and runs a short oral quiz, listens for spoken answers ("A"/"B"/"C"/"D" or Hindi equivalents), gives instant feedback, tracks score.

## Architecture

```
loqwi/
├── web/      Vite + React + Tailwind frontend (the smart-board UI)
└── server/   Node/Express backend holds the Gemini API key, proxies structured calls
```

```
Teacher's voice ──▶ Web Speech API (STT, in-browser) ──▶ React state machine
                                                              │
                              local Hinglish intent router ◀─┘ (no network call for routing)
                                                              │
                                            POST /api/assistant (same-origin)
                                                              │
                                                       Express backend
                                                              │
                                              Gemini API (structured JSON output)
                                                              │
                                                  React renders visual + speaks via TTS
```

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| STT / TTS | Web Speech API (`SpeechRecognition` / `speechSynthesis`) | Native, free, zero extra latency, works offline-ish in Chrome/Edge and no audio round-trips to a cloud STT/TTS vendor needed for a classroom demo |
| LLM | Google Gemini (`gemini-2.5-flash` by default), structured output via `responseSchema` | Fast + cheap enough for live classroom use; native JSON-schema-constrained output means the UI never parses free-form text out of a prompt |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 | Component-based UI with the response shapes from `server/gemini.js` mirrored in `types.ts`, so a drift between what the backend returns and what the UI expects is a compile error, not a runtime crash; instant HMR during development, ships as static assets |
| UI components | Hand-built, Tailwind/Radix-style primitives (`Button`, `Dialog`, `Switch`, toasts) in the visual language of shadcn/ui, plus `lucide-react` icons and `framer-motion` for motion | Polished, accessible, consistent design without a heavy dependency tree |
| Backend | Node.js + Express, zero extra runtime deps besides `express` | Holds the Gemini key server-side; serves the built frontend in production so there's one deployable process |
| Rate limiting | Upstash Redis (sliding window), falls back to in-memory | Works across stateless Vercel function instances, where a per-process counter can't |
| Testing / quality | Vitest + React Testing Library (frontend), Node's built-in `node:test` (backend), ESLint (flat config, `react-hooks` + `jsx-a11y`) + Prettier, GitHub Actions CI | Catches regressions in the intent router, script segmenter, and view state transitions; enforces consistent style without a heavy toolchain |

## Local setup

Requires Node.js 20+.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # then edit .env and set GEMINI_API_KEY
npm run dev                 # http://localhost:3000

# 2. Frontend (separate terminal)
cd web
npm install
npm run dev                 # http://localhost:5173, proxies /api/* to :3000
```

For a single deployable process (what actually runs in production):

```bash
cd web && npm run build     # writes web/dist
cd ../server && npm start   # serves web/dist AND /api/* on one port
```

### Environment variables (`server/.env`)

```
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash   # optional override
PORT=3000                       # optional override
```

`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are optional (free tier at [console.upstash.com](https://console.upstash.com)). they make the `/api/assistant` rate limiter work across stateless instances (required for it to mean anything on Vercel); without them it falls back to a single-process in-memory counter.

## Testing, linting, CI

```bash
cd web && npm run typecheck && npm run lint && npm test && npm run build   # tsc, ESLint, Vitest + RTL, production build
cd server && npm run lint && npm test                                        # ESLint, Node's built-in test runner
```

Tests cover the parts most likely to silently break: the Hinglish intent router (`lib/intents.js`), the Devanagari/Latin script segmenter that drives bilingual TTS (`lib/speech.js`), the quiz/activity view state transitions, and the grounding-fact lookup + rate limiter on the backend. `.github/workflows/ci.yml` runs all of the above (plus a Prettier format check) on every push and PR.

## Prompt design

Every AI task (`explain_concept`, `generate_quiz`, `translate_text`, `generate_activity`, `classify_intent`) is a forced-structured Gemini call: `generationConfig.responseSchema` constrains the model to return exactly the JSON shape the UI expects (see `server/gemini.js`), so there's no brittle "parse JSON out of a markdown code block" step.

The shared system prompt establishes persona and tone once ("Loqwi, a calm and encouraging AI co-pilot... Haryana government-school classroom... grade-appropriate... safe for children"), and the **hard rule that matters most for the Hinglish requirement**: spoken text must use **Devanagari script for Hindi words and Latin letters for English/technical terms** and never Romanized Hindi. This isn't just a style preference: the frontend's TTS layer (`web/src/lib/speech.js`) segments the returned text by Unicode script run and routes each run to a matching-language voice (`hi-IN` vs `en-IN`). Romanized Hindi handed to an English voice reads as gibberish, so the prompt constraint and the TTS engineering have to agree.

Command **routing** (which of the four modes a teacher meant) is handled two ways:
- A fast local regex/keyword classifier (`web/src/lib/intents.js`) handles the common phrasings ("samjhao X", "quiz on X paanch sawaal", "X translate karo", "activity shuru karo X") with zero network latency.
- Genuinely ambiguous utterances fall back to a `classify_intent` Gemini call.

## Localization notes

- Recognition language defaults to `hi-IN`, which in Chrome/Edge handles Hindi/English code-switching noticeably better than `en-IN` for this use case; it's a one-click toggle in the top bar.
- TTS voice selection is configurable per language (Hindi/English) in Settings, with auto-fallback if a preferred voice isn't installed on the device.
- A typed-command fallback is always available, both for accessibility and because classroom mic conditions are unpredictable.
## Hands-free design

- **Push-to-talk** (default): click the mic, speak one command, it auto-stops.
- **Hands-free** (toggle): continuous listening gated by a wake phrase ("Hey Loqwi" / "साथी"-style cue), so ambient classroom noise doesn't trigger commands. Once inside Quiz or Activity mode, answers/controls ("A"/"B"/"C"/"D", "next", "pause", "stop") are accepted without the wake phrase, since the context already implies who's being addressed.
- **Barge-in**: saying "stop" while Loqwi is mid-explanation or mid-question immediately cancels speech, even in the middle of an utterance.

## Known limitations

- Web Speech API's `SpeechRecognition` is Chromium-only (Chrome/Edge). Firefox/Safari fall back to the typed-input path, with a banner explaining why.
- Browser TTS voice quality/availability varies by OS; Windows/Edge generally ships usable `hi-IN` and `en-IN` voices out of the box.
- The rate limiter (60 requests/hour/IP, Upstash-backed or in-memory. see "Testing, linting, CI" above) is a basic abuse guard for a small deployment, not a substitute for real auth/billing controls at scale.
- No persistent lesson history/analytics.
- The grounding-fact lookup covers common CBSE grade 6-10 topics (see `server/groundingFacts.js`); topics outside that curated list fall back to the model's own knowledge with no fact-check pass.
- `server/` is plain JS (no TypeScript). small enough that the test suite covers it adequately without the added build step.
