#MULTICAT_START
# dir: ./lib
# file: rethinking.js
# note: Statistical Rethinking JS library — ported R functions with real math
#MULTICAT_END
/**
 * rethinking.js — Statistical Rethinking in JavaScript
 * Ported from R's rethinking package (Richard McElreath)
 * Provides: distributions, sampling, optimisation, quap, link, precis, DAG, KDE
 */
(function (global) {
  "use strict";
  const R = {};

  /* ═══════════════════════════════════════════════════════
     PRNG — Park-Miller LCG (seeded)
     ═══════════════════════════════════════════════════════ */
  class PRNG {
    constructor(seed) {
      this.s = ((seed % 2147483647) + 2147483646) % 2147483647 || 1;
    }
    next() {
      this.s = (this.s * 16807) % 2147483647;
      return (this.s - 1) / 2147483646;
    }
  }
  let _rng = new PRNG(42);
  R.set_seed = (seed) => { _rng = new PRNG(seed); };
  R.rng = () => _rng.next();

  /* ═══════════════════════════════════════════════════════
     SPECIAL FUNCTIONS
     ═══════════════════════════════════════════════════════ */
  function erf(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
          a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sgn = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    return sgn * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  }

  // Beasley-Springer-Moro rational approximation of Φ⁻¹
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
    let q, r;
    if (p < pLo) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHi) {
      q = p - 0.5; r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
             (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1));
    }
  }

  /* ═══════════════════════════════════════════════════════
     DISTRIBUTIONS
     ═══════════════════════════════════════════════════════ */

  // --- Normal ---
  R.dnorm = (x, mu = 0, sd = 1, log = false) => {
    const z = (x - mu) / sd;
    const lp = -0.5 * Math.log(2 * Math.PI) - Math.log(sd) - 0.5 * z * z;
    return log ? lp : Math.exp(lp);
  };
  R.pnorm = (x, mu = 0, sd = 1) => 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));
  R.qnorm = (p, mu = 0, sd = 1) => mu + sd * qnormStd(p);
  R.rnorm = (n = 1, mu = 0, sd = 1) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const u1 = _rng.next(), u2 = _rng.next();
      out.push(mu + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
    }
    return n === 1 ? out[0] : out;
  };

  // --- Exponential ---
  R.dexp = (x, rate = 1, log = false) => {
    if (x < 0) return log ? -Infinity : 0;
    const lp = Math.log(rate) - rate * x;
    return log ? lp : Math.exp(lp);
  };
  R.rexp = (n = 1, rate = 1) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push(-Math.log(_rng.next()) / rate);
    return n === 1 ? out[0] : out;
  };

  // --- Log-Normal ---
  R.dlnorm = (x, ml = 0, sl = 1, log = false) => {
    if (x <= 0) return log ? -Infinity : 0;
    const lp = -Math.log(x) - Math.log(sl) - 0.5 * Math.log(2 * Math.PI)
               - 0.5 * ((Math.log(x) - ml) / sl) ** 2;
    return log ? lp : Math.exp(lp);
  };
  R.rlnorm = (n = 1, ml = 0, sl = 1) => {
    const v = R.rnorm(n, ml, sl);
    return n === 1 ? Math.exp(v) : v.map(Math.exp);
  };

  // --- Uniform ---
  R.runif = (n = 1, lo = 0, hi = 1) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push(lo + _rng.next() * (hi - lo));
    return n === 1 ? out[0] : out;
  };

  /* ═══════════════════════════════════════════════════════
     CORE UTILITIES
     ═══════════════════════════════════════════════════════ */
  R.sum    = (x) => x.reduce((a, b) => a + b, 0);
  R.mean   = (x) => R.sum(x) / x.length;
  R.variance = (x) => { const m = R.mean(x); return x.reduce((a, v) => a + (v - m) ** 2, 0) / (x.length - 1); };
  R.sd     = (x) => Math.sqrt(R.variance(x));
  R.cov    = (x, y) => { const mx = R.mean(x), my = R.mean(y); return x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0) / (x.length - 1); };
  R.cor    = (x, y) => R.cov(x, y) / (R.sd(x) * R.sd(y));
  R.cumsum = (x) => { let s = 0; return x.map(v => (s += v)); };
  R.abs    = (x) => Array.isArray(x) ? x.map(Math.abs) : Math.abs(x);
  R.log    = (x) => Array.isArray(x) ? x.map(Math.log) : Math.log(x);
  R.exp    = (x) => Array.isArray(x) ? x.map(Math.exp) : Math.exp(x);
  R.sqrt   = (x) => Array.isArray(x) ? x.map(Math.sqrt) : Math.sqrt(x);

  R.seq = (from, to, len) => {
    const out = [], step = (to - from) / (len - 1);
    for (let i = 0; i < len; i++) out.push(from + i * step);
    return out;
  };
  R.rep = (v, n) => Array.isArray(v) ? [].concat(...Array(n).fill(v)) : new Array(n).fill(v);

  R.ifelse = (c, a, b) => {
    if (Array.isArray(c)) return c.map((ci, i) => ci ? (Array.isArray(a) ? a[i] : a) : (Array.isArray(b) ? b[i] : b));
    return c ? a : b;
  };

  R.sample = (x, n, replace = false) => {
    const out = [];
    if (replace) {
      for (let i = 0; i < n; i++) out.push(x[Math.floor(_rng.next() * x.length)]);
    } else {
      const pool = [...x];
      for (let i = 0; i < Math.min(n, pool.length); i++) {
        const j = Math.floor(_rng.next() * (pool.length - i)) + i;
        [pool[i], pool[j]] = [pool[j], pool[i]];
        out.push(pool[i]);
      }
    }
    return out;
  };

  R.quantile = (x, probs) => {
    const s = [...x].sort((a, b) => a - b), n = s.length;
    const get = (p) => { const i = p * (n - 1), lo = Math.floor(i); return s[lo] + (s[Math.min(lo + 1, n - 1)] - s[lo]) * (i - lo); };
    return typeof probs === "number" ? get(probs) : probs.map(get);
  };

  R.PI = (samples, prob = 0.89) => {
    const lo = (1 - prob) / 2;
    return R.quantile(samples, [lo, 1 - lo]);
  };

  R.HPDI = (samples, prob = 0.89) => {
    const s = [...samples].sort((a, b) => a - b), n = s.length, w = Math.ceil(prob * n);
    let best = Infinity, idx = 0;
    for (let i = 0; i <= n - w; i++) { const d = s[i + w - 1] - s[i]; if (d < best) { best = d; idx = i; } }
    return [s[idx], s[idx + w - 1]];
  };

  // Column-wise apply on 2D array
  R.apply2 = (mat, fn) => {
    const nC = mat[0].length, out = [];
    for (let j = 0; j < nC; j++) { const col = mat.map(r => r[j]); out.push(fn(col)); }
    return out;
  };

  /* ═══════════════════════════════════════════════════════
     KERNEL DENSITY ESTIMATION
     ═══════════════════════════════════════════════════════ */
  R.density = (data, npts = 512, bw) => {
    const n = data.length;
    if (!bw) bw = 1.06 * R.sd(data) * Math.pow(n, -0.2);
    const lo = Math.min(...data) - 3 * bw, hi = Math.max(...data) + 3 * bw;
    const step = (hi - lo) / (npts - 1), x = [], y = [];
    for (let i = 0; i < npts; i++) {
      const xi = lo + i * step;
      let yi = 0;
      for (let j = 0; j < n; j++) yi += R.dnorm(xi, data[j], bw);
      x.push(xi); y.push(yi / n);
    }
    return { x, y, bw };
  };

  /* ═══════════════════════════════════════════════════════
     LINEAR ALGEBRA
     ═══════════════════════════════════════════════════════ */
  R.cholesky = (A) => {
    const n = A.length, L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      let s = 0; for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      L[i][j] = i === j ? Math.sqrt(Math.max(1e-12, A[i][i] - s)) : (A[i][j] - s) / L[j][j];
    }
    return L;
  };

  R.solve = (A) => {
    const n = A.length;
    const aug = A.map((r, i) => { const row = [...r]; for (let j = 0; j < n; j++) row.push(i === j ? 1 : 0); return row; });
    for (let i = 0; i < n; i++) {
      let mx = i; for (let k = i + 1; k < n; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[mx][i])) mx = k;
      [aug[i], aug[mx]] = [aug[mx], aug[i]];
      const piv = aug[i][i]; if (Math.abs(piv) < 1e-14) continue;
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= piv;
      for (let k = 0; k < n; k++) { if (k === i) continue; const f = aug[k][i]; for (let j = 0; j < 2 * n; j++) aug[k][j] -= f * aug[i][j]; }
    }
    return aug.map(r => r.slice(n));
  };

  R.matmul_vec = (A, v) => A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));

  R.rmvnorm = (n, mu, sigma) => {
    const d = mu.length, L = R.cholesky(sigma), out = [];
    for (let i = 0; i < n; i++) {
      const z = R.rnorm(d, 0, 1), zArr = Array.isArray(z) ? z : [z];
      const x = R.matmul_vec(L, zArr);
      out.push(x.map((v, j) => v + mu[j]));
    }
    return out;
  };

  /* ═══════════════════════════════════════════════════════
     OPTIMISATION — Nelder-Mead
     ═══════════════════════════════════════════════════════ */
  R.optim = (start, fn, opts = {}) => {
    const n = start.length, maxIt = opts.maxIter || 10000, tol = opts.tol || 1e-8;
    let simplex = [{ x: [...start], y: fn(start) }];
    for (let i = 0; i < n; i++) {
      const xi = [...start]; xi[i] += Math.abs(xi[i]) > 1e-6 ? 0.05 * Math.abs(xi[i]) : 0.00025;
      simplex.push({ x: xi, y: fn(xi) });
    }
    for (let it = 0; it < maxIt; it++) {
      simplex.sort((a, b) => a.y - b.y);
      if (simplex[n].y - simplex[0].y < tol) break;
      const c = new Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += simplex[i].x[j] / n;
      const xr = c.map((v, j) => v + (v - simplex[n].x[j])), yr = fn(xr);
      if (yr < simplex[0].y) {
        const xe = c.map((v, j) => v + 2 * (xr[j] - v)), ye = fn(xe);
        simplex[n] = ye < yr ? { x: xe, y: ye } : { x: xr, y: yr };
      } else if (yr < simplex[n - 1].y) {
        simplex[n] = { x: xr, y: yr };
      } else {
        const xc = c.map((v, j) => v + 0.5 * (simplex[n].x[j] - v)), yc = fn(xc);
        if (yc < simplex[n].y) { simplex[n] = { x: xc, y: yc }; }
        else { for (let i = 1; i <= n; i++) { simplex[i].x = simplex[i].x.map((v, j) => simplex[0].x[j] + 0.5 * (v - simplex[0].x[j])); simplex[i].y = fn(simplex[i].x); } }
      }
    }
    simplex.sort((a, b) => a.y - b.y);
    return { par: simplex[0].x, value: simplex[0].y };
  };

  R.hessian = (fn, x, h = 1e-5) => {
    const n = x.length, H = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      const pp = [...x], pm = [...x], mp = [...x], mm = [...x];
      pp[i] += h; pp[j] += h; pm[i] += h; pm[j] -= h;
      mp[i] -= h; mp[j] += h; mm[i] -= h; mm[j] -= h;
      H[i][j] = H[j][i] = (fn(pp) - fn(pm) - fn(mp) + fn(mm)) / (4 * h * h);
    }
    return H;
  };

  /* ═══════════════════════════════════════════════════════
     QUAP — Quadratic Approximation of the Posterior
     ═══════════════════════════════════════════════════════

     spec = {
       params: { name: { dims:[n]|[], prior(v)->logp, sample()->v, lower?:num, start?:num|[num] } },
       likelihood: (paramsObj, dataRow) -> logp,
       data: [ {row}, ... ]
     }
     returns: { coef, vcov, paramNames, ... }
     ═══════════════════════════════════════════════════════ */
  R.quap = (spec) => {
    const { params, likelihood, data } = spec;
    const layout = [], names = [];
    let dim = 0;
    for (const [nm, info] of Object.entries(params)) {
      const sz = info.dims?.length ? info.dims[0] : 1;
      for (let i = 0; i < sz; i++) {
        layout.push({ name: nm, idx: sz > 1 ? i : null, prior: info.prior, lower: info.lower });
        names.push(sz > 1 ? `${nm}[${i + 1}]` : nm);
        dim++;
      }
    }
    const toCon = (th) => th.map((v, i) => layout[i].lower != null ? Math.exp(v) + (layout[i].lower || 0) : v);
    const toUnc = (x) => x.map((v, i) => layout[i].lower != null ? Math.log(v - (layout[i].lower || 0)) : v);
    const logJac = (th) => { let j = 0; for (let i = 0; i < dim; i++) if (layout[i].lower != null) j += th[i]; return j; };
    const unpack = (con) => {
      const obj = {}; let k = 0;
      for (const [nm, info] of Object.entries(params)) {
        const sz = info.dims?.length ? info.dims[0] : 1;
        if (sz > 1) { obj[nm] = []; for (let i = 0; i < sz; i++) obj[nm].push(con[k++]); }
        else obj[nm] = con[k++];
      }
      return obj;
    };
    const negLP = (th) => {
      const con = toCon(th), p = unpack(con);
      let lp = logJac(th);
      for (let i = 0; i < dim; i++) lp += layout[i].prior(con[i]);
      for (const row of data) lp += likelihood(p, row);
      return -lp;
    };
    // Initial values
    const start = [];
    for (const [, info] of Object.entries(params)) {
      const sz = info.dims?.length ? info.dims[0] : 1;
      for (let i = 0; i < sz; i++) start.push(info.start != null ? (Array.isArray(info.start) ? info.start[i] : info.start) : (info.lower != null ? 1 : 0));
    }
    const opt = R.optim(toUnc(start), negLP);
    const H = R.hessian(negLP, opt.par);
    const vcov = R.solve(H);
    return { coef: toCon(opt.par), vcov, paramNames: names, _layout: layout, _unpack: unpack, _toCon: toCon, _toUnc: toUnc, _thetaOpt: opt.par, _params: params, _likelihood: likelihood, _data: data };
  };

  /* ═══════════════════════════════════════════════════════
     EXTRACT SAMPLES / PRIOR / LINK / PRECIS
     ═══════════════════════════════════════════════════════ */
  R.extract_samples = (fit, n = 1000) => {
    const raw = R.rmvnorm(n, fit._thetaOpt, fit.vcov), res = {};
    for (const [nm, info] of Object.entries(fit._params)) {
      const sz = info.dims?.length ? info.dims[0] : 1;
      res[nm] = sz > 1 ? Array.from({ length: sz }, () => []) : [];
    }
    for (const r of raw) {
      const obj = fit._unpack(fit._toCon(r));
      for (const [nm, val] of Object.entries(obj)) {
        if (Array.isArray(val)) val.forEach((v, i) => res[nm][i].push(v));
        else res[nm].push(v);
      }
    }
    return res;
  };

  R.extract_prior = (spec, n = 1000) => {
    const res = {};
    for (const [nm, info] of Object.entries(spec.params)) {
      const sz = info.dims?.length ? info.dims[0] : 1;
      if (sz > 1) { res[nm] = Array.from({ length: sz }, () => []); for (let s = 0; s < n; s++) for (let i = 0; i < sz; i++) res[nm][i].push(info.sample()); }
      else { res[nm] = []; for (let s = 0; s < n; s++) res[nm].push(info.sample()); }
    }
    return res;
  };

  R.link = (fit, muFn, newData, nSamples = 1000) => {
    const post = R.extract_samples(fit, nSamples);
    const nS = Array.isArray(post[Object.keys(post)[0]][0]) ? post[Object.keys(post)[0]][0].length : post[Object.keys(post)[0]].length;
    const nR = newData.length;
    const mu = Array.from({ length: nS }, () => new Array(nR));
    for (let s = 0; s < nS; s++) {
      const p = {};
      for (const [nm, val] of Object.entries(post)) {
        if (Array.isArray(val[0])) p[nm] = val.map(a => a[s]);
        else p[nm] = val[s];
      }
      for (let r = 0; r < nR; r++) mu[s][r] = muFn(p, newData[r]);
    }
    return mu;
  };

  R.precis = (fit, depth = 2) => {
    const rows = [];
    fit.paramNames.forEach((nm, i) => {
      if (depth < 2 && nm.includes("[")) return;
      const se = Math.sqrt(Math.max(0, fit.vcov[i][i]));
      rows.push({ param: nm, mean: fit.coef[i], sd: se, lo: fit.coef[i] + R.qnorm(0.055) * se, hi: fit.coef[i] + R.qnorm(0.945) * se });
    });
    return rows;
  };

  /* ═══════════════════════════════════════════════════════
     SIMULATION — sim_HW
     ═══════════════════════════════════════════════════════ */
  R.sim_HW = (S, b = 0.6, a = -50) => {
    const out = [];
    for (let i = 0; i < S.length; i++) {
      const H = (S[i] === 2 ? 160 : 150) + R.rnorm(1, 0, 8);
      const W = a + b * H + (S[i] === 2 ? 5 : 0) + R.rnorm(1, 0, 4);
      out.push({ S: S[i], H, W });
    }
    return out;
  };

  /* ═══════════════════════════════════════════════════════
     DAG
     ═══════════════════════════════════════════════════════ */
  R.dagitty = (spec) => {
    const edges = [], nodes = new Set();
    (spec.match(/(\w+)\s*->\s*(\w+)/g) || []).forEach(m => {
      const [f, t] = m.split("->").map(s => s.trim());
      edges.push({ from: f, to: t }); nodes.add(f); nodes.add(t);
    });
    return {
      nodes: [...nodes], edges,
      parents: (n) => edges.filter(e => e.to === n).map(e => e.from),
      children: (n) => edges.filter(e => e.from === n).map(e => e.to),
      paths: (from, to) => {
        const res = [];
        (function dfs(cur, path, vis) {
          if (cur === to) { res.push([...path]); return; }
          for (const e of edges) if (e.from === cur && !vis.has(e.to)) { vis.add(e.to); dfs(e.to, [...path, e.to], vis); vis.delete(e.to); }
        })(from, [from], new Set([from]));
        return res;
      }
    };
  };

  /* ═══════════════════════════════════════════════════════
     COLOUR UTILITY
     ═══════════════════════════════════════════════════════ */
  R.col_alpha = (hex, a) => {
    if (hex.startsWith("#") && hex.length === 7) {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    return hex;
  };

  // Expose globally
  if (typeof module !== "undefined" && module.exports) module.exports = R;
  else global.R = R;
})(typeof window !== "undefined" ? window : globalThis);
#MULTICAT_START
# dir: .
# file: index.html
# note: Interactive Statistical Rethinking workflow — uses rethinking.js for all computation
#MULTICAT_END
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Statistical Rethinking — Interactive Workflow</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0f1a;--sf:#111827;--sfh:#1a2236;--bd:#1e293b;--tx:#e2e8f0;--tm:#94a3b8;--td:#64748b;--ac:#3b82f6;--ag:rgba(59,130,246,.15);--red:#ef4444;--blu:#60a5fa;--grn:#34d399;--yel:#fbbf24;--pur:#a78bfa;--org:#fb923c}
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:var(--bg);color:var(--tx);font-family:'DM Sans','Segoe UI',system-ui,sans-serif}
.hdr{padding:24px 32px 0;max-width:1300px;margin:0 auto}
.hdr-in{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.hdr h1{font-size:26px;font-family:'Fraunces',Georgia,serif;font-weight:700;letter-spacing:-.5px;background:linear-gradient(135deg,#e2e8f0,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hdr .sub{margin-top:4px;color:var(--td);font-size:13px}
.hdr-ctl{display:flex;gap:10px;align-items:center}
.etog{display:inline-flex;border-radius:6px;overflow:hidden;border:1px solid var(--bd)}
.etog button{padding:6px 14px;border:none;background:var(--sf);color:var(--tm);cursor:pointer;font-size:12px;font-family:'JetBrains Mono',monospace;transition:.2s}
.etog button.on{background:var(--ag);color:var(--ac)}
.etog button:hover:not(.on){background:var(--sfh)}
.pbtn{padding:8px 18px;border-radius:20px;border:1px solid var(--ac);background:0;color:var(--ac);cursor:pointer;font-size:12px;font-family:'DM Sans';transition:.25s;letter-spacing:.5px}
.pbtn:hover{background:var(--ag)}
.main{padding:20px 32px 32px;max-width:1300px;margin:0 auto}
.snav{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px}
.sb{padding:8px 14px;border-radius:6px;border:1px solid var(--bd);border-left-width:3px;background:var(--sf);color:var(--tx);cursor:pointer;font-size:12px;font-family:'DM Sans';transition:.2s;white-space:nowrap}
.sb:hover{background:var(--sfh);border-color:var(--ac)}
.sb.on{background:var(--ag);border-right-color:var(--ac);border-top-color:var(--ac);border-bottom-color:var(--ac);color:var(--ac)}
.sb .n{opacity:.6;margin-right:4px}
.gr{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:900px){.gr{grid-template-columns:1fr}}
.pn{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:20px}
.vg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.vp{background:#080c14;border:1px solid var(--bd);border-radius:8px;padding:12px}
.vl{font-size:10px;color:var(--td);margin-bottom:6px;font-family:'JetBrains Mono',monospace}
.dl{margin-top:4px;font-size:11px;color:var(--tm)}
.dl em{font-family:Georgia,serif;font-style:italic}
.dh{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.di{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
.dt{font-size:18px;font-family:'Fraunces',Georgia,serif;font-weight:600}
.ds{font-size:11px;color:var(--td);font-family:'JetBrains Mono',monospace}
.dd{font-size:14px;line-height:1.7;color:var(--tm)}
.ch{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.cl{background:#1a1b26;border-radius:4px;padding:2px 8px;font-size:11px;color:var(--ac);font-family:'JetBrains Mono',monospace;border:1px solid var(--bd)}
.ct{background:0;border:0;color:var(--td);cursor:pointer;font-size:12px;font-family:'DM Sans'}
.cb{background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:16px;overflow-x:auto;font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;line-height:1.6;color:#e6edf3;white-space:pre-wrap;max-height:340px;overflow-y:auto}
.cb::-webkit-scrollbar{width:6px;height:6px}.cb::-webkit-scrollbar-track{background:0}.cb::-webkit-scrollbar-thumb{background:#30363d;border-radius:3px}
.cm{color:#8b949e}.sr{color:#a5d6ff}.kw{color:#ff7b72}.fn{color:#d2a8ff}.nu{color:#79c0ff}
.ec{display:flex;flex-direction:column;gap:10px}
.ecd{padding:12px;border-radius:8px;border:1px solid var(--bd);cursor:pointer;transition:.2s}
.ecd.on{background:var(--ag);border-color:var(--ac)}
.ect{font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--yel);margin-bottom:4px}
.ecc{font-size:12px;color:var(--tm)}
.pl{font-size:12px;color:var(--td);margin-bottom:8px;font-family:'JetBrains Mono',monospace}
.pt{font-size:13px;line-height:1.6;color:var(--tm);font-style:italic}
.status{font-size:11px;padding:6px 12px;background:#0d1117;border:1px solid #21262d;border-radius:6px;color:var(--grn);font-family:'JetBrains Mono',monospace;margin-bottom:12px;display:none}
.status.show{display:block}
svg text{font-family:'DM Sans','Segoe UI',sans-serif}
.fnode{cursor:pointer}
.fnode rect{transition:.2s}
</style>
</head>
<body>
<div class="hdr"><div class="hdr-in">
<div><h1>Statistical Rethinking — Workflow</h1><p class="sub">Interactive Bayesian analysis pipeline · McElreath 2026 · Computed in JS via rethinking.js</p></div>
<div class="hdr-ctl">
<div class="etog"><button id="e1" class="on" onclick="setEst(1)">p(W|do(S))</button><button id="e2" onclick="setEst(2)">p(W|do(S),H=h)</button></div>
<button class="pbtn" onclick="playThru()">▶ Walk Through</button>
</div>
</div></div>
<div class="main">
<div id="statusBar" class="status"></div>
<div class="snav" id="snav"></div>
<div class="gr">
<div>
<div class="pn" style="margin-bottom:16px"><svg id="fsvg" width="100%" height="360" viewBox="0 0 540 360"></svg></div>
<div class="vg">
<div class="vp"><div class="vl">DAG: GENERATIVE MODEL</div><svg id="dagSvg" width="160" height="90"></svg><div class="dl"><em>S</em> = Sex, <em>H</em> = Height, <em>W</em> = Weight</div></div>
<div class="vp"><div class="vl">POSTERIOR PREDICTIONS</div><svg id="scSvg" width="240" height="170"></svg></div>
<div class="vp"><div class="vl" id="dnLbl">ESTIMAND 1: TOTAL EFFECT</div><svg id="dnSvg" width="240" height="140"></svg></div>
<div class="vp"><div class="vl">CAUSAL EFFECT BY HEIGHT</div><svg id="ceSvg" width="240" height="140"></svg></div>
</div>
</div>
<div id="det"></div>
</div>
</div>

<script src="./lib/rethinking.js"></script>
<script>
"use strict";

/* ── state ──────────────────────────────────────── */
let active = "generative", est = 1, codeVis = true, animTmr = null;
const STEPS = ["generative","estimand","statistical","prior","synthetic","synth_est","data","estimate","posterior","causal"];

/* ── compute real data & models ─────────────────── */
function status(msg) { const el = document.getElementById("statusBar"); el.textContent = msg; el.classList.add("show"); }
function statusHide() { document.getElementById("statusBar").classList.remove("show"); }

status("Generating synthetic data…");
R.set_seed(42);
const N = 200;
const S_vec = R.sample([1, 2], N, true);
const synthData = R.sim_HW(S_vec);
const Hbar_synth = R.mean(synthData.map(d => d.H));

// Also generate "observed" data (simulating Howell-like population)
R.set_seed(99);
const N_obs = 352;
const obs = [];
for (let i = 0; i < N_obs; i++) {
  const male = R.runif() > 0.53 ? 1 : 0;
  const H = (male ? 161.5 : 149.5) + R.rnorm(1, 0, 6.5);
  const W = -52 + 0.63 * H + (male ? 3.8 : 0) + R.rnorm(1, 0, 3.8);
  obs.push({ S: male + 1, H, W, height: H, weight: W });
}
const Hbar = R.mean(obs.map(d => d.H));

status("Fitting Model 1 (total effect) via quap …");
const m1spec = {
  params: {
    a: { dims: [2], prior: v => R.dnorm(v, 60, 10, true), sample: () => R.rnorm(1, 60, 10), start: [44, 46] },
    sigma: { dims: [], prior: v => R.dexp(v, 1, true), sample: () => R.rexp(1, 1), lower: 0, start: 5 }
  },
  likelihood: (p, row) => R.dnorm(row.W, p.a[row.S - 1], p.sigma, true),
  data: obs
};
const m1 = R.quap(m1spec);

status("Fitting Model 2 (direct effect) via quap …");
const m2spec = {
  params: {
    a: { dims: [2], prior: v => R.dnorm(v, 60, 10, true), sample: () => R.rnorm(1, 60, 10), start: [44, 46] },
    b: { dims: [2], prior: v => R.dlnorm(v, 0, 1, true), sample: () => R.rlnorm(1, 0, 1), lower: 0, start: [0.6, 0.6] },
    sigma: { dims: [], prior: v => R.dexp(v, 1, true), sample: () => R.rexp(1, 1), lower: 0, start: 4 }
  },
  likelihood: (p, row) => R.dnorm(row.W, p.a[row.S - 1] + p.b[row.S - 1] * (row.H - Hbar), p.sigma, true),
  data: obs
};
const m2 = R.quap(m2spec);

status("Extracting posterior samples …");
const post1 = R.extract_samples(m1, 2000);
const post2 = R.extract_samples(m2, 2000);

// Causal contrasts
const contrast_total = post1.a[0].map((v, i) => v - post1.a[1][i]);
const h_seq = R.seq(130, 190, 50);
const mu2fn = (p, row) => p.a[row.S - 1] + p.b[row.S - 1] * (row.H - Hbar);
const predF = h_seq.map(h => ({ S: 1, H: h }));
const predM = h_seq.map(h => ({ S: 2, H: h }));
const muF = R.link(m2, mu2fn, predF, 500);
const muM = R.link(m2, mu2fn, predM, 500);
const contrastByH_mean = h_seq.map((_, j) => R.mean(muF.map((s, i) => s[j] - muM[i][j])));
const contrastByH_lo = h_seq.map((_, j) => R.quantile(muF.map((s, i) => s[j] - muM[i][j]), 0.055));
const contrastByH_hi = h_seq.map((_, j) => R.quantile(muF.map((s, i) => s[j] - muM[i][j]), 0.945));

statusHide();

/* ── precis output ──────────────────────────────── */
function fmtPrecis(fit) {
  const rows = R.precis(fit, 2);
  let s = "       mean    sd   5.5%  94.5%\n";
  rows.forEach(r => { s += `${r.param.padStart(7)} ${r.mean.toFixed(2).padStart(7)} ${r.sd.toFixed(2).padStart(5)} ${r.lo.toFixed(2).padStart(6)} ${r.hi.toFixed(2).padStart(6)}\n`; });
  return s;
}

/* ── node definitions ───────────────────────────── */
const COLORS = { generative:"var(--pur)",estimand:"var(--yel)",statistical:"var(--blu)",prior:"var(--org)",synthetic:"var(--grn)",synth_est:"var(--grn)",data:"var(--tx)",estimate:"var(--ac)",posterior:"var(--blu)",causal:"var(--red)" };
const ND = {
generative:{ t:"Generative Model",ic:"◇",
  desc:"A causal DAG encoding our scientific assumptions. Sex (S) influences Height (H), which influences Weight (W). S also directly affects W.",
  code:`// Define causal DAG with rethinking.js
const dag = R.dagitty("S -> H   H -> W   S -> W");
console.log(dag.nodes);   // ["S","H","W"]
console.log(dag.paths("S","W"));
// [["S","H","W"], ["S","W"]]

// Simulate from the generative model
R.set_seed(42);
const S = R.sample([1, 2], 200, true);
const data = R.sim_HW(S, 0.6, -50);
// Each row: { S, H, W }`,
  pr:'"The meaning of any statistical estimate depends upon assumptions outside the data." Start with a causal story.'},
estimand:{ t:"Estimand",ic:"?",
  desc:"The specific causal question in do-calculus notation. Two estimands correspond to the total and direct causal effect of sex on weight.",
  code:`// Estimand 1: Total causal effect of S on W
// p(W | do(S))
// Includes both S→W and S→H→W

// Estimand 2: Direct causal effect of S on W
// p(W | do(S), H = h)
// Blocks the indirect path S→H→W

// In the DAG:
const dag = R.dagitty("S -> H  H -> W  S -> W");
console.log(dag.paths("S","W"));
// Two paths: direct S→W, indirect S→H→W`,
  pr:'"Nothing much can be done with data, until we theorize about what caused it." Define the question before the method.'},
statistical:{ t:"Statistical Models",ic:"∫",
  desc:"Translate the causal model into statistical models. Different estimands require different adjustments.",
  code:`// Model 1: Total effect — don't condition on H
const m1 = R.quap({
  params: {
    a: { dims: [2],
         prior: v => R.dnorm(v, 60, 10, true),
         start: [44, 46] },
    sigma: { dims: [],
             prior: v => R.dexp(v, 1, true),
             lower: 0, start: 5 }
  },
  likelihood: (p, row) =>
    R.dnorm(row.W, p.a[row.S-1], p.sigma, true),
  data: obs
});

// Model 2: Direct effect — condition on H
const m2 = R.quap({
  params: {
    a: { dims:[2], prior: v=>R.dnorm(v,60,10,true), start:[44,46] },
    b: { dims:[2], prior: v=>R.dlnorm(v,0,1,true), lower:0, start:[.6,.6] },
    sigma: { dims:[], prior: v=>R.dexp(v,1,true), lower:0, start:4 }
  },
  likelihood: (p, row) =>
    R.dnorm(row.W, p.a[row.S-1]+p.b[row.S-1]*(row.H-Hbar), p.sigma, true),
  data: obs
});`,
  pr:'"Different estimands require different statistical models." The model serves the question.'},
prior:{ t:"Prior Predictions",ic:"⟨⟩",
  desc:"Before seeing data, simulate from the prior to check the model produces scientifically reasonable outcomes.",
  code:`// Prior predictive simulation
const priorSamples = R.extract_prior(m2spec, 200);

// Compute mu for a grid of heights under the prior
const hGrid = R.seq(130, 190, 50);
const priorPred = hGrid.map(h => ({S:1,H:h}));

// Each prior draw gives a regression line
// Check: do the lines span plausible weight ranges?
for (let s = 0; s < 50; s++) {
  const a = priorSamples.a[0][s];
  const b = priorSamples.b[0][s];
  const line = hGrid.map(h => a + b*(h - Hbar));
  // plot line...
}`,
  pr:'"Prior predictive simulation checks whether the model assumptions produce scientifically reasonable outcomes."'},
synthetic:{ t:"Synthetic Data",ic:"⟳",
  desc:"Generate data from the generative model with known parameters. If the analysis can't recover these, it will fail on real data.",
  code:`// Generate synthetic data with known parameters
R.set_seed(42);
const N = 200;
const S = R.sample([1, 2], N, true);
const synthData = R.sim_HW(S, 0.6, -50);
// Known: b=0.6, a=-50, sex effect=5kg

// Quick summary
const heights = synthData.map(d => d.H);
const weights = synthData.map(d => d.W);
console.log("H mean:", R.mean(heights).toFixed(1),
            "sd:", R.sd(heights).toFixed(1));
console.log("W mean:", R.mean(weights).toFixed(1),
            "sd:", R.sd(weights).toFixed(1));`,
  pr:'"If your procedure can\'t recover a known effect from synthetic data, it won\'t find a real one either."'},
synth_est:{ t:"Synthetic Estimates",ic:"✓",
  desc:"Fit the model to synthetic data and verify we recover the known causal effects. This validates the entire pipeline.",
  code:`// Fit model to synthetic data
const mSynth = R.quap({
  params: {
    a:{ dims:[2], prior:v=>R.dnorm(v,60,10,true), start:[44,46] },
    b:{ dims:[2], prior:v=>R.dlnorm(v,0,1,true), lower:0, start:[.5,.5] },
    sigma:{ dims:[], prior:v=>R.dexp(v,1,true), lower:0, start:4 }
  },
  likelihood: (p,row) =>
    R.dnorm(row.W, p.a[row.S-1]+p.b[row.S-1]*(row.H-Hbar_synth), p.sigma, true),
  data: synthData
});

// Compare estimated vs. true effects
const postSynth = R.extract_samples(mSynth, 2000);
const estEffect = R.mean(postSynth.a[0]) - R.mean(postSynth.a[1]);
console.log("True sex effect: 5.0");
console.log("Estimated:", estEffect.toFixed(2));`,
  pr:'"Validate the pipeline end-to-end before trusting results from real data."'},
data:{ t:"Data",ic:"▦",
  desc:"The observed data. Here we simulate a Howell-like dataset: height, weight, and sex from a forager population.",
  code:`// Generate Howell-like observed data
R.set_seed(99);
const N_obs = 352;
const obs = [];
for (let i = 0; i < N_obs; i++) {
  const male = R.runif() > 0.53 ? 1 : 0;
  const H = (male ? 161.5 : 149.5) + R.rnorm(1, 0, 6.5);
  const W = -52 + 0.63*H + (male ? 3.8 : 0)
          + R.rnorm(1, 0, 3.8);
  obs.push({S: male+1, H, W});
}
const Hbar = R.mean(obs.map(d => d.H));

console.log("N =", obs.length);
console.log("Mean H:", R.mean(obs.map(d=>d.H)).toFixed(1));
console.log("Mean W:", R.mean(obs.map(d=>d.W)).toFixed(1));`,
  pr:'"Data alone has no voice. It speaks only through our models."'},
estimate:{ t:"Estimate",ic:"≈",
  desc:"Fit the statistical model to real data via quadratic approximation (Nelder-Mead optimisation + numerical Hessian).",
  code:`// Fit Model 2 to observed data
const m2 = R.quap(m2spec);  // see Statistical Models step

// Posterior summary via precis
const rows = R.precis(m2, 2);
// ${fmtPrecis(m2)}
// Extract 2000 posterior samples
const post = R.extract_samples(m2, 2000);`,
  pr:'"Bayesian inference gives us a posterior distribution — not a point estimate, but our full uncertainty."'},
posterior:{ t:"Posterior Predictions",ic:"📊",
  desc:"Generate predictions from the posterior and compare against observed data. Good fit = model captures the data-generating process.",
  code:`// Posterior predictions for each observation
const muFn = (p, row) =>
  p.a[row.S-1] + p.b[row.S-1]*(row.H - Hbar);
const mu = R.link(m2, muFn, obs, 1000);

// Posterior mean and 89% interval for each row
const mu_mean = R.apply2(mu, R.mean);
const mu_PI = mu[0].map((_, j) => {
  const col = mu.map(s => s[j]);
  return R.PI(col, 0.89);
});

// Plot data + regression band...`,
  pr:'"Posterior predictions let us see if the model has learned something useful about the world."'},
causal:{ t:"Causal Effects",ic:"⟶",
  desc:"Compute the causal contrast — difference in predicted weight between sexes, answering our original estimand.",
  code:`// Estimand 1: Total causal contrast
const post1 = R.extract_samples(m1, 2000);
const contrast_total = post1.a[0].map(
  (v, i) => v - post1.a[1][i]);
const dens = R.density(contrast_total);
// dens.x, dens.y → plot kernel density

// Estimand 2: Direct contrast at each height
const hSeq = R.seq(130, 190, 50);
const muF = R.link(m2, muFn,
  hSeq.map(h=>({S:1,H:h})), 500);
const muM = R.link(m2, muFn,
  hSeq.map(h=>({S:2,H:h})), 500);
const contrast = hSeq.map((_, j) =>
  R.mean(muF.map((s,i) => s[j]-muM[i][j])));
// Plot contrast ± 89% PI...`,
  pr:'"The causal effect is the answer to our original question. Does it match our scientific understanding?"'}
};

/* ── SVG helpers ────────────────────────────────── */
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs, par) { const e = document.createElementNS(NS, tag); for (const [k,v] of Object.entries(attrs||{})) e.setAttribute(k,v); if (par) par.appendChild(e); return e; }
function clr(id) { const s = document.getElementById(id); s.innerHTML = ""; return s; }
function txt(parent, attrs, content) { const t = el("text", attrs, parent); t.textContent = content; return t; }

/* ── layout ─────────────────────────────────────── */
const LY={generative:{x:80,y:50},synthetic:{x:270,y:50},synth_est:{x:435,y:50},estimand:{x:80,y:155},statistical:{x:230,y:155},prior:{x:230,y:245},data:{x:380,y:110},estimate:{x:450,y:165},posterior:{x:470,y:245},causal:{x:470,y:320}};
const EDGES=[["generative","synthetic"],["synthetic","synth_est"],["generative","estimand"],["generative","statistical"],["estimand","statistical"],["statistical","prior"],["statistical","estimate"],["data","estimate"],["estimate","posterior"],["estimate","causal"]];
const NW=120, NH=40;

/* ── render steps nav ───────────────────────────── */
function rNav() {
  const nav = document.getElementById("snav"); nav.innerHTML = "";
  STEPS.forEach((s,i) => {
    const b = document.createElement("button"); b.className = "sb" + (s===active?" on":"");
    b.style.borderLeftColor = COLORS[s];
    b.innerHTML = `<span class="n">${i+1}.</span>${ND[s].t}`;
    b.onclick = () => { clrAnim(); active = s; render(); }; nav.appendChild(b);
  });
}

/* ── render flow diagram ────────────────────────── */
function rFlow() {
  const svg = clr("fsvg");
  const defs = el("defs",{},svg);
  const flt = el("filter",{id:"glow"},defs); el("feGaussianBlur",{stdDeviation:"3",result:"b"},flt);
  const mg = el("feMerge",{},flt); el("feMergeNode",{"in":"b"},mg); el("feMergeNode",{"in":"SourceGraphic"},mg);
  ["on","off"].forEach(st => {
    const m = el("marker",{id:`ar-${st}`,viewBox:"0 0 10 7",refX:"9",refY:"3.5",markerWidth:"7",markerHeight:"5",orient:"auto"},defs);
    el("polygon",{points:"0 0, 10 3.5, 0 7",fill:st==="on"?"var(--ac)":"var(--td)"},m);
  });
  EDGES.forEach(([fi,ti])=>{
    const f=LY[fi],t=LY[ti],dx=t.x-f.x,dy=t.y-f.y,ln=Math.sqrt(dx*dx+dy*dy),nx=dx/ln,ny=dy/ln;
    const x1=f.x+nx*(NW/2+2),y1=f.y+ny*(NH/2+2),x2=t.x-nx*(NW/2+4),y2=t.y-ny*(NH/2+4);
    const on = fi===active||ti===active;
    if(fi==="estimate"&&ti==="causal") el("path",{d:`M${x1},${y1} Q${f.x+50},${(f.y+t.y)/2} ${x2},${y2}`,stroke:on?"var(--ac)":"var(--td)","stroke-width":on?"2":"1.5",fill:"none",opacity:on?"1":".4","marker-end":`url(#ar-${on?"on":"off"})`},svg);
    else el("line",{x1,y1,x2,y2,stroke:on?"var(--ac)":"var(--td)","stroke-width":on?"2":"1.5",opacity:on?"1":".4","marker-end":`url(#ar-${on?"on":"off"})`},svg);
  });
  STEPS.forEach(id => {
    const nd=ND[id],pos=LY[id],on=id===active;
    const g = el("g",{class:"fnode",style:"cursor:pointer"},svg);
    g.onclick = () => { clrAnim(); active=id; render(); };
    el("rect",{x:pos.x-NW/2,y:pos.y-NH/2,width:NW,height:NH,rx:"8",fill:on?"var(--sfh)":"var(--sf)",stroke:on?COLORS[id]:"var(--bd)","stroke-width":on?"2":"1",...(on?{filter:"url(#glow)"}:{})},g);
    txt(g,{x:pos.x,y:pos.y+1,fill:on?COLORS[id]:"var(--tx)","font-size":"11","font-weight":on?"600":"400","text-anchor":"middle","dominant-baseline":"middle"},nd.ic+" "+nd.t);
  });
}

/* ── render DAG ─────────────────────────────────── */
function rDAG() {
  const svg = clr("dagSvg"), defs = el("defs",{},svg);
  const m = el("marker",{id:"da",viewBox:"0 0 10 7",refX:"9",refY:"3.5",markerWidth:"8",markerHeight:"6",orient:"auto"},defs);
  el("polygon",{points:"0 0, 10 3.5, 0 7",fill:"var(--tm)"},m);
  const dn=[{id:"S",x:30,y:65},{id:"H",x:80,y:25},{id:"W",x:130,y:25}];
  [["S","H"],["H","W"]].forEach(([fi,ti])=>{
    const f=dn.find(n=>n.id===fi),t=dn.find(n=>n.id===ti),dx=t.x-f.x,dy=t.y-f.y,ln=Math.sqrt(dx*dx+dy*dy);
    el("line",{x1:f.x+(dx/ln)*14,y1:f.y+(dy/ln)*14,x2:t.x-(dx/ln)*14,y2:t.y-(dy/ln)*14,stroke:"var(--tm)","stroke-width":"1.5","marker-end":"url(#da)"},svg);
  });
  dn.forEach(n=>{
    el("circle",{cx:n.x,cy:n.y,r:"14",fill:"transparent",stroke:"var(--tm)","stroke-width":"1"},svg);
    txt(svg,{x:n.x,y:n.y+1,fill:"var(--tx)","font-size":"14","text-anchor":"middle","dominant-baseline":"middle",style:"font-style:italic;font-family:Georgia,serif"},n.id);
  });
}

/* ── render scatter (posterior predictions) ──────── */
function rScat() {
  const svg = clr("scSvg"), W=240,H=170;
  const p={t:20,r:15,b:30,l:35},w=W-p.l-p.r,h=H-p.t-p.b,hR=[130,190],wR=[25,70];
  const sx=v=>p.l+((v-hR[0])/(hR[1]-hR[0]))*w, sy=v=>p.t+h-((v-wR[0])/(wR[1]-wR[0]))*h;
  [140,150,160,170,180].forEach(v=>{el("line",{x1:sx(v),y1:p.t,x2:sx(v),y2:p.t+h,stroke:"#1e293b","stroke-width":".5"},svg);txt(svg,{x:sx(v),y:p.t+h+14,fill:"var(--td)","font-size":"9","text-anchor":"middle"},v);});
  [30,40,50,60].forEach(v=>{el("line",{x1:p.l,y1:sy(v),x2:p.l+w,y2:sy(v),stroke:"#1e293b","stroke-width":".5"},svg);txt(svg,{x:p.l-5,y:sy(v)+3,fill:"var(--td)","font-size":"9","text-anchor":"end"},v);});
  txt(svg,{x:p.l+w/2,y:H-2,fill:"var(--tm)","font-size":"10","text-anchor":"middle"},"height (cm)");
  txt(svg,{x:10,y:p.t+h/2,fill:"var(--tm)","font-size":"10","text-anchor":"middle",transform:`rotate(-90,10,${p.t+h/2})`},"weight (kg)");

  obs.forEach(d=>el("circle",{cx:sx(d.H),cy:sy(d.W),r:"2.5",fill:d.S===2?"var(--blu)":"var(--red)",opacity:".55"},svg));

  // Regression lines from posterior means
  const a1=R.mean(post2.a[0]),a2=R.mean(post2.a[1]),b1=R.mean(post2.b[0]),b2=R.mean(post2.b[1]);
  el("line",{x1:sx(hR[0]),y1:sy(a1+b1*(hR[0]-Hbar)),x2:sx(hR[1]),y2:sy(a1+b1*(hR[1]-Hbar)),stroke:"var(--red)","stroke-width":"1.5",opacity:".8"},svg);
  el("line",{x1:sx(hR[0]),y1:sy(a2+b2*(hR[0]-Hbar)),x2:sx(hR[1]),y2:sy(a2+b2*(hR[1]-Hbar)),stroke:"var(--blu)","stroke-width":"1.5",opacity:".8"},svg);
}

/* ── render density (causal contrast) ───────────── */
function rDens() {
  const svg = clr("dnSvg");
  document.getElementById("dnLbl").textContent = `ESTIMAND ${est}: ${est===1?"TOTAL EFFECT":"DIRECT EFFECT"}`;
  const W=240,H=140,p={t:15,r:10,b:25,l:35},w=W-p.l-p.r,h=H-p.t-p.b;

  const samples = est===1 ? contrast_total : contrastByH_mean; // For est 2 we show a different viz
  if (est === 1) {
    const dens = R.density(contrast_total, 256);
    const maxY = Math.max(...dens.y);
    const xlo = Math.min(...dens.x), xhi = Math.max(...dens.x);
    const sx = v => p.l+((v-xlo)/(xhi-xlo))*w, sy = v => p.t+h-(v/maxY)*h;

    // Ticks
    const ticks = [-10,-5,0,5,10,15];
    ticks.forEach(v=>{if(v>=xlo&&v<=xhi){el("line",{x1:sx(v),y1:p.t,x2:sx(v),y2:p.t+h,stroke:"#1e293b","stroke-width":".5"},svg);txt(svg,{x:sx(v),y:p.t+h+14,fill:"var(--td)","font-size":"9","text-anchor":"middle"},v);}});

    // Fill area
    let pathPos = `M${sx(dens.x[0])},${p.t+h}`;
    let pathNeg = `M${sx(dens.x[0])},${p.t+h}`;
    dens.x.forEach((xi,i)=>{
      if(xi>=0) pathPos += `L${sx(xi)},${sy(dens.y[i])}`;
      if(xi<=0) pathNeg += `L${sx(xi)},${sy(dens.y[i])}`;
    });
    pathPos += `L${sx(dens.x[dens.x.length-1])},${p.t+h}Z`;
    pathNeg += `L${sx(0)},${p.t+h}Z`;
    el("path",{d:pathNeg,fill:"var(--red)",opacity:".6"},svg);
    el("path",{d:pathPos,fill:"var(--blu)",opacity:".6"},svg);
    el("line",{x1:sx(0),y1:p.t,x2:sx(0),y2:p.t+h,stroke:"var(--tm)","stroke-width":"1","stroke-dasharray":"3,3"},svg);
    txt(svg,{x:p.l+w/2,y:H-2,fill:"var(--tm)","font-size":"9","text-anchor":"middle"},"posterior weight contrast (kg)");
  } else {
    // Show direct effect by height
    const ylo=-8,yhi=6;
    const sx=v=>p.l+((v-130)/60)*w, sy=v=>p.t+h-((v-ylo)/(yhi-ylo))*h;
    [140,160,180].forEach(v=>{el("line",{x1:sx(v),y1:p.t,x2:sx(v),y2:p.t+h,stroke:"#1e293b","stroke-width":".5"},svg);txt(svg,{x:sx(v),y:p.t+h+14,fill:"var(--td)","font-size":"9","text-anchor":"middle"},v);});
    [-6,-4,-2,0,2,4].forEach(v=>{el("line",{x1:p.l,y1:sy(v),x2:p.l+w,y2:sy(v),stroke:"#1e293b","stroke-width":".5"},svg);txt(svg,{x:p.l-5,y:sy(v)+3,fill:"var(--td)","font-size":"8","text-anchor":"end"},v);});
    // Band
    let band = h_seq.map((x,i)=>`${i===0?"M":"L"}${sx(x)},${sy(contrastByH_hi[i])}`).join(" ");
    band += h_seq.slice().reverse().map((x,i)=>`L${sx(x)},${sy(contrastByH_lo[h_seq.length-1-i])}`).join(" ") + "Z";
    el("path",{d:band,fill:"var(--td)",opacity:".15"},svg);
    let line = h_seq.map((x,i)=>`${i===0?"M":"L"}${sx(x)},${sy(contrastByH_mean[i])}`).join(" ");
    el("path",{d:line,stroke:"var(--tx)","stroke-width":"1.5",fill:"none"},svg);
    el("line",{x1:p.l,y1:sy(0),x2:p.l+w,y2:sy(0),stroke:"var(--tm)","stroke-width":"1","stroke-dasharray":"3,3"},svg);
    txt(svg,{x:p.l+w/2,y:H-2,fill:"var(--tm)","font-size":"9","text-anchor":"middle"},"height (cm)");
    txt(svg,{x:8,y:p.t+h/2,fill:"var(--tm)","font-size":"8","text-anchor":"middle",transform:`rotate(-90,8,${p.t+h/2})`},"contrast (F-M)");
  }
}

/* ── render causal effect plot ──────────────────── */
function rCaus() {
  const svg = clr("ceSvg"),W=240,H=140;
  const p={t:15,r:10,b:25,l:35},w=W-p.l-p.r,h=H-p.t-p.b;
  const ylo=-8,yhi=6;
  const sx=v=>p.l+((v-130)/60)*w, sy=v=>p.t+h-((v-ylo)/(yhi-ylo))*h;
  [140,160,180].forEach(v=>{el("line",{x1:sx(v),y1:p.t,x2:sx(v),y2:p.t+h,stroke:"#1e293b","stroke-width":".5"},svg);txt(svg,{x:sx(v),y:p.t+h+14,fill:"var(--td)","font-size":"9","text-anchor":"middle"},v);});
  [-6,-4,-2,0,2,4].forEach(v=>{el("line",{x1:p.l,y1:sy(v),x2:p.l+w,y2:sy(v),stroke:"#1e293b","stroke-width":".5"},svg);txt(svg,{x:p.l-5,y:sy(v)+3,fill:"var(--td)","font-size":"8","text-anchor":"end"},v);});
  let band = h_seq.map((x,i)=>`${i===0?"M":"L"}${sx(x)},${sy(contrastByH_hi[i])}`).join(" ");
  band += h_seq.slice().reverse().map((x,i)=>`L${sx(x)},${sy(contrastByH_lo[h_seq.length-1-i])}`).join(" ")+"Z";
  el("path",{d:band,fill:"var(--td)",opacity:".15"},svg);
  let line = h_seq.map((x,i)=>`${i===0?"M":"L"}${sx(x)},${sy(contrastByH_mean[i])}`).join(" ");
  el("path",{d:line,stroke:"var(--tx)","stroke-width":"1.5",fill:"none"},svg);
  el("line",{x1:p.l,y1:sy(0),x2:p.l+w,y2:sy(0),stroke:"var(--tm)","stroke-width":"1","stroke-dasharray":"3,3"},svg);
  txt(svg,{x:p.l+w/2,y:H-2,fill:"var(--tm)","font-size":"9","text-anchor":"middle"},"height (cm)");
  txt(svg,{x:8,y:p.t+h/2,fill:"var(--tm)","font-size":"8","text-anchor":"middle",transform:`rotate(-90,8,${p.t+h/2})`},"weight contrast (F-M)");
}

/* ── syntax highlight ───────────────────────────── */
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function hl(code){
  return code.split("\n").map(ln=>{
    if(ln.trim().startsWith("//")) return `<span class="cm">${esc(ln)}</span>`;
    let o = esc(ln);
    o = o.replace(/(["'`](?:[^"'`\\]|\\.)*?["'`])/g,'<span class="sr">$1</span>');
    o = o.replace(/(\/\/.*)$/gm,'<span class="cm">$1</span>');
    o = o.replace(/\b(const|let|var|function|for|if|else|return|true|false|null|new|typeof|class|import|export)\b/g,'<span class="kw">$1</span>');
    o = o.replace(/\b(R\.\w+)\b/g,'<span class="fn">$1</span>');
    o = o.replace(/\b(console\.log|Math\.\w+)\b/g,'<span class="fn">$1</span>');
    o = o.replace(/\b(\d+\.?\d*)\b/g,'<span class="nu">$1</span>');
    return o;
  }).join("\n");
}

/* ── render detail panel ────────────────────────── */
function rDet(){
  const c=document.getElementById("det"),nd=ND[active],idx=STEPS.indexOf(active),col=COLORS[active];
  let h=`<div class="pn" style="margin-bottom:16px"><div class="dh">
<div class="di" style="background:${col}22;border:1px solid ${col}44">${nd.ic}</div>
<div><div class="dt" style="color:${col}">${nd.t}</div><div class="ds">Step ${idx+1} of ${STEPS.length}</div></div>
</div><p class="dd">${nd.desc}</p></div>
<div class="pn" style="margin-bottom:16px"><div class="ch"><div style="display:flex;align-items:center"><span class="cl">JS</span><span style="font-size:12px;color:var(--td);margin-left:8px">rethinking.js code</span></div>
<button class="ct" onclick="codeVis=!codeVis;rDet()">${codeVis?"Hide":"Show"}</button></div>
${codeVis?`<div class="cb">${hl(nd.code)}</div>`:""}
</div>`;
  if(active==="estimand"){
    h+=`<div class="pn" style="margin-bottom:16px"><div style="font-size:12px;color:var(--td);margin-bottom:8px">ESTIMAND DEFINITIONS</div><div class="ec">
<div class="ecd ${est===1?"on":""}" onclick="setEst(1)"><div class="ect">1. p(W | do(S))</div><div class="ecc">Total causal effect. Includes all paths: S→W and S→H→W.</div></div>
<div class="ecd ${est===2?"on":""}" onclick="setEst(2)"><div class="ect">2. p(W | do(S), H = h)</div><div class="ecc">Direct causal effect. Blocks the indirect path S→H→W.</div></div>
</div></div>`;
  }
  if(active==="estimate"){
    h+=`<div class="pn" style="margin-bottom:16px"><div class="pl">PRECIS OUTPUT (Model 2)</div><div class="cb" style="font-size:11px">${esc(fmtPrecis(m2))}</div></div>`;
  }
  h+=`<div class="pn"><div class="pl">WORKFLOW PRINCIPLE</div><p class="pt">${nd.pr}</p></div>`;
  c.innerHTML=h;
}

/* ── actions ────────────────────────────────────── */
function setEst(e){est=e;document.getElementById("e1").className=e===1?"on":"";document.getElementById("e2").className=e===2?"on":"";rDens();rDet();}
function clrAnim(){if(animTmr){clearTimeout(animTmr);animTmr=null;}}
function playThru(){clrAnim();active=STEPS[0];render();let i=0;(function go(){i++;if(i<STEPS.length){animTmr=setTimeout(()=>{active=STEPS[i];render();go();},1500);}})();}
function render(){rNav();rFlow();rDet();rDens();}

/* ── init ───────────────────────────────────────── */
render(); rDAG(); rScat(); rCaus();
</script>
</body>
</html>
