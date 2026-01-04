
import { SYSTEM_INSTRUCTION } from "../constants";

export class GeminiService {
  async *generateExplanationStream(prompt: string, history: any[] = []) {
    // Dynamically import the official Gemini client only at runtime. This
    // avoids bundling a Node-only library into the browser build which can
    // break the app at runtime.
    let GoogleGenAI: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = await import('@google/genai');
      GoogleGenAI = mod.GoogleGenAI;
    } catch (err) {
      throw new Error(
        "Could not load @google/genai. If you're running in the browser, this library must be used from a server-side environment."
      );
    }

    const effectiveKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';

    if (!effectiveKey) {
      const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
      const hint = isBrowser
        ? "It looks like you're attempting to call Gemini from the browser.\n" +
          "Gemini API keys are secret and should be used from a trusted server only.\n" +
          "If you want to test locally, run a small server-side proxy that holds the key."
        : "No API key found. Set API_KEY (or GEMINI_API_KEY / VITE_GEMINI_API_KEY) in your .env and restart the dev server.";

      throw new Error(`Gemini configuration error: ${hint}`);
    }

    // If running in the browser, call a local server proxy which holds the
    // secret API key. This prevents leaking secrets into the client bundle.
    const isBrowser = typeof window !== 'undefined' && typeof window.fetch === 'function';
    if (isBrowser) {
      try {
  const base = ((import.meta as any).env && (import.meta as any).env.BASE_URL) || '';
  const resp = await fetch(base + '/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, history }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Proxy error: ${resp.status} ${errText}`);
        }
        const data = await resp.json();
        // yield the whole text once (proxy isn't streaming in this simple setup)
        yield data.text || '';
        return;
      } catch (err: any) {
        console.error('Client proxy request failed', err);
        throw err;
      }
    }

    // Server-side: initialize the client with the effective key and stream
    const ai = new GoogleGenAI({ apiKey: effectiveKey });

    try {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error: any) {
      console.error("Gemini API Error Detail:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
