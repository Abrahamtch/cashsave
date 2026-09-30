// ============================================
// Coach Abraham — Client Gemini + boucle function calling
// ============================================

import { GoogleGenAI } from '@google/genai';
import { toolDeclarations, runTool } from './tools';
import { buildSystemPrompt, FALLBACK_MESSAGE, TOO_MANY_STEPS_MESSAGE } from './prompt';
import type { CoachContext } from './prompt';
import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_TURNS = 4;

interface CoachMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: Record<string, unknown> } }>;
}

interface RunCoachArgs {
  history: CoachMessage[];
  userMessage: string;
  ctx: CoachContext;
  supabase: SupabaseClient;
}

interface RunCoachResult {
  text: string;
  toolsUsed: string[];
}

export async function runCoach({ history, userMessage, ctx, supabase }: RunCoachArgs): Promise<RunCoachResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Coach] GEMINI_API_KEY is not set');
    return { text: FALLBACK_MESSAGE, toolsUsed: [] };
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  const contents: CoachMessage[] = [
    ...history,
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const toolsUsed: string[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    try {
      const res = await ai.models.generateContent({
        model: modelName,
        contents: contents as unknown as Array<{ role: string; parts: Array<{ text?: string }> }>,
        config: {
          systemInstruction: buildSystemPrompt(ctx),
          tools: [{ functionDeclarations: toolDeclarations }],
          temperature: 0.4,
          maxOutputTokens: 600,
        },
      });

      // Extraire les function calls
      const calls = res.functionCalls ?? [];

      if (calls.length === 0) {
        // Réponse textuelle finale
        const responseText = res.text ?? FALLBACK_MESSAGE;
        return { text: responseText, toolsUsed };
      }

      // Renvoyer le contenu du modèle tel quel
      if (res.candidates && res.candidates[0] && res.candidates[0].content) {
        contents.push(res.candidates[0].content as unknown as CoachMessage);
      }

      // Exécuter les outils en parallèle
      const results = await Promise.all(
        calls.map(async (c) => {
          const toolName = c.name!;
          toolsUsed.push(toolName);
          return {
            functionResponse: {
              name: toolName,
              response: await runTool(toolName, c.args ?? {}, supabase, ctx),
            },
          };
        })
      );

      // Renvoyer les résultats d'outils
      contents.push({
        role: 'user',
        parts: results,
      } as unknown as CoachMessage);

    } catch (err: unknown) {
      console.error('[Coach] Gemini error:', err);

      // Retry une fois pour les erreurs temporaires (5xx, réseau)
      const errMsg = err instanceof Error ? err.message : String(err);
      if (turn === 0 && (errMsg.includes('500') || errMsg.includes('503') || errMsg.includes('network'))) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      return { text: FALLBACK_MESSAGE, toolsUsed };
    }
  }

  return { text: TOO_MANY_STEPS_MESSAGE, toolsUsed };
}
