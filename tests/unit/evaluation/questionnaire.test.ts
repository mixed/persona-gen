import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionnaireGenerator, PersonaResponder } from '../../../src/evaluation/questionnaire.js';
import { MockLLMProvider, MOCK_EXTRACTED_AXES, MOCK_PERSONA } from '../../fixtures/mock-llm-responses.js';

describe('Questionnaire', () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  describe('QuestionnaireGenerator', () => {
    it('should generate N questions for given context', async () => {
      const generator = new QuestionnaireGenerator(provider);
      const questions = await generator.generate(
        'Self-driving car users',
        MOCK_EXTRACTED_AXES,
        5
      );

      // Mock returns structured response
      expect(Array.isArray(questions)).toBe(true);
    });

    it('should include question text and related axes', async () => {
      const generator = new QuestionnaireGenerator(provider);

      // Mock will return questions
      provider.chat = async () => JSON.stringify([
        {
          id: 'q1',
          text: 'How comfortable are you with new technology?',
          relatedAxes: ['tech-literacy'],
          responseType: 'likert',
        },
        {
          id: 'q2',
          text: 'How often do you drive?',
          relatedAxes: ['driving-frequency'],
          responseType: 'likert',
        },
      ]);

      const questions = await generator.generate('Test', MOCK_EXTRACTED_AXES, 2);

      expect(questions[0]).toHaveProperty('id');
      expect(questions[0]).toHaveProperty('text');
      expect(questions[0]).toHaveProperty('relatedAxes');
    });
  });

  describe('PersonaResponder', () => {
    it('should produce response for each persona', async () => {
      const responder = new PersonaResponder(provider);

      // Mock questionnaire response
      provider.chat = async () => JSON.stringify({
        answers: [
          { questionId: 'q1', response: 5, reasoning: 'Tech savvy' },
        ],
      });

      const questions = [
        { id: 'q1', text: 'Rate your tech comfort', relatedAxes: ['tech-literacy'], responseType: 'likert' as const },
      ];

      const response = await responder.respond(MOCK_PERSONA, questions);

      expect(response.personaId).toBe(MOCK_PERSONA.id);
      expect(response.answers).toBeDefined();
    });

    it('should return structured answers', async () => {
      const responder = new PersonaResponder(provider);

      provider.chat = async () => JSON.stringify({
        answers: [
          { questionId: 'q1', response: 4, reasoning: 'Comfortable with tech' },
          { questionId: 'q2', response: 3, reasoning: 'Moderate driver' },
        ],
      });

      const questions = [
        { id: 'q1', text: 'Tech comfort?', relatedAxes: [], responseType: 'likert' as const },
        { id: 'q2', text: 'Driving frequency?', relatedAxes: [], responseType: 'likert' as const },
      ];

      const response = await responder.respond(MOCK_PERSONA, questions);

      expect(response.answers).toHaveLength(2);
      expect(response.answers[0]).toHaveProperty('questionId');
      expect(response.answers[0]).toHaveProperty('response');
    });
  });
});
