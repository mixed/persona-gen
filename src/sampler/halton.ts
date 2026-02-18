import type { Sampler } from './sampler.js';

// First 30 prime numbers for up to 30 dimensions
export const PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
  31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
];

export interface HaltonOptions {
  offset?: number;
}

export class HaltonSampler implements Sampler {
  private offset: number;

  constructor(options: HaltonOptions = {}) {
    this.offset = options.offset ?? 0;
  }

  /**
   * Compute the Halton sequence value for a given index and base.
   * The Halton sequence produces quasi-random numbers in (0, 1)
   * with low discrepancy properties.
   */
  private halton(index: number, base: number): number {
    let result = 0;
    let f = 1 / base;
    let i = index;

    while (i > 0) {
      result += f * (i % base);
      i = Math.floor(i / base);
      f /= base;
    }

    return result;
  }

  /**
   * Generate quasi-random samples using the Halton sequence.
   * Each dimension uses a different prime base for the sequence.
   *
   * @param numSamples - Number of samples to generate
   * @param numDimensions - Number of dimensions per sample
   * @returns Array of samples, each sample is an array of values in (0, 1)
   */
  generate(numSamples: number, numDimensions: number): number[][] {
    if (numSamples === 0) {
      return [];
    }

    if (numDimensions > PRIMES.length) {
      throw new Error(
        `Maximum ${PRIMES.length} dimensions supported, got ${numDimensions}`
      );
    }

    const samples: number[][] = [];

    for (let i = 0; i < numSamples; i++) {
      const point: number[] = [];
      // Use 1-indexed to avoid halton(0) = 0
      const index = i + 1 + this.offset;

      for (let d = 0; d < numDimensions; d++) {
        point.push(this.halton(index, PRIMES[d]));
      }

      samples.push(point);
    }

    return samples;
  }
}
