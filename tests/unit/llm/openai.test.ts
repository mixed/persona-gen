import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { OpenAIProvider } from '../../../src/llm/openai.js';
import type { ChatMessage } from '../../../src/types.js';

// Mock OpenAI client
const mockCreate = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: 'Mock response content',
      },
    },
  ],
});

const mockEmbeddingsCreate = vi.fn().mockResolvedValue({
  data: [
    { embedding: [0.1, 0.2, 0.3] },
    { embedding: [0.4, 0.5, 0.6] },
  ],
});

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
      embeddings: {
        create: mockEmbeddingsCreate,
      },
    })),
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAIProvider({
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
    });
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('openai');
  });

  it('should format messages correctly for API call', async () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' },
    ];

    await provider.chat(messages);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' },
        ],
      })
    );
  });

  it('should parse response content from API result', async () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello!' },
    ];

    const response = await provider.chat(messages);
    expect(response).toBe('Mock response content');
  });

  it('should respect temperature option', async () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello!' },
    ];

    await provider.chat(messages, { temperature: 0.5 });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.5,
      })
    );
  });

  it('should respect maxTokens option', async () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello!' },
    ];

    await provider.chat(messages, { maxTokens: 500 });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 500,
      })
    );
  });

  it('should parse JSON response when using chatJSON', async () => {
    // Create a provider with a mock that returns JSON
    const jsonProvider = new OpenAIProvider({
      apiKey: 'test-api-key',
    });

    // Override the internal implementation for this test
    vi.spyOn(jsonProvider, 'chat').mockResolvedValue('{"name": "test", "value": 123}');

    const result = await jsonProvider.chatJSON<{ name: string; value: number }>([
      { role: 'user', content: 'Give me JSON' },
    ]);

    expect(result.name).toBe('test');
    expect(result.value).toBe(123);
  });

  it('should throw error for invalid JSON in chatJSON', async () => {
    vi.spyOn(provider, 'chat').mockResolvedValue('not valid json');

    await expect(
      provider.chatJSON([{ role: 'user', content: 'test' }])
    ).rejects.toThrow();
  });

  it('should default to gpt-4o-mini model', () => {
    const defaultProvider = new OpenAIProvider({
      apiKey: 'test-key',
    });
    expect(defaultProvider.model).toBe('gpt-4o-mini');
  });

  it('should use custom model when specified', () => {
    const customProvider = new OpenAIProvider({
      apiKey: 'test-key',
      model: 'gpt-4o',
    });
    expect(customProvider.model).toBe('gpt-4o');
  });

  describe('error handling', () => {
    it('should throw error on empty response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      await expect(
        provider.chat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Empty response from OpenAI');
    });

    it('should throw error on empty choices', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [],
      });

      await expect(
        provider.chat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Empty response from OpenAI');
    });

    it('should propagate rate limit errors (429)', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockCreate.mockRejectedValueOnce(rateLimitError);

      await expect(
        provider.chat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should propagate authentication errors (401)', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockCreate.mockRejectedValueOnce(authError);

      await expect(
        provider.chat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Invalid API key');
    });

    it('should propagate server errors (500)', async () => {
      const serverError = new Error('Internal server error');
      (serverError as any).status = 500;
      mockCreate.mockRejectedValueOnce(serverError);

      await expect(
        provider.chat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Internal server error');
    });

    it('should propagate timeout errors', async () => {
      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';
      mockCreate.mockRejectedValueOnce(timeoutError);

      await expect(
        provider.chat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Request timed out');
    });
  });

  describe('embeddings', () => {
    it('should call embeddings API with correct parameters', async () => {
      const texts = ['hello', 'world'];
      await provider.embed(texts);

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: texts,
      });
    });

    it('should return embedding vectors', async () => {
      const result = await provider.embed(['test']);

      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]);
    });

    it('should propagate embedding errors', async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error('Embedding failed'));

      await expect(
        provider.embed(['test'])
      ).rejects.toThrow('Embedding failed');
    });
  });

  describe('JSON response format', () => {
    it('should request JSON format when responseFormat is json', async () => {
      await provider.chat(
        [{ role: 'user', content: 'test' }],
        { responseFormat: 'json' }
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should not set response_format when responseFormat is text', async () => {
      await provider.chat(
        [{ role: 'user', content: 'test' }],
        { responseFormat: 'text' }
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: undefined,
        })
      );
    });
  });

  describe('Structured Outputs (json_schema)', () => {
    it('should use json_schema when responseSchema is provided', async () => {
      await provider.chat(
        [{ role: 'user', content: 'test' }],
        {
          responseSchema: {
            name: 'test_schema',
            description: 'A test schema',
            schema: {
              type: 'object',
              properties: { items: { type: 'array', items: { type: 'string' } } },
              required: ['items'],
              additionalProperties: false,
            },
            strict: true,
          },
        }
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'test_schema',
              description: 'A test schema',
              schema: {
                type: 'object',
                properties: { items: { type: 'array', items: { type: 'string' } } },
                required: ['items'],
                additionalProperties: false,
              },
              strict: true,
            },
          },
        })
      );
    });

    it('should prefer responseSchema over responseFormat json', async () => {
      await provider.chat(
        [{ role: 'user', content: 'test' }],
        {
          responseFormat: 'json',
          responseSchema: {
            name: 'priority_test',
            schema: {
              type: 'object',
              properties: { value: { type: 'string' } },
              required: ['value'],
              additionalProperties: false,
            },
          },
        }
      );

      const call = mockCreate.mock.calls[0][0];
      expect(call.response_format.type).toBe('json_schema');
    });

    it('should default strict to true when not specified', async () => {
      await provider.chat(
        [{ role: 'user', content: 'test' }],
        {
          responseSchema: {
            name: 'default_strict',
            schema: {
              type: 'object',
              properties: { v: { type: 'number' } },
              required: ['v'],
              additionalProperties: false,
            },
          },
        }
      );

      const call = mockCreate.mock.calls[0][0];
      expect(call.response_format.json_schema.strict).toBe(true);
    });

    it('should respect strict: false', async () => {
      await provider.chat(
        [{ role: 'user', content: 'test' }],
        {
          responseSchema: {
            name: 'non_strict',
            schema: {
              type: 'object',
              properties: { data: { type: 'object' } },
              required: ['data'],
              additionalProperties: false,
            },
            strict: false,
          },
        }
      );

      const call = mockCreate.mock.calls[0][0];
      expect(call.response_format.json_schema.strict).toBe(false);
    });
  });
});
