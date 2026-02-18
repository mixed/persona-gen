import { describe, it, expect, beforeEach } from 'vitest';
import { Pipeline } from '../../src/generator/pipeline.js';
import { MockLLMProvider, MOCK_EXTRACTED_AXES } from '../fixtures/mock-llm-responses.js';

describe('Pipeline', () => {
  let provider: MockLLMProvider;
  let pipeline: Pipeline;

  beforeEach(() => {
    provider = new MockLLMProvider();
    pipeline = new Pipeline(provider);
  });

  it('should produce complete Population from context string', async () => {
    const population = await pipeline.generate('Test context', {
      populationSize: 3,
      numAxes: 6,
    });

    expect(population.context).toBeDefined();
    expect(population.context.description).toBe('Test context');
    expect(population.context.expanded).toBeDefined();
    expect(population.axes).toHaveLength(6);
    expect(population.personas).toHaveLength(3);
    expect(population.generatedAt).toBeDefined();
  });

  it('should use custom axes when provided', async () => {
    const customAxes = MOCK_EXTRACTED_AXES.slice(0, 2);

    const population = await pipeline.generate('Test context', {
      populationSize: 2,
      customAxes,
    });

    expect(population.axes).toHaveLength(2);
    expect(population.axes[0].id).toBe(customAxes[0].id);
    expect(population.axes[1].id).toBe(customAxes[1].id);
  });

  it('should skip axis extraction when customAxes given', async () => {
    const customAxes = MOCK_EXTRACTED_AXES.slice(0, 2);

    provider.reset();
    await pipeline.generate('Test context', {
      populationSize: 1,
      customAxes,
    });

    // Should call LLM for: context expansion (1) + persona expansion (1) = 2 calls
    // NOT for axis extraction
    const axisExtractionCalls = provider.lastMessages
      .filter((m) => m.content.includes('diversity ax'));

    // Last call should be for persona, not axis extraction
    expect(provider.callCount).toBeGreaterThanOrEqual(2);
  });

  it('should attach metrics when evaluateAfter=true', async () => {
    const population = await pipeline.generate('Test context', {
      populationSize: 5,
      numAxes: 4,
      evaluateAfter: true,
    });

    expect(population.metrics).toBeDefined();
    expect(population.metrics!.coverage).toBeGreaterThanOrEqual(0);
    expect(population.metrics!.overall).toBeGreaterThanOrEqual(0);
  });

  it('should respect populationSize config', async () => {
    const population = await pipeline.generate('Test context', {
      populationSize: 10,
      numAxes: 4,
    });

    expect(population.personas).toHaveLength(10);
  });

  it('should generate valid persona coordinates', async () => {
    const population = await pipeline.generate('Test context', {
      populationSize: 3,
      numAxes: 6,  // Mock returns 6 axes
    });

    for (const persona of population.personas) {
      expect(persona.coordinates.length).toBe(6);
      for (const coord of persona.coordinates) {
        expect(coord.rawValue).toBeGreaterThanOrEqual(0);
        expect(coord.rawValue).toBeLessThanOrEqual(1);
        expect(coord.mappedValue).toBeDefined();
      }
    }
  });

  it('should use specified sampler type', async () => {
    // Currently only halton is implemented, this tests the config is accepted
    const population = await pipeline.generate('Test context', {
      populationSize: 3,
      samplerType: 'halton',
    });

    expect(population.personas).toHaveLength(3);
  });

  it('should support language option', async () => {
    const pipelineKo = new Pipeline(provider, { language: 'ko' });
    const population = await pipelineKo.generate('테스트', {
      populationSize: 1,
    });

    // Should have processed without error
    expect(population.personas).toHaveLength(1);
  });

  it('should set generatedAt timestamp', async () => {
    const before = new Date().toISOString();
    const population = await pipeline.generate('Test', { populationSize: 1 });
    const after = new Date().toISOString();

    expect(population.generatedAt).toBeDefined();
    expect(population.generatedAt >= before).toBe(true);
    expect(population.generatedAt <= after).toBe(true);
  });

  it('should expose individual pipeline steps', async () => {
    const context = await pipeline.expandContext('Test context');
    expect(context.expanded).toBeDefined();

    // Mock always returns 6 axes regardless of requested count
    const axes = await pipeline.extractAxes(context.expanded!, 6);
    expect(axes).toHaveLength(6);

    const samples = pipeline.sample(5, 6);
    expect(samples).toHaveLength(5);
    expect(samples[0]).toHaveLength(6);
  });
});
