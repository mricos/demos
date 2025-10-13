/**
 * CLUSTER • Audio / Synth
 * Dual cluster synthesis with FM, waveshaping, filtering, FX
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const Audio = {
    AC: null,
    fx: null,
    L: null,
    R: null,
    analyserL: null,
    analyserR: null,
    meter: null,
    master: null
  };

  /* ---------- Synthesis Utilities ---------- */
  function periodicWave(context, morph) {
    const N = 64;
    const re = new Float32Array(N);
    const im = new Float32Array(N);

    im[1] = (1 - morph);
    for (let k = 1; k < N; k++) {
      im[k] += morph * ((k % 2 ? 1 : -1) * (1 / k));
    }

    return context.createPeriodicWave(re, im, { disableNormalization: false });
  }

  function waveshaper(context, amount) {
    const n = 2048;
    const s = new Float32Array(n);
    const a = Math.max(0.0001, amount);

    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      const fold = Math.sin(3 * x);
      const sat = Math.tanh(2.5 * x);
      s[i] = (1 - a) * sat + a * fold;
    }

    const sh = context.createWaveShaper();
    sh.curve = s;
    sh.oversample = '4x';
    return sh;
  }

  /* ---------- Cluster Generation ---------- */
  function makeCluster(prefix) {
    const g = k => +document.querySelector(`[data-param="${prefix + k}"]`).value;
    const baseHz = g('freq');
    const count = g('count') | 0;
    const spread = g('spread');
    const morph = g('morph');
    const fmC = g('fmIndex');

    const out = Audio.AC.createGain();
    out.gain.value = 1;

    // FM modulator
    const mod = Audio.AC.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = baseHz;
    const modGain = Audio.AC.createGain();
    modGain.gain.value = fmC;
    mod.connect(modGain);

    const pw = periodicWave(Audio.AC, morph);
    const osc = [];

    for (let i = 0; i < count; i++) {
      const o = Audio.AC.createOscillator();
      o.setPeriodicWave(pw);
      o.frequency.value = baseHz;

      // Detune calculation
      const frac = (i - (count - 1) / 2) / Math.max(1, (count - 1));
      const det = frac * spread;

      // Sum for detune + FM
      const sum = Audio.AC.createGain();
      sum.gain.value = 1.0;
      const dc = Audio.AC.createConstantSource();
      dc.offset.value = det;
      dc.start();
      dc.connect(sum);
      modGain.connect(sum);
      sum.connect(o.detune);

      // Signal chain: osc -> waveshaper -> filter -> pan -> out
      const sh = waveshaper(Audio.AC, g('fold'));
      const biq = Audio.AC.createBiquadFilter();
      biq.type = 'lowpass';
      biq.frequency.value = g('cut');
      biq.Q.value = g('q');
      const pan = Audio.AC.createStereoPanner();
      pan.pan.value = g('pan');

      o.connect(sh).connect(biq).connect(pan).connect(out);
      o.start();

      osc.push({ o, sh, biq, pan, sum, dc });
    }

    mod.start();
    return { group: out, osc, mod, modGain };
  }

  /* ---------- FX Chain ---------- */
  function buildFX() {
    const fx = {};
    fx.pre = Audio.AC.createGain();
    fx.pre.gain.value = 1;

    fx.delayL = Audio.AC.createDelay(1.5);
    fx.delayR = Audio.AC.createDelay(1.5);

    function AP() {
      const b = Audio.AC.createBiquadFilter();
      b.type = 'allpass';
      b.frequency.value = 2000;
      b.Q.value = 1.2;
      return b;
    }

    fx.apL1 = AP();
    fx.apL2 = AP();
    fx.apR1 = AP();
    fx.apR2 = AP();
    fx.fbL = Audio.AC.createGain();
    fx.fbR = Audio.AC.createGain();

    fx.shiftOscL = Audio.AC.createOscillator();
    fx.shiftOscR = Audio.AC.createOscillator();
    fx.shiftGainL = Audio.AC.createGain();
    fx.shiftGainR = Audio.AC.createGain();

    fx.mulL = Audio.AC.createGain();
    fx.mulR = Audio.AC.createGain();
    fx.mulL.gain.value = 0;
    fx.mulR.gain.value = 0;

    fx.wet = Audio.AC.createGain();
    fx.dry = Audio.AC.createGain();

    fx.modL = Audio.AC.createOscillator();
    fx.modR = Audio.AC.createOscillator();
    fx.modGainL = Audio.AC.createGain();
    fx.modGainR = Audio.AC.createGain();

    fx.split = Audio.AC.createChannelSplitter(2);
    fx.merge = Audio.AC.createChannelMerger(2);

    fx.pre.connect(fx.split);
    fx.split.connect(fx.delayL, 0);
    fx.delayL.connect(fx.apL1).connect(fx.apL2).connect(fx.fbL).connect(fx.mulL).connect(fx.merge, 0, 0);
    fx.split.connect(fx.delayR, 1);
    fx.delayR.connect(fx.apR1).connect(fx.apR2).connect(fx.fbR).connect(fx.mulR).connect(fx.merge, 0, 1);

    fx.apL2.connect(fx.delayL);
    fx.apR2.connect(fx.delayR);

    fx.shiftOscL.type = 'sine';
    fx.shiftOscR.type = 'sine';
    fx.shiftOscL.connect(fx.shiftGainL).connect(fx.mulL.gain);
    fx.shiftOscR.connect(fx.shiftGainR).connect(fx.mulR.gain);

    fx.merge.connect(fx.wet);
    fx.pre.connect(fx.dry);

    const master = Audio.master = Audio.AC.createGain();
    fx.wet.connect(master);
    fx.dry.connect(master);

    const toScope = Audio.AC.createChannelSplitter(2);
    master.connect(toScope);

    Audio.analyserL = Audio.AC.createAnalyser();
    Audio.analyserR = Audio.AC.createAnalyser();
    Audio.analyserL.fftSize = 2048;
    Audio.analyserR.fftSize = 2048;

    toScope.connect(Audio.analyserL, 0);
    toScope.connect(Audio.analyserR, 1);

    Audio.meter = {
      getPeak: () => {
        const buf = new Float32Array(2048);
        Audio.analyserL.getFloatTimeDomainData(buf);
        let p = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i]);
          if (v > p) p = v;
        }
        return p;
      }
    };

    master.connect(Audio.AC.destination);
    Audio.fx = fx;
  }

  /* ---------- Parameter Wiring ---------- */
  function wireParams() {
    const gSel = sel => document.querySelector(`[data-param="${sel}"]`);
    const fx = Audio.fx;
    const bind = (name, fn) => gSel(name).addEventListener('input', fn);

    bind('fxTime', () => {
      const v = +gSel('fxTime').value;
      fx.delayL.delayTime.value = v;
      fx.delayR.delayTime.value = v;
    });

    bind('feedback', () => {
      const v = +gSel('feedback').value;
      fx.fbL.gain.value = v;
      fx.fbR.gain.value = v;
    });

    bind('diffuse', () => {
      const d = +gSel('diffuse').value;
      [fx.apL1, fx.apL2, fx.apR1, fx.apR2].forEach((ap, i) => {
        ap.Q.value = 0.5 + (i + 1) * 0.5 * d;
      });
    });

    bind('modRate', () => {
      const r = +gSel('modRate').value;
      fx.modL.frequency.value = r;
      fx.modR.frequency.value = r * 1.01;
    });

    bind('modDepth', () => {
      const g = (+gSel('modDepth').value) / 1000;
      fx.modGainL.gain.value = g;
      fx.modGainR.gain.value = g;
    });

    bind('shiftHz', () => {
      const f = +gSel('shiftHz').value;
      fx.shiftOscL.frequency.value = f;
      fx.shiftOscR.frequency.value = f * 1.003;
    });

    bind('shiftMix', () => {
      const m = +gSel('shiftMix').value;
      fx.shiftGainL.gain.value = m;
      fx.shiftGainR.gain.value = m;
    });

    bind('mix', () => {
      const m = +gSel('mix').value;
      fx.wet.gain.value = m;
      fx.dry.gain.value = 1 - m;
    });

    bind('outGain', () => {
      Audio.master.gain.setTargetAtTime(
        U.dbToGain(+gSel('outGain').value),
        Audio.AC.currentTime,
        0.01
      );
    });

    // Initialize values
    const r = +gSel('modRate').value;
    fx.modL.frequency.value = r;
    fx.modR.frequency.value = r * 1.01;

    const g = (+gSel('modDepth').value) / 1000;
    fx.modGainL.gain.value = g;
    fx.modGainR.gain.value = g;

    const f = +gSel('shiftHz').value;
    fx.shiftOscL.frequency.value = f;
    fx.shiftOscR.frequency.value = f * 1.003;

    const m = +gSel('shiftMix').value;
    fx.shiftGainL.gain.value = m;
    fx.shiftGainR.gain.value = m;

    const mix = +gSel('mix').value;
    fx.wet.gain.value = mix;
    fx.dry.gain.value = 1 - mix;

    Audio.master.gain.value = U.dbToGain(+gSel('outGain').value);
  }

  /* ---------- Cluster Rebuild & Update ---------- */
  function rebuild(which) {
    const p = which === 'L' ? 'L_' : 'R_';

    if (Audio[which]) {
      try {
        Audio[which].mod.stop();
      } catch (e) {}
      Audio[which].osc.forEach(x => {
        try {
          x.o.stop();
        } catch (_) {}
      });
    }

    const made = makeCluster(p);
    Audio[which] = made;

    const lvl = Audio.AC.createGain();
    lvl.gain.value = U.dbToGain(+document.querySelector(`[data-param="${p}level"]`).value);
    made.group.connect(lvl).connect(Audio.fx.pre);
    Audio[which].lvl = lvl;
  }

  function updateContinuous(which) {
    const p = which === 'L' ? 'L_' : 'R_';
    const g = k => +document.querySelector(`[data-param="${p + k}"]`).value;
    const S = Audio[which];
    if (!S) return;

    const freq = g('freq');
    const morph = g('morph');
    const fold = g('fold');
    const cut = g('cut');
    const q = g('q');
    const pan = g('pan');
    const lvl = U.dbToGain(g('level'));
    const fmix = g('fmIndex');

    if (S.mod) {
      S.mod.frequency.setTargetAtTime(freq, Audio.AC.currentTime, 0.01);
      S.modGain.gain.setTargetAtTime(fmix, Audio.AC.currentTime, 0.02);
    }

    const pw = periodicWave(Audio.AC, morph);

    S.osc.forEach(x => {
      x.o.setPeriodicWave(pw);
      x.biq.frequency.setTargetAtTime(cut, Audio.AC.currentTime, 0.01);
      x.biq.Q.setTargetAtTime(q, Audio.AC.currentTime, 0.01);
      x.pan.pan.setTargetAtTime(pan, Audio.AC.currentTime, 0.01);

      const sh = waveshaper(Audio.AC, fold);
      x.o.disconnect();
      x.o.connect(sh).connect(x.biq).connect(x.pan);
    });

    S.lvl.gain.setTargetAtTime(lvl, Audio.AC.currentTime, 0.02);
  }

  /* ---------- Parameter Value Display ---------- */
  // Throttle value display updates to prevent flicker during gamepad input
  let pendingValUpdates = new Set();
  let rafScheduled = false;

  function flushValUpdates() {
    pendingValUpdates.forEach(el => {
      const name = el.getAttribute('data-param');
      const tag = U.$(`[data-val="${name}"]`);
      if (tag) {
        const newText = (el.step && Math.abs(+el.step) >= 1)
          ? (+el.value).toFixed(1)
          : (+el.value).toFixed(3);

        // Only update if changed to avoid unnecessary reflows
        if (tag.textContent !== newText) {
          tag.textContent = newText;
        }
      }
      el.setAttribute('aria-valuetext', el.value);
    });
    pendingValUpdates.clear();
    rafScheduled = false;
  }

  function renderVal(el) {
    const name = el.getAttribute('data-param');

    // Queue the update
    pendingValUpdates.add(el);

    // Schedule flush if not already scheduled
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flushValUpdates);
    }

    // Note: Removed 'ui:param-changed' emit to prevent canvas node flickering at 60fps
    // The event was causing the UI canvas node to pulse continuously during gamepad input
  }

  /* ---------- Start Audio ---------- */
  Audio.start = async () => {
    if (Audio.AC && Audio.AC.state !== 'closed') {
      // Resume if suspended
      if (Audio.AC.state === 'suspended') {
        await Audio.AC.resume();
        return;
      }
      return;
    }

    Audio.AC = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });

    buildFX();
    wireParams();
    rebuild('L');
    rebuild('R');

    const bindList = (W) => {
      ['freq', 'morph', 'fold', 'cut', 'q', 'pan', 'level', 'fmIndex'].forEach(k => {
        document.querySelector(`[data-param="${W + '_' + k}"]`).addEventListener('input', () => updateContinuous(W));
      });

      ['count', 'spread'].forEach(k => {
        document.querySelector(`[data-param="${W + '_' + k}"]`).addEventListener('change', () => rebuild(W));
      });
    };

    bindList('L');
    bindList('R');

    NS.Bus.emit('audio:started', {});

    // Meter animation (optimized to prevent flicker)
    const bar = document.getElementById('cl-mbar');
    if (bar) {
      let lastWidth = 0;
      const raf = () => {
        if (Audio.meter && Audio.AC && Audio.AC.state === 'running') {
          const p = Audio.meter.getPeak();
          const newWidth = Math.min(1, p) * 100;

          // Only update if changed by >0.5% to reduce DOM thrashing
          if (Math.abs(newWidth - lastWidth) > 0.5) {
            bar.style.width = newWidth + '%';
            lastWidth = newWidth;
          }
        }
        requestAnimationFrame(raf);
      };
      raf();
    }

    NS.Bus.emit('audio:ready', { analyserL: Audio.analyserL, analyserR: Audio.analyserR });
  };

  /* ---------- Stop Audio ---------- */
  Audio.stop = async () => {
    if (Audio.AC && Audio.AC.state === 'running') {
      await Audio.AC.suspend();
      NS.Bus.emit('audio:suspended', {});
    }
  };

  /* ---------- Initialize UI ---------- */
  Audio.init = () => {
    // Param value mirrors
    U.$all('[data-param]').forEach(inp => {
      inp.addEventListener('input', () => renderVal(inp));
      renderVal(inp);
    });

    // Toggle audio button
    const btnAudio = U.$('#btn-audio');
    if (btnAudio) {
      btnAudio.onclick = async () => {
        if (!Audio.AC || Audio.AC.state === 'closed') {
          // First time start
          await Audio.start();
          btnAudio.textContent = 'Stop Audio';
          btnAudio.classList.remove('btn-solid');
          btnAudio.classList.add('btn-ghost');
          U.$('#status-audio').textContent = 'audio: on';
        } else if (Audio.AC.state === 'running') {
          // Stop (suspend)
          await Audio.stop();
          btnAudio.textContent = 'Start Audio';
          btnAudio.classList.remove('btn-ghost');
          btnAudio.classList.add('btn-solid');
          U.$('#status-audio').textContent = 'audio: off';
        } else if (Audio.AC.state === 'suspended') {
          // Resume
          await Audio.start();
          btnAudio.textContent = 'Stop Audio';
          btnAudio.classList.remove('btn-solid');
          btnAudio.classList.add('btn-ghost');
          U.$('#status-audio').textContent = 'audio: on';
        }
      };
    }
  };

  NS.Audio = Audio;

})(window);
