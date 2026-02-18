import { describe, it, expect, beforeEach } from 'vitest';
import { ContextExpander } from '../../../src/generator/context-expander.js';
import { MockLLMProvider } from '../../fixtures/mock-llm-responses.js';

describe('ContextExpander', () => {
  let provider: MockLLMProvider;
  let expander: ContextExpander;

  beforeEach(() => {
    provider = new MockLLMProvider();
    expander = new ContextExpander(provider);
  });

  it('should call LLM with context expansion prompt', async () => {
    await expander.expand('자율주행 자동차 초기 채택자');

    expect(provider.callCount).toBe(1);
    expect(provider.lastMessages.length).toBeGreaterThan(0);

    const userMessage = provider.lastMessages.find((m) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain('자율주행');
  });

  it('should return expanded context string', async () => {
    const result = await expander.expand('테스트 컨텍스트');

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should preserve original context in result', async () => {
    const original = '자율주행 자동차 초기 채택자';
    const expanded = await expander.expand(original);

    // The mock returns a response about 자율주행
    expect(expanded).toContain('자율주행');
  });

  it('should support language option', async () => {
    const expanderKo = new ContextExpander(provider, { language: 'ko' });
    await expanderKo.expand('test');

    const systemMessage = provider.lastMessages.find((m) => m.role === 'system');
    expect(systemMessage!.content).toContain('한국어');
  });

  it('should return Context object with expandContext method', async () => {
    const result = await expander.expandContext('테스트');

    expect(result.description).toBe('테스트');
    expect(result.expanded).toBeDefined();
    expect(result.expanded!.length).toBeGreaterThan(0);
  });
});
