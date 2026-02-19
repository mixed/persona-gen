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
 * Compute log-gamma using Lanczos approximation.
 */
function logGamma(z: number): number {
  if (z < 0.5) {
    // Reflection formula: Γ(z)Γ(1-z) = π/sin(πz)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Compute adaptive epsilon for coverage metric based on dimensionality.
 * Maintains the same volume ratio as epsilon=0.2 in 2D (~12.6% of unit hypercube).
 *
 * Formula: epsilon_d = (targetVolume × Γ(d/2+1) / π^(d/2))^(1/d)
 * where targetVolume = π × referenceEpsilon² (2D ball volume)
 */
export function adaptiveEpsilon(dimensions: number, referenceEpsilon: number = 0.2): number {
  // targetVolume = π × ref² (volume of 2D ball with radius=referenceEpsilon)
  const targetVolume = Math.PI * referenceEpsilon * referenceEpsilon;

  // Volume of d-ball with radius r: V_d(r) = π^(d/2) / Γ(d/2+1) × r^d
  // Solving for r: r = (V × Γ(d/2+1) / π^(d/2))^(1/d)
  const halfD = dimensions / 2;
  const logNumerator = Math.log(targetVolume) + logGamma(halfD + 1);
  const logDenominator = halfD * Math.log(Math.PI);

  return Math.exp((logNumerator - logDenominator) / dimensions);
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
  epsilon?: number,
  numTestPoints: number = 1000
): number {
  if (points.length === 0) return 0;

  const dimensions = points[0].length;
  const effectiveEpsilon = epsilon ?? adaptiveEpsilon(dimensions);
  let covered = 0;

  for (let i = 0; i < numTestPoints; i++) {
    const testPoint = randomPoint(dimensions);
    let isCovered = false;

    for (const point of points) {
      if (euclideanDistance(testPoint, point) < effectiveEpsilon) {
        isCovered = true;
        break;
      }
    }

    if (isCovered) covered++;
  }

  return covered / numTestPoints;
}

/**
 * Check if a point lies inside the convex hull of a set of points
 * using the Away-Step Frank-Wolfe algorithm. Unlike standard Frank-Wolfe
 * (O(1/t) convergence), this variant achieves linear convergence by
 * maintaining an explicit active set of vertices and their weights.
 */
function isInsideConvexHull(
  point: number[],
  hullPoints: number[][],
  maxIter: number = 100,
  tol: number = 1e-10
): boolean {
  const n = hullPoints.length;
  const d = point.length;

  // Find closest vertex as starting point
  let bestIdx = 0;
  let bestDistSq = 0;
  for (let j = 0; j < d; j++) bestDistSq += (hullPoints[0][j] - point[j]) ** 2;

  for (let i = 1; i < n; i++) {
    let distSq = 0;
    for (let j = 0; j < d; j++) distSq += (hullPoints[i][j] - point[j]) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIdx = i;
    }
  }

  if (bestDistSq < tol) return true;

  // Active set: vertex weights (only track non-zero entries)
  const alpha = new Float64Array(n);
  alpha[bestIdx] = 1.0;
  const current = [...hullPoints[bestIdx]];

  for (let iter = 0; iter < maxIter; iter++) {
    // gradient direction g = current - point (factor of 2 cancels in line search)

    // Forward vertex: argmin_i <g, p_i>
    let fwIdx = 0;
    let fwDot = 0;
    for (let j = 0; j < d; j++) fwDot += (current[j] - point[j]) * hullPoints[0][j];
    for (let i = 1; i < n; i++) {
      let dot = 0;
      for (let j = 0; j < d; j++) dot += (current[j] - point[j]) * hullPoints[i][j];
      if (dot < fwDot) { fwDot = dot; fwIdx = i; }
    }

    // Away vertex: argmax_{i: α_i > 0} <g, p_i>
    let awIdx = -1;
    let awDot = -Infinity;
    for (let i = 0; i < n; i++) {
      if (alpha[i] < 1e-14) continue;
      let dot = 0;
      for (let j = 0; j < d; j++) dot += (current[j] - point[j]) * hullPoints[i][j];
      if (dot > awDot) { awDot = dot; awIdx = i; }
    }

    // FW duality gap: <g, x - v_fw>
    let gCurrent = 0;
    for (let j = 0; j < d; j++) gCurrent += (current[j] - point[j]) * current[j];
    const fwGap = gCurrent - fwDot;

    if (fwGap < tol) break; // converged

    const awGap = awDot - gCurrent;
    const useForward = fwGap >= awGap;

    // Line search along chosen direction
    let num = 0;
    let den = 0;
    let maxGamma: number;

    if (useForward) {
      // direction = v_fw - current
      for (let j = 0; j < d; j++) {
        const dj = hullPoints[fwIdx][j] - current[j];
        num += (current[j] - point[j]) * dj;
        den += dj * dj;
      }
      maxGamma = 1.0;
    } else {
      // direction = current - v_aw
      for (let j = 0; j < d; j++) {
        const dj = current[j] - hullPoints[awIdx][j];
        num += (current[j] - point[j]) * dj;
        den += dj * dj;
      }
      maxGamma = alpha[awIdx] / (1 - alpha[awIdx]);
    }

    if (den < 1e-15) break;
    const gamma = Math.max(0, Math.min(maxGamma, -num / den));
    if (gamma < 1e-15) break;

    // Update current point and weights
    if (useForward) {
      for (let j = 0; j < d; j++) {
        current[j] = (1 - gamma) * current[j] + gamma * hullPoints[fwIdx][j];
      }
      for (let i = 0; i < n; i++) alpha[i] *= (1 - gamma);
      alpha[fwIdx] += gamma;
    } else {
      for (let j = 0; j < d; j++) {
        current[j] = (1 + gamma) * current[j] - gamma * hullPoints[awIdx][j];
      }
      for (let i = 0; i < n; i++) alpha[i] *= (1 + gamma);
      alpha[awIdx] -= gamma;
    }

    let distSq = 0;
    for (let j = 0; j < d; j++) distSq += (current[j] - point[j]) ** 2;
    if (distSq < tol) return true;
  }

  let distSq = 0;
  for (let j = 0; j < d; j++) distSq += (current[j] - point[j]) ** 2;
  return distSq < tol;
}

/**
 * Compute convex hull volume as a fraction of the unit hypercube [0,1]^d
 * using Monte Carlo sampling with Frank-Wolfe hull membership test.
 */
export function computeConvexHullVolume(
  points: number[][],
  numTestPoints: number = 5000
): number {
  if (points.length < 2) return 0;

  const dimensions = points[0].length;

  // Check for degenerate cases (all points same or collinear)
  const uniquePoints = filterUniquePoints(points);
  if (uniquePoints.length < 2) return 0;

  let insideCount = 0;
  for (let i = 0; i < numTestPoints; i++) {
    const testPoint = randomPoint(dimensions);
    if (isInsideConvexHull(testPoint, uniquePoints)) {
      insideCount++;
    }
  }

  return insideCount / numTestPoints;
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
    convexHullVolume * 0.2 +
    normMeanPairwise * 0.15 +
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
