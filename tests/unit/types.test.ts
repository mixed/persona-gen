import { describe, it, expect } from 'vitest';
import type {
  ChatMessage,
  LLMOptions,
  Context,
  DiversityAxis,
  PersonaCoordinate,
  Persona,
  DiversityMetrics,
  Population,
  GeneratorConfig,
} from '../../src/types.js';
import type { LLMProvider } from '../../src/llm/provider.js';
import type { Sampler } from '../../src/sampler/sampler.js';
import { MockLLMProvider } from '../fixtures/mock-llm-responses.js';

describe('Core Types', () => {
  it('should define ChatMessage type correctly', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hello',
    };
    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello');
  });

  it('should define LLMOptions type correctly', () => {
    const options: LLMOptions = {
      temperature: 0.7,
      maxTokens: 1000,
      responseFormat: 'json',
    };
    expect(options.temperature).toBe(0.7);
    expect(options.responseFormat).toBe('json');
  });

  it('should define Context type correctly', () => {
    const context: Context = {
      description: 'Test context',
      expanded: 'Expanded description',
      domain: 'technology',
    };
    expect(context.description).toBe('Test context');
    expect(context.expanded).toBe('Expanded description');
  });

  it('should define DiversityAxis type correctly', () => {
    const continuousAxis: DiversityAxis = {
      id: 'tech-literacy',
      name: 'Tech Literacy',
      description: 'Technical proficiency',
      type: 'continuous',
      anchors: [
        { value: 0, label: 'Low' },
        { value: 1, label: 'High' },
      ],
    };
    expect(continuousAxis.type).toBe('continuous');
    expect(continuousAxis.anchors).toHaveLength(2);

    const categoricalAxis: DiversityAxis = {
      id: 'age-group',
      name: 'Age Group',
      description: 'Age categories',
      type: 'categorical',
      categories: ['20s', '30s', '40s'],
    };
    expect(categoricalAxis.type).toBe('categorical');
    expect(categoricalAxis.categories).toHaveLength(3);
  });

  it('should define PersonaCoordinate type correctly', () => {
    const coord: PersonaCoordinate = {
      axisId: 'tech-literacy',
      rawValue: 0.75,
      mappedValue: 'High',
    };
    expect(coord.rawValue).toBeGreaterThanOrEqual(0);
    expect(coord.rawValue).toBeLessThanOrEqual(1);
  });

  it('should define Persona type correctly', () => {
    const persona: Persona = {
      id: 'persona-1',
      name: 'John Doe',
      coordinates: [],
      description: 'A tech-savvy individual',
      traits: { occupation: 'Engineer' },
      behaviorPatterns: ['Early adopter of technology'],
    };
    expect(persona.id).toBe('persona-1');
    expect(persona.behaviorPatterns).toHaveLength(1);
  });

  it('should define DiversityMetrics type correctly', () => {
    const metrics: DiversityMetrics = {
      coverage: 0.85,
      convexHullVolume: 0.72,
      meanPairwiseDistance: 0.65,
      minPairwiseDistance: 0.15,
      dispersion: 0.1,
      klDivergence: 0.05,
      overall: 0.78,
    };
    expect(metrics.coverage).toBeGreaterThanOrEqual(0);
    expect(metrics.coverage).toBeLessThanOrEqual(1);
  });

  it('should define Population type correctly', () => {
    const population: Population = {
      context: { description: 'Test' },
      axes: [],
      personas: [],
      generatedAt: new Date().toISOString(),
    };
    expect(population.context.description).toBe('Test');
    expect(population.metrics).toBeUndefined();
  });

  it('should define GeneratorConfig type correctly', () => {
    const config: GeneratorConfig = {
      populationSize: 25,
      numAxes: 6,
      samplerType: 'halton',
      evaluateAfter: true,
      language: 'ko',
    };
    expect(config.populationSize).toBe(25);
    expect(config.samplerType).toBe('halton');
  });
});

describe('MockLLMProvider', () => {
  it('should implement LLMProvider interface', () => {
    const provider: LLMProvider = new MockLLMProvider();
    expect(provider.name).toBe('mock');
    expect(typeof provider.chat).toBe('function');
    expect(typeof provider.chatJSON).toBe('function');
    expect(typeof provider.embed).toBe('function');
  });

  it('should return expanded context for expand-related messages', async () => {
    const provider = new MockLLMProvider();
    const response = await provider.chat([
      { role: 'user', content: 'Please expand this context' },
    ]);
    expect(response).toContain('자율주행');
    expect(provider.callCount).toBe(1);
  });

  it('should return axes for axis-related messages', async () => {
    const provider = new MockLLMProvider();
    const response = await provider.chat([
      { role: 'user', content: 'Extract diversity axis' },
    ]);
    const axes = JSON.parse(response);
    expect(Array.isArray(axes)).toBe(true);
    expect(axes.length).toBe(6);
  });

  it('should return persona for persona-related messages', async () => {
    const provider = new MockLLMProvider();
    const response = await provider.chat([
      { role: 'user', content: 'Generate a persona' },
    ]);
    const persona = JSON.parse(response);
    expect(persona.id).toBe('persona-1');
    expect(persona.name).toBe('Alex Chen');
  });

  it('should parse JSON response correctly', async () => {
    const provider = new MockLLMProvider();
    const axes = await provider.chatJSON<DiversityAxis[]>([
      { role: 'user', content: 'Extract axis definitions' },
    ]);
    expect(Array.isArray(axes)).toBe(true);
    expect(axes[0].id).toBe('tech-literacy');
  });

  it('should generate mock embeddings', async () => {
    const provider = new MockLLMProvider();
    const embeddings = await provider.embed!(['hello', 'world']);
    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toHaveLength(64);
  });

  it('should reset call count', async () => {
    const provider = new MockLLMProvider();
    await provider.chat([{ role: 'user', content: 'test' }]);
    expect(provider.callCount).toBe(1);
    provider.reset();
    expect(provider.callCount).toBe(0);
  });
});

describe('Sampler Interface', () => {
  it('should define Sampler interface correctly', () => {
    const mockSampler: Sampler = {
      generate: (numSamples: number, numDimensions: number) => {
        return Array.from({ length: numSamples }, () =>
          Array.from({ length: numDimensions }, () => Math.random())
        );
      },
    };
    const samples = mockSampler.generate(10, 3);
    expect(samples).toHaveLength(10);
    expect(samples[0]).toHaveLength(3);
  });
});
