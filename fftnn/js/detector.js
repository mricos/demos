// Detector / test runner
import { $, state } from './state.js';
import { initRng } from './rng.js';
import { generateSignal, dft, magPhase, detectWithSNR, computeFLOPs, EEG_BANDS, EEG_BAND_NAMES } from './dsp.js';
import { plot, plotMulti, plotBandSNR, plotTestSignalActivations, plotClassOutput } from './plot.js';
import { getParams, buildSizes } from './params.js';
import { prepareInput, makeBandTarget } from './train.js';
import { getDetectorCommentary } from './commentary.js';

function runDetector() {
  if (!state.nn) return;

  const p = getParams();
  initRng(p.seed + 999);

  const sizes = buildSizes(p);
  const flops = computeFLOPs({ N: p.N, sizes });
  const half = Math.floor(p.N / 2) + 1;
  const bandLabels = ['B1 \u03b4','B2 \u03b8','B3 \u03b1','B4 \u03b2','B5 \u03b3'];
  const getClass = v => v >= 80 ? 'good' : v >= 50 ? 'ok' : 'bad';

  $('mcCount').textContent = p.mcSamples;
  state.testResults = [];

  let passCount = 0;
  const perBinErrors = new Array(p.mode === 'fft-simulator' ? (p.fftRepr === 'complex' ? half * 2 : half) : 5).fill(0);
  const bandConfNN = bandLabels.map(() => [[0,0],[0,0]]);
  const bandConfSNR = bandLabels.map(() => [[0,0],[0,0]]);

  for (let i = 0; i < p.mcSamples; i++) {
    const meta = generateSignal(p, true);
    const maxIn = Math.max(...meta.x.map(Math.abs)) || 1;
    const normX = Array.from(meta.x).map(v => v / maxIn);
    const input = prepareInput(normX, meta.x, p);
    const pred = state.nn.predict(input);
    const { re, im } = dft(meta.x);

    let target, pass, mse, corr, detail;
    let fftPass, fftDetail;

    // FFT baseline: always run SNR detection for band comparison
    const snrResult = detectWithSNR(Array.from(meta.x), p.fs, EEG_BANDS, p.snrThresh);
    const snrBands = bandLabels.map(name => snrResult.bandResults[name]?.detected ? 1 : 0);

    if (p.mode === 'fft-simulator') {
      if (p.fftRepr === 'complex') {
        const maxVal = Math.max(...Array.from(re).slice(0, half).map(Math.abs), ...Array.from(im).slice(0, half).map(Math.abs)) || 1;
        target = [];
        for (let k = 0; k < half; k++) target.push(re[k] / maxVal);
        for (let k = 0; k < half; k++) target.push(im[k] / maxVal);
      } else {
        const { mag } = magPhase(re, im, true);
        target = Array.from(mag);
      }
      mse = 0;
      for (let j = 0; j < target.length; j++) {
        const err = (pred[j] - target[j]) ** 2;
        mse += err;
        perBinErrors[j] += err;
      }
      mse /= target.length;
      const meanP = pred.reduce((a,v) => a+v, 0) / pred.length;
      const meanT = target.reduce((a,v) => a+v, 0) / target.length;
      let num = 0, denP = 0, denT = 0;
      for (let j = 0; j < pred.length; j++) {
        num += (pred[j]-meanP)*(target[j]-meanT);
        denP += (pred[j]-meanP)**2;
        denT += (target[j]-meanT)**2;
      }
      corr = (denP > 0 && denT > 0) ? num / Math.sqrt(denP*denT) : 0;
      pass = corr > 0.7;
      detail = `MSE=${mse.toFixed(4)} r=${corr.toFixed(3)}`;

      // FFT baseline: perfect by definition (it IS the target)
      fftPass = true;
      fftDetail = 'FFT is ground truth (r=1.0, MSE=0)';
    } else {
      target = makeBandTarget(meta.tones, p);
      const predBands = pred.map(v => v >= 0.5 ? 1 : 0);

      let bandCorrect = 0, fftBandCorrect = 0;
      const bandDetail = [], fftBandDetail = [];
      for (let b = 0; b < 5; b++) {
        const t = target[b];
        bandConfNN[b][t][predBands[b]]++;
        bandConfSNR[b][t][snrBands[b]]++;
        if (predBands[b] === t) bandCorrect++;
        if (predBands[b] !== t) bandDetail.push(`${bandLabels[b]}:${t ? 'FN' : 'FP'}`);
        if (snrBands[b] === t) fftBandCorrect++;
        if (snrBands[b] !== t) fftBandDetail.push(`${bandLabels[b]}:${t ? 'FN' : 'FP'}`);
      }
      mse = pred.reduce((s, v, j) => s + (v - target[j]) ** 2, 0) / pred.length;
      pass = bandCorrect === 5;
      detail = pass ? 'all bands correct' : `errors: ${bandDetail.join(', ')}`;
      fftPass = fftBandCorrect === 5;
      fftDetail = fftPass ? 'all bands correct' : `errors: ${fftBandDetail.join(', ')}`;
    }

    if (pass) passCount++;

    const toneStr = meta.tones
      ? meta.tones.map(t => `${t.freq.toFixed(0)}Hz(${t.band})`).join(', ')
      : meta.freqs.map(f => f.toFixed(0) + 'Hz').join(', ');

    state.testResults.push({
      idx: i, K: meta.K, freqs: meta.freqs, tones: meta.tones, toneStr,
      signal: normX, target, pred: Array.from(pred),
      pass, mse, corr: corr ?? null, detail,
      fftPass, fftDetail,
      mode: p.mode, fftRepr: p.fftRepr
    });
  }

  perBinErrors.forEach((v, i, a) => a[i] = v / p.mcSamples);
  const passRate = (passCount / p.mcSamples * 100).toFixed(1);
  const failCount = p.mcSamples - passCount;

  // FFT baseline aggregate
  const fftPassCount = state.testResults.filter(r => r.fftPass).length;
  const fftPassRate = (fftPassCount / p.mcSamples * 100).toFixed(1);

  if (p.mode === 'fft-simulator') {
    const avgMSE = state.testResults.reduce((s, r) => s + r.mse, 0) / p.mcSamples;
    const avgCorr = state.testResults.reduce((s, r) => s + (r.corr || 0), 0) / p.mcSamples;
    $('detectorResults').innerHTML = `
      <div class="metric ${getClass(+passRate)}"><div class="val">${passRate}%</div><div class="lbl">NN Pass (r&gt;0.7)</div></div>
      <div class="metric ${getClass(+fftPassRate)}"><div class="val">${fftPassRate}%</div><div class="lbl">FFT Pass</div></div>
      <div class="metric"><div class="val">${avgCorr.toFixed(3)}</div><div class="lbl">NN Mean r</div></div>
      <div class="metric"><div class="val">${avgMSE.toFixed(4)}</div><div class="lbl">NN Mean MSE</div></div>
      <div class="metric"><div class="val">${flops.fftFlops}/${flops.nnFlops}</div><div class="lbl">FLOPs FFT/NN</div></div>
    `;
    $('confNNTitle').textContent = 'Per-Bin MSE';
    $('confNNCaption').textContent = 'Error per output bin. Peaks = frequencies the NN struggles with.';
    plot($('cConfNN'), perBinErrors, { color: '#f85149', yMin: 0 });
    const corrBins = new Array(20).fill(0);
    state.testResults.forEach(r => {
      const bin = Math.min(19, Math.max(0, Math.floor((r.corr + 1) / 2 * 20)));
      corrBins[bin]++;
    });
    $('confFFTTitle').textContent = 'Correlation Distribution';
    $('confFFTCaption').textContent = 'x: r from -1 to 1. Green bars = pass (r>0.7).';
    plot($('cConfFFT'), corrBins, { color: '#58a6ff', yMin: 0 });
  } else {
    const nnBandTotal = p.mcSamples * 5;
    let nnBandCorrect = 0;
    bandConfNN.forEach(c => { nnBandCorrect += c[0][0] + c[1][1]; });
    const nnBandAcc = (nnBandCorrect / nnBandTotal * 100).toFixed(1);
    let snrBandCorrect = 0;
    bandConfSNR.forEach(c => { snrBandCorrect += c[0][0] + c[1][1]; });
    const snrBandAcc = (snrBandCorrect / nnBandTotal * 100).toFixed(1);

    $('detectorResults').innerHTML = `
      <div class="metric ${getClass(+passRate)}"><div class="val">${passRate}%</div><div class="lbl">NN All-Bands</div></div>
      <div class="metric ${getClass(+fftPassRate)}"><div class="val">${fftPassRate}%</div><div class="lbl">FFT All-Bands</div></div>
      <div class="metric ${getClass(+nnBandAcc)}"><div class="val">${nnBandAcc}%</div><div class="lbl">NN Band Acc</div></div>
      <div class="metric ${getClass(+snrBandAcc)}"><div class="val">${snrBandAcc}%</div><div class="lbl">FFT Band Acc</div></div>
      <div class="metric"><div class="val">${flops.fftFlops}/${flops.nnFlops}</div><div class="lbl">FLOPs FFT/NN</div></div>
    `;
    const bandStats = bandLabels.map((name, b) => {
      const tp = bandConfNN[b][1][1], fp = bandConfNN[b][0][1], fn = bandConfNN[b][1][0], tn = bandConfNN[b][0][0];
      const prec = (tp+fp) > 0 ? (tp/(tp+fp)*100).toFixed(0) : '-';
      const rec = (tp+fn) > 0 ? (tp/(tp+fn)*100).toFixed(0) : '-';
      return { name, tp, fp, fn, tn, prec, rec };
    });
    $('confNNTitle').textContent = 'Per-Band NN Results';
    $('confNNCaption').innerHTML = `<table style="font-size:9px; width:100%; border-collapse:collapse;">
      <tr><th>Band</th><th>TP</th><th>FP</th><th>FN</th><th>TN</th><th>Prec</th><th>Rec</th></tr>
      ${bandStats.map(s => `<tr><td>${s.name}</td><td>${s.tp}</td><td>${s.fp}</td><td>${s.fn}</td><td>${s.tn}</td><td>${s.prec}%</td><td>${s.rec}%</td></tr>`).join('')}
    </table>`;
    const bandAccs = bandLabels.map((_, b) => {
      const total = bandConfNN[b][0][0]+bandConfNN[b][0][1]+bandConfNN[b][1][0]+bandConfNN[b][1][1];
      const correct = bandConfNN[b][0][0]+bandConfNN[b][1][1];
      return total > 0 ? correct / total : 0;
    });
    plotClassOutput($('cConfNN'), bandAccs, -1, bandLabels);
    const snrAccs = bandLabels.map((_, b) => {
      const total = bandConfSNR[b][0][0]+bandConfSNR[b][0][1]+bandConfSNR[b][1][0]+bandConfSNR[b][1][1];
      const correct = bandConfSNR[b][0][0]+bandConfSNR[b][1][1];
      return total > 0 ? correct / total : 0;
    });
    $('confFFTTitle').textContent = 'Per-Band SNR Baseline';
    $('confFFTCaption').textContent = `SNR threshold: ${p.snrThresh}dB`;
    plotClassOutput($('cConfFFT'), snrAccs, -1, bandLabels);
  }

  // K-class breakdown tables: NN and FFT side by side
  renderKBreakdown(state.testResults, p, 'nn');
  renderKBreakdown(state.testResults, p, 'fft');

  // Contextual commentary
  const commentaryEl = $('detectorCommentary');
  const commentaryText = getDetectorCommentary(state.testResults, p);
  commentaryEl.innerHTML = commentaryText;
  commentaryEl.style.display = '';

  if (state.signal) {
    const p2 = getParams();
    const snrResult = detectWithSNR(Array.from(state.signal), p2.fs, EEG_BANDS, p2.snrThresh);
    plotBandSNR($('cBandSNR'), snrResult.bandResults, p2.snrThresh);
  }

  if (state.probes) {
    const bandProbes = state.probes.filter(pr => pr.isBandProbe);
    if (bandProbes.length > 0 && state.nn) {
      plotTestSignalActivations($('cTestActivations'), state.nn, bandProbes.map(bp => ({
        label: bp.label,
        input: prepareInput(bp.input, bp.rawSignal, p)
      })));
    }
  }

  applyTestFilter();
  renderTestLog();
  $('testBrowserPanel').style.display = '';
  $('testLogPanel').style.display = '';
}

