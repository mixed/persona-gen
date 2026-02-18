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

  it('should return original if score above threshold and individual metrics met', async () => {
    const generateSpy = vi.spyOn(pipeline, 'generate');

    // Mock generate to return metrics that satisfy both overall and individual thresholds
    generateSpy.mockResolvedValue({
      personas: [
        { name: 'p1', background: '', demographics: { age: 25, gender: 'female', location: 'US', education: 'BS', occupation: 'eng', income: 'high' }, psychographics: { values: [], interests: [], lifestyle: '' }, coordinates: [0.1, 0.9] },
        { name: 'p2', background: '', demographics: { age: 45, gender: 'male', location: 'UK', education: 'MS', occupation: 'mgr', income: 'middle' }, psychographics: { values: [], interests: [], lifestyle: '' }, coordinates: [0.9, 0.1] },
      ],
      metadata: { context: 'test', generatedAt: new Date().toISOString(), config: { populationSize: 2, numAxes: 2 } },
      metrics: {
        coverage: 0.8,
        convexHullVolume: 0.7, // Above 0.5 threshold
        meanPairwiseDistance: 1.0, // normalized: 1.0/sqrt(2) ≈ 0.71, above 0.5
        minPairwiseDistance: 0.5,
        dispersion: 0.1,
        klDivergence: 0.1,
        overall: 0.8, // Above scoreThreshold of 0.1
      },
    });

    const result = await optimizer.optimize('Test context', {
      populationSize: 2,
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

  it('should use default maxRetries of 5', async () => {
    const generateSpy = vi.spyOn(pipeline, 'generate');

    await optimizer.optimize('Test context', {
      populationSize: 3,
      scoreThreshold: 0.99, // Impossibly high threshold
    });

    // Default maxRetries=5: 1 initial + 5 retries = 6 calls
    expect(generateSpy).toHaveBeenCalledTimes(6);
  });

  it('should retry when overall is high but individual metrics are low', async () => {
    const generateSpy = vi.spyOn(pipeline, 'generate');

    // Mock generate to return high overall but low convexHullVolume
    generateSpy.mockResolvedValue({
      personas: [{ name: 'p1', background: '', demographics: { age: 30, gender: 'male', location: 'US', education: 'BS', occupation: 'dev', income: 'middle' }, psychographics: { values: [], interests: [], lifestyle: '' }, coordinates: [0.5, 0.5] }],
      metadata: { context: 'test', generatedAt: new Date().toISOString(), config: { populationSize: 1, numAxes: 2 } },
      metrics: {
        coverage: 0.9,
        convexHullVolume: 0.1, // Below 0.5 threshold
        meanPairwiseDistance: 0.9,
        minPairwiseDistance: 0.5,
        dispersion: 0.1,
        klDivergence: 0.1,
        overall: 0.8, // Above scoreThreshold
      },
    });

    await optimizer.optimize('Test context', {
      populationSize: 1,
      scoreThreshold: 0.5,
      maxRetries: 2,
    });

    // Should retry because convexHullVolume < 0.5 even though overall >= threshold
    expect(generateSpy).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should log retry reasons with iteration count', async () => {
    const generateSpy = vi.spyOn(pipeline, 'generate');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock generate to return low metrics
    generateSpy.mockResolvedValue({
      personas: [{ name: 'p1', background: '', demographics: { age: 30, gender: 'male', location: 'US', education: 'BS', occupation: 'dev', income: 'middle' }, psychographics: { values: [], interests: [], lifestyle: '' }, coordinates: [0.5, 0.5] }],
      metadata: { context: 'test', generatedAt: new Date().toISOString(), config: { populationSize: 1, numAxes: 2 } },
      metrics: {
        coverage: 0.2,
        convexHullVolume: 0.1,
        meanPairwiseDistance: 0.3,
        minPairwiseDistance: 0.1,
        dispersion: 0.5,
        klDivergence: 0.8,
        overall: 0.3,
      },
    });

    await optimizer.optimize('Test context', {
      populationSize: 1,
      scoreThreshold: 0.5,
      maxRetries: 2,
    });

    // Should have logged 2 retry warnings (not on the last attempt)
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toMatch(/\[Optimizer\] Retry 1\/2/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/overall/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/convexHullVolume/);
    expect(warnSpy.mock.calls[1][0]).toMatch(/\[Optimizer\] Retry 2\/2/);

    warnSpy.mockRestore();
  });

  it('should not log when metrics pass on first try', async () => {
    const generateSpy = vi.spyOn(pipeline, 'generate');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    generateSpy.mockResolvedValue({
      personas: [
        { name: 'p1', background: '', demographics: { age: 25, gender: 'female', location: 'US', education: 'BS', occupation: 'eng', income: 'high' }, psychographics: { values: [], interests: [], lifestyle: '' }, coordinates: [0.1, 0.9] },
        { name: 'p2', background: '', demographics: { age: 45, gender: 'male', location: 'UK', education: 'MS', occupation: 'mgr', income: 'middle' }, psychographics: { values: [], interests: [], lifestyle: '' }, coordinates: [0.9, 0.1] },
      ],
      metadata: { context: 'test', generatedAt: new Date().toISOString(), config: { populationSize: 2, numAxes: 2 } },
      metrics: {
        coverage: 0.8,
        convexHullVolume: 0.7,
        meanPairwiseDistance: 1.0,
        minPairwiseDistance: 0.5,
        dispersion: 0.1,
        klDivergence: 0.1,
        overall: 0.8,
      },
    });

    await optimizer.optimize('Test context', {
      populationSize: 2,
      scoreThreshold: 0.5,
      maxRetries: 3,
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
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
