import type { LLMProvider } from '../llm/provider.js';
import type {
  Context,
  DiversityAxis,
  EvaluablePersona,
  GeneratorConfig,
  Persona,
  PersonaCoordinate,
  Population,
  DiversityMetrics,
} from '../types.js';
import { ContextExpander } from './context-expander.js';
import { AxisExtractor } from './axis-extractor.js';
import { PersonaExpander } from './persona-expander.js';
import { HaltonSampler } from '../sampler/halton.js';
import { mapCoordinates } from '../sampler/mapper.js';
import { computeAllMetrics } from '../evaluation/metrics.js';
import { getPersonaPoints } from '../evaluation/embedding.js';

export interface PipelineOptions {
  language?: string;
  concurrency?: number;
}

const DEFAULT_CONFIG: GeneratorConfig = {
  populationSize: 40,
  numAxes: 6,
  samplerType: 'halton',
  evaluateAfter: false,
  language: 'en',
};

export class Pipeline {
  private contextExpander: ContextExpander;
  private axisExtractor: AxisExtractor;
  private personaExpander: PersonaExpander;
  private sampler: HaltonSampler;
  private language: string;

  constructor(
    private llm: LLMProvider,
    options: PipelineOptions = {}
  ) {
    this.language = options.language ?? 'en';

    this.contextExpander = new ContextExpander(llm, { language: this.language });
    this.axisExtractor = new AxisExtractor(llm, { language: this.language });
    this.personaExpander = new PersonaExpander(llm, {
      language: this.language,
      concurrency: options.concurrency ?? 5,
    });
    this.sampler = new HaltonSampler();
  }

  /**
   * Generate a complete population of personas.
   */
  async generate(
    contextDescription: string,
    config: Partial<GeneratorConfig> = {}
  ): Promise<Population> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Step 1: Expand context
    const context = await this.expandContext(contextDescription);

    // Step 2: Extract or use custom axes
    let axes: DiversityAxis[];
    if (finalConfig.customAxes && finalConfig.customAxes.length > 0) {
      // Validate custom axes before using
      for (const axis of finalConfig.customAxes) {
        AxisExtractor.validateAxis(axis);
      }
      axes = finalConfig.customAxes;
    } else {
      axes = await this.extractAxes(
        context.expanded!,
        finalConfig.numAxes ?? 6
      );
    }

    // Step 3: Sample coordinates
    const rawSamples = this.sample(finalConfig.populationSize, axes.length);

    // Step 4: Map raw values to semantic labels
    const mappedCoordinates = mapCoordinates(rawSamples, axes);

    // Step 5: Expand personas
    const personas = await this.personaExpander.expandAll(
      context.expanded!,
      axes,
      mappedCoordinates
    );

    // Step 6: Optionally compute metrics (using API embeddings)
    let metrics: DiversityMetrics | undefined;
    if (finalConfig.evaluateAfter) {
      metrics = await this.evaluate(personas, axes.length);
    }

    return {
      context,
      axes,
      personas,
      metrics,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Expand a context description.
   */
  async expandContext(description: string): Promise<Context> {
    return this.contextExpander.expandContext(description);
  }

  /**
   * Extract diversity axes from expanded context.
   */
  async extractAxes(expandedContext: string, numAxes: number): Promise<DiversityAxis[]> {
    return this.axisExtractor.extract(expandedContext, numAxes);
  }

  /**
   * Generate quasi-random samples.
   */
  sample(numSamples: number, numDimensions: number): number[][] {
    return this.sampler.generate(numSamples, numDimensions);
  }

  /**
   * Compute diversity metrics for a set of personas using API embeddings.
   */
  async evaluate(personas: EvaluablePersona[], targetDims?: number): Promise<DiversityMetrics> {
    const points = await getPersonaPoints(personas as Persona[], 'api', this.llm, targetDims);
    return computeAllMetrics(points);
  }
}
