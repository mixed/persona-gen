// === LLM Provider Types ===
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

// === Core Domain Types ===
export interface Context {
  description: string;
  expanded?: string;
  domain?: string;
}

export interface AxisAnchor {
  value: number;
  label: string;
}

export interface DiversityAxis {
  id: string;
  name: string;
  description: string;
  type: 'continuous' | 'categorical';
  anchors?: AxisAnchor[];
  categories?: string[];
}

export interface PersonaCoordinate {
  axisId: string;
  rawValue: number;
  mappedValue: string;
}

export interface Persona {
  id: string;
  name: string;
  coordinates: PersonaCoordinate[];
  description: string;
  traits: Record<string, string>;
  behaviorPatterns: string[];
}

export interface DiversityMetrics {
  coverage: number;
  convexHullVolume: number;
  meanPairwiseDistance: number;
  minPairwiseDistance: number;
  dispersion: number;
  klDivergence: number;
  overall: number;
}

export interface Population {
  context: Context;
  axes: DiversityAxis[];
  personas: Persona[];
  metrics?: DiversityMetrics;
  generatedAt: string;
}

// === Configuration ===
export interface GeneratorConfig {
  populationSize: number;
  numAxes?: number;
  customAxes?: DiversityAxis[];
  samplerType?: 'halton';
  evaluateAfter?: boolean;
  language?: string;
}

// === Evaluation Types ===
export interface EvaluablePersona {
  coordinates: Pick<PersonaCoordinate, 'rawValue'>[];
}

// === Optimizer Interface (for future full AlphaEvolve) ===
export interface OptimizerResult {
  population: Population;
  iterations: number;
  bestScore: number;
}
