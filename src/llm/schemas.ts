import type { ResponseSchema } from '../types.js';

/**
 * Schema for axis extraction — returns { axes: DiversityAxis[] }
 */
export const axisExtractionSchema: ResponseSchema = {
  name: 'axis_extraction',
  description: 'Extract diversity axes from context',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      axes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['continuous', 'categorical'] },
            anchors: {
              anyOf: [
                {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      label: { type: 'string' },
                    },
                    required: ['value', 'label'],
                    additionalProperties: false,
                  },
                },
                { type: 'null' },
              ],
            },
            categories: {
              anyOf: [
                { type: 'array', items: { type: 'string' } },
                { type: 'null' },
              ],
            },
          },
          required: ['id', 'name', 'description', 'type', 'anchors', 'categories'],
          additionalProperties: false,
        },
      },
    },
    required: ['axes'],
    additionalProperties: false,
  },
};

/**
 * Schema for persona expansion — returns { name, description, traits, behaviorPatterns }
 * strict: false because traits is a dynamic key-value object.
 */
export const personaExpansionSchema: ResponseSchema = {
  name: 'persona_expansion',
  description: 'Expand coordinates into a full persona',
  strict: false,
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      traits: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      behaviorPatterns: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['name', 'description', 'traits', 'behaviorPatterns'],
    additionalProperties: false,
  },
};

/**
 * Schema for questionnaire generation — returns { questions: Question[] }
 */
export const questionnaireSchema: ResponseSchema = {
  name: 'questionnaire_generation',
  description: 'Generate questionnaire items',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            relatedAxes: { type: 'array', items: { type: 'string' } },
            responseType: {
              type: 'string',
              enum: ['likert', 'multiple-choice', 'short-text'],
            },
          },
          required: ['id', 'text', 'relatedAxes', 'responseType'],
          additionalProperties: false,
        },
      },
    },
    required: ['questions'],
    additionalProperties: false,
  },
};

/**
 * Schema for persona questionnaire responses — returns { answers: Answer[] }
 */
export const personaResponseSchema: ResponseSchema = {
  name: 'persona_response',
  description: 'Persona questionnaire responses',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            questionId: { type: 'string' },
            response: {
              anyOf: [{ type: 'number' }, { type: 'string' }],
            },
            reasoning: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
          },
          required: ['questionId', 'response', 'reasoning'],
          additionalProperties: false,
        },
      },
    },
    required: ['answers'],
    additionalProperties: false,
  },
};
