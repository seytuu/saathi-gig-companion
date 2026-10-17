# Project rules (PromptWars — read before every task)

## Goal
Ship a working, deployed AI app in under 3 hours. Judges reward intent, speed and execution — not complex boilerplate.

## Stack (do not add anything else)
- Node.js + Express server (`server.js`) serving a single-page front end from `/public`.
- Gemini API called ONLY from the server (`/api/agent`), never from the browser.
- API key from the `GEMINI_API_KEY` environment variable. Never hardcode keys.
- Deploy target: Google Cloud Run (`./deploy.sh`).

## How to work
1. Before coding, write a 5-line plan: user, problem, core workflow, the one AI action, what "done" looks like.
2. Build the smallest end-to-end version first. Deploy it. Then improve.
3. After every feature: run `npm start`, test it in the browser, fix errors before moving on.
4. Every AI feature must DO something (extract, decide, classify, generate a usable output, take an action) — not just chat.
5. Ask Gemini for structured JSON when the UI needs to render results; validate it and handle failures gracefully.

## UI
- Clean, minimal, mobile-friendly. One primary action per screen.
- Show loading states, empty states and readable error messages.
- Make the AI's output visible and useful at a glance (cards, checklists, tables), not a wall of text.

## Don'ts
- No auth, no database, no multi-agent architecture unless the challenge truly needs it.
- No new frameworks or build steps.
- Don't refactor working code in the last 30 minutes.
