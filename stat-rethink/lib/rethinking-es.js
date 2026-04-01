/**
 * rethinking-es.js — ES module entry point for rethinking.js
 *
 * Re-exports the R namespace functions using shared/distributions.js
 * for distribution primitives, plus rethinking-specific functions
 * (quap, link, precis, DAG, sampling) from the original library.
 *
 * Usage:
 *   import { dnorm, pnorm, quap, density } from './lib/rethinking-es.js';
 *
 * For backward compatibility with non-module scripts, continue using:
 *   <script src="./lib/rethinking.js"></script>
 *   // then use R.dnorm(), R.quap(), etc.
 */

// Distribution primitives from shared
import { normal, exponential, uniform, kde, erf } from '/shared/distributions.js';
import { mean, variance, std, covariance, correlation } from '/shared/statistics.js';

// Load the full rethinking library for higher-level functions
// (quap, link, precis, DAG, sampling, etc.)
// We dynamic-import to avoid circular issues and because it's an IIFE
const _loadR = () => {
  if (typeof window !== 'undefined' && window.R) return window.R;
  throw new Error('rethinking.js must be loaded via <script> first for quap/link/precis');
};

// ── Distribution functions (delegating to shared) ──────────

export const dnorm = (x, mu = 0, sd = 1, log = false) => {
  const val = normal.pdf(x, mu, sd);
  return log ? Math.log(val) : val;
};
export const pnorm = (x, mu = 0, sd = 1) => normal.cdf(x, mu, sd);
export const qnorm = (p, mu = 0, sd = 1) => normal.quantile(p, mu, sd);
export const rnorm = (n = 1, mu = 0, sd = 1) => normal.sample(n, mu, sd);

export const dexp = (x, rate = 1, log = false) => {
  const val = exponential.pdf(x, rate);
  return log ? Math.log(val) : val;
};
export const rexp = (n = 1, rate = 1) => exponential.sample(n, rate);

export const runif = (n = 1, lo = 0, hi = 1) => uniform.sample(n, lo, hi);

// ── Core utilities (delegating to shared) ──────────────────

export { mean, variance, std };
export const sd = std;
export const cov = covariance;
export const cor = correlation;

// ── KDE (delegating to shared) ─────────────────────────────

export const density = (data, npts = 512, bw) => {
  return kde(data, bw, npts);
};

// ── Higher-level functions (require full rethinking.js) ────

export const quap = (...args) => _loadR().quap(...args);
export const extract_samples = (...args) => _loadR().extract_samples(...args);
export const extract_prior = (...args) => _loadR().extract_prior(...args);
export const link = (...args) => _loadR().link(...args);
export const precis = (...args) => _loadR().precis(...args);
export const dagitty = (...args) => _loadR().dagitty(...args);
export const optim = (...args) => _loadR().optim(...args);
export const hessian = (...args) => _loadR().hessian(...args);

// ── R-style utilities ──────────────────────────────────────

export const seq = (from, to, len) => {
  const out = [], step = (to - from) / (len - 1);
  for (let i = 0; i < len; i++) out.push(from + i * step);
  return out;
};

export const rep = (v, n) => Array.isArray(v) ? [].concat(...Array(n).fill(v)) : new Array(n).fill(v);

export const sample = (x, n, replace = false) => {
  const out = [];
  if (replace) {
    for (let i = 0; i < n; i++) out.push(x[Math.floor(Math.random() * x.length)]);
  } else {
    const pool = [...x];
    for (let i = 0; i < Math.min(n, pool.length); i++) {
      const j = Math.floor(Math.random() * (pool.length - i)) + i;
      [pool[i], pool[j]] = [pool[j], pool[i]];
      out.push(pool[i]);
    }
  }
  return out;
};

export const PI = (samples, prob = 0.89) => {
  const lo = (1 - prob) / 2;
  return quantile(samples, [lo, 1 - lo]);
};

export const quantile = (x, probs) => {
  const s = [...x].sort((a, b) => a - b), n = s.length;
  const get = (p) => {
    const i = p * (n - 1), lo = Math.floor(i);
    return s[lo] + (s[Math.min(lo + 1, n - 1)] - s[lo]) * (i - lo);
  };
  return typeof probs === 'number' ? get(probs) : probs.map(get);
};

export const HPDI = (samples, prob = 0.89) => {
  const s = [...samples].sort((a, b) => a - b), n = s.length, w = Math.ceil(prob * n);
  let best = Infinity, idx = 0;
  for (let i = 0; i <= n - w; i++) {
    const d = s[i + w - 1] - s[i];
    if (d < best) { best = d; idx = i; }
  }
  return [s[idx], s[idx + w - 1]];
};
