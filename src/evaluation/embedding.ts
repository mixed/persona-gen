import type { LLMProvider } from '../llm/provider.js';
import type { Persona } from '../types.js';
import { pcaReduce, minMaxNormalize } from './pca.js';

export type EmbeddingMode = 'coordinate' | 'api';

/**
 * Extract points from personas for diversity evaluation.
 * In coordinate mode, uses raw coordinate values.
 * In API mode, generates embeddings from persona descriptions,
 * then applies PCA dimensionality reduction and min-max normalization
 * to map high-dimensional embeddings into [0,1]^targetDims space.
 */
export async function getPersonaPoints(
  personas: Persona[],
  mode: EmbeddingMode = 'coordinate',
  llm?: LLMProvider,
  targetDims?: number
): Promise<number[][]> {
  if (mode === 'coordinate') {
    return personas.map((p) => p.coordinates.map((c) => c.rawValue));
  }

  if (mode === 'api') {
    if (!llm || !llm.embed) {
      throw new Error('API embedding mode requires an LLM provider with embed support');
    }

    const texts = personas.map((p) => p.description);
    const rawEmbeddings = await llm.embed(texts);

    // PCA dimensionality reduction + [0,1] normalization
    const dims = targetDims ?? 6;
    const reduced = pcaReduce(rawEmbeddings, dims);
    return minMaxNormalize(reduced);
  }

  throw new Error(`Unknown embedding mode: ${mode}`);
}
