# Saathi — Gig Worker Companion

> **Platforms have an algorithm managing the worker. Saathi gives the worker an AI working for him.**

**Live:** https://saathi-gig-companion-taupe.vercel.app · **Stack:** Node 20 + Express · vanilla JS (no build step) · Google Gemini 3.8 Flash · Google Maps Platform · Vercel

Saathi is a multilingual, GenAI-powered companion for India's gig and informal workers — delivery partners, drivers and daily-wage workers. It turns the messy inputs they already use (Hinglish text, voice, payout screenshots, bank SMS, document photos) into structured, actionable help across **earnings, safety, rights & welfare schemes, documents and grievances**, in simple language.

---

## The user
**Ravi, 26, Swiggy delivery partner in Mohali.** Budget Android, patchy data, speaks Hindi/Punjabi, types Hinglish, 10–12 hour days. Platforms give him no access to his own data; support is a chatbot that loops; schemes he qualifies for are buried in English PDFs. He uses an app for ~30 seconds between orders.

Design constraints that follow: language-first, simple words, voice + text, one action per screen, works on low-end phones, no sign-up wall, his data stays on his phone.

## Features (all five areas from the brief)

| Area | What Saathi does |
|---|---|
| **Earnings tracking** | Log by typing, speaking, a payout **screenshot**, a pasted **bank/UPI SMS** or a **PDF** → Gemini extracts a ledger entry (orders, gross, incentives, deductions, expenses, net). Weekly totals, AI flags (missing incentive, unexplained deduction). Relative dates ("aaj", "kal") normalised to ISO in Asia/Kolkata. |
| **Safety practices** | Situation-based guidance (accident, unsafe late-night drop, harassment, heat/rain/pollution, breakdown/theft, hostile customer). **Hard-coded helplines** (112, 108, 1091, 181, 1033, 100) — never AI-generated. **SOS** (call 112 + share live location). **Nearby essentials** via Google Places (toilet, hospital, police, pharmacy, petrol, EV charging, ATM). **Live weather + AQI alerts** via Google Weather & Air Quality APIs. |
| **Rights & welfare schemes** | Schemes matched to the worker's profile (e-Shram, PM-JAY, PMSBY, PMJJBY, PM-SYM, state platform-worker laws, …) with eligibility, benefits, steps, documents needed and official links — plus "verify on the official portal". |
| **Document help** | Photo/PDF of any notice, payout slip or form → plain-language explanation, key points, actions needed, warnings. |
| **Grievance / dispute drafting** | Venting text → formal complaint in **English + the worker's language**, where to submit, evidence list. Copy / download / share to WhatsApp. |
| **Scam checker** | Paste a suspicious message (fake "platform support", OTP/KYC, loan apps) → verdict + what to do; cyber helpline **1930** and cybercrime.gov.in hard-coded. |

## Connected workflows
Every feature hands off to the next, through one shared on-device "worker record":
- **Earnings → Dispute → Grievance:** a flagged ledger row becomes a complaint letter with date, amount and evidence prefilled.
- **Schemes → Apply help → Documents:** a matched scheme opens its document checklist.
- **Safety → Grievance:** an incident (e.g. harassment, unfair penalty after an accident) becomes a complaint.
- **Home hub:** earnings summary, conditions alert, safety quick actions, saved schemes, open grievances.

