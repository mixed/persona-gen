// Main API exports for persona-gen library

// Types
export type {
  ChatMessage,
  LLMOptions,
  ResponseSchema,
  Context,
  AxisAnchor,
  DiversityAxis,
  PersonaCoordinate,
  Persona,
  EvaluablePersona,
  DiversityMetrics,
  Population,
  GeneratorConfig,
  OptimizerResult,
} from './types.js';

// LLM Provider
export type { LLMProvider } from './llm/provider.js';
export { OpenAIProvider, type OpenAIProviderConfig } from './llm/openai.js';

// Sampler
export type { Sampler } from './sampler/sampler.js';
export { HaltonSampler, type HaltonOptions, PRIMES } from './sampler/halton.js';
export { AxisMapper, mapValue, mapCoordinates } from './sampler/mapper.js';

// Generator Pipeline
export { Pipeline, type PipelineOptions } from './generator/pipeline.js';
export { ContextExpander, type ContextExpanderOptions } from './generator/context-expander.js';
export { AxisExtractor, type AxisExtractorOptions } from './generator/axis-extractor.js';
export { PersonaExpander, type PersonaExpanderOptions } from './generator/persona-expander.js';

// Evaluation
export {
  computeCoverage,
  computeConvexHullVolume,
  computeMeanPairwiseDistance,
  computeMinPairwiseDistance,
  computeDispersion,
  computeKLDivergence,
  computeAllMetrics,
} from './evaluation/metrics.js';
export { getPersonaPoints, type EmbeddingMode } from './evaluation/embedding.js';

// Output
export { MarkdownRenderer } from './output/markdown.js';
export { JSONRenderer, type JSONRendererOptions } from './output/json.js';

// Prompts (for advanced users)
export {
  buildContextExpansionPrompt,
  buildAxisExtractionPrompt,
  buildPersonaExpansionPrompt,
  buildQuestionnairePrompt,
} from './llm/prompts.js';

// Schemas (for Structured Outputs)
export {
  axisExtractionSchema,
  personaExpansionSchema,
  questionnaireSchema,
  personaResponseSchema,
} from './llm/schemas.js';

// Evolution / Optimizer
export { SimpleOptimizer, type OptimizerConfig, type Optimizer } from './evolution/optimizer.js';
export {
  type MutationStrategy,
  AxesCountMutator,
  PopulationSizeMutator,
  AxisDefinitionMutator,
  CompositeMutator,
  createDefaultMutators,
} from './evolution/mutator.js';

// Questionnaire
export {
  QuestionnaireGenerator,
  PersonaResponder,
  analyzeResponseDiversity,
  type Question,
  type Answer,
  type PersonaResponse,
} from './evaluation/questionnaire.js';

// Convenience class that wraps the pipeline
import { Pipeline, type PipelineOptions } from './generator/pipeline.js';
import type { LLMProvider } from './llm/provider.js';
import type { GeneratorConfig, Population, DiversityMetrics } from './types.js';
import { MarkdownRenderer } from './output/markdown.js';
import { JSONRenderer } from './output/json.js';

export interface PersonaGeneratorOptions extends PipelineOptions {}

export class PersonaGenerator {
  private pipeline: Pipeline;
  private mdRenderer: MarkdownRenderer;
  private jsonRenderer: JSONRenderer;

  constructor(llm: LLMProvider, options: PersonaGeneratorOptions = {}) {
    this.pipeline = new Pipeline(llm, options);
    this.mdRenderer = new MarkdownRenderer();
    this.jsonRenderer = new JSONRenderer();
  }

  /**
   * Generate a population of diverse personas.
   */
  async generate(context: string, config?: Partial<GeneratorConfig>): Promise<Population> {
    return this.pipeline.generate(context, config);
  }

  /**
   * Expand a context description.
   */
  async expandContext(description: string) {
    return this.pipeline.expandContext(description);
  }

  /**
   * Extract diversity axes from expanded context.
   */
  async extractAxes(expandedContext: string, numAxes: number) {
    return this.pipeline.extractAxes(expandedContext, numAxes);
  }

  /**
   * Generate quasi-random samples.
   */
  sample(numSamples: number, numDimensions: number) {
    return this.pipeline.sample(numSamples, numDimensions);
  }

  /**
   * Evaluate diversity metrics for personas.
   */
  evaluate(personas: { coordinates: { rawValue: number }[] }[]): DiversityMetrics {
    return this.pipeline.evaluate(personas);
  }

  /**
   * Render population to Markdown.
   */
  toMarkdown(population: Population): string {
    return this.mdRenderer.render(population);
  }

  /**
   * Render population to JSON.
   */
  toJSON(population: Population): string {
    return this.jsonRenderer.render(population);
  }
}
