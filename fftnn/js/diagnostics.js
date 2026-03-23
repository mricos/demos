// Weight diagnostics via SVD / Eigenvalue analysis
// Pure math module, no DOM dependencies

/**
 * Jacobi eigenvalue algorithm for symmetric matrix.
 * Returns sorted eigenvalues (descending).
 */
export function jacobiEigenvalues(A, maxIter = 50) {
  const n = A.length;
  // Copy A
  const S = A.map(row => [...row]);

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(S[i][j]) > maxVal) {
          maxVal = Math.abs(S[i][j]);
          p = i; q = j;
        }
      }
    }
    if (maxVal < 1e-10) break;

    // Compute rotation angle
    const diff = S[q][q] - S[p][p];
    let t;
    if (Math.abs(diff) < 1e-15) {
      t = 1;
    } else {
      const phi = diff / (2 * S[p][q]);
      t = 1 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
      if (phi < 0) t = -t;
    }
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    // Apply rotation to S
    const tau = s / (1 + c);
    const aij = S[p][q];
    S[p][q] = 0;
    S[p][p] -= t * aij;
    S[q][q] += t * aij;

    for (let i = 0; i < n; i++) {
      if (i === p || i === q) continue;
      const sip = S[i][p], siq = S[i][q];
      S[i][p] = S[p][i] = sip - s * (siq + tau * sip);
      S[i][q] = S[q][i] = siq + s * (sip - tau * siq);
    }
  }

  const eigenvalues = [];
  for (let i = 0; i < n; i++) eigenvalues.push(S[i][i]);
  eigenvalues.sort((a, b) => b - a);
  return eigenvalues;
}

/**
 * Compute singular values of W (m x n matrix).
 * Builds W^T*W or W*W^T (whichever is smaller), runs Jacobi.
 */
export function computeSingularValues(W) {
  const m = W.length, n = W[0].length;
  const useTranspose = m > n;
  const dim = useTranspose ? n : m;

  // Build symmetric matrix: either W^T*W (n x n) or W*W^T (m x m)
  const G = Array.from({ length: dim }, () => new Array(dim).fill(0));

  if (useTranspose) {
    // W^T * W  (n x n)
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < m; k++) sum += W[k][i] * W[k][j];
        G[i][j] = G[j][i] = sum;
      }
    }
  } else {
    // W * W^T  (m x m)
    for (let i = 0; i < m; i++) {
      for (let j = i; j < m; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) sum += W[i][k] * W[j][k];
        G[i][j] = G[j][i] = sum;
      }
    }
  }

  const eigenvalues = jacobiEigenvalues(G);
  const singularValues = eigenvalues.map(ev => Math.sqrt(Math.max(0, ev)));
  const sigmaMax = singularValues[0] || 1;
  const sigmaMin = singularValues[singularValues.length - 1] || 0;
  const conditionNumber = sigmaMin > 1e-10 ? sigmaMax / sigmaMin : Infinity;
  const effectiveRank = singularValues.filter(s => s > 0.01 * sigmaMax).length;

  return { singularValues, conditionNumber, effectiveRank };
}

/**
 * Compute orthogonality of rows of W.
 * L2-normalizes rows, computes Gram matrix, returns mean |off-diagonal|.
 */
export function computeOrthogonality(W) {
  const m = W.length, n = W[0].length;

  // L2-normalize rows
  const Wn = W.map(row => {
    const norm = Math.sqrt(row.reduce((s, v) => s + v * v, 0)) || 1;
    return row.map(v => v / norm);
  });

  // Gram matrix
  const gramMatrix = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = i; j < m; j++) {
      let dot = 0;
      for (let k = 0; k < n; k++) dot += Wn[i][k] * Wn[j][k];
      gramMatrix[i][j] = gramMatrix[j][i] = dot;
    }
  }

  // Mean |off-diagonal|
  let sum = 0, count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      if (i !== j) { sum += Math.abs(gramMatrix[i][j]); count++; }
    }
  }
  const score = count > 0 ? sum / count : 0;

  return { gramMatrix, score };
}

/**
 * Spectral purity: DFT each row, measure energy in peak ±1 bin / total energy.
 * Returns {perNeuron, mean}. 1.0 = pure sinusoid.
 */
export function computeSpectralPurity(W) {
  const m = W.length, n = W[0].length;
  const perNeuron = [];

  for (let r = 0; r < m; r++) {
    const row = W[r];
    // Compute DFT magnitude squared
    const nBins = Math.floor(n / 2) + 1;
    const mag2 = new Array(nBins).fill(0);
    for (let k = 0; k < nBins; k++) {
      let re = 0, im = 0;
      for (let t = 0; t < n; t++) {
        const angle = -2 * Math.PI * k * t / n;
        re += row[t] * Math.cos(angle);
        im += row[t] * Math.sin(angle);
      }
      mag2[k] = re * re + im * im;
    }

    const totalEnergy = mag2.reduce((a, b) => a + b, 0);
    if (totalEnergy < 1e-15) { perNeuron.push(0); continue; }

    // Find peak bin
    let peakIdx = 0, peakVal = 0;
    for (let k = 0; k < nBins; k++) {
      if (mag2[k] > peakVal) { peakVal = mag2[k]; peakIdx = k; }
    }

    // Energy in peak ±1
    let peakEnergy = mag2[peakIdx];
    if (peakIdx > 0) peakEnergy += mag2[peakIdx - 1];
    if (peakIdx < nBins - 1) peakEnergy += mag2[peakIdx + 1];

    perNeuron.push(peakEnergy / totalEnergy);
  }

  const mean = perNeuron.length > 0
    ? perNeuron.reduce((a, b) => a + b, 0) / perNeuron.length : 0;

  return { perNeuron, mean };
}

/**
 * Detect dead and redundant neurons.
 * Dead: ||row|| < 0.01. Redundant: |corr(row_i, row_j)| > 0.95.
 */
export function detectDeadRedundant(W) {
  const m = W.length, n = W[0].length;

  // Row norms
  const norms = W.map(row => Math.sqrt(row.reduce((s, v) => s + v * v, 0)));
  const deadCount = norms.filter(norm => norm < 0.01).length;

  // Row means for correlation
  const means = W.map(row => row.reduce((s, v) => s + v, 0) / n);

  let redundantCount = 0;
  const redundantSet = new Set();
  for (let i = 0; i < m; i++) {
    if (norms[i] < 0.01) continue;
    for (let j = i + 1; j < m; j++) {
      if (norms[j] < 0.01) continue;
      // Pearson correlation
      let num = 0, di = 0, dj = 0;
      for (let k = 0; k < n; k++) {
        const a = W[i][k] - means[i], b = W[j][k] - means[j];
        num += a * b;
        di += a * a;
        dj += b * b;
      }
      const denom = Math.sqrt(di * dj);
      if (denom > 1e-15 && Math.abs(num / denom) > 0.95) {
        redundantSet.add(i);
        redundantSet.add(j);
      }
    }
  }
  redundantCount = redundantSet.size;

  return { deadCount, redundantCount };
}
