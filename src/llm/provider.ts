import type { ChatMessage, LLMOptions } from '../types.js';

export interface LLMProvider {
  name: string;
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
  chatJSON<T>(messages: ChatMessage[], options?: LLMOptions): Promise<T>;
  embed?(texts: string[]): Promise<number[][]>;
}
