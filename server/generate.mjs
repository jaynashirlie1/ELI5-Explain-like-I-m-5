import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

async function main() {
  const { GoogleGenAI } = await import('@google/genai');

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  const port = process.env.PORT || 8787;

  const effectiveKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!effectiveKey) {
    console.error('Missing API key. Set API_KEY (or GEMINI_API_KEY) in your environment before running this server.');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  app.post('/generate', async (req, res) => {
    try {
      const { prompt, history } = req.body || {};
      if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [...(history || []), { role: 'user', parts: [{ text: prompt }] }],
      });

      let full = '';
      for await (const chunk of responseStream) {
        if (chunk && chunk.text) full += chunk.text;
      }

      res.json({ text: full });
    } catch (err) {
      console.error('Proxy error', err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.listen(port, () => console.log(`Gemini proxy listening on http://localhost:${port}`));
}

await main();
