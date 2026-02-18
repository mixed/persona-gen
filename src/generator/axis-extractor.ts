import type { LLMProvider } from '../llm/provider.js';
import type { DiversityAxis } from '../types.js';
import { buildAxisExtractionPrompt } from '../llm/prompts.js';
import { safeJSONParseArray } from '../utils/json.js';

export interface AxisExtractorOptions {
  language?: string;
}

export class AxisExtractor {
  private language: string;

  constructor(
    private llm: LLMProvider,
    options: AxisExtractorOptions = {}
  ) {
    this.language = options.language ?? 'en';
  }

  /**
   * Extract diversity axes from an expanded context.
   */
  async extract(expandedContext: string, numAxes: number): Promise<DiversityAxis[]> {
    const messages = buildAxisExtractionPrompt(expandedContext, numAxes, this.language);
    const response = await this.llm.chat(messages, { responseFormat: 'json' });

    const axes = safeJSONParseArray<DiversityAxis>(response, 'axis extraction response');

    for (const axis of axes) {
      AxisExtractor.validateAxis(axis);
    }

    return axes;
  }

  static validateAxis(axis: unknown): asserts axis is DiversityAxis {
    if (typeof axis !== 'object' || axis === null) {
      throw new Error('Axis must be an object');
    }

    const a = axis as Record<string, unknown>;

    if (typeof a.id !== 'string') {
      throw new Error('Axis must have a string id');
    }
    if (typeof a.name !== 'string') {
      throw new Error('Axis must have a string name');
    }
    if (typeof a.description !== 'string') {
      throw new Error('Axis must have a string description');
    }
    if (a.type !== 'continuous' && a.type !== 'categorical') {
      throw new Error('Axis type must be "continuous" or "categorical"');
    }

    if (a.type === 'continuous') {
      if (!Array.isArray(a.anchors) || a.anchors.length < 2) {
        throw new Error('Continuous axis must have at least 2 anchors');
      }
      for (const anchor of a.anchors) {
        if (typeof anchor.value !== 'number' || typeof anchor.label !== 'string') {
          throw new Error('Anchor must have numeric value and string label');
        }
      }
    }

    if (a.type === 'categorical') {
      if (!Array.isArray(a.categories) || a.categories.length < 2) {
        throw new Error('Categorical axis must have at least 2 categories');
      }
    }
  }
}