function applyTestFilter() {
  const filter = $('testFilter').value;
  if (filter === 'pass') state.filteredTests = state.testResults.filter(r => r.pass);
  else if (filter === 'fail') state.filteredTests = state.testResults.filter(r => !r.pass);
  else if (filter === 'fft-pass') state.filteredTests = state.testResults.filter(r => r.fftPass);
  else if (filter === 'fft-fail') state.filteredTests = state.testResults.filter(r => !r.fftPass);
  else if (filter === 'nn-better') state.filteredTests = state.testResults.filter(r => r.pass && !r.fftPass);
  else if (filter === 'fft-better') state.filteredTests = state.testResults.filter(r => !r.pass && r.fftPass);
  else state.filteredTests = state.testResults.slice();

  state.currentTestIdx = 0;
  $('testFilterInfo').textContent = `(${state.filteredTests.length} of ${state.testResults.length}${filter !== 'all' ? ', ' + filter : ''})`;
  if (state.filteredTests.length > 0) showTestResult(0);
  else {
    $('testNum').textContent = '-';
    $('testTotal').textContent = '0';
    $('testMeta').textContent = 'No matching tests.';
  }
}

function showTestResult(idx) {
  if (!state.filteredTests.length) return;
  idx = Math.max(0, Math.min(idx, state.filteredTests.length - 1));
  state.currentTestIdx = idx;
  const r = state.filteredTests[idx];

  $('testNum').textContent = idx + 1;
  $('testTotal').textContent = state.filteredTests.length;

  const badge = $('testPassBadge');
  badge.textContent = r.pass ? 'PASS' : 'FAIL';
  badge.style.background = r.pass ? '#238636' : '#da3633';
  badge.style.color = '#fff';

  const fftBadge = r.fftPass ? '<span style="color:#3fb950;">FFT:PASS</span>' : '<span style="color:#f85149;">FFT:FAIL</span>';
  $('testMeta').innerHTML = `Test #${r.idx + 1} | K=${r.K} | tones=[${r.toneStr}] | NN: ${r.detail} | ${fftBadge} ${r.fftDetail}`;
  plot($('cTestSignal'), r.signal, { color: '#58a6ff' });

  if (r.mode === 'fft-simulator') {
    $('testPredTitle').textContent = `Predicted vs True Spectrum (r=${(r.corr||0).toFixed(3)}, MSE=${r.mse.toFixed(4)})`;
    plotMulti($('cTestPred'), [
      { data: r.target, color: '#3fb950' },
      { data: r.pred, color: '#f85149' }
    ], { yMin: r.fftRepr === 'complex' ? -1 : 0, yMax: 1 });
  } else {
    $('testPredTitle').textContent = `Band Detection (MSE=${r.mse.toFixed(4)})`;
    plotMulti($('cTestPred'), [
      { data: r.target, color: '#3fb950' },
      { data: r.pred, color: '#f85149' }
    ], { yMin: 0, yMax: 1.2 });
  }

  let errHtml = '<span style="color:#8b949e;">';
  if (r.mode === 'band-detector') {
    const bandLabels = ['B1 \u03b4','B2 \u03b8','B3 \u03b1','B4 \u03b2','B5 \u03b3'];
    errHtml += bandLabels.map((name, j) => {
      const predBit = r.pred[j] >= 0.5 ? 1 : 0;
      const ok = predBit === r.target[j];
      return `<span style="color:${ok ? '#3fb950' : '#f85149'};">${name}: true=${r.target[j]} pred=${r.pred[j].toFixed(2)}${ok ? '' : (r.target[j] ? ' FN' : ' FP')}</span>`;
    }).join(' | ');
  } else {
    const errs = r.target.map((t, j) => ({ j, err: (r.pred[j] - t) ** 2 }));
    errs.sort((a, b) => b.err - a.err);
    errHtml += 'Worst bins: ' + errs.slice(0, 5).map(e => `[${e.j}] err=${e.err.toFixed(4)}`).join(', ');
  }
  errHtml += '</span>';
  $('testErrorDetail').innerHTML = errHtml;
}

