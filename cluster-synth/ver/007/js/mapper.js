/**
 * CLUSTER • Mapper
 * Universal input→parameter mapping system
 * Maps gamepad, keyboard, mouse, and UI events to synth parameters
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const Mapper = {
    maps: JSON.parse(localStorage.getItem('cluster.maps.v4') || '{}'),
    actions: JSON.parse(localStorage.getItem('cluster.actions.v2') || '{}'),
    uiEvents: JSON.parse(localStorage.getItem('cluster.uievents.v1') || '{}'),
    // Cache for continuous values (axes, etc)
    cache: {}
  };

  function save() {
    localStorage.setItem('cluster.maps.v4', JSON.stringify(Mapper.maps));
    localStorage.setItem('cluster.actions.v2', JSON.stringify(Mapper.actions));
    localStorage.setItem('cluster.uievents.v1', JSON.stringify(Mapper.uiEvents));
  }

  /* ---------- Scale Conversions ---------- */
  function scaleValue(value01, min, max, scaleType) {
    // value01 is normalized input [0, 1]
    // Returns output in [min, max] range with appropriate scaling

    switch(scaleType) {
      case 'log':
        // Logarithmic scaling for frequency parameters
        if (min <= 0) min = 0.001; // Avoid log(0)
        const logMin = Math.log(min);
        const logMax = Math.log(max);
        return Math.exp(logMin + value01 * (logMax - logMin));

      case 'exp':
        // Exponential scaling (inverse of log)
        const expScale = Math.log(max / min);
        return min * Math.exp(value01 * expScale);

      case 'linear':
      default:
        return min + value01 * (max - min);
    }
  }

  /* ---------- Apply Mappings ---------- */
  function applyMapping(source, value01) {
    const binds = Mapper.maps[source];
    if (!binds || binds.length === 0) return;

    binds.forEach(m => {
      const el = document.querySelector(`[data-param="${m.param}"]`);
      if (!el) return;

      const min = +el.min;
      const max = +el.max;
      const sign = m.invert ? -1 : 1;
      const dead = m.dead || 0;

      // Apply deadzone, inversion, scale, and offset
      let v = value01;
      if (Math.abs(value01 - 0.5) * 2 < dead) {
        v = 0.5; // Center deadzone
      }
      v = (v - 0.5) * sign + 0.5; // Invert around center
      v = v * m.scale + m.offset;
      v = U.clamp(v, 0, 1);

      // Apply scale type
      const scaleType = m.scaleType || 'linear';
      const out = scaleValue(v, min, max, scaleType);

      el.value = out;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  /* ---------- Apply Actions ---------- */
  function applyActions(source) {
    const actions = Mapper.actions[source];
    if (!actions || !actions.length) return;

    actions.forEach(action => {
      switch(action.type) {
        case 'panel-toggle':
          if (action.target && NS.PanelManager) {
            const panelId = action.target.replace('#', '');
            NS.PanelManager.togglePanel(panelId);
          }
          break;

        case 'param-set':
          if (action.param) {
            const el = document.querySelector(`[data-param="${action.param}"]`);
            if (el) {
              el.value = action.value || 0;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
          break;

        case 'param-inc':
          if (action.param) {
            const el = document.querySelector(`[data-param="${action.param}"]`);
            if (el) {
              const step = action.step || (+el.step) || 0.01;
              const max = +el.max || 1;
              const newVal = Math.min(max, (+el.value) + step);
              el.value = newVal;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
          break;

        case 'param-dec':
          if (action.param) {
            const el = document.querySelector(`[data-param="${action.param}"]`);
            if (el) {
              const step = action.step || (+el.step) || 0.01;
              const min = +el.min || 0;
              const newVal = Math.max(min, (+el.value) - step);
              el.value = newVal;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
          break;

        case 'tap-tempo':
          NS.Bus.emit('rhythm:tap-tempo', { timestamp: U.now() });
          break;

        case 'bus-emit':
          // Generic event emission
          if (action.event) {
            NS.Bus.emit(action.event, action.data || {});
          }
          break;
      }
    });
  }

  /* ---------- Live Input Display ---------- */
  function updateLiveInputDisplay() {
    const el = U.$('#mapper-live-inputs');
    if (!el) return;

    const inputs = [];

    // Always show axis0 and axis1 (primary axes)
    ['g0.axis0', 'g0.axis1'].forEach(source => {
      const value = Mapper.cache[source] || 0.5; // Default to center
      const mappings = Mapper.maps[source];
      const hasMappings = mappings && mappings.length > 0;
      const color = hasMappings ? '#8bd5ca' : '#5a5f75';
      const opacity = Math.abs(value - 0.5) > 0.05 ? '1' : '0.5'; // Highlight active inputs

      // Show mapped params if any
      const mappedParams = hasMappings
        ? mappings.map(m => m.param).join(', ')
        : 'unmapped';

      inputs.push(`
        <div style="background:#0a0f1a;border:1px solid #1e2a40;border-radius:6px;padding:6px;opacity:${opacity};transition:opacity .15s ease">
          <div style="color:${color};font-weight:bold;margin-bottom:4px;font-size:10px">${source}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div style="flex:1;height:6px;background:#1a1f2b;border-radius:3px;margin-right:8px;overflow:hidden">
              <div style="height:100%;width:${value * 100}%;background:${color};transition:width .05s ease"></div>
            </div>
            <span style="color:#cbd3ea;font-weight:bold;font-size:11px">${value.toFixed(3)}</span>
          </div>
          <div style="color:#6b7089;font-size:9px">→ ${mappedParams}</div>
        </div>
      `);
    });

    // Show active MIDI CC controllers
    const activeMIDICC = [];
    Object.keys(Mapper.cache).forEach(source => {
      if (source.startsWith('midi.') && source.includes('.cc')) {
        const value = Mapper.cache[source];
        if (value > 0.01) {
          activeMIDICC.push({ source, value });
        }
      }
    });

    // Show last 6 active MIDI CCs
    activeMIDICC.slice(-6).forEach(({ source, value }) => {
      const mappings = Mapper.maps[source];
      const hasMappings = mappings && mappings.length > 0;
      const color = hasMappings ? '#eb6f92' : '#5a5f75';

      const mappedParams = hasMappings
        ? mappings.map(m => m.param).join(', ')
        : 'unmapped';

      inputs.push(`
        <div style="background:#1a0e14;border:1px solid #3a1e2a;border-radius:6px;padding:6px">
          <div style="color:${color};font-weight:bold;margin-bottom:4px;font-size:10px">${source}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div style="flex:1;height:6px;background:#1a1f2b;border-radius:3px;margin-right:8px;overflow:hidden">
              <div style="height:100%;width:${value * 100}%;background:${color};transition:width .05s ease"></div>
            </div>
            <span style="color:#cbd3ea;font-weight:bold;font-size:11px">${value.toFixed(3)}</span>
          </div>
          <div style="color:#6b7089;font-size:9px">→ ${mappedParams}</div>
        </div>
      `);
    });

    // Show recently pressed buttons
    const pressedButtons = [];
    Object.keys(Mapper.cache).forEach(source => {
      if (source.startsWith('g0.btn')) {
        const value = Mapper.cache[source];
        if (value > 0) {
          pressedButtons.push({ source, value });
        }
      }
    });

    // Sort and show only last 4 pressed buttons
    pressedButtons.slice(-4).forEach(({ source, value }) => {
      const actions = Mapper.actions[source];
      const hasActions = actions && actions.length > 0;
      const color = hasActions ? '#f6c177' : '#5a5f75';

      const actionStr = hasActions
        ? actions.map(a => a.type).join(', ')
        : 'unmapped';

      inputs.push(`
        <div style="background:#1a1510;border:1px solid #3a2a10;border-radius:6px;padding:6px">
          <div style="color:${color};font-weight:bold;margin-bottom:4px;font-size:10px">${source}</div>
          <div style="color:#cbd3ea;font-weight:bold;font-size:11px;margin-bottom:4px">${value.toFixed(3)}</div>
          <div style="color:#6b7089;font-size:9px">→ ${actionStr}</div>
        </div>
      `);
    });

    el.innerHTML = inputs.join('');
  }

  /* ---------- Event Handlers ---------- */
  function onGamepadAxis(data) {
    // Cache the value
    Mapper.cache[data.source] = data.value;
    // Apply immediately
    applyMapping(data.source, data.value);
    // Update display
    updateLiveInputDisplay();
  }

  function onGamepadButton(data) {
    // Cache the value
    Mapper.cache[data.source] = data.value;

    // Apply continuous mappings (for analog triggers)
    if (data.pressed) {
      applyMapping(data.source, data.value);
    }

    // Apply button actions (only on press, not hold)
    if (data.justPressed) {
      applyActions(data.source);
    }

    // Update display
    updateLiveInputDisplay();
  }

  function onUIEvent(eventType, target, eventData) {
    // Generate source key for UI events
    const source = `ui.${eventType}.${target}`;

    // Cache and apply
    Mapper.cache[source] = 1; // UI events are binary
    applyActions(source);
  }

  function onMIDICC(data) {
    // Cache the value
    Mapper.cache[data.source] = data.value;
    // Apply immediately
    applyMapping(data.source, data.value);
    // Update display
    updateLiveInputDisplay();
  }

  function onMIDINote(data) {
    // Cache the value
    Mapper.cache[data.source] = data.velocity;

    // Apply continuous mappings (note velocity as continuous value)
    applyMapping(data.source, data.velocity);

    // Apply button actions (only on note on)
    if (data.type === 'noteon') {
      applyActions(data.source);
    }

    // Update display
    updateLiveInputDisplay();
  }

  function onMIDIPitchBend(data) {
    // Cache the value
    Mapper.cache[data.source] = data.value;
    // Apply immediately
    applyMapping(data.source, data.value);
    // Update display
    updateLiveInputDisplay();
  }

  /* ---------- Public API ---------- */
  Mapper.addMapping = function(source, param, scale, offset, invert, dead, scaleType) {
    if (!Mapper.maps[source]) {
      Mapper.maps[source] = [];
    }
    Mapper.maps[source].push({
      param: param,
      scale: scale || 1,
      offset: offset || 0,
      invert: invert || false,
      dead: dead || 0,
      scaleType: scaleType || 'linear'
    });
    save();
    NS.Bus.emit('mapper:changed', Mapper.maps);
  };

  Mapper.removeMapping = function(source, index) {
    if (Mapper.maps[source] && Mapper.maps[source][index] !== undefined) {
      Mapper.maps[source].splice(index, 1);
      if (Mapper.maps[source].length === 0) {
        delete Mapper.maps[source];
      }
      save();
      NS.Bus.emit('mapper:changed', Mapper.maps);
    }
  };

  Mapper.updateMapping = function(source, index, key, value) {
    if (Mapper.maps[source] && Mapper.maps[source][index]) {
      Mapper.maps[source][index][key] = value;
      save();
    }
  };

  Mapper.addAction = function(source, type, options) {
    if (!Mapper.actions[source]) {
      Mapper.actions[source] = [];
    }
    Mapper.actions[source].push({
      type: type,
      ...options
    });
    save();
    NS.Bus.emit('mapper:actions-changed', Mapper.actions);
  };

  Mapper.removeAction = function(source, index) {
    if (Mapper.actions[source] && Mapper.actions[source][index] !== undefined) {
      Mapper.actions[source].splice(index, 1);
      if (Mapper.actions[source].length === 0) {
        delete Mapper.actions[source];
      }
      save();
      NS.Bus.emit('mapper:actions-changed', Mapper.actions);
    }
  };

  Mapper.updateAction = function(source, index, key, value) {
    if (Mapper.actions[source] && Mapper.actions[source][index]) {
      Mapper.actions[source][index][key] = value;
      save();
    }
  };

  Mapper.clearAll = function() {
    Mapper.maps = {};
    Mapper.actions = {};
    save();
    NS.Bus.emit('mapper:changed', Mapper.maps);
    NS.Bus.emit('mapper:actions-changed', Mapper.actions);
    Mapper.renderMappingTable();
    Mapper.renderActionsTable();
  };

  // Poll loop (called from gamepad main loop, similar to rhythm)
  Mapper.poll = function(now) {
    // Re-apply cached continuous values
    // This ensures mappings stay active even between events
    Object.keys(Mapper.cache).forEach(source => {
      if (source.startsWith('g0.axis')) {
        applyMapping(source, Mapper.cache[source]);
      }
    });
  };

  /* ---------- UI Rendering ---------- */
  Mapper.renderMappingTable = function() {
    const body = U.$('#map-body');
    if (!body) return;

    body.innerHTML = '';

    Object.keys(Mapper.maps).forEach(src => {
      Mapper.maps[src].forEach((m, i) => {
        const scaleType = m.scaleType || 'linear';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${src}</td>
          <td>${m.param}</td>
          <td>
            <select class="small-select" data-map="${src}:${i}:scaleType">
              <option value="linear" ${scaleType === 'linear' ? 'selected' : ''}>Lin</option>
              <option value="log" ${scaleType === 'log' ? 'selected' : ''}>Log</option>
              <option value="exp" ${scaleType === 'exp' ? 'selected' : ''}>Exp</option>
            </select>
          </td>
          <td><input type="number" step="0.01" value="${m.scale}" data-map="${src}:${i}:scale"/></td>
          <td><input type="number" step="0.01" value="${m.offset}" data-map="${src}:${i}:offset"/></td>
          <td><input type="checkbox" ${m.invert ? 'checked' : ''} data-map="${src}:${i}:invert"/></td>
          <td><input type="number" step="0.01" value="${m.dead || 0}" data-map="${src}:${i}:dead"/></td>
          <td><button data-del="${src}:${i}">🗑</button></td>
        `;
        body.appendChild(tr);
      });
    });

    // Wire up editors
    body.querySelectorAll('[data-map]').forEach(el => {
      const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventType, (e) => {
        const [src, idx, key] = e.target.getAttribute('data-map').split(':');
        const i = (+idx) | 0;
        let val;
        if (key === 'invert') {
          val = e.target.checked;
        } else if (key === 'scaleType') {
          val = e.target.value;
        } else {
          val = parseFloat(e.target.value);
        }
        Mapper.updateMapping(src, i, key, val);
      });
    });

    // Wire up delete buttons
    body.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [src, idx] = btn.getAttribute('data-del').split(':');
        const i = (+idx) | 0;
        Mapper.removeMapping(src, i);
        Mapper.renderMappingTable();
      });
    });
  };

  Mapper.renderActionsTable = function() {
    const body = U.$('#action-body');
    if (!body) return;

    body.innerHTML = '';

    Object.keys(Mapper.actions).forEach(src => {
      Mapper.actions[src].forEach((action, i) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
          <td>${src}</td>
          <td>
            <select class="small-select" data-action="${src}:${i}:type">
              <option value="panel-toggle" ${action.type === 'panel-toggle' ? 'selected' : ''}>Panel</option>
              <option value="param-inc" ${action.type === 'param-inc' ? 'selected' : ''}>Inc</option>
              <option value="param-dec" ${action.type === 'param-dec' ? 'selected' : ''}>Dec</option>
              <option value="param-set" ${action.type === 'param-set' ? 'selected' : ''}>Set</option>
              <option value="tap-tempo" ${action.type === 'tap-tempo' ? 'selected' : ''}>Tap</option>
              <option value="bus-emit" ${action.type === 'bus-emit' ? 'selected' : ''}>Event</option>
            </select>
          </td>
          <td><input type="text" value="${action.target || ''}" placeholder="panel-control1" data-action="${src}:${i}:target" style="width:100%;font-size:11px;"/></td>
          <td><input type="text" value="${action.param || ''}" placeholder="L_freq" data-action="${src}:${i}:param" style="width:100%;font-size:11px;"/></td>
          <td><input type="number" step="0.01" value="${action.step || 0.1}" data-action="${src}:${i}:step" style="width:60px;font-size:11px;"/></td>
          <td><button data-del-action="${src}:${i}">🗑</button></td>
        `;
        body.appendChild(tr);
      });
    });

    // Wire up action editors
    body.querySelectorAll('[data-action]').forEach(el => {
      const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventType, (e) => {
        const [src, idx, key] = e.target.getAttribute('data-action').split(':');
        const i = (+idx) | 0;
        const val = e.target.value;
        Mapper.updateAction(src, i, key, val);
      });
    });

    // Wire up delete buttons
    body.querySelectorAll('[data-del-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [src, idx] = btn.getAttribute('data-del-action').split(':');
        const i = (+idx) | 0;
        Mapper.removeAction(src, i);
        Mapper.renderActionsTable();
      });
    });
  };

  Mapper.loadDefaults = function() {
    // Create example axis mappings
    const defaultMaps = {
      'g0.axis0': [
        { param: 'L_freq', scale: 1, offset: 0, invert: false, dead: 0.08, scaleType: 'log' },
        { param: 'mix', scale: 1, offset: 0, invert: false, dead: 0.08, scaleType: 'linear' }
      ],
      'g0.axis1': [
        { param: 'R_freq', scale: 1, offset: 0, invert: false, dead: 0.08, scaleType: 'log' },
        { param: 'feedback', scale: 1, offset: 0, invert: false, dead: 0.08, scaleType: 'linear' }
      ]
    };

    // Create default button actions
    const defaultActions = {
      'g0.btn3': [{ type: 'panel-toggle', target: 'panel-control1' }],  // Y button
      'g0.btn1': [{ type: 'panel-toggle', target: 'panel-control2' }],  // B button
      'g0.btn0': [{ type: 'panel-toggle', target: 'panel-control3' }],  // A button
      'g0.btn2': [{ type: 'tap-tempo' }]  // X button
    };

    Mapper.maps = defaultMaps;
    Mapper.actions = defaultActions;
    save();
    Mapper.renderMappingTable();
    Mapper.renderActionsTable();
    NS.Bus.emit('mapper:changed', Mapper.maps);
    NS.Bus.emit('mapper:actions-changed', Mapper.actions);
    console.log('Loaded default mappings and actions');
  };

  /* ---------- UI Event Capture ---------- */
  Mapper.captureUIEvents = function() {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const source = `ui.key.${e.key}`;
      NS.Bus.emit('ui:key', { source, key: e.key, code: e.code });

      // Apply actions for this key
      applyActions(source);
    });

    // Mouse clicks on specific elements
    document.addEventListener('click', (e) => {
      const target = e.target;

      // Check for data-map-source attribute
      const mapSource = target.getAttribute('data-map-source');
      if (mapSource) {
        const source = `ui.click.${mapSource}`;
        NS.Bus.emit('ui:click', { source, target: mapSource });
        applyActions(source);
      }
    });

    // Note: MIDI handling is now done by midi.js module
    // The mapper subscribes to MIDI events via the Bus system
  };

  Mapper.addUIMapping = function(eventType, target, param, options) {
    const source = `ui.${eventType}.${target}`;
    Mapper.addMapping(source, param, options?.scale, options?.offset, options?.invert, options?.dead, options?.scaleType);
  };

  Mapper.addUIAction = function(eventType, target, actionType, options) {
    const source = `ui.${eventType}.${target}`;
    Mapper.addAction(source, actionType, options);
  };

  /* ---------- Initialization ---------- */
  Mapper.init = function() {
    // Subscribe to input events
    NS.Bus.on('gamepad:axis', onGamepadAxis);
    NS.Bus.on('gamepad:button', onGamepadButton);
    NS.Bus.on('midi:cc', onMIDICC);
    NS.Bus.on('midi:note', onMIDINote);
    NS.Bus.on('midi:pitchbend', onMIDIPitchBend);

    // Capture UI events
    Mapper.captureUIEvents();

    // UI setup
    Mapper.renderMappingTable();
    Mapper.renderActionsTable();

    // Clear button
    const clearBtn = U.$('#map-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all mappings and actions?')) {
          Mapper.clearAll();
        }
      });
    }

    // Load defaults button
    const defaultsBtn = U.$('#map-defaults');
    if (defaultsBtn) {
      defaultsBtn.addEventListener('click', () => {
        if (confirm('Load default mappings? This will replace your current mappings and actions.')) {
          Mapper.loadDefaults();
        }
      });
    }

    // Export params button
    const exportBtn = U.$('#map-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = U.copyParamsJSON();
        const textarea = U.$('#params-json');
        if (textarea) {
          textarea.value = json;
        }
      });
    }

    // Listen for mapping changes
    NS.Bus.on('mapper:changed', () => {
      Mapper.renderMappingTable();
      updateLiveInputDisplay(); // Update display when mappings change
    });

    NS.Bus.on('mapper:actions-changed', () => {
      Mapper.renderActionsTable();
      updateLiveInputDisplay(); // Update display when actions change
    });

    // Initial display update
    updateLiveInputDisplay();

    // Auto-load defaults if no mappings or actions exist
    const hasNoMaps = Object.keys(Mapper.maps).length === 0;
    const hasNoActions = Object.keys(Mapper.actions).length === 0;
    if (hasNoMaps && hasNoActions) {
      console.log('No mappings or actions found, loading defaults...');
      Mapper.loadDefaults();
    }
  };

  NS.Mapper = Mapper;

})(window);
