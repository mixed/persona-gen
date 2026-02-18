import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from '../../../src/output/markdown.js';
import { JSONRenderer } from '../../../src/output/json.js';
import type { Population } from '../../../src/types.js';
import { MOCK_EXTRACTED_AXES, MOCK_PERSONA } from '../../fixtures/mock-llm-responses.js';

const mockPopulation: Population = {
  context: {
    description: '자율주행 자동차 초기 채택자',
    expanded: '자율주행 자동차의 초기 채택자는 다양한 배경을 가진 사람들입니다...',
  },
  axes: MOCK_EXTRACTED_AXES,
  personas: [MOCK_PERSONA],
  metrics: {
    coverage: 0.83,
    convexHullVolume: 0.71,
    meanPairwiseDistance: 0.62,
    minPairwiseDistance: 0.18,
    dispersion: 0.12,
    klDivergence: 0.04,
    overall: 0.74,
  },
  generatedAt: '2024-01-15T10:30:00.000Z',
};

const mockPopulationWithoutMetrics: Population = {
  ...mockPopulation,
  metrics: undefined,
};

describe('MarkdownRenderer', () => {
  const renderer = new MarkdownRenderer();

  it('should include # Persona Population Report header', () => {
    const md = renderer.render(mockPopulation);
    expect(md).toContain('# Persona Population Report');
  });

  it('should render context section with original and expanded', () => {
    const md = renderer.render(mockPopulation);
    expect(md).toContain('## Context');
    expect(md).toContain('자율주행 자동차 초기 채택자');
    expect(md).toContain('다양한 배경');
  });

  it('should render axes table', () => {
    const md = renderer.render(mockPopulation);
    expect(md).toContain('## Diversity Axes');
    expect(md).toContain('기술 숙련도');
    expect(md).toContain('continuous');
    expect(md).toContain('categorical');
  });

  it('should render each persona as ### subsection', () => {
    const md = renderer.render(mockPopulation);
    expect(md).toContain('### Persona 1:');
    expect(md).toContain('Alex Chen');
  });

  it('should render metrics table when metrics present', () => {
    const md = renderer.render(mockPopulation);
    expect(md).toContain('## Diversity Evaluation');
    expect(md).toContain('Coverage');
    expect(md).toContain('0.83');
    expect(md).toContain('Overall');
  });

  it('should not render metrics section when metrics absent', () => {
    const md = renderer.render(mockPopulationWithoutMetrics);
    expect(md).not.toContain('## Diversity Evaluation');
  });

  it('should render persona coordinates', () => {
    const md = renderer.render(mockPopulation);
    expect(md).toContain('얼리어답터');
    expect(md).toContain('0.82');
  });

  it('should render behavior patterns', () => {
    const md = renderer.render(mockPopulation);
    expect(md).toContain('Behavior Patterns');
    expect(md).toContain('새 기술 제품이 나오면');
  });

  it('should include generation timestamp', () => {
    const md = renderer.render(mockPopulation);
    expect(md).toContain('2024-01-15');
  });

  it('should render ASCII histogram for axis distribution', () => {
    // Create population with multiple personas for distribution
    const multiPersonaPopulation: Population = {
      ...mockPopulation,
      personas: [
        { ...MOCK_PERSONA, id: 'p1', coordinates: [{ axisId: 'tech-literacy', rawValue: 0.1, mappedValue: '낮음' }] },
        { ...MOCK_PERSONA, id: 'p2', coordinates: [{ axisId: 'tech-literacy', rawValue: 0.3, mappedValue: '중간' }] },
        { ...MOCK_PERSONA, id: 'p3', coordinates: [{ axisId: 'tech-literacy', rawValue: 0.5, mappedValue: '중간' }] },
        { ...MOCK_PERSONA, id: 'p4', coordinates: [{ axisId: 'tech-literacy', rawValue: 0.7, mappedValue: '높음' }] },
        { ...MOCK_PERSONA, id: 'p5', coordinates: [{ axisId: 'tech-literacy', rawValue: 0.9, mappedValue: '매우높음' }] },
      ],
      axes: [MOCK_EXTRACTED_AXES[0]],
    };

    const md = renderer.render(multiPersonaPopulation);
    expect(md).toContain('Coordinate Distribution');
    expect(md).toContain('█');
  });
});

describe('JSONRenderer', () => {
  const renderer = new JSONRenderer();

  it('should produce valid JSON string', () => {
    const json = renderer.render(mockPopulation);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should be parseable back to Population type', () => {
    const json = renderer.render(mockPopulation);
    const parsed = JSON.parse(json) as Population;

    expect(parsed.context.description).toBe(mockPopulation.context.description);
    expect(parsed.axes).toHaveLength(mockPopulation.axes.length);
    expect(parsed.personas).toHaveLength(mockPopulation.personas.length);
  });

  it('should include all population fields', () => {
    const json = renderer.render(mockPopulation);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('context');
    expect(parsed).toHaveProperty('axes');
    expect(parsed).toHaveProperty('personas');
    expect(parsed).toHaveProperty('metrics');
    expect(parsed).toHaveProperty('generatedAt');
  });

  it('should pretty print by default', () => {
    const json = renderer.render(mockPopulation);
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });

  it('should support compact mode', () => {
    const compactRenderer = new JSONRenderer({ compact: true });
    const json = compactRenderer.render(mockPopulation);
    expect(json).not.toContain('\n');
  });
});
