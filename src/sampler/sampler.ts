export interface Sampler {
  generate(numSamples: number, numDimensions: number): number[][];
}
