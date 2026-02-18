import type { Pipeline } from '../generator/pipeline.js';
import type { GeneratorConfig, Population, OptimizerResult, DiversityMetrics } from '../types.js';

export interface OptimizerConfig extends Partial<GeneratorConfig> {
  scoreThreshold?: number;
  maxRetries?: number;
}

const DEFAULT_OPTIMIZER_CONFIG = {
  populationSize: 25,
  numAxes: 6,
  samplerType: 'halton' as const,
  evaluateAfter: true,
  language: 'en',
  scoreThreshold: 0.5,
  maxRetries: 5,
};

/**
 * Simple optimizer that retries generation if diversity score is below threshold.
 * This is a simplified version of the full AlphaEvolve algorithm from the paper.
 */
export class SimpleOptimizer {
  constructor(private pipeline: Pipeline) {}

  /**
   * Generate personas with optional retry if diversity is low.
   */
  async optimize(
    context: string,
    config: OptimizerConfig = {}
  ): Promise<OptimizerResult> {
    const finalConfig = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };
    const { scoreThreshold, maxRetries, ...generatorConfig } = finalConfig;

    let bestPopulation: Population | null = null;
    let bestScore = -Infinity;
    let iterations = 0;

    for (let i = 0; i <= maxRetries; i++) {
      iterations++;

      // Generate with evaluation
      const population = await this.pipeline.generate(context, {
        ...generatorConfig,
        evaluateAfter: true,
      });

      const score = population.metrics?.overall ?? 0;
      const metrics = population.metrics;

      // Track best result
      if (score > bestScore) {
        bestScore = score;
        bestPopulation = population;
      }

      // Check individual metric thresholds (normalized)
      const dims = population.personas[0]?.coordinates.length ?? 1;
      const maxDist = Math.sqrt(dims);
      const normMeanPairwise = (metrics?.meanPairwiseDistance ?? 0) / maxDist;
      const meetsIndividual = (metrics?.convexHullVolume ?? 0) >= 0.5
        && normMeanPairwise >= 0.5;

      // Early exit if overall score and individual metrics are good enough
      if (score >= scoreThreshold && meetsIndividual) {
        break;
      }
    }

    if (!bestPopulation) {
      throw new Error('Failed to generate population');
    }

    return {
      population: bestPopulation,
      iterations,
      bestScore,
    };
  }
}

/**
 * Interface for future full AlphaEvolve implementation.
 */
export interface Optimizer {
  optimize(context: string, config?: OptimizerConfig): Promise<OptimizerResult>;
}
