require('dotenv').config({path: '.env.local'});
const express = require('express');
// using global fetch available in Node 18+/24+ on Vercel

const app = express();
app.use(express.json({ limit: '10kb' })); // parse JSON requests

app.get('/health', (req, res) => res.status(200).send('OK'));

// Admin: list detected/candidate models and optional discovery (use v1beta only)
let cachedModel = process.env.GEMINI_MODEL || null;
let cachedModelApiVersion = 'v1'; // only v1beta is used now

const candidateModels = (process.env.GEMINI_MODEL_CANDIDATES || 'gemini-2.5').split(',').map(s => s.trim()).filter(Boolean);

function genGenerateUrl(version, model) {
  return `https://generativelanguage.googleapis.com/${version}/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
}

async function probeModel(model) {
  try {
    // Try v1beta only
    const url = genGenerateUrl('v1beta', model);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Model availability check' }] }] })
      });
      if (resp.ok) return 'v1beta';
    } catch (e) {
      // ignore
    }
    return null;
  } catch (e) {
    console.error('probeModel error for', model, e && e.message);
    return null;
  }
} 

async function listAvailableModels() {
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.models || null;
  } catch (e) {
    return null;
  }
} 

async function detectModel() {
  if (cachedModel && cachedModelApiVersion) return { model: cachedModel, version: cachedModelApiVersion };
  if (process.env.GEMINI_MODEL) {
    cachedModel = process.env.GEMINI_MODEL;
    cachedModelApiVersion = process.env.GEMINI_MODEL_API_VERSION || 'v1beta';
    return { model: cachedModel, version: cachedModelApiVersion };
  }

  // Probe candidate models
  for (const m of candidateModels) {
    const ver = await probeModel(m);
    if (ver) {
      cachedModel = m;
      cachedModelApiVersion = ver;
      return { model: m, version: ver };
    }
  }

  // Try listing models and probing a few
  const models = await listAvailableModels();
  if (Array.isArray(models)) {
    for (const mod of models) {
      const name = mod.name || mod.model || (typeof mod === 'string' ? mod : null);
      if (name) {
        const ver = await probeModel(name);
        if (ver) {
          cachedModel = name;
          cachedModelApiVersion = ver;
          return { model: name, version: ver };
        }
      }
    }
  }

  return null;
}

app.get('/models', async (req, res) => {
  const avail = await listAvailableModels();
  console.log('candidates:', candidateModels);
  res.json({ detected: cachedModel ? { model: cachedModel, version: cachedModelApiVersion } : null, candidates: candidateModels, available: avail });
});

// The endpoint your extension will call
app.post('/api/explain', async (req, res) => {
  const { error, message } = req.body || {};
  const text = error || message;

  if (!text) return res.status(400).json({ error: 'Missing error text (send `message` or `error` in JSON body)' });

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("bananan", process.env.GEMINI_API_KEY);  
      console.error('Missing GEMINI_API_KEY');
      return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });
    }

    const det = await detectModel();

    if (!det) {
      const explanation = `(Server) No compatible model found. Please set GEMINI_MODEL manually or check available models at /models`;
      return res.status(200).json({ explanation });
    }

    const url = genGenerateUrl(det.version, det.model);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Explain this error clearly:\n${text}` }]
        }]
      })
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.error('Gemini API returned non-2xx', response.status, bodyText);
      const explanation = `(Server) Upstream API error ${response.status}: ${bodyText}`;
      return res.status(200).json({ explanation, upstreamError: { status: response.status, body: bodyText } });
    }

    const data = await response.json();

    res.json({
      explanation: data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response',
      input: text
    });

  } catch (err) {
    console.error('explain handler error:', err);
    res.status(500).json({ error: 'Failed to call Gemini', details: String(err.message || err) });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});
