/**
 * PCA dimensionality reduction and min-max normalization for API embeddings.
 *
 * Uses a Gram matrix approach (n×n) which is efficient when n (persona count)
 * is much smaller than the embedding dimension d (e.g., 25 vs 512).
 */

/**
 * Reduce high-dimensional points to targetDims dimensions using PCA.
 * Uses Gram matrix + power iteration for eigendecomposition.
 */
export function pcaReduce(points: number[][], targetDims: number): number[][] {
  const n = points.length;

  if (n === 0) return [];
  if (n === 1) {
    return [Array(targetDims).fill(0.5)];
  }

  const d = points[0].length;

  // Effective max PCA dimensions is min(n-1, d, targetDims)
  const effectiveDims = Math.min(targetDims, n - 1, d);

  // Step 1: Mean-center the data
  const mean = Array(d).fill(0);
  for (const p of points) {
    for (let j = 0; j < d; j++) {
      mean[j] += p[j];
    }
  }
  for (let j = 0; j < d; j++) {
    mean[j] /= n;
  }

  const centered: number[][] = points.map((p) =>
    p.map((v, j) => v - mean[j])
  );

  // Step 2: Build Gram matrix G = X_centered × X_centered^T (n×n)
  const G: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < d; k++) {
        dot += centered[i][k] * centered[j][k];
      }
      G[i][j] = dot;
      G[j][i] = dot;
    }
  }

  // Step 3: Power iteration + deflation for top-k eigenvectors of G
  const eigenvalues: number[] = [];
  const eigenvectors: number[][] = [];
  const G_work = G.map((row) => [...row]);

  for (let k = 0; k < effectiveDims; k++) {
    const { value, vector } = powerIteration(G_work, n);

    if (value < 1e-10) {
      // Remaining eigenvalues are negligible
      eigenvalues.push(0);
      eigenvectors.push(Array(n).fill(0));
    } else {
      eigenvalues.push(value);
      eigenvectors.push(vector);
    }

    // Deflation: G_work -= value * v * v^T
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        G_work[i][j] -= value * vector[i] * vector[j];
      }
    }
  }

  // Step 4: Project points — coordinate k of point i = sqrt(λ_k) × v_k[i]
  const result: number[][] = Array.from({ length: n }, () => Array(targetDims).fill(0.5));

  for (let k = 0; k < effectiveDims; k++) {
    if (eigenvalues[k] < 1e-10) continue;
    const scale = Math.sqrt(eigenvalues[k]);
    for (let i = 0; i < n; i++) {
      result[i][k] = scale * eigenvectors[k][i];
    }
  }

  return result;
}

/**
 * Power iteration to find the dominant eigenvector/eigenvalue of a symmetric matrix.
 */
function powerIteration(
  matrix: number[][],
  size: number,
  maxIter: number = 200,
  tol: number = 1e-8
): { value: number; vector: number[] } {
  // Initialize with a non-zero vector
  let v = Array.from({ length: size }, (_, i) => Math.sin(i + 1) + 0.1);

  // Normalize
  let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (norm < 1e-15) {
    v = Array(size).fill(1 / Math.sqrt(size));
    norm = 1;
  } else {
    v = v.map((x) => x / norm);
  }

  let eigenvalue = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    // Matrix-vector multiply
    const Av = Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        Av[i] += matrix[i][j] * v[j];
      }
    }

    // New eigenvalue estimate (Rayleigh quotient)
    const newEigenvalue = v.reduce((s, vi, i) => s + vi * Av[i], 0);

    // Normalize
    norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
    if (norm < 1e-15) {
      return { value: 0, vector: Array(size).fill(0) };
    }
    const vNew = Av.map((x) => x / norm);

    // Check convergence
    if (Math.abs(newEigenvalue - eigenvalue) < tol * Math.max(1, Math.abs(newEigenvalue))) {
      return { value: newEigenvalue, vector: vNew };
    }

    eigenvalue = newEigenvalue;
    v = vNew;
  }

  return { value: eigenvalue, vector: v };
}

/**
 * Normalize each dimension of points to [0, 1] using min-max scaling.
 * Zero-range dimensions are mapped to 0.5.
 */
export function minMaxNormalize(points: number[][]): number[][] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    return [Array(points[0].length).fill(0.5)];
  }

  const d = points[0].length;
  const mins = Array(d).fill(Infinity);
  const maxs = Array(d).fill(-Infinity);

  for (const p of points) {
    for (let j = 0; j < d; j++) {
      mins[j] = Math.min(mins[j], p[j]);
      maxs[j] = Math.max(maxs[j], p[j]);
    }
  }

  return points.map((p) =>
    p.map((v, j) => {
      const range = maxs[j] - mins[j];
      if (range < 1e-15) return 0.5;
      return (v - mins[j]) / range;
    })
  );
}