## Built for the real user
- **Zero-setup onboarding:** no login, no OTP, no forms — only the language is required; everything else is skippable. Permissions (mic, location) are asked just-in-time.
- **Simple Mode** (inspired by Uber's simplified experience for seniors): bigger text (≥22px) and tap targets (56px), higher contrast, shorter AI answers, fewer choices — for older and low-literacy workers.
- **Multilingual:** English, Hindi, Hinglish, Punjabi, Tamil, Telugu, Bengali, Marathi; Noto Sans Devanagari/Gurmukhi fonts. Voice input (browser speech recognition) alongside text — never voice-only.
- **Data stays on the phone:** worker record in versioned localStorage with migrations and a crash-safe fallback (bad/old data is backed up and reset, never a blank screen).

## Data integrity — "AI suggests, worker confirms"
Unstructured input → structured records is where trust is won or lost:
- **Provenance** stored with records (source, raw input/transcript, model, time).
- **Deterministic cross-checks** (`src/utils/crossCheck.js`, no AI): numbers in the raw text vs extracted amounts, arithmetic (net = gross + incentives − deductions − expenses), sanity bounds.
- **Review before saving:** extracted fields are shown for confirmation/edit before entering the ledger; disputes use confirmed data.

## Generative AI usage

| Service | Where | What it does |
|---|---|---|
| **Google Gemini 3.8 Flash** (Gemini API, structured JSON output with per-mode `responseSchema`) | `src/ai/gemini.js` via the provider interface `src/ai/provider.js` | Core of every mode below |
| ↳ Earnings | `src/modes/earnings/` | Extraction from Hinglish text, **screenshots and PDFs (multimodal)**, SMS; flags suspicious items; tips |
| ↳ Safety | `src/modes/safety/` | Situation classification → do-now / don't / evidence / report-to steps in the worker's language |
| ↳ Schemes | `src/modes/schemes/` | Profile → matched welfare schemes with steps & documents (cached per profile) |
| ↳ Documents | `src/modes/document/` | **Multimodal** image/PDF understanding → plain-language explanation |
| ↳ Grievance | `src/modes/grievance/` | Drafts bilingual complaint letters + escalation targets |
| ↳ Scam check | `src/modes/scam/` | Classifies scam / suspicious / safe with reasons |
| **Google Places API (New)** | `src/routes/nearby.js` | Nearby toilets, hospitals, police, pharmacies, petrol, EV charging, ATMs (Maps deep-link fallback) |
| **Google Weather API + Air Quality API + Geocoding** | `src/routes/conditions.js` | Heat / rain / AQI alerts on Home (Open-Meteo fallback) |
| **Browser Web Speech API** | `public/js/voice.js` | Voice input in the worker's language |

Every system prompt carries a **prompt-injection guard** (`src/prompts/guards.js`): user text and media are treated as data, never instructions.

## Architecture
```
Browser (vanilla JS ES modules)
  features/<mode>.js ── ui/ components ── store.js (versioned worker record, migrations)
        │  POST /api/agent {mode, input, profile, media[]}
        ▼
Express app (src/app.js — helmet CSP, rate limit, validation, error middleware)
  /api/agent ─► mode registry (src/modes/index.js) ─► mode {prompt, schema, handler}
                                                         └─► AI provider ─► Gemini
  /api/nearby ─► Google Places API (New)     /api/conditions ─► Google Weather + Air Quality
        ▼
Vercel serverless (api/index.js → default-exported Express app) + static public/
```

### Add a new mode in 3 steps
1. Create `src/modes/<name>/` with `prompt.js` (system prompt + user prompt builder), `schema.js` (JSON response schema) and `handler.js`.
2. Register it in `src/modes/index.js` (one line).
3. Add `public/js/features/<name>.js` using the shared `ui/` components and `store.js`.

## Security
- API keys only in server env vars (never sent to the browser); Google calls proxied server-side, `connect-src 'self'`.
- Helmet + strict Content-Security-Policy (also mirrored in `vercel.json` for static assets), Permissions-Policy scoped to self.
- Rate limiting on `/api`, allow-listed modes/languages, input length and media type/size validation.
- Model output is rendered with DOM builders/`textContent` — never `innerHTML`.
- Generic errors to the client, details only in server logs; no PII or keys logged.
- Emergency numbers are hard-coded and tested, never generated by AI. No Aadhaar/bank numbers requested.

## Efficiency
Gemini Flash for low latency; structured JSON (no re-parsing chains); per-profile LRU cache for schemes; client-side image compression; static asset caching; no front-end framework or heavy libraries — fast on budget phones and slow networks.

## Testing & quality
- `npm test` — Node's built-in test runner, **75+ tests**: validation, JSON repair, registry dispatch, prompts (language + profile + injection guard), cross-checks, date normalisation, store migration, security headers, Vercel default export, routes with a mocked provider.
- `npm run lint` — ESLint (flat config) + Prettier; `// @ts-check` + JSDoc types.
- **GitHub Actions CI** runs lint + tests on every push.

## Accessibility
Mobile-first, WCAG AA contrast, 16px+ base text (22px in Simple Mode), large tap targets, labelled inputs, keyboard-navigable tabs, `aria-live` results, visible focus, `<html lang>` follows the chosen language, reduced-motion respected.

## Run locally
```bash
npm install
cp .env.example .env   # add GEMINI_API_KEY, GOOGLE_MAPS_API_KEY (optional: GEMINI_MODEL)
npm start              # http://localhost:8080
npm test && npm run lint
```

## Deploy (Vercel)
Import the GitHub repo → Framework preset "Other" → add env vars `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, `GOOGLE_MAPS_API_KEY` → Deploy. Every push to `main` redeploys.

## Roadmap (designed, not yet built)
- **Quick Capture:** one hold-to-record button; voice note → Indic speech-to-text (**Sarvam Saaras**, code-mix aware, Gemini audio fallback) → Gemini routes to the right feature.
- **Incident recorder ("dashcam"):** "Police ne roka" starts audio recording with timestamp, GPS and a SHA-256 integrity hash → AI summary → contest challan / complaint.
- **Challan Saathi:** papers checklist with PUC/insurance expiry reminders; calm script; e-challan check and contest flow.
- **Settlements:** expected vs received payouts (from credit SMS) with shortfall/delay flags and an escalation ladder (support → grievance officer → labour dept / welfare board → union).
- **Peer hazard reports:** anonymous, threshold-based (≥3 riders) alerts for stray dogs, potholes, waterlogging, unsafe areas, long restaurant waits.
- **Optional phone-OTP backup & multi-device sync** (Firebase Auth + Firestore) — login never blocks first use.
- **Native shell** (Capacitor/TWA): floating record bubble, lock-screen widget, volume-key SOS, background recording. **DigiLocker** integration once onboarded as a requester. Gemini **Grounding with Google Search/Maps** for cited scheme info and natural-language "nearby".

See [`docs/DECISIONS.md`](docs/DECISIONS.md) for the design decision log.
