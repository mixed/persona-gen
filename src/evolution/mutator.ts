import type { DiversityAxis, GeneratorConfig } from '../types.js';

/**
 * Configuration mutation strategies for future full AlphaEvolve implementation.
 * Currently provides placeholder interfaces.
 */

export interface MutationStrategy {
  name: string;
  mutate(config: GeneratorConfig): GeneratorConfig;
}

/**
 * Mutator that adjusts the number of axes.
 */
export class AxesCountMutator implements MutationStrategy {
  name = 'axes-count';

  mutate(config: GeneratorConfig): GeneratorConfig {
    const delta = Math.random() > 0.5 ? 1 : -1;
    const newAxes = Math.max(3, Math.min(12, (config.numAxes ?? 6) + delta));
    return { ...config, numAxes: newAxes };
  }
}

/**
 * Mutator that adjusts the population size.
 */
export class PopulationSizeMutator implements MutationStrategy {
  name = 'population-size';

  mutate(config: GeneratorConfig): GeneratorConfig {
    const multiplier = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
    const newSize = Math.max(5, Math.round(config.populationSize * multiplier));
    return { ...config, populationSize: newSize };
  }
}

/**
 * Mutator that shuffles or modifies custom axes.
 */
export class AxisDefinitionMutator implements MutationStrategy {
  name = 'axis-definition';

  mutate(config: GeneratorConfig): GeneratorConfig {
    if (!config.customAxes || config.customAxes.length < 2) {
      return config;
    }

    // Randomly swap two axes
    const axes = [...config.customAxes];
    const i = Math.floor(Math.random() * axes.length);
    const j = Math.floor(Math.random() * axes.length);
    [axes[i], axes[j]] = [axes[j], axes[i]];

    return { ...config, customAxes: axes };
  }
}

/**
 * Composite mutator that applies multiple mutations.
 */
export class CompositeMutator implements MutationStrategy {
  name = 'composite';

  constructor(private strategies: MutationStrategy[]) {}

  mutate(config: GeneratorConfig): GeneratorConfig {
    // Apply one random strategy
    const strategy = this.strategies[Math.floor(Math.random() * this.strategies.length)];
    return strategy.mutate(config);
  }
}

/**
 * Create default mutator set.
 */
export function createDefaultMutators(): CompositeMutator {
  return new CompositeMutator([
    new AxesCountMutator(),
    new PopulationSizeMutator(),
    new AxisDefinitionMutator(),
  ]);
}
