import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import { fileURLToPath } from 'url';
import { generateStudioScoreWav } from './src/server/audioScoreGenerator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Forest Friends Video Scorer API', timestamp: new Date().toISOString() });
  });

  // Score generation endpoint
  app.post('/api/score', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      const { mode, videoBase64, videoMimeType, userDirection, mood, durationSec } = req.body;

      // Clean prompt context
      const directionText = userDirection && userDirection.trim()
        ? `Director notes: ${userDirection.trim()}`
        : 'Cinematic, magical forest ambiance, gentle orchestral progression, organic instruments.';

      const moodText = mood ? `Preset mood: ${mood}.` : '';

      const ai = new GoogleGenAI({
        apiKey,
        serverParams: {
          headers: {
            'x-goog-api-client': 'ai-studio-scorer/1.0.0',
            'origin': 'https://aistudio.google.com'
          }
        }
      });

      let musicPrompt = '';
      if (mode === 'movie') {
        musicPrompt = `Compose an original orchestral cinematic soundtrack for the animated short film 'Enhanced Forest Friends'.
Story: A young fawn and tiny rabbit wander into a mystical bioluminescent forest glade.
Visual elements: Soft emerald moss, glowing morning mist, playful fireflies dancing over a tranquil creek.
Emotional Arc:
- 00:00 - 00:10: Gentle wonder, curiosity, tender acoustic harp and muted strings.
- 00:10 - 00:25: Playful discovery, fluttering woodwinds, pizzicato strings, glockenspiel.
- 00:25 - 00:45: Deep cinematic awe, rich warm cellos, french horns, sweeping orchestral swells.
- 00:45 - 01:02: Peaceful resolution, fading warm pads, solitary oboe, soft magical chime sparkle.
${moodText} ${directionText}`;
      } else {
        musicPrompt = `Compose an original cinematic musical soundtrack bed for video content.
Atmosphere: Lush orchestral instrumentation, cinematic dynamics, emotive melody.
${moodText} ${directionText}`;
      }

      let audioBase64 = '';
      let audioSource: 'lyria' | 'procedural' = 'lyria';
      let isFallback = false;
      let fallbackMsg = '';
      let proceduralPlan: any = null;

      // Attempt Lyria API call
      try {
        console.log('[Server] Requesting score from Google Lyria models...');
        const response = await ai.models.generateContentStream({
          model: 'lyria-3-pro-preview',
          contents: musicPrompt,
          config: {
            responseModalities: [Modality.AUDIO]
          }
        });

        for await (const chunk of response) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              audioBase64 += part.inlineData.data;
            }
          }
        }

        if (!audioBase64) {
          console.log('[Server] Testing secondary Lyria model: lyria-3-clip-preview');
          const clipResponse = await ai.models.generateContentStream({
            model: 'lyria-3-clip-preview',
            contents: musicPrompt,
            config: {
              responseModalities: [Modality.AUDIO]
            }
          });

          for await (const chunk of clipResponse) {
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (!parts) continue;
            for (const part of parts) {
              if (part.inlineData?.data) {
                audioBase64 += part.inlineData.data;
              }
            }
          }
        }
      } catch (lyriaErr: any) {
        console.warn('Lyria synthesis API notice, activating high-fidelity studio score engine:', lyriaErr?.message || lyriaErr);
        isFallback = true;
        fallbackMsg = lyriaErr?.message || String(lyriaErr);
      }

      // If Lyria audio stream wasn't produced or errored, activate procedural studio score engine
      if (isFallback || !audioBase64) {
        isFallback = true;
        audioSource = 'procedural';

        try {
          const schemaPrompt = `You are a film score composer drafting audio chord structures.
Review the film requirements: "${musicPrompt}"
Provide a clean JSON music specification matching this schema:
{
  "tempoBpm": 80,
  "keySignature": "E Lydian",
  "baseFrequencyHz": 164.81,
  "scales": [1, 1.125, 1.25, 1.5, 1.667],
  "chordSequence": [
    { "timeMs": 0, "chordName": "E Major", "rootFreq": 164.81, "type": "major" },
    { "timeMs": 5500, "chordName": "F# Major", "rootFreq": 185, "type": "major" },
    { "timeMs": 10500, "chordName": "G# Minor", "rootFreq": 207.65, "type": "minor" },
    { "timeMs": 18500, "chordName": "C# Minor", "rootFreq": 138.59, "type": "minor" },
    { "timeMs": 26500, "chordName": "A Major", "rootFreq": 110, "type": "major" },
    { "timeMs": 35500, "chordName": "B Sus4", "rootFreq": 123.47, "type": "sus4" },
    { "timeMs": 48500, "chordName": "E Maj7", "rootFreq": 164.81, "type": "maj7" },
    { "timeMs": 58000, "chordName": "E Major", "rootFreq": 164.81, "type": "major" }
  ]
}
Output valid JSON only.`;

          const planResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: schemaPrompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          const planText = planResponse.text;
          if (planText) {
            proceduralPlan = JSON.parse(planText);
          }
        } catch (planErr) {
          console.error('Using default cinematic progression:', planErr);
          proceduralPlan = {
            tempoBpm: 80,
            keySignature: 'E Lydian',
            baseFrequencyHz: 164.81,
            scales: [1, 1.125, 1.25, 1.5, 1.667],
            chordSequence: [
              { timeMs: 0, chordName: 'E Major', rootFreq: 164.81, type: 'major' },
              { timeMs: 5500, chordName: 'F# Major', rootFreq: 185, type: 'major' },
              { timeMs: 10500, chordName: 'G# Minor', rootFreq: 207.65, type: 'minor' },
              { timeMs: 18500, chordName: 'C# Minor', rootFreq: 138.59, type: 'minor' },
              { timeMs: 26500, chordName: 'A Major', rootFreq: 110, type: 'major' },
              { timeMs: 35500, chordName: 'B Sus4', rootFreq: 123.47, type: 'sus4' },
              { timeMs: 48500, chordName: 'E Maj7', rootFreq: 164.81, type: 'maj7' },
              { timeMs: 58000, chordName: 'E Major (Quiet)', rootFreq: 164.81, type: 'major' }
            ]
          };
        }

        const targetDuration = Number(durationSec) > 0 ? Number(durationSec) : (mode === 'movie' ? 62.5 : 60);
        audioBase64 = generateStudioScoreWav({
          durationSec: targetDuration,
          moodId: mood,
          moodName: mood,
          proceduralPlan
        });
      }

      return res.json({
        musicPrompt,
        audioBase64,
        audioSource,
        isFallback,
        fallbackMsg,
        proceduralPlan
      });

    } catch (err: any) {
      console.error('Score generation API error:', err);
      return res.status(500).json({ error: err.message || 'An error occurred during score generation.' });
    }
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on host 0.0.0.0 and port ${PORT}`);
  });
}

startServer();
