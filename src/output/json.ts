import type { Population } from '../types.js';

export interface JSONRendererOptions {
  compact?: boolean;
}

export class JSONRenderer {
  private compact: boolean;

  constructor(options: JSONRendererOptions = {}) {
    this.compact = options.compact ?? false;
  }

  render(population: Population): string {
    if (this.compact) {
      return JSON.stringify(population);
    }
    return JSON.stringify(population, null, 2);
  }

  parse(json: string): Population {
    return JSON.parse(json) as Population;
  }
}
