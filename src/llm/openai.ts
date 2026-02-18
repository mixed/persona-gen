import OpenAI from 'openai';
import type { LLMProvider } from './provider.js';
import type { ChatMessage, LLMOptions } from '../types.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  model: string;
  private client: OpenAI;

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.model ?? 'gpt-4o-mini';
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      response_format:
        options?.responseFormat === 'json'
          ? { type: 'json_object' }
          : undefined,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;
  }

  async chatJSON<T>(messages: ChatMessage[], options?: LLMOptions): Promise<T> {
    const response = await this.chat(messages, {
      ...options,
      responseFormat: 'json',
    });

    try {
      return JSON.parse(response) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${response}`);
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  }
}
