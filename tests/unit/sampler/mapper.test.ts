import { describe, it, expect } from 'vitest';
import { AxisMapper, mapValue, mapCoordinates } from '../../../src/sampler/mapper.js';
import type { DiversityAxis, PersonaCoordinate } from '../../../src/types.js';

describe('AxisMapper', () => {
  const continuousAxis: DiversityAxis = {
    id: 'tech-literacy',
    name: '기술 숙련도',
    description: '기술 사용 능력',
    type: 'continuous',
    anchors: [
      { value: 0, label: '매우 낮음' },
      { value: 0.5, label: '보통' },
      { value: 1, label: '매우 높음' },
    ],
  };

  const categoricalAxis: DiversityAxis = {
    id: 'age-group',
    name: '나이대',
    description: '연령 그룹',
    type: 'categorical',
    categories: ['20대', '30대', '40대', '50대', '60대 이상'],
  };

  describe('mapValue', () => {
    it('should map 0.0 to first anchor label for continuous axis', () => {
      const result = mapValue(0.0, continuousAxis);
      expect(result).toBe('매우 낮음');
    });

    it('should map 1.0 to last anchor label for continuous axis', () => {
      const result = mapValue(1.0, continuousAxis);
      expect(result).toBe('매우 높음');
    });

    it('should map 0.5 to middle anchor label for continuous axis', () => {
      const result = mapValue(0.5, continuousAxis);
      expect(result).toBe('보통');
    });

    it('should interpolate between anchors for continuous axis', () => {
      const result = mapValue(0.25, continuousAxis);
      // Should be between "매우 낮음" and "보통" (closer to 낮음)
      // At 0.25, ratio between 0 and 0.5 anchors is 0.5, so we expect the lower key
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should map 0.75 to between 보통 and 매우 높음', () => {
      const result = mapValue(0.75, continuousAxis);
      expect(result).toContain('높음');
    });

    it('should map categorical axis value 0.0 to first category', () => {
      const result = mapValue(0.0, categoricalAxis);
      expect(result).toBe('20대');
    });

    it('should map categorical axis value near 1.0 to last category', () => {
      const result = mapValue(0.99, categoricalAxis);
      expect(result).toBe('60대 이상');
    });

    it('should map categorical axis middle values correctly', () => {
      // 5 categories, each spans 0.2 of the range
      const result1 = mapValue(0.1, categoricalAxis);  // 0.1 / 0.2 = 0.5, still category 0
      expect(result1).toBe('20대');

      const result2 = mapValue(0.3, categoricalAxis);  // 0.3 / 0.2 = 1.5, category 1
      expect(result2).toBe('30대');

      const result3 = mapValue(0.5, categoricalAxis);  // 0.5 / 0.2 = 2.5, category 2
      expect(result3).toBe('40대');

      const result4 = mapValue(0.7, categoricalAxis);  // 0.7 / 0.2 = 3.5, category 3
      expect(result4).toBe('50대');

      const result5 = mapValue(0.9, categoricalAxis);  // 0.9 / 0.2 = 4.5, category 4
      expect(result5).toBe('60대 이상');
    });

    it('should handle continuous axis with only two anchors', () => {
      const twoAnchorAxis: DiversityAxis = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        type: 'continuous',
        anchors: [
          { value: 0, label: 'Low' },
          { value: 1, label: 'High' },
        ],
      };
      expect(mapValue(0.0, twoAnchorAxis)).toBe('Low');
      expect(mapValue(1.0, twoAnchorAxis)).toBe('High');
      // 0.5 is exactly between, should return something meaningful
      const midValue = mapValue(0.5, twoAnchorAxis);
      expect(typeof midValue).toBe('string');
      expect(midValue.length).toBeGreaterThan(0);
    });

    it('should handle values at exact anchor boundaries', () => {
      const result = mapValue(0.5, continuousAxis);
      expect(result).toBe('보통');
    });

    it('should clamp values outside [0, 1] range', () => {
      expect(mapValue(-0.1, continuousAxis)).toBe('매우 낮음');
      expect(mapValue(1.1, continuousAxis)).toBe('매우 높음');
    });
  });

  describe('AxisMapper class', () => {
    it('should map all coordinates correctly', () => {
      const mapper = new AxisMapper([continuousAxis, categoricalAxis]);
      const rawValues = [0.75, 0.5];

      const coordinates = mapper.map(rawValues);

      expect(coordinates).toHaveLength(2);
      expect(coordinates[0].axisId).toBe('tech-literacy');
      expect(coordinates[0].rawValue).toBe(0.75);
      expect(coordinates[0].mappedValue).toContain('높음');

      expect(coordinates[1].axisId).toBe('age-group');
      expect(coordinates[1].rawValue).toBe(0.5);
      expect(coordinates[1].mappedValue).toBe('40대');
    });

    it('should throw error if rawValues length does not match axes', () => {
      const mapper = new AxisMapper([continuousAxis, categoricalAxis]);
      expect(() => mapper.map([0.5])).toThrow();
    });
  });

  describe('mapCoordinates', () => {
    it('should map multiple sample coordinates at once', () => {
      const axes = [continuousAxis, categoricalAxis];
      const rawSamples = [
        [0.2, 0.1],
        [0.8, 0.9],
      ];

      const result = mapCoordinates(rawSamples, axes);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(2);

      // First sample
      expect(result[0][0].axisId).toBe('tech-literacy');
      expect(result[0][0].rawValue).toBe(0.2);
      expect(result[0][1].axisId).toBe('age-group');
      expect(result[0][1].rawValue).toBe(0.1);

      // Second sample
      expect(result[1][0].rawValue).toBe(0.8);
      expect(result[1][1].mappedValue).toBe('60대 이상');
    });
  });

  describe('edge cases', () => {
    it('should handle axis without anchors gracefully', () => {
      const axisWithoutAnchors: DiversityAxis = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        type: 'continuous',
        // No anchors defined
      };
      // Should generate default description
      const result = mapValue(0.5, axisWithoutAnchors);
      expect(result).toContain('0.50');
    });

    it('should handle axis without categories gracefully', () => {
      const axisWithoutCategories: DiversityAxis = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        type: 'categorical',
        // No categories defined
      };
      const result = mapValue(0.5, axisWithoutCategories);
      expect(result).toContain('0.50');
    });

    it('should handle single category', () => {
      const singleCatAxis: DiversityAxis = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        type: 'categorical',
        categories: ['Only'],
      };
      expect(mapValue(0.0, singleCatAxis)).toBe('Only');
      expect(mapValue(0.5, singleCatAxis)).toBe('Only');
      expect(mapValue(1.0, singleCatAxis)).toBe('Only');
    });
  });
});
