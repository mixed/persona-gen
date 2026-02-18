import { describe, it, expect } from 'vitest';
import {
  buildContextExpansionPrompt,
  buildAxisExtractionPrompt,
  buildPersonaExpansionPrompt,
  buildQuestionnairePrompt,
} from '../../../src/llm/prompts.js';
import type { DiversityAxis, PersonaCoordinate } from '../../../src/types.js';

describe('Prompts', () => {
  describe('buildContextExpansionPrompt', () => {
    it('should include context in user message', () => {
      const prompt = buildContextExpansionPrompt('자율주행 자동차 초기 채택자');
      const userMessage = prompt.find(m => m.role === 'user');

      expect(userMessage).toBeDefined();
      expect(userMessage!.content).toContain('자율주행 자동차 초기 채택자');
    });

    it('should include system message with instructions', () => {
      const prompt = buildContextExpansionPrompt('test context');
      const systemMessage = prompt.find(m => m.role === 'system');

      expect(systemMessage).toBeDefined();
      expect(systemMessage!.content.length).toBeGreaterThan(50);
    });

    it('should support language parameter', () => {
      const koPrompt = buildContextExpansionPrompt('test', 'ko');
      const enPrompt = buildContextExpansionPrompt('test', 'en');

      const koSystem = koPrompt.find(m => m.role === 'system');
      const enSystem = enPrompt.find(m => m.role === 'system');

      expect(koSystem!.content).toContain('한국어');
      expect(enSystem!.content).toContain('English');
    });
  });

  describe('buildAxisExtractionPrompt', () => {
    it('should request JSON format', () => {
      const prompt = buildAxisExtractionPrompt('expanded context', 6);
      const systemMessage = prompt.find(m => m.role === 'system');

      expect(systemMessage!.content).toContain('JSON');
    });

    it('should include number of axes in user message', () => {
      const prompt = buildAxisExtractionPrompt('expanded context', 8);
      const userMessage = prompt.find(m => m.role === 'user');

      expect(userMessage!.content).toContain('8');
    });

    it('should include expanded context', () => {
      const prompt = buildAxisExtractionPrompt('This is the expanded context about users', 6);
      const userMessage = prompt.find(m => m.role === 'user');

      expect(userMessage!.content).toContain('expanded context about users');
    });

    it('should describe axis structure', () => {
      const prompt = buildAxisExtractionPrompt('context', 6);
      const systemMessage = prompt.find(m => m.role === 'system');

      expect(systemMessage!.content).toContain('continuous');
      expect(systemMessage!.content).toContain('categorical');
    });
  });

  describe('buildPersonaExpansionPrompt', () => {
    const mockAxes: DiversityAxis[] = [
      {
        id: 'tech-literacy',
        name: '기술 숙련도',
        description: '기술 사용 능력',
        type: 'continuous',
        anchors: [
          { value: 0, label: '낮음' },
          { value: 1, label: '높음' },
        ],
      },
    ];

    const mockCoordinates: PersonaCoordinate[] = [
      { axisId: 'tech-literacy', rawValue: 0.8, mappedValue: '높음' },
    ];

    it('should include all coordinates', () => {
      const prompt = buildPersonaExpansionPrompt(
        'test context',
        mockAxes,
        mockCoordinates
      );
      const userMessage = prompt.find(m => m.role === 'user');

      expect(userMessage!.content).toContain('기술 숙련도');
      expect(userMessage!.content).toContain('높음');
    });

    it('should instruct action-oriented style', () => {
      const prompt = buildPersonaExpansionPrompt(
        'test context',
        mockAxes,
        mockCoordinates
      );
      const systemMessage = prompt.find(m => m.role === 'system');

      expect(systemMessage!.content).toMatch(/action|행동|behavior/i);
    });

    it('should discourage background-heavy descriptions', () => {
      const prompt = buildPersonaExpansionPrompt(
        'test context',
        mockAxes,
        mockCoordinates
      );
      const systemMessage = prompt.find(m => m.role === 'system');

      // Should mention avoiding pure background/memory-based descriptions
      expect(systemMessage!.content).toMatch(/avoid|피|하지|말/i);
    });

    it('should request JSON output format', () => {
      const prompt = buildPersonaExpansionPrompt(
        'context',
        mockAxes,
        mockCoordinates
      );
      const systemMessage = prompt.find(m => m.role === 'system');

      expect(systemMessage!.content).toContain('JSON');
    });
  });

  describe('buildQuestionnairePrompt', () => {
    const mockAxes: DiversityAxis[] = [
      {
        id: 'risk-tolerance',
        name: '위험 감수 성향',
        description: '불확실성 수용 정도',
        type: 'continuous',
        anchors: [
          { value: 0, label: '보수적' },
          { value: 1, label: '모험적' },
        ],
      },
    ];

    it('should include context', () => {
      const prompt = buildQuestionnairePrompt('자율주행 관련', mockAxes);
      const userMessage = prompt.find(m => m.role === 'user');

      expect(userMessage!.content).toContain('자율주행');
    });

    it('should reference axes', () => {
      const prompt = buildQuestionnairePrompt('test', mockAxes);
      const userMessage = prompt.find(m => m.role === 'user');

      expect(userMessage!.content).toContain('위험 감수 성향');
    });

    it('should request questionnaire format', () => {
      const prompt = buildQuestionnairePrompt('test', mockAxes);
      const systemMessage = prompt.find(m => m.role === 'system');

      expect(systemMessage!.content).toMatch(/question|질문|설문/i);
    });
  });

  describe('language support', () => {
    const axes: DiversityAxis[] = [
      {
        id: 'test',
        name: 'Test Axis',
        description: 'A test axis',
        type: 'continuous',
        anchors: [{ value: 0, label: 'Low' }, { value: 1, label: 'High' }],
      },
    ];

    it('should generate Korean prompts when language is ko', () => {
      const prompt = buildContextExpansionPrompt('test', 'ko');
      const system = prompt.find(m => m.role === 'system');
      expect(system!.content).toContain('한국어');
    });

    it('should generate English prompts when language is en', () => {
      const prompt = buildContextExpansionPrompt('test', 'en');
      const system = prompt.find(m => m.role === 'system');
      expect(system!.content).toContain('English');
    });
  });
});
