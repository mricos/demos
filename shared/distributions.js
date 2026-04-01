/**
 * shared/distributions.js — Statistical distributions
 *
 * Provides PDF, CDF, quantile, and sampling functions for common distributions.
 * Extracted from stat-rethink/lib/rethinking.js (R's rethinking package port).
 *
 * Usage:
 *   import { normal, kde, erf } from '/shared/distributions.js';
 *   const p = normal.pdf(1.5, 0, 1);
 *   const samples = normal.sample(100, 0, 1);
 */

/* ═══════════════════════════════════════════════════════
   SPECIAL FUNCTIONS
   ═══════════════════════════════════════════════════════ */

/**
 * Error function (Abramowitz & Stegun approximation)
 * @param {number} x
 * @returns {number}
 */
export function erf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sgn = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  return sgn * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
}

/**
 * Log-gamma function (Lanczos approximation)
 * @param {number} x
 * @returns {number}
 */
export function logGamma(x) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Beta function B(a,b) = Γ(a)Γ(b)/Γ(a+b)
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function betaFunction(a, b) {
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

// Inverse normal (Beasley-Springer-Moro rational approximation)
function qnormStd(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
             1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
             6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
             -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLo = 0.02425, pHi = 1 - pLo;
  let q;
  if (p < pLo) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHi) {
    q = p - 0.5;
    const r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/* ═══════════════════════════════════════════════════════
   DISTRIBUTIONS
   ═══════════════════════════════════════════════════════ */

/**
 * Normal (Gaussian) distribution
 */
export const normal = {
  /** Probability density function */
  pdf(x, mu = 0, sd = 1) {
    const z = (x - mu) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  },

  /** Cumulative distribution function */
  cdf(x, mu = 0, sd = 1) {
    return 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));
  },

  /** Quantile function (inverse CDF) */
  quantile(p, mu = 0, sd = 1) {
    return mu + sd * qnormStd(p);
  },

  /** Generate n random samples */
  sample(n = 1, mu = 0, sd = 1) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const u1 = Math.random(), u2 = Math.random();
      out.push(mu + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
    }
    return n === 1 ? out[0] : out;
  },
};

/**
 * Exponential distribution
 */
export const exponential = {
  pdf(x, rate = 1) {
    return x < 0 ? 0 : rate * Math.exp(-rate * x);
  },

  cdf(x, rate = 1) {
    return x < 0 ? 0 : 1 - Math.exp(-rate * x);
  },

  quantile(p, rate = 1) {
    return -Math.log(1 - p) / rate;
  },

  sample(n = 1, rate = 1) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(-Math.log(Math.random()) / rate);
    return n === 1 ? out[0] : out;
  },
};

/**
 * Uniform distribution
 */
export const uniform = {
  pdf(x, lo = 0, hi = 1) {
    return (x >= lo && x <= hi) ? 1 / (hi - lo) : 0;
  },

  cdf(x, lo = 0, hi = 1) {
    if (x < lo) return 0;
    if (x > hi) return 1;
    return (x - lo) / (hi - lo);
  },

  quantile(p, lo = 0, hi = 1) {
    return lo + p * (hi - lo);
  },

  sample(n = 1, lo = 0, hi = 1) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(lo + Math.random() * (hi - lo));
    return n === 1 ? out[0] : out;
  },
};

/**
 * Beta distribution
 */
