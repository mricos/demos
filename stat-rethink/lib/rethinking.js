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
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
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
        else res[nm].push(val);
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
