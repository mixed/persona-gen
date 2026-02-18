import type { LLMProvider } from '../llm/provider.js';
import type { Context } from '../types.js';
import { buildContextExpansionPrompt } from '../llm/prompts.js';

export interface ContextExpanderOptions {
  language?: string;
}

export class ContextExpander {
  private language: string;

  constructor(
    private llm: LLMProvider,
    options: ContextExpanderOptions = {}
  ) {
    this.language = options.language ?? 'en';
  }

  /**
   * Expand a short context description into a detailed overview.
   */
  async expand(context: string): Promise<string> {
    const messages = buildContextExpansionPrompt(context, this.language);
    const expanded = await this.llm.chat(messages);
    return expanded;
  }

  /**
   * Expand context and return a full Context object.
   */
  async expandContext(description: string): Promise<Context> {
    const expanded = await this.expand(description);
    return {
      description,
      expanded,
    };
  }
}