function renderTestLog() {
  const grid = $('testLogGrid');
  grid.innerHTML = state.testResults.map(r => {
    const bg = r.pass ? 'rgba(35,134,54,0.15)' : 'rgba(218,54,51,0.15)';
    const icon = r.pass ? '\u2713' : '\u2717';
    const color = r.pass ? '#3fb950' : '#f85149';
    const fftColor = r.fftPass ? '#3fb950' : '#f85149';
    const fftIcon = r.fftPass ? '\u2713' : '\u2717';
    return `<div style="padding:2px 4px; background:${bg}; margin:1px 0; border-radius:2px; cursor:pointer; display:flex; gap:6px;" data-test-idx="${r.idx}">
      <span style="color:${color}; width:12px;" title="NN">${icon}</span>
      <span style="color:${fftColor}; width:12px;" title="FFT">${fftIcon}</span>
      <span style="color:#8b949e; width:30px;">#${r.idx + 1}</span>
      <span style="width:30px;">K=${r.K}</span>
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.toneStr}</span>
      <span style="width:80px; text-align:right;">${r.mode === 'fft-simulator' ? 'r=' + (r.corr||0).toFixed(2) : 'MSE=' + r.mse.toFixed(3)}</span>
      <span style="color:${color}; width:24px; text-align:right; font-size:7px;">NN:${r.pass ? 'P' : 'F'}</span>
      <span style="color:${fftColor}; width:28px; text-align:right; font-size:7px;">FFT:${r.fftPass ? 'P' : 'F'}</span>
    </div>`;
  }).join('');

  grid.querySelectorAll('[data-test-idx]').forEach(row => {
    row.onclick = () => {
      const globalIdx = +row.dataset.testIdx;
      const filtIdx = state.filteredTests.findIndex(r => r.idx === globalIdx);
      if (filtIdx >= 0) {
        showTestResult(filtIdx);
      } else {
        $('testFilter').value = 'all';
        applyTestFilter();
        const newIdx = state.filteredTests.findIndex(r => r.idx === globalIdx);
        if (newIdx >= 0) showTestResult(newIdx);
      }
    };
  });
}

