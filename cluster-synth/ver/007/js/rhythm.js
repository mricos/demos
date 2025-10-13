/**
 * CLUSTER • Rhythm
 * BPM-driven temporal modulation system
 * Maps musical time to parameter values
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const Rhythm = {
    bpm: 120,
    running: false,
    startTime: 0,
    tapTimes: [],
    maps: JSON.parse(localStorage.getItem('cluster.rhythm.v1') || '{}')
  };

  function save() {
    localStorage.setItem('cluster.rhythm.v1', JSON.stringify(Rhythm.maps));
  }

  /* ---------- Tap Tempo ---------- */
  function tap() {
    const now = performance.now();
    Rhythm.tapTimes.push(now);

    // Keep only last 4 taps
    if (Rhythm.tapTimes.length > 4) {
      Rhythm.tapTimes.shift();
    }

    // Need at least 2 taps to calculate BPM
    if (Rhythm.tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < Rhythm.tapTimes.length; i++) {
        intervals.push(Rhythm.tapTimes[i] - Rhythm.tapTimes[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBPM = 60000 / avgInterval; // ms to BPM

      // Clamp to reasonable range
      Rhythm.bpm = U.clamp(calculatedBPM, 30, 300);

      // Update UI
      const bpmInput = U.$('#rhythm-bpm');
      if (bpmInput) {
        bpmInput.value = Rhythm.bpm.toFixed(1);
      }

      // Reset start time to sync phase
      Rhythm.startTime = now;
    }
  }

  /* ---------- Beat Divisions ---------- */
  const DIVISIONS = {
    '1': 4,      // Whole note
    '1/2': 2,    // Half note
    '1/4': 1,    // Quarter note (1 beat)
    '1/8': 0.5,  // Eighth note
    '1/16': 0.25,// Sixteenth note
    '1/32': 0.125,// Thirty-second note
    '1/4T': 2/3, // Quarter triplet
    '1/8T': 1/3, // Eighth triplet
    '1/4.': 1.5, // Dotted quarter
    '1/8.': 0.75 // Dotted eighth
  };

  /* ---------- Waveform Generators ---------- */
  function waveform(type, phase) {
    // phase is [0, 1] representing one cycle
    phase = phase % 1; // Wrap to [0, 1]

    switch(type) {
      case 'sine':
        return Math.sin(phase * Math.PI * 2) * 0.5 + 0.5; // [0, 1]

      case 'triangle':
        return phase < 0.5 ? phase * 2 : 2 - phase * 2; // [0, 1]

      case 'saw-up':
        return phase; // [0, 1]

      case 'saw-down':
        return 1 - phase; // [0, 1]

      case 'square':
        return phase < 0.5 ? 0 : 1; // [0, 1]

      case 'random':
        // Sample & hold: new random value each cycle
        return Math.floor(phase * 100) < Math.floor((phase - 0.01) * 100)
          ? Math.random()
          : (Math.sin(phase * 12345.6789) * 0.5 + 0.5); // Pseudo-random

      default:
        return 0.5;
    }
  }

  /* ---------- Beat Phase Calculation ---------- */
  function getBeatPhase(now, rate, phaseOffset) {
    if (!Rhythm.running) return 0;

    const elapsed = (now - Rhythm.startTime) / 1000; // seconds
    const beatsPerSecond = Rhythm.bpm / 60;
    const currentBeat = elapsed * beatsPerSecond;

    // Convert rate to beats
    const beatsPerCycle = DIVISIONS[rate] || 1;
    const cycles = currentBeat / beatsPerCycle;

    // Apply phase offset (0-360° → 0-1)
    const phaseOffsetNorm = (phaseOffset || 0) / 360;
    const phase = (cycles + phaseOffsetNorm) % 1;

    return phase;
  }

  /* ---------- Apply Rhythm Mappings ---------- */
  function applyRhythms(now) {
    if (!Rhythm.running) return;

    Object.keys(Rhythm.maps).forEach(param => {
      const mappings = Rhythm.maps[param];
      if (!mappings || mappings.length === 0) return;

      const el = document.querySelector(`[data-param="${param}"]`);
      if (!el) return;

      const min = +el.min;
      const max = +el.max;
      const range = max - min;

      // Sum all modulations for this parameter (additive)
      let totalMod = 0;
      let count = 0;

      mappings.forEach(m => {
        const phase = getBeatPhase(now, m.rate, m.phase);
        const wave = waveform(m.wave, phase);
        const depth = m.depth || 0.5;

        // Scale to [-depth/2, +depth/2] for bipolar modulation
        const modulation = (wave - 0.5) * depth;
        totalMod += modulation;
        count++;
      });

      // Average modulations if multiple
      if (count > 0) {
        const avgMod = totalMod / count;

        // Apply to current value
        const currentNorm = (el.value - min) / range; // Normalize to [0, 1]
        const newNorm = U.clamp(currentNorm + avgMod, 0, 1);
        const newVal = min + newNorm * range;

        el.value = newVal;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  /* ---------- Public API ---------- */
  Rhythm.tap = tap;
  Rhythm.save = save;

  Rhythm.start = function() {
    Rhythm.running = true;
    Rhythm.startTime = performance.now();
  };

  Rhythm.stop = function() {
    Rhythm.running = false;
  };

  Rhythm.setBPM = function(bpm) {
    Rhythm.bpm = U.clamp(+bpm, 30, 300);
    // Keep phase continuous by adjusting start time
    // (implementation could be enhanced to prevent phase jumps)
  };

  Rhythm.addMapping = function(param, rate, wave, depth, phase) {
    if (!Rhythm.maps[param]) {
      Rhythm.maps[param] = [];
    }
    Rhythm.maps[param].push({
      rate: rate || '1/4',
      wave: wave || 'sine',
      depth: depth || 0.5,
      phase: phase || 0
    });
    save();
    NS.Bus.emit('rhythm:changed', Rhythm.maps);
  };

  Rhythm.removeMapping = function(param, index) {
    if (Rhythm.maps[param] && Rhythm.maps[param][index] !== undefined) {
      Rhythm.maps[param].splice(index, 1);
      if (Rhythm.maps[param].length === 0) {
        delete Rhythm.maps[param];
      }
      save();
      NS.Bus.emit('rhythm:changed', Rhythm.maps);
    }
  };

  Rhythm.updateMapping = function(param, index, key, value) {
    if (Rhythm.maps[param] && Rhythm.maps[param][index]) {
      Rhythm.maps[param][index][key] = value;
      save();
    }
  };

  // Poll loop integration
  Rhythm.poll = function(now) {
    applyRhythms(now);
  };

  /* ---------- UI Rendering ---------- */
  function renderMappingTable() {
    const tbody = U.$('#rhythm-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    Object.keys(Rhythm.maps).forEach(param => {
      const mappings = Rhythm.maps[param];
      mappings.forEach((m, idx) => {
        const tr = document.createElement('tr');

        // Param name (read-only)
        tr.innerHTML = `
          <td>${param}</td>
          <td>${m.rate}</td>
          <td>${m.wave}</td>
          <td>${m.depth.toFixed(2)}</td>
          <td>${m.phase}°</td>
          <td><button class="btn-ghost small" data-param="${param}" data-idx="${idx}">🗑</button></td>
        `;

        tbody.appendChild(tr);
      });
    });

    // Wire up delete buttons
    tbody.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const param = btn.getAttribute('data-param');
        const idx = +btn.getAttribute('data-idx');
        Rhythm.removeMapping(param, idx);
        renderMappingTable();
      });
    });
  }

  function populateParameterSelect() {
    const sel = U.$('#rhythm-param-select');
    if (!sel) return;

    // Get all parameters from control inputs
    const params = Array.from(U.$all('[data-param]')).map(el => el.getAttribute('data-param'));

    // Clear and repopulate
    sel.innerHTML = '<option value="">-- Select Parameter --</option>';

    if (params.length === 0) {
      console.warn('No parameters found for rhythm dropdown');
      return;
    }

    params.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    });
  }

  function populateParametersList() {
    const listEl = U.$('#rhythm-params-list');
    if (!listEl) return;

    // Get all parameters
    const paramElements = Array.from(U.$all('[data-param]'));

    if (paramElements.length === 0) {
      listEl.innerHTML = '<div style="color:#8a8f9d;font-style:italic">No parameters found</div>';
      return;
    }

    // Get gamepad mappings if available
    const gpMaps = (NS.Gamepad && NS.Gamepad.maps) || {};

    // Build list
    let html = '<div style="display:grid;gap:6px">';

    paramElements.forEach(el => {
      const param = el.getAttribute('data-param');
      const panel = el.closest('.panel');
      const panelTitle = panel ? panel.querySelector('.panel-title')?.textContent || 'Unknown' : 'Unknown';

      // Check for rhythm mappings
      const rhythmMaps = Rhythm.maps[param] || [];
      const rhythmCount = rhythmMaps.length;

      // Check for gamepad mappings
      let gpCount = 0;
      Object.keys(gpMaps).forEach(source => {
        const mappings = gpMaps[source];
        if (mappings.some(m => m.param === param)) {
          gpCount++;
        }
      });

      const hasMapping = rhythmCount > 0 || gpCount > 0;
      const color = hasMapping ? '#8bd5ca' : '#6b7089';

      html += `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1a1f2b">
        <span style="color:${color}">${param}</span>
        <span style="color:#5a5f75;font-size:10px">${panelTitle} ${hasMapping ? `| R:${rhythmCount} GP:${gpCount}` : ''}</span>
      </div>`;
    });

    html += '</div>';
    listEl.innerHTML = html;
  }

  /* ---------- UI Event Handlers ---------- */
  function attachUI() {
    // BPM input
    const bpmInput = U.$('#rhythm-bpm');
    if (bpmInput) {
      bpmInput.addEventListener('input', () => {
        Rhythm.setBPM(+bpmInput.value);
        const statusBpm = U.$('#status-bpm');
        if (statusBpm) statusBpm.textContent = `bpm: ${Rhythm.bpm.toFixed(1)}`;
      });
    }

    // Tap button
    const tapBtn = U.$('#rhythm-tap');
    if (tapBtn) {
      tapBtn.addEventListener('click', () => {
        tap();
        if (bpmInput) bpmInput.value = Rhythm.bpm.toFixed(1);
        const statusBpm = U.$('#status-bpm');
        if (statusBpm) statusBpm.textContent = `bpm: ${Rhythm.bpm.toFixed(1)}`;
      });
    }

    // Start/Stop toggle
    const toggleBtn = U.$('#rhythm-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (Rhythm.running) {
          Rhythm.stop();
          toggleBtn.textContent = 'Start';
          toggleBtn.classList.remove('btn-solid');
          toggleBtn.classList.add('btn-ghost');
        } else {
          Rhythm.start();
          toggleBtn.textContent = 'Stop';
          toggleBtn.classList.remove('btn-ghost');
          toggleBtn.classList.add('btn-solid');
        }
      });
    }

    // Depth and phase value displays
    const depthInput = U.$('#rhythm-depth');
    const depthVal = U.$('#rhythm-depth-val');
    if (depthInput && depthVal) {
      depthInput.addEventListener('input', () => {
        depthVal.textContent = (+depthInput.value).toFixed(2);
      });
    }

    const phaseInput = U.$('#rhythm-phase');
    const phaseVal = U.$('#rhythm-phase-val');
    if (phaseInput && phaseVal) {
      phaseInput.addEventListener('input', () => {
        phaseVal.textContent = (+phaseInput.value) + '°';
      });
    }

    // Add mapping button
    const addBtn = U.$('#rhythm-add');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const paramSel = U.$('#rhythm-param-select');
        const rateSel = U.$('#rhythm-rate-select');
        const waveSel = U.$('#rhythm-wave-select');
        const depthInput = U.$('#rhythm-depth');
        const phaseInput = U.$('#rhythm-phase');

        const param = paramSel?.value;
        if (!param) {
          alert('Please select a parameter');
          return;
        }

        const rate = rateSel?.value || '1/4';
        const wave = waveSel?.value || 'sine';
        const depth = +(depthInput?.value || 0.5);
        const phase = +(phaseInput?.value || 0);

        Rhythm.addMapping(param, rate, wave, depth, phase);
        renderMappingTable();

        // Reset parameter selector
        if (paramSel) paramSel.value = '';
      });
    }

    // Populate parameter dropdown and list (with delay to ensure all params are loaded)
    setTimeout(() => {
      populateParameterSelect();
      populateParametersList();
    }, 100);

    // Repopulate when rhythm panel opens
    NS.Bus.on('panel:mode-changed', (data) => {
      if (data.panelId === 'panel-rhythm' && data.mode === 'open') {
        populateParameterSelect();
        populateParametersList();
      }
    });

    // Render initial table
    renderMappingTable();

    // Listen for mapping changes from other sources
    NS.Bus.on('rhythm:changed', () => {
      renderMappingTable();
      populateParametersList(); // Update list when mappings change
    });

    // Listen for gamepad mapping changes
    NS.Bus.on('mapper:changed', () => {
      populateParametersList(); // Update list when gamepad mappings change
    });
  }

  // Initialize UI
  Rhythm.init = attachUI;

  // Listen for tap tempo events from gamepad
  NS.Bus.on('rhythm:tap-tempo', () => {
    tap();
    // Update UI on tap
    const bpmInput = U.$('#rhythm-bpm');
    if (bpmInput) bpmInput.value = Rhythm.bpm.toFixed(1);
    const statusBpm = U.$('#status-bpm');
    if (statusBpm) statusBpm.textContent = `bpm: ${Rhythm.bpm.toFixed(1)}`;
  });

  NS.Rhythm = Rhythm;

})(window);
