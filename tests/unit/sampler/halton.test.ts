import { describe, it, expect } from 'vitest';
import { HaltonSampler, PRIMES } from '../../../src/sampler/halton.js';

describe('HaltonSampler', () => {
  it('should generate correct number of samples', () => {
    const sampler = new HaltonSampler();
    const points = sampler.generate(100, 6);
    expect(points).toHaveLength(100);
    expect(points[0]).toHaveLength(6);
  });

  it('should produce values strictly in (0, 1)', () => {
    const sampler = new HaltonSampler();
    const points = sampler.generate(1000, 3);
    for (const p of points) {
      for (const v of p) {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('should be deterministic', () => {
    const s1 = new HaltonSampler().generate(50, 4);
    const s2 = new HaltonSampler().generate(50, 4);
    expect(s1).toEqual(s2);
  });

  it('should use distinct prime bases per dimension', () => {
    // First few primes should be used for first few dimensions
    expect(PRIMES[0]).toBe(2);
    expect(PRIMES[1]).toBe(3);
    expect(PRIMES[2]).toBe(5);
    expect(PRIMES[3]).toBe(7);
    expect(PRIMES[4]).toBe(11);
    expect(PRIMES[5]).toBe(13);
  });

  it('should have better uniformity than pure random', () => {
    const sampler = new HaltonSampler();
    const points = sampler.generate(100, 1);

    // Count points in each half
    const lowerHalf = points.filter((p) => p[0] < 0.5).length;
    const upperHalf = points.filter((p) => p[0] >= 0.5).length;

    // Halton should have very even distribution (close to 50-50)
    expect(lowerHalf).toBeGreaterThanOrEqual(45);
    expect(lowerHalf).toBeLessThanOrEqual(55);
    expect(upperHalf).toBeGreaterThanOrEqual(45);
    expect(upperHalf).toBeLessThanOrEqual(55);
  });

  it('should distribute points evenly across quartiles', () => {
    const sampler = new HaltonSampler();
    const points = sampler.generate(100, 1);

    const q1 = points.filter((p) => p[0] < 0.25).length;
    const q2 = points.filter((p) => p[0] >= 0.25 && p[0] < 0.5).length;
    const q3 = points.filter((p) => p[0] >= 0.5 && p[0] < 0.75).length;
    const q4 = points.filter((p) => p[0] >= 0.75).length;

    // Each quartile should have roughly 25 points (±10 for tolerance)
    expect(q1).toBeGreaterThanOrEqual(15);
    expect(q1).toBeLessThanOrEqual(35);
    expect(q2).toBeGreaterThanOrEqual(15);
    expect(q2).toBeLessThanOrEqual(35);
    expect(q3).toBeGreaterThanOrEqual(15);
    expect(q3).toBeLessThanOrEqual(35);
    expect(q4).toBeGreaterThanOrEqual(15);
    expect(q4).toBeLessThanOrEqual(35);
  });

  it('should support offset parameter for different starting points', () => {
    const sampler1 = new HaltonSampler({ offset: 0 });
    const sampler2 = new HaltonSampler({ offset: 100 });

    const points1 = sampler1.generate(10, 2);
    const points2 = sampler2.generate(10, 2);

    // Different offsets should produce different sequences
    expect(points1).not.toEqual(points2);
  });

  it('should compute correct Halton values for known base-2 sequence', () => {
    const sampler = new HaltonSampler();
    const points = sampler.generate(8, 1); // Just first dimension (base 2)

    // Halton base-2 sequence: 1/2, 1/4, 3/4, 1/8, 5/8, 3/8, 7/8, 1/16...
    // For index 1,2,3,4,5,6,7,8 (1-indexed)
    expect(points[0][0]).toBeCloseTo(0.5, 5);      // 1/2
    expect(points[1][0]).toBeCloseTo(0.25, 5);     // 1/4
    expect(points[2][0]).toBeCloseTo(0.75, 5);     // 3/4
    expect(points[3][0]).toBeCloseTo(0.125, 5);    // 1/8
    expect(points[4][0]).toBeCloseTo(0.625, 5);    // 5/8
    expect(points[5][0]).toBeCloseTo(0.375, 5);    // 3/8
    expect(points[6][0]).toBeCloseTo(0.875, 5);    // 7/8
    expect(points[7][0]).toBeCloseTo(0.0625, 5);   // 1/16
  });

  it('should handle high dimensions correctly', () => {
    const sampler = new HaltonSampler();
    const points = sampler.generate(10, 15);

    expect(points).toHaveLength(10);
    expect(points[0]).toHaveLength(15);

    // All values should still be in (0, 1)
    for (const p of points) {
      for (const v of p) {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('should handle edge case of zero samples', () => {
    const sampler = new HaltonSampler();
    const points = sampler.generate(0, 3);
    expect(points).toHaveLength(0);
  });

  it('should handle single sample', () => {
    const sampler = new HaltonSampler();
    const points = sampler.generate(1, 3);
    expect(points).toHaveLength(1);
    expect(points[0]).toHaveLength(3);
  });
});
