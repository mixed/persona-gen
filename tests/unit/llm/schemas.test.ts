import { describe, it, expect } from 'vitest';
import {
  axisExtractionSchema,
  personaExpansionSchema,
  questionnaireSchema,
  personaResponseSchema,
} from '../../../src/llm/schemas.js';
import type { ResponseSchema } from '../../../src/types.js';

function assertValidStructuredOutputSchema(schema: ResponseSchema) {
  expect(schema.name).toBeTypeOf('string');
  expect(schema.name.length).toBeGreaterThan(0);

  const root = schema.schema;
  expect(root.type).toBe('object');
  expect(root.additionalProperties).toBe(false);
  expect(Array.isArray(root.required)).toBe(true);
  expect((root.required as string[]).length).toBeGreaterThan(0);
}

describe('schemas', () => {
  describe('axisExtractionSchema', () => {
    it('should have valid root structure', () => {
      assertValidStructuredOutputSchema(axisExtractionSchema);
    });

    it('should be strict', () => {
      expect(axisExtractionSchema.strict).toBe(true);
    });

    it('should wrap axes in an object', () => {
      const props = axisExtractionSchema.schema.properties as Record<string, unknown>;
      expect(props).toHaveProperty('axes');
    });
  });

  describe('personaExpansionSchema', () => {
    it('should have valid root structure', () => {
      assertValidStructuredOutputSchema(personaExpansionSchema);
    });

    it('should NOT be strict (dynamic traits object)', () => {
      expect(personaExpansionSchema.strict).toBe(false);
    });

    it('should require name, description, traits, behaviorPatterns', () => {
      const required = personaExpansionSchema.schema.required as string[];
      expect(required).toContain('name');
      expect(required).toContain('description');
      expect(required).toContain('traits');
      expect(required).toContain('behaviorPatterns');
    });
  });

  describe('questionnaireSchema', () => {
    it('should have valid root structure', () => {
      assertValidStructuredOutputSchema(questionnaireSchema);
    });

    it('should be strict', () => {
      expect(questionnaireSchema.strict).toBe(true);
    });

    it('should wrap questions in an object', () => {
      const props = questionnaireSchema.schema.properties as Record<string, unknown>;
      expect(props).toHaveProperty('questions');
    });
  });

  describe('personaResponseSchema', () => {
    it('should have valid root structure', () => {
      assertValidStructuredOutputSchema(personaResponseSchema);
    });

    it('should be strict', () => {
      expect(personaResponseSchema.strict).toBe(true);
    });

    it('should wrap answers in an object', () => {
      const props = personaResponseSchema.schema.properties as Record<string, unknown>;
      expect(props).toHaveProperty('answers');
    });
  });
});
