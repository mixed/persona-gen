import type { LLMProvider } from '../llm/provider.js';
import type { DiversityAxis, Persona } from '../types.js';
import { buildQuestionnairePrompt } from '../llm/prompts.js';
import { safeJSONParse, safeJSONParseArray } from '../utils/json.js';

export interface Question {
  id: string;
  text: string;
  relatedAxes: string[];
  responseType: 'likert' | 'multiple-choice' | 'short-text';
}

export interface Answer {
  questionId: string;
  response: number | string;
  reasoning?: string;
}

export interface PersonaResponse {
  personaId: string;
  answers: Answer[];
}

/**
 * Generate questionnaire items based on context and axes.
 */
export class QuestionnaireGenerator {
  constructor(
    private llm: LLMProvider,
    private language: string = 'en'
  ) {}

  async generate(
    context: string,
    axes: DiversityAxis[],
    numQuestions: number = 10
  ): Promise<Question[]> {
    const messages = buildQuestionnairePrompt(context, axes, numQuestions, this.language);
    const response = await this.llm.chat(messages, { responseFormat: 'json' });

    return safeJSONParseArray<Question>(response, 'questionnaire response');
  }
}

/**
 * Simulate persona responses to questionnaire.
 */
export class PersonaResponder {
  constructor(
    private llm: LLMProvider,
    private language: string = 'en'
  ) {}

  async respond(persona: Persona, questions: Question[]): Promise<PersonaResponse> {
    const prompt = this.buildResponsePrompt(persona, questions);
    const response = await this.llm.chat(prompt, { responseFormat: 'json' });

    const parsed = safeJSONParse<{ answers: Answer[] }>(response, 'persona response');
    return {
      personaId: persona.id,
      answers: parsed.answers,
    };
  }

  async respondAll(
    personas: Persona[],
    questions: Question[]
  ): Promise<PersonaResponse[]> {
    const responses = await Promise.all(
      personas.map((persona) => this.respond(persona, questions))
    );
    return responses;
  }

  private buildResponsePrompt(persona: Persona, questions: Question[]) {
    const questionList = questions
      .map((q, i) => `${i + 1}. [${q.id}] ${q.text}`)
      .join('\n');

    const coordDescription = persona.coordinates
      .map((c) => `- ${c.axisId}: ${c.mappedValue}`)
      .join('\n');

    return [
      {
        role: 'system' as const,
        content: `You are simulating how a specific persona would respond to a questionnaire.
Answer as if you ARE this persona, based on their characteristics and behavior patterns.

For Likert scale questions, respond with a number 1-5 where:
1 = Strongly Disagree
2 = Disagree
3 = Neutral
4 = Agree
5 = Strongly Agree

Return a JSON object with:
{
  "answers": [
    { "questionId": "q1", "response": 4, "reasoning": "Brief explanation" },
    ...
  ]
}`,
      },
      {
        role: 'user' as const,
        content: `Persona: ${persona.name}

Description:
${persona.description}

Characteristics:
${coordDescription}

Behavior Patterns:
${persona.behaviorPatterns.map((p) => `- ${p}`).join('\n')}

Questions:
${questionList}

Respond as this persona would.`,
      },
    ];
  }
}

/**
 * Analyze diversity of responses across personas.
 */
export function analyzeResponseDiversity(
  responses: PersonaResponse[],
  questions: Question[]
): Record<string, { mean: number; variance: number; spread: number }> {
  const analysis: Record<string, { mean: number; variance: number; spread: number }> = {};

  for (const question of questions) {
    const values = responses
      .map((r) => r.answers.find((a) => a.questionId === question.id)?.response)
      .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) continue;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const spread = Math.max(...values) - Math.min(...values);

    analysis[question.id] = { mean, variance, spread };
  }

  return analysis;
}
