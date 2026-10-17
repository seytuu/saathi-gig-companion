# PromptWars starter

## Tonight (20 min)
1. Find the separate invite email with the QR code; screenshot it.
2. Install Antigravity from antigravity.google, sign in, open this folder.
3. Get a Gemini API key at aistudio.google.com/apikey.
4. Run locally:
   ```
   npm install
   export GEMINI_API_KEY=your_key
   npm start            # open http://localhost:8080
   ```
5. Deploy once (needs gcloud CLI + a Google Cloud project with billing on):
   ```
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   chmod +x deploy.sh && ./deploy.sh
   ```
6. Sleep.

## Tomorrow
- In Antigravity, tell the agent: "Read AGENTS.md. Here is the challenge: ... Write the 5-line plan first."
- First edits: `SYSTEM_PROMPT` in server.js, title/subtitle in public/index.html.
- Deploy by minute 60. Pitch template in PITCH.md.

## Pack
Laptop + charger, government photo ID, QR invite on phone. Maya Hotel, Sector 35-B, Chandigarh. Report 9:00 AM.
