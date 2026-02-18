import type { DiversityMetrics } from '../types.js';

/**
 * Compute Euclidean distance between two points.
 */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Generate a random point in [0, 1]^d space.
 */
function randomPoint(dimensions: number): number[] {
  return Array.from({ length: dimensions }, () => Math.random());
}

/**
 * Compute Monte Carlo coverage metric.
 * Measures what fraction of random test points are within epsilon distance of any data point.
 */
export function computeCoverage(
  points: number[][],
  epsilon: number = 0.2,
  numTestPoints: number = 1000
): number {
  if (points.length === 0) return 0;

  const dimensions = points[0].length;
  let covered = 0;

  for (let i = 0; i < numTestPoints; i++) {
    const testPoint = randomPoint(dimensions);
    let isCovered = false;

    for (const point of points) {
      if (euclideanDistance(testPoint, point) < epsilon) {
        isCovered = true;
        break;
      }
    }

    if (isCovered) covered++;
  }

  return covered / numTestPoints;
}

/**
 * Compute approximate convex hull volume using Monte Carlo method.
 * This is a simplified approximation - true convex hull computation is complex in high dimensions.
 */
export function computeConvexHullVolume(points: number[][]): number {
  if (points.length < 2) return 0;

  const dimensions = points[0].length;

  // Check for degenerate cases (all points same or collinear)
  const uniquePoints = filterUniquePoints(points);
  if (uniquePoints.length < 2) return 0;

  // Compute bounding box
  const mins = Array(dimensions).fill(Infinity);
  const maxs = Array(dimensions).fill(-Infinity);

  for (const point of uniquePoints) {
    for (let d = 0; d < dimensions; d++) {
      mins[d] = Math.min(mins[d], point[d]);
      maxs[d] = Math.max(maxs[d], point[d]);
    }
  }

  // Check if any dimension has zero range (collinear/degenerate)
  let boxVolume = 1;
  let zeroRangeCount = 0;
  for (let d = 0; d < dimensions; d++) {
    const range = maxs[d] - mins[d];
    if (range < 0.001) {
      zeroRangeCount++;
    }
    boxVolume *= range;
  }

  // If more than one dimension has zero range, volume is 0
  if (zeroRangeCount >= dimensions - 1) return 0;

  // For simplicity, return normalized bounding box volume
  // (True convex hull would be smaller, but this is a reasonable approximation)
  // Normalize to [0, 1] range (unit hypercube has volume 1)
  return Math.min(boxVolume, 1);
}

/**
 * Filter to unique points (remove duplicates).
 */
function filterUniquePoints(points: number[][]): number[][] {
  const seen = new Set<string>();
  const unique: number[][] = [];

  for (const point of points) {
    const key = point.map((v) => v.toFixed(6)).join(',');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(point);
    }
  }

  return unique;
}

/**
 * Compute mean pairwise distance between all points.
 */
export function computeMeanPairwiseDistance(points: number[][]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  let count = 0;

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      totalDistance += euclideanDistance(points[i], points[j]);
      count++;
    }
  }

  return count > 0 ? totalDistance / count : 0;
}

/**
 * Compute minimum pairwise distance (closest pair).
 */
export function computeMinPairwiseDistance(points: number[][]): number {
  if (points.length < 2) return 0;

  let minDistance = Infinity;

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = euclideanDistance(points[i], points[j]);
      minDistance = Math.min(minDistance, dist);
    }
  }

  return minDistance === Infinity ? 0 : minDistance;
}

/**
 * Compute dispersion (maximum empty space radius) using Monte Carlo.
 */
export function computeDispersion(
  points: number[][],
  numTestPoints: number = 1000
): number {
  if (points.length === 0) return 1;

  const dimensions = points[0].length;
  let maxMinDistance = 0;

  for (let i = 0; i < numTestPoints; i++) {
    const testPoint = randomPoint(dimensions);
    let minDistance = Infinity;

    for (const point of points) {
      const dist = euclideanDistance(testPoint, point);
      minDistance = Math.min(minDistance, dist);
    }

    maxMinDistance = Math.max(maxMinDistance, minDistance);
  }

  return maxMinDistance;
}

/**
 * Compute KL divergence from uniform distribution.
 * Higher values indicate more deviation from uniform.
 */
export function computeKLDivergence(
  points: number[][],
  numBins: number = 10
): number {
  if (points.length === 0) return 0;

  const dimensions = points[0].length;
  let totalKL = 0;

  // Compute KL for each dimension
  for (let d = 0; d < dimensions; d++) {
    const histogram = Array(numBins).fill(0);

    for (const point of points) {
      const binIndex = Math.min(
        Math.floor(point[d] * numBins),
        numBins - 1
      );
      histogram[binIndex]++;
    }

    // Convert to probabilities
    const probs = histogram.map((count) => count / points.length);
    const uniformProb = 1 / numBins;

    // Compute KL divergence for this dimension
    let kl = 0;
    for (const p of probs) {
      if (p > 0) {
        kl += p * Math.log(p / uniformProb);
      }
    }

    totalKL += kl;
  }

  // Return average KL across dimensions
  return totalKL / dimensions;
}

/**
 * Compute all diversity metrics and an overall score.
 */
export function computeAllMetrics(points: number[][]): DiversityMetrics {
  if (points.length === 0) {
    return {
      coverage: 0,
      convexHullVolume: 0,
      meanPairwiseDistance: 0,
      minPairwiseDistance: 0,
      dispersion: 1,
      klDivergence: 0,
      overall: 0,
    };
  }

  const coverage = computeCoverage(points);
  const convexHullVolume = computeConvexHullVolume(points);
  const meanPairwiseDistance = computeMeanPairwiseDistance(points);
  const minPairwiseDistance = computeMinPairwiseDistance(points);
  const dispersion = computeDispersion(points);
  const klDivergence = computeKLDivergence(points);

  // Normalize metrics to [0, 1] range for overall score
  // Higher is better for: coverage, convexHullVolume, meanPairwiseDistance, minPairwiseDistance
  // Lower is better for: dispersion, klDivergence

  // Normalize pairwise distances (max possible in unit hypercube is sqrt(d))
  const dimensions = points[0].length;
  const maxDistance = Math.sqrt(dimensions);
  const normMeanPairwise = meanPairwiseDistance / maxDistance;
  const normMinPairwise = minPairwiseDistance / maxDistance;

  // Invert dispersion (lower is better, so 1 - normalized)
  const normDispersion = 1 - Math.min(dispersion / maxDistance, 1);

  // Invert KL divergence (cap at reasonable max, then invert)
  const normKL = 1 - Math.min(klDivergence / 3, 1);

  // Compute weighted overall score
  const overall =
    coverage * 0.2 +
    convexHullVolume * 0.15 +
    normMeanPairwise * 0.2 +
    normMinPairwise * 0.15 +
    normDispersion * 0.15 +
    normKL * 0.15;

  return {
    coverage,
    convexHullVolume,
    meanPairwiseDistance,
    minPairwiseDistance,
    dispersion,
    klDivergence,
    overall: Math.min(Math.max(overall, 0), 1),
  };
}