export const beta = {
  pdf(x, a = 1, b = 1) {
    if (x <= 0 || x >= 1) return 0;
    return Math.pow(x, a - 1) * Math.pow(1 - x, b - 1) / betaFunction(a, b);
  },

  /** CDF via regularized incomplete beta (simple numerical integration) */
  cdf(x, a = 1, b = 1) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Simpson's rule numerical integration
    const steps = 200;
    const h = x / steps;
    let sum = beta.pdf(0, a, b) + beta.pdf(x, a, b);
    for (let i = 1; i < steps; i++) {
      const xi = i * h;
      sum += (i % 2 === 0 ? 2 : 4) * beta.pdf(xi, a, b);
    }
    return sum * h / 3;
  },

  /** Sample via rejection sampling */
  sample(n = 1, a = 1, b = 1) {
    const out = [];
    // Use Jöhnk's algorithm for simplicity
    for (let i = 0; i < n; i++) {
      let x;
      if (a >= 1 && b >= 1) {
        // Gamma-based sampling
        const ga = gammaSample(a);
        const gb = gammaSample(b);
        x = ga / (ga + gb);
      } else {
        // Rejection sampling fallback
        do {
          const u1 = Math.random(), u2 = Math.random();
          const v = Math.pow(u1, 1 / a);
          const w = Math.pow(u2, 1 / b);
          x = v / (v + w);
        } while (x <= 0 || x >= 1);
      }
      out.push(x);
    }
    return n === 1 ? out[0] : out;
  },
};

// Helper: sample from Gamma(a, 1) using Marsaglia & Tsang
function gammaSample(shape) {
  if (shape < 1) {
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normal.sample(1, 0, 1);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Gamma distribution
 */
export const gamma = {
  pdf(x, shape = 1, rate = 1) {
    if (x <= 0) return 0;
    return Math.exp(
      (shape - 1) * Math.log(x) - rate * x + shape * Math.log(rate) - logGamma(shape)
    );
  },

  cdf(x, shape = 1, rate = 1) {
    if (x <= 0) return 0;
    // Numerical integration via Simpson's rule
    const steps = 200;
    const h = x / steps;
    let sum = gamma.pdf(0, shape, rate) + gamma.pdf(x, shape, rate);
    for (let i = 1; i < steps; i++) {
      const xi = i * h;
      sum += (i % 2 === 0 ? 2 : 4) * gamma.pdf(xi, shape, rate);
    }
    return Math.min(1, sum * h / 3);
  },

  sample(n = 1, shape = 1, rate = 1) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(gammaSample(shape) / rate);
    return n === 1 ? out[0] : out;
  },
};

/**
 * Log-Normal distribution
 */
export const logNormal = {
  pdf(x, mu = 0, sigma = 1) {
    if (x <= 0) return 0;
    const logx = Math.log(x);
    return Math.exp(-0.5 * ((logx - mu) / sigma) ** 2) / (x * sigma * Math.sqrt(2 * Math.PI));
  },

  cdf(x, mu = 0, sigma = 1) {
    if (x <= 0) return 0;
    return normal.cdf(Math.log(x), mu, sigma);
  },

  sample(n = 1, mu = 0, sigma = 1) {
    const norms = normal.sample(n, mu, sigma);
    if (n === 1) return Math.exp(norms);
    return norms.map(Math.exp);
  },
};

/* ═══════════════════════════════════════════════════════
   KERNEL DENSITY ESTIMATION
   ═══════════════════════════════════════════════════════ */

/**
 * Kernel density estimation with Gaussian kernel
 * @param {number[]} data - Sample data
 * @param {number} [bandwidth] - Bandwidth (Silverman's rule if omitted)
 * @param {number} [npts=512] - Number of evaluation points
 * @returns {{ x: number[], y: number[], bw: number }}
 */
export function kde(data, bandwidth, npts = 512) {
  const n = data.length;
  const sd = Math.sqrt(data.reduce((s, v) => {
    const m = data.reduce((a, b) => a + b, 0) / n;
    return s + (v - m) ** 2;
  }, 0) / n);
  const bw = bandwidth || 1.06 * (sd || 1) * Math.pow(n, -0.2);

  const lo = Math.min(...data) - 3 * bw;
  const hi = Math.max(...data) + 3 * bw;
  const step = (hi - lo) / (npts - 1);
  const x = [], y = [];

  for (let i = 0; i < npts; i++) {
    const xi = lo + i * step;
    let yi = 0;
    for (let j = 0; j < n; j++) yi += normal.pdf(xi, data[j], bw);
    x.push(xi);
    y.push(yi / n);
  }
  return { x, y, bw };
}
