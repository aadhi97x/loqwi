# Loqwi — Voice AI Teaching Assistant

Built for **CDF Round 2 — Technical Assignment, Option A**: a hands-free, Hinglish, voice-first AI co-pilot for a live classroom on a smart board.

Loqwi listens for a teacher's spoken (or typed) commands in Hindi/English code-switched speech ("Hinglish"), and handles all four optional requirements from the brief:

1. **Live Concept Simplification** — explains a topic in simple Hinglish with a generated on-screen visual (steps, diagram, comparison, or analogy).
2. **Voice-Triggered Quizzing** — generates and runs a short oral quiz, listens for spoken answers ("A"/"B"/"C"/"D" or Hindi equivalents), gives instant feedback, tracks score.
3. **Bilingual Dictation & Translation** — live-transcribes spoken/typed passages and translates between Hindi and English on command.
4. **Hands-Free Activity Guide** — generates a short hands-on classroom activity with timed, voice-narrated steps and an auto-advancing on-screen timer, controllable by voice ("next", "pause", "stop") without touching the screen.

## Architecture

```
loqwi/
├── web/      Vite + React + Tailwind frontend (the smart-board UI)
└── server/   Node/Express backend — holds the Gemini API key, proxies structured calls
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

**Why a backend at all, for a "simple web interface"?** The brief suggests Streamlit/Gradio, which run server-side by default and never expose API keys to the browser. A pure static frontend calling Gemini directly from client JS would have to embed the key in shipped code — visible to anyone via DevTools. Loqwi keeps the same security property Streamlit gives you for free: the Gemini key lives only in `server/.env`, read by Node at startup, and the browser only ever talks to our own `/api/assistant` endpoint.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| STT / TTS | Web Speech API (`SpeechRecognition` / `speechSynthesis`) | Native, free, zero extra latency, works offline-ish in Chrome/Edge — no audio round-trips to a cloud STT/TTS vendor needed for a classroom demo |
| LLM | Google Gemini (`gemini-2.5-flash` by default), structured output via `responseSchema` | Fast + cheap enough for live classroom use; native JSON-schema-constrained output means the UI never parses free-form text out of a prompt |
| Frontend | React 19 + Vite + Tailwind CSS v4 | Component-based UI, instant HMR during development, ships as static assets |
| UI components | Hand-built, Tailwind/Radix-style primitives (`Button`, `Dialog`, `Switch`, toasts) in the visual language of shadcn/ui — the same system 21st.dev components are built on — plus `lucide-react` icons and `framer-motion` for motion | Polished, accessible, consistent design without a heavy dependency tree |
| Backend | Node.js + Express, zero extra runtime deps besides `express` | Holds the Gemini key server-side; serves the built frontend in production so there's one deployable process |

## Deploying to Vercel

The repo includes `vercel.json` plus `api/assistant.js` and `api/health.js` — Vercel auto-detects anything under `/api` as serverless functions, separate from the always-on `server/` Express app used for local dev or Render/Railway-style hosts.

1. Push this repo to GitHub, then import it in Vercel.
2. Project Settings → keep **Root Directory** as the repo root (not `web/`) so `/api` is picked up.
3. Project Settings → **Environment Variables** → add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`). Do **not** put it in any committed file.
4. Deploy. Vercel runs the `buildCommand` from `vercel.json` (`cd web && npm install && npm run build`) and serves `web/dist` as static, with `/api/assistant` and `/api/health` as functions.

Note: the simple in-memory rate limiter in `server/server.js` doesn't carry over to Vercel's stateless functions (each invocation/instance has its own memory) — fine for a small classroom demo, but worth knowing if you plan to share the URL widely.

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

`server/.env` is git-ignored — it never reaches the repo. `server/.env.example` documents the shape without a real key.

## Prompt design

Every AI task (`explain_concept`, `generate_quiz`, `translate_text`, `generate_activity`, `classify_intent`) is a forced-structured Gemini call: `generationConfig.responseSchema` constrains the model to return exactly the JSON shape the UI expects (see `server/gemini.js`), so there's no brittle "parse JSON out of a markdown code block" step.

The shared system prompt establishes persona and tone once ("Loqwi, a calm and encouraging AI co-pilot... Haryana government-school classroom... grade-appropriate... safe for children"), and the **hard rule that matters most for the Hinglish requirement**: spoken text must use **Devanagari script for Hindi words and Latin letters for English/technical terms** — never Romanized Hindi. This isn't just a style preference: the frontend's TTS layer (`web/src/lib/speech.js`) segments the returned text by Unicode script run and routes each run to a matching-language voice (`hi-IN` vs `en-IN`). Romanized Hindi handed to an English voice reads as gibberish, so the prompt constraint and the TTS engineering have to agree.

Command **routing** (which of the four modes a teacher meant) is handled two ways:
- A fast local regex/keyword classifier (`web/src/lib/intents.js`) handles the common phrasings ("samjhao X", "quiz on X paanch sawaal", "X translate karo", "activity shuru karo X") with zero network latency — important for a tool meant to feel instant in a live class.
- Genuinely ambiguous utterances fall back to a `classify_intent` Gemini call.

## Localization notes

- Recognition language defaults to `hi-IN`, which in Chrome/Edge handles Hindi/English code-switching noticeably better than `en-IN` for this use case; it's a one-click toggle in the top bar.
- TTS voice selection is configurable per language (Hindi/English) in Settings, with auto-fallback if a preferred voice isn't installed on the device.
- A typed-command fallback is always available, both for accessibility and because classroom mic conditions are unpredictable — voice is the primary path, not the only path.

## Hands-free design

- **Push-to-talk** (default): click the mic, speak one command, it auto-stops.
- **Hands-free** (toggle): continuous listening gated by a wake phrase ("Hey Loqwi" / "साथी"-style cue), so ambient classroom noise doesn't trigger commands. Once inside Quiz or Activity mode, answers/controls ("A"/"B"/"C"/"D", "next", "pause", "stop") are accepted without the wake phrase, since the context already implies who's being addressed.
- **Barge-in**: saying "stop" while Loqwi is mid-explanation or mid-question immediately cancels speech, even in the middle of an utterance.

## Known limitations

- Web Speech API's `SpeechRecognition` is Chromium-only (Chrome/Edge) — Firefox/Safari fall back to the typed-input path, with a banner explaining why.
- Browser TTS voice quality/availability varies by OS; Windows/Edge generally ships usable `hi-IN` and `en-IN` voices out of the box.
- The in-memory rate limiter in `server/server.js` (60 requests/hour/IP) is a basic abuse guard for a small single-instance deployment, not a substitute for real auth/billing controls at scale.
- No persistent lesson history/analytics — this is a live-session tool, not a gradebook.

## Deliverables checklist

- [x] Functional prototype covering all four Option A requirements
- [x] STT/TTS audio pipeline
- [x] Web interface optimized for smart board (large-text "Smart Board" mode) and mobile (responsive layout)
- [x] Server-side API key handling (Gemini key never reaches the browser)
- [ ] Live URL — ready to deploy on Vercel (see "Deploying to Vercel" above) or any Node host that runs `server/` with `GEMINI_API_KEY` set as an environment variable
- [ ] Public GitHub repo
- [ ] Video walkthrough (≤3 min)