function renderKBreakdown(results, p, method = 'nn') {
  const elId = method === 'fft' ? 'kBreakdownFFT' : 'kBreakdown';
  const el = $(elId);
  if (!results.length) { el.style.display = 'none'; return; }

  const isFFTMethod = method === 'fft';
  const usePass = r => isFFTMethod ? r.fftPass : r.pass;
  const title = isFFTMethod ? 'FFT Baseline by K' : 'NN Results by K';
  const titleColor = isFFTMethod ? '#f0883e' : '#58a6ff';

  // For fft-simulator + fft method, FFT is always perfect — show simplified table
  if (p.mode === 'fft-simulator' && isFFTMethod) {
    el.innerHTML = `<div style="font-size:10px; font-weight:bold; color:${titleColor}; margin-bottom:4px;">${title}</div>
      <div style="font-size:9px; color:#8b949e; background:#0d1117; padding:8px; border-radius:4px;">
        FFT is the ground truth for fft-simulator mode.<br>
        Every test: <span style="color:#3fb950; font-weight:bold;">r=1.000, MSE=0.0000</span><br>
        The FFT computes the exact DFT in <b>${Math.round(5 * p.N * Math.log2(p.N))}</b> FLOPs.<br>
        The NN is trying to <i>learn</i> this transform from examples.
      </div>`;
    el.style.display = '';
    return;
  }

  // Group by K
  const byK = {};
  results.forEach(r => {
    if (!byK[r.K]) byK[r.K] = { total: 0, pass: 0, mseSum: 0, corrSum: 0 };
    byK[r.K].total++;
    if (usePass(r)) byK[r.K].pass++;
    if (!isFFTMethod) {
      byK[r.K].mseSum += r.mse;
      if (r.corr != null) byK[r.K].corrSum += r.corr;
    }
  });

  const keys = Object.keys(byK).map(Number).sort();
  const isFftMode = p.mode === 'fft-simulator';
  const showMSE = !isFFTMethod;

  const cellColor = rate => {
    if (rate >= 90) return '#238636';
    if (rate >= 70) return '#2ea043';
    if (rate >= 50) return '#9e6a03';
    if (rate >= 30) return '#bd561d';
    return '#da3633';
  };

  let html = `<div style="font-size:10px; font-weight:bold; color:${titleColor}; margin-bottom:4px;">${title}</div>`;
  html += `<table style="font-size:9px; width:100%; border-collapse:collapse; background:#0d1117; border-radius:4px;">
    <tr style="color:#8b949e; border-bottom:1px solid #21262d;">
      <th style="padding:4px 6px; text-align:left;">K</th>
      <th style="padding:4px 6px; text-align:center;">N</th>
      <th style="padding:4px 6px; text-align:center;">P/F</th>
      <th style="padding:4px 6px; text-align:center;">Rate</th>
      ${showMSE ? '<th style="padding:4px 6px; text-align:center;">MSE</th>' : ''}
      ${showMSE && isFftMode ? '<th style="padding:4px 6px; text-align:center;">r</th>' : ''}
    </tr>`;

  keys.forEach(k => {
    const d = byK[k];
    const rate = (d.pass / d.total * 100);
    const bg = cellColor(rate);
    const kLabel = k === 0 ? '0 (noise)' : k === 1 ? '1 (1 tone)' : `${k} (${k}t)`;

    html += `<tr style="border-bottom:1px solid #21262d;">
      <td style="padding:3px 6px; color:#c9d1d9;">${kLabel}</td>
      <td style="padding:3px 6px; text-align:center; color:#8b949e;">${d.total}</td>
      <td style="padding:3px 6px; text-align:center; color:#8b949e;">${d.pass}/${d.total - d.pass}</td>
      <td style="padding:3px 6px; text-align:center;"><span style="background:${bg}; color:#fff; padding:1px 5px; border-radius:3px; font-weight:bold;">${rate.toFixed(0)}%</span></td>
      ${showMSE ? `<td style="padding:3px 6px; text-align:center; color:#8b949e;">${(d.mseSum / d.total).toFixed(4)}</td>` : ''}
      ${showMSE && isFftMode ? `<td style="padding:3px 6px; text-align:center; color:#8b949e;">${(d.corrSum / d.total).toFixed(3)}</td>` : ''}
    </tr>`;
  });

  // Totals row
  const totalPass = results.filter(usePass).length;
  const totalRate = (totalPass / results.length * 100);
  html += `<tr style="font-weight:bold; border-top:2px solid #30363d;">
    <td style="padding:3px 6px; color:#c9d1d9;">All</td>
    <td style="padding:3px 6px; text-align:center; color:#c9d1d9;">${results.length}</td>
    <td style="padding:3px 6px; text-align:center; color:#c9d1d9;">${totalPass}/${results.length - totalPass}</td>
    <td style="padding:3px 6px; text-align:center;"><span style="background:${cellColor(totalRate)}; color:#fff; padding:1px 5px; border-radius:3px; font-weight:bold;">${totalRate.toFixed(0)}%</span></td>`;
  if (showMSE) {
    const totalMSE = (results.reduce((s,r) => s + r.mse, 0) / results.length).toFixed(4);
    html += `<td style="padding:3px 6px; text-align:center; color:#c9d1d9;">${totalMSE}</td>`;
    if (isFftMode) {
      const totalCorr = (results.reduce((s,r) => s + (r.corr||0), 0) / results.length).toFixed(3);
      html += `<td style="padding:3px 6px; text-align:center; color:#c9d1d9;">${totalCorr}</td>`;
    }
  }
  html += `</tr></table>`;

  el.innerHTML = html;
  el.style.display = '';
}

function testLogToText() {
  const lines = [`Test Log (${state.testResults.length} tests, ${state.testResults.filter(r=>r.pass).length} pass, ${state.testResults.filter(r=>!r.pass).length} fail)\n`];
  state.testResults.forEach(r => {
    lines.push(`#${r.idx+1} NN:${r.pass ? 'PASS' : 'FAIL'} FFT:${r.fftPass ? 'PASS' : 'FAIL'} K=${r.K} [${r.toneStr}] ${r.detail}`);
  });
  return lines.join('\n');
}

export { runDetector, applyTestFilter, showTestResult, renderTestLog, testLogToText };
