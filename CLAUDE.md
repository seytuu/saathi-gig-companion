# Project rules (Saathi — read before every task)

## Goal
Ship a working, deployed AI app that gig workers can actually use. Judging weights code quality and problem alignment highest. The warm-up problem continues into the main challenge, so **architecture extensibility beats feature count**.

## Stack (do not add anything else)
- Node.js 20+ with Express; vanilla JS ES modules on the front end; no build step, no database, no auth.
- Gemini API (default `gemini-2.5-flash`) called ONLY from the server via `/api/agent`, never from the browser.
- API key from `GEMINI_API_KEY`. Never hardcode keys. Local `.env` is loaded by `node --env-file-if-exists=.env`.
- **Deploy target: Vercel.** `server.js` runs locally; `api/index.js` is the Vercel entry (both import the same `src/app.js`).

## How to work
1. Before coding, write a 5-line plan: user, problem, core workflow, the one AI action, what "done" looks like.
2. Build the smallest end-to-end version first. Push + deploy. Then improve.
3. After every milestone: `npm run lint`, `npm test`, start the server, hit `/api/health`, click through, commit + push.
4. Every AI feature must DO something (extract, classify, match, draft) — not just chat. Ask Gemini for schema-validated JSON.
5. All AI output in the worker's language, simple words, short sentences.

## UI
- WhatsApp-familiar, mobile-first. One primary action per screen.
- Loading, empty and friendly localized error states everywhere.
- Render AI output via DOM builders / `textContent`. Never `innerHTML` of untrusted content.

## Security (judges score it)
- Server-side validation of mode / language / profile / media (allow-lists + size caps).
- Helmet strict CSP, express-rate-limit on `/api`.
- Every system prompt includes a prompt-injection guard.
- Never ask for Aadhaar / full bank account numbers.
- Helplines are hard-coded in `src/config.js`.

## Don'ts
- No auth, no database, no multi-agent architecture.
- No new frameworks or build steps.
- No raw video uploads — sample frames in the browser.
- Don't refactor working code in the last 30 minutes.
