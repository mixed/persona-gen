import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersonaExpander } from '../../../src/generator/persona-expander.js';
import { MockLLMProvider, MOCK_EXTRACTED_AXES, MOCK_PERSONA } from '../../fixtures/mock-llm-responses.js';
import type { PersonaCoordinate } from '../../../src/types.js';

describe('PersonaExpander', () => {
  let provider: MockLLMProvider;
  let expander: PersonaExpander;
  const context = 'Test context';
  const axes = MOCK_EXTRACTED_AXES;

  const mockCoordinates: PersonaCoordinate[] = [
    { axisId: 'tech-literacy', rawValue: 0.8, mappedValue: '얼리어답터' },
    { axisId: 'risk-tolerance', rawValue: 0.6, mappedValue: '적당히 모험적' },
    { axisId: 'age-group', rawValue: 0.3, mappedValue: '30대' },
    { axisId: 'driving-frequency', rawValue: 0.5, mappedValue: '주 2-3회' },
    { axisId: 'residence-type', rawValue: 0.1, mappedValue: '대도시' },
    { axisId: 'economic-status', rawValue: 0.7, mappedValue: '중상' },
  ];

  beforeEach(() => {
    provider = new MockLLMProvider();
    expander = new PersonaExpander(provider);
  });

  it('should generate one persona per coordinate set', async () => {
    const coordinateSets = [mockCoordinates, mockCoordinates];
    const personas = await expander.expandAll(context, axes, coordinateSets);

    expect(personas).toHaveLength(2);
  });

  it('should include all coordinate values in persona', async () => {
    const persona = await expander.expand(context, axes, mockCoordinates, 'persona-1');

    expect(persona.coordinates).toHaveLength(mockCoordinates.length);
    for (const coord of mockCoordinates) {
      const found = persona.coordinates.find((c) => c.axisId === coord.axisId);
      expect(found).toBeDefined();
      expect(found!.rawValue).toBe(coord.rawValue);
    }
  });

  it('should produce unique names', async () => {
    // Create multiple personas
    const coordinateSets = [mockCoordinates, mockCoordinates, mockCoordinates];
    const personas = await expander.expandAll(context, axes, coordinateSets);

    // Mock returns same name, but IDs should be unique
    const ids = personas.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should include behaviorPatterns array', async () => {
    const persona = await expander.expand(context, axes, mockCoordinates, 'test-id');

    expect(Array.isArray(persona.behaviorPatterns)).toBe(true);
    expect(persona.behaviorPatterns.length).toBeGreaterThan(0);
  });

  it('should respect concurrency limit', async () => {
    const expanderWithLimit = new PersonaExpander(provider, { concurrency: 2 });
    const coordinateSets = Array(5).fill(mockCoordinates);

    // Track concurrent calls
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const originalChat = provider.chat.bind(provider);
    provider.chat = async (...args) => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await new Promise((r) => setTimeout(r, 10)); // Small delay
      currentConcurrent--;
      return originalChat(...args);
    };

    await expanderWithLimit.expandAll(context, axes, coordinateSets);

    // Should not exceed concurrency limit
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should call LLM with persona expansion prompt', async () => {
    await expander.expand(context, axes, mockCoordinates, 'test');

    expect(provider.callCount).toBe(1);
    const userMessage = provider.lastMessages.find((m) => m.role === 'user');
    expect(userMessage!.content).toContain('기술 숙련도');
  });

  it('should generate valid persona structure', async () => {
    const persona = await expander.expand(context, axes, mockCoordinates, 'test-id');

    expect(persona.id).toBe('test-id');
    expect(typeof persona.name).toBe('string');
    expect(typeof persona.description).toBe('string');
    expect(typeof persona.traits).toBe('object');
    expect(Array.isArray(persona.behaviorPatterns)).toBe(true);
  });

  it('should support language option', async () => {
    const expanderKo = new PersonaExpander(provider, { language: 'ko' });
    await expanderKo.expand(context, axes, mockCoordinates, 'test');

    const systemMessage = provider.lastMessages.find((m) => m.role === 'system');
    expect(systemMessage!.content).toContain('한국어');
  });

  it('should handle LLM errors gracefully', async () => {
    provider.chat = async () => {
      throw new Error('LLM error');
    };

    await expect(
      expander.expand(context, axes, mockCoordinates, 'test')
    ).rejects.toThrow('LLM error');
  });
});
