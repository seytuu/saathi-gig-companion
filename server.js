import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const API_KEY = process.env.GEMINI_API_KEY;
// Change the model with the GEMINI_MODEL env var if this one isn't available.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// System instruction: edit this first once the challenge is revealed.
const SYSTEM_PROMPT = `You are an assistant that turns the user's input into a clear, actionable result.
Respond ONLY with JSON in this shape:
{"title": string, "summary": string, "items": [{"label": string, "detail": string}]}`;

async function callGemini(userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "{}";
  return JSON.parse(text);
}

app.post("/api/agent", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
    const input = (req.body?.input || "").trim();
    if (!input) return res.status(400).json({ error: "Please enter something first." });
    res.json(await callGemini(input));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.get("/healthz", (_req, res) => res.send("ok"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
