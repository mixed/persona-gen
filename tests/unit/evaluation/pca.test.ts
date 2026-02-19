import { describe, it, expect } from 'vitest';
import { pcaReduce, minMaxNormalize } from '../../../src/evaluation/pca.js';

describe('pcaReduce', () => {
  it('should reduce 50D points to 3D', () => {
    const points = Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: 50 }, (_, j) => Math.sin((i + 1) * (j + 1) * 0.1) * 0.05)
    );
    const reduced = pcaReduce(points, 3);
    expect(reduced).toHaveLength(10);
    for (const p of reduced) {
      expect(p).toHaveLength(3);
    }
  });

  it('should handle targetDims > n-1 by capping effective dims', () => {
    const points = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6],
      [3, 4, 5, 6, 7],
    ];
    // n=3, so max effective PCA dims = 2, but targetDims=4
    const reduced = pcaReduce(points, 4);
    expect(reduced).toHaveLength(3);
    for (const p of reduced) {
      expect(p).toHaveLength(4);
      // Dimensions beyond effective (indices 2,3) should be 0.5
      expect(p[2]).toBe(0.5);
      expect(p[3]).toBe(0.5);
    }
  });

  it('should return [0.5, ...] for a single point', () => {
    const reduced = pcaReduce([[1, 2, 3]], 3);
    expect(reduced).toEqual([[0.5, 0.5, 0.5]]);
  });

  it('should handle two points', () => {
    const reduced = pcaReduce(
      [
        [0, 0, 0],
        [1, 1, 1],
      ],
      3
    );
    expect(reduced).toHaveLength(2);
    for (const p of reduced) {
      expect(p).toHaveLength(3);
    }
    // effective dims = 1, so dims 1 and 2 should be 0.5
    expect(reduced[0][1]).toBe(0.5);
    expect(reduced[0][2]).toBe(0.5);
    // The two points should differ on dim 0
    expect(reduced[0][0]).not.toBeCloseTo(reduced[1][0]);
  });

  it('should return all 0.5 when all points are identical', () => {
    const points = Array.from({ length: 5 }, () => [1, 2, 3]);
    const reduced = pcaReduce(points, 2);
    for (const p of reduced) {
      expect(p).toEqual([0.5, 0.5]);
    }
  });

  it('should return empty array for empty input', () => {
    expect(pcaReduce([], 3)).toEqual([]);
  });

  it('should preserve structure of a line in high-D', () => {
    // Points along a single direction in 20D should compress to 1 effective dimension
    const direction = Array.from({ length: 20 }, (_, j) => Math.sin(j + 1));
    const points = Array.from({ length: 8 }, (_, i) =>
      direction.map((d) => d * (i / 7))
    );
    const reduced = pcaReduce(points, 3);

    // Dims 1 and 2 should all be 0.5 (no variance)
    for (const p of reduced) {
      expect(p[1]).toBeCloseTo(0.5, 5);
      expect(p[2]).toBeCloseTo(0.5, 5);
    }

    // Dim 0 should vary across points
    const dim0Values = reduced.map((p) => p[0]);
    const dim0Range = Math.max(...dim0Values) - Math.min(...dim0Values);
    expect(dim0Range).toBeGreaterThan(0.01);
  });
});

describe('minMaxNormalize', () => {
  it('should normalize all values to [0, 1]', () => {
    const points = [
      [-5, 10, 0],
      [5, 20, 100],
      [0, 15, 50],
    ];
    const normed = minMaxNormalize(points);
    for (const p of normed) {
      for (const v of p) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should map min to 0 and max to 1', () => {
    const points = [
      [0, 10],
      [10, 20],
    ];
    const normed = minMaxNormalize(points);
    expect(normed[0][0]).toBeCloseTo(0);
    expect(normed[1][0]).toBeCloseTo(1);
    expect(normed[0][1]).toBeCloseTo(0);
    expect(normed[1][1]).toBeCloseTo(1);
  });

  it('should return 0.5 for zero-range dimensions', () => {
    const points = [
      [1, 5],
      [2, 5],
      [3, 5],
    ];
    const normed = minMaxNormalize(points);
    for (const p of normed) {
      expect(p[1]).toBe(0.5);
    }
  });

  it('should return [0.5, ...] for single point', () => {
    const normed = minMaxNormalize([[3, 7, 11]]);
    expect(normed).toEqual([[0.5, 0.5, 0.5]]);
  });

  it('should return empty array for empty input', () => {
    expect(minMaxNormalize([])).toEqual([]);
  });
});

describe('pcaReduce + minMaxNormalize pipeline', () => {
  it('should produce [0,1] normalized output from high-D embeddings', () => {
    // Simulate realistic API embeddings
    const points = Array.from({ length: 15 }, (_, i) =>
      Array.from({ length: 64 }, (_, j) => Math.sin((i + 1) * (j + 1) * 0.1) * 0.05)
    );
    const reduced = pcaReduce(points, 6);
    const normed = minMaxNormalize(reduced);

    expect(normed).toHaveLength(15);
    for (const p of normed) {
      expect(p).toHaveLength(6);
      for (const v of p) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
