import { describe, it, expect, beforeEach } from 'vitest';
import { AxisExtractor } from '../../../src/generator/axis-extractor.js';
import { MockLLMProvider, MOCK_EXTRACTED_AXES } from '../../fixtures/mock-llm-responses.js';

describe('AxisExtractor', () => {
  let provider: MockLLMProvider;
  let extractor: AxisExtractor;

  beforeEach(() => {
    provider = new MockLLMProvider();
    extractor = new AxisExtractor(provider);
  });

  it('should extract requested number of axes', async () => {
    const axes = await extractor.extract('expanded context', 6);

    // Mock returns 6 axes
    expect(axes.length).toBe(6);
  });

  it('should return valid DiversityAxis objects', async () => {
    const axes = await extractor.extract('expanded context', 6);

    for (const axis of axes) {
      expect(axis).toHaveProperty('id');
      expect(axis).toHaveProperty('name');
      expect(axis).toHaveProperty('description');
      expect(axis).toHaveProperty('type');
      expect(['continuous', 'categorical']).toContain(axis.type);
    }
  });

  it('should generate unique IDs for each axis', async () => {
    const axes = await extractor.extract('expanded context', 6);
    const ids = axes.map((a) => a.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should include anchors for continuous axes', async () => {
    const axes = await extractor.extract('expanded context', 6);
    const continuousAxes = axes.filter((a) => a.type === 'continuous');

    for (const axis of continuousAxes) {
      expect(axis.anchors).toBeDefined();
      expect(axis.anchors!.length).toBeGreaterThanOrEqual(2);

      for (const anchor of axis.anchors!) {
        expect(anchor).toHaveProperty('value');
        expect(anchor).toHaveProperty('label');
        expect(anchor.value).toBeGreaterThanOrEqual(0);
        expect(anchor.value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should include categories for categorical axes', async () => {
    const axes = await extractor.extract('expanded context', 6);
    const categoricalAxes = axes.filter((a) => a.type === 'categorical');

    for (const axis of categoricalAxes) {
      expect(axis.categories).toBeDefined();
      expect(axis.categories!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should handle LLM returning malformed JSON gracefully', async () => {
    // Override to return invalid JSON
    provider.chat = async () => 'not valid json {{}';

    await expect(extractor.extract('context', 6)).rejects.toThrow();
  });

  it('should call LLM with axis extraction prompt', async () => {
    await extractor.extract('my expanded context', 6);

    expect(provider.callCount).toBe(1);
    const userMessage = provider.lastMessages.find((m) => m.role === 'user');
    expect(userMessage!.content).toContain('my expanded context');
  });

  it('should support language option', async () => {
    const extractorKo = new AxisExtractor(provider, { language: 'ko' });
    await extractorKo.extract('context', 6);

    const systemMessage = provider.lastMessages.find((m) => m.role === 'system');
    expect(systemMessage!.content).toContain('한국어');
  });

  it('should validate extracted axes structure', async () => {
    const axes = await extractor.extract('context', 6);

    // Each axis should have required fields
    for (const axis of axes) {
      expect(typeof axis.id).toBe('string');
      expect(typeof axis.name).toBe('string');
      expect(typeof axis.description).toBe('string');
    }
  });
});
