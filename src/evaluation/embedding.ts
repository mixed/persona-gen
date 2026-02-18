import type { LLMProvider } from '../llm/provider.js';
import type { Persona } from '../types.js';

export type EmbeddingMode = 'coordinate' | 'api';

/**
 * Extract points from personas for diversity evaluation.
 * In coordinate mode, uses raw coordinate values.
 * In API mode, generates embeddings from persona descriptions.
 */
export async function getPersonaPoints(
  personas: Persona[],
  mode: EmbeddingMode = 'coordinate',
  llm?: LLMProvider
): Promise<number[][]> {
  if (mode === 'coordinate') {
    return personas.map((p) => p.coordinates.map((c) => c.rawValue));
  }

  if (mode === 'api') {
    if (!llm || !llm.embed) {
      throw new Error('API embedding mode requires an LLM provider with embed support');
    }

    const texts = personas.map((p) => p.description);
    return llm.embed(texts);
  }

  throw new Error(`Unknown embedding mode: ${mode}`);
}
