import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimpleOptimizer, type OptimizerConfig } from '../../../src/evolution/optimizer.js';
import { Pipeline } from '../../../src/generator/pipeline.js';
import { MockLLMProvider } from '../../fixtures/mock-llm-responses.js';

describe('SimpleOptimizer', () => {
  let provider: MockLLMProvider;
  let pipeline: Pipeline;
  let optimizer: SimpleOptimizer;

  beforeEach(() => {
    provider = new MockLLMProvider();
    pipeline = new Pipeline(provider);
    optimizer = new SimpleOptimizer(pipeline);
  });

  it('should return original if score above threshold', async () => {
    const result = await optimizer.optimize('Test context', {
      populationSize: 5,
      scoreThreshold: 0.1, // Very low threshold
      maxRetries: 3,
    });

    expect(result.population).toBeDefined();
    expect(result.iterations).toBe(1);
    expect(result.bestScore).toBeGreaterThan(0);
  });

  it('should retry up to maxRetries when score below threshold', async () => {
    const generateSpy = vi.spyOn(pipeline, 'generate');

    await optimizer.optimize('Test context', {
      populationSize: 3,
      scoreThreshold: 0.99, // Impossibly high threshold
      maxRetries: 2,
    });

    // Should have called generate multiple times (initial + retries)
    expect(generateSpy).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should return best result among all attempts', async () => {
    // With fixed random seed (Halton), results should be deterministic
    const result = await optimizer.optimize('Test context', {
      populationSize: 5,
      scoreThreshold: 0.99,
      maxRetries: 2,
    });

    // Should have the best score from all attempts
    expect(result.bestScore).toBeGreaterThan(0);
    expect(result.iterations).toBe(3);
  });

  it('should use default config values', async () => {
    const result = await optimizer.optimize('Test context');

    expect(result.population.personas.length).toBeGreaterThan(0);
  });

  it('should track all iterations', async () => {
    const result = await optimizer.optimize('Test context', {
      populationSize: 3,
      scoreThreshold: 0.99,
      maxRetries: 1,
    });

    expect(result.iterations).toBe(2); // 1 initial + 1 retry
  });
});
