import type { LLMProvider } from '../llm/provider.js';
import type { DiversityAxis, Persona, PersonaCoordinate } from '../types.js';
import { buildPersonaExpansionPrompt } from '../llm/prompts.js';
import { personaExpansionSchema } from '../llm/schemas.js';
import { safeJSONParse } from '../utils/json.js';

export interface PersonaExpanderOptions {
  language?: string;
  concurrency?: number;
}

interface PersonaLLMResponse {
  name: string;
  description: string;
  traits: Record<string, string>;
  behaviorPatterns: string[];
}

export class PersonaExpander {
  private language: string;
  private concurrency: number;

  constructor(
    private llm: LLMProvider,
    options: PersonaExpanderOptions = {}
  ) {
    this.language = options.language ?? 'en';
    this.concurrency = options.concurrency ?? 5;
  }

  /**
   * Expand a single set of coordinates into a full persona.
   */
  async expand(
    context: string,
    axes: DiversityAxis[],
    coordinates: PersonaCoordinate[],
    id: string
  ): Promise<Persona> {
    const messages = buildPersonaExpansionPrompt(context, axes, coordinates, this.language);
    const response = await this.llm.chat(messages, {
      responseFormat: 'json',
      responseSchema: personaExpansionSchema,
    });

    const parsed = safeJSONParse<PersonaLLMResponse>(response, 'persona expansion response');

    return {
      id,
      name: parsed.name,
      coordinates,
      description: parsed.description,
      traits: parsed.traits ?? {},
      behaviorPatterns: parsed.behaviorPatterns ?? [],
    };
  }

  /**
   * Expand multiple coordinate sets into personas with concurrency control.
   */
  async expandAll(
    context: string,
    axes: DiversityAxis[],
    coordinateSets: PersonaCoordinate[][]
  ): Promise<Persona[]> {
    const results: Persona[] = [];
    const queue = coordinateSets.map((coords, index) => ({
      coords,
      id: `persona-${index + 1}`,
    }));

    // Process in batches based on concurrency
    for (let i = 0; i < queue.length; i += this.concurrency) {
      const batch = queue.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(
        batch.map((item) => this.expand(context, axes, item.coords, item.id))
      );
      results.push(...batchResults);
    }

    return results;
  }
}
