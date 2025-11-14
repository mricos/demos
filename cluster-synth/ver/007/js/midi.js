/**
 * CLUSTER • MIDI
 * Web MIDI API integration for controller input
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const MIDI = {
    access: null,
    inputs: [],
    outputs: [],
    activeInput: null,
    learnParam: null,
    messageHistory: [],
    maxHistory: 100,
    ccValues: {}, // Cache for CC values { 'midi.ch0.cc1': 0.5, ... }
    noteStates: {}, // Cache for note on/off states
    activeCCs: new Set(), // Track which CCs have been used
    ccLastUpdate: {} // Track last update time for each CC
  };

  /* ---------- MIDI Message Parsing ---------- */
  function parseMIDIMessage(data) {
    const status = data[0];
    const messageType = status & 0xF0;
    const channel = status & 0x0F;

    const message = {
      raw: data,
      channel: channel,
      timestamp: Date.now()
    };

    switch(messageType) {
      case 0x80: // Note Off
        message.type = 'noteoff';
        message.note = data[1];
        message.velocity = data[2];
        message.source = `midi.ch${channel}.note${data[1]}`;
        break;

      case 0x90: // Note On
        message.type = data[2] === 0 ? 'noteoff' : 'noteon';
        message.note = data[1];
        message.velocity = data[2];
        message.source = `midi.ch${channel}.note${data[1]}`;
        break;

      case 0xA0: // Polyphonic Aftertouch
        message.type = 'polytouch';
        message.note = data[1];
        message.pressure = data[2];
        message.source = `midi.ch${channel}.polytouch${data[1]}`;
        break;

      case 0xB0: // Control Change
        message.type = 'cc';
        message.controller = data[1];
        message.value = data[2];
        message.source = `midi.ch${channel}.cc${data[1]}`;
        break;

      case 0xC0: // Program Change
        message.type = 'program';
        message.program = data[1];
        message.source = `midi.ch${channel}.program`;
        break;

      case 0xD0: // Channel Aftertouch
        message.type = 'aftertouch';
        message.pressure = data[1];
        message.source = `midi.ch${channel}.aftertouch`;
        break;

      case 0xE0: // Pitch Bend
        message.type = 'pitchbend';
        message.value = ((data[2] << 7) | data[1]) - 8192;
        message.normalized = (message.value + 8192) / 16383; // 0-1
        message.source = `midi.ch${channel}.pitchbend`;
        break;

      default:
        message.type = 'unknown';
        message.source = `midi.ch${channel}.unknown`;
    }

    return message;
  }

  /* ---------- MIDI Message Handler ---------- */
  function handleMIDIMessage(event) {
    const message = parseMIDIMessage(event.data);

    // Add to history
    MIDI.messageHistory.push({
      ...message,
      inputName: event.target.name || 'Unknown'
    });
    if (MIDI.messageHistory.length > MIDI.maxHistory) {
      MIDI.messageHistory.shift();
    }

    // Update caches
    if (message.type === 'cc') {
      MIDI.ccValues[message.source] = message.value / 127; // Normalize to 0-1
      MIDI.activeCCs.add(message.source);
      MIDI.ccLastUpdate[message.source] = Date.now();

      // Debug: Log every 10th message to see value distribution
      if (!MIDI._debugCounter) MIDI._debugCounter = {};
      if (!MIDI._debugCounter[message.source]) MIDI._debugCounter[message.source] = 0;
      MIDI._debugCounter[message.source]++;
      if (MIDI._debugCounter[message.source] % 10 === 0) {
        console.log(`${message.source}: raw=${message.value}, normalized=${(message.value/127).toFixed(3)}`);
      }
    } else if (message.type === 'noteon') {
      MIDI.noteStates[message.source] = message.velocity / 127;
    } else if (message.type === 'noteoff') {
      MIDI.noteStates[message.source] = 0;
    }

    // Emit bus events for different message types
    switch(message.type) {
      case 'cc':
        NS.Bus.emit('midi:cc', {
          source: message.source,
          controller: message.controller,
          value: message.value / 127, // Normalized 0-1
          raw: message.value,
          channel: message.channel
        });

        // Learning mode
        if (MIDI.learnParam) {
          bindLearn(message.source, MIDI.learnParam);
          MIDI.learnParam = null;
        }
        break;

      case 'noteon':
      case 'noteoff':
        NS.Bus.emit('midi:note', {
          source: message.source,
          type: message.type,
          note: message.note,
          velocity: message.velocity / 127,
          raw: message.velocity,
          channel: message.channel
        });

        // Learning mode - treat note as button
        if (message.type === 'noteon' && MIDI.learnParam) {
          bindLearn(message.source, MIDI.learnParam);
          MIDI.learnParam = null;
        }
        break;

      case 'pitchbend':
        NS.Bus.emit('midi:pitchbend', {
          source: message.source,
          value: message.normalized,
          raw: message.value,
          channel: message.channel
        });

        // Learning mode
        if (MIDI.learnParam) {
          bindLearn(message.source, MIDI.learnParam);
          MIDI.learnParam = null;
        }
        break;
    }

    // Emit general message event for logging
    NS.Bus.emit('midi:message', message);

    // Update UI
    renderMessageLog();
    renderCCMeters();
  }

  /* ---------- Learning Mode ---------- */
  function bindLearn(source, param) {
    // Detect scale type from element attribute
    const el = document.querySelector(`[data-param="${param}"]`);
    const scaleType = el?.getAttribute('data-scale') || 'linear';

    // Use Mapper API to add mapping
    if (NS.Mapper) {
      NS.Mapper.addMapping(source, param, 1, 0, false, 0, scaleType);
    }

    // Render mapping table if available
    if (NS.Mapper && NS.Mapper.renderMappingTable) {
      NS.Mapper.renderMappingTable();
    }

    console.log(`MIDI Learn: ${source} → ${param} (${scaleType})`);
  }

  /* ---------- UI Updates ---------- */
  function renderDeviceList() {
    const listEl = U.$('#midi-device-list');
    if (!listEl) return;

    const html = MIDI.inputs.map((input, idx) => {
      const isActive = MIDI.activeInput === input.id;
      return `
        <div class="midi-device ${isActive ? 'active' : ''}" data-input-id="${input.id}">
          <div class="midi-device-name">${input.name || 'Unknown Device'}</div>
          <div class="midi-device-info">
            ${input.manufacturer || ''} • ${input.state}
          </div>
        </div>
      `;
    }).join('');

    listEl.innerHTML = html || '<div class="kbd">No MIDI devices connected</div>';

    // Add click handlers
    U.$all('.midi-device').forEach(el => {
      el.addEventListener('click', () => {
        const inputId = el.getAttribute('data-input-id');
        const input = MIDI.inputs.find(i => i.id === inputId);
        if (input) {
          MIDI.activeInput = input.id;
          renderDeviceList();
        }
      });
    });
  }

  function renderMessageLog() {
    const logEl = U.$('#midi-log-body');
    if (!logEl) return;

    // Take last 20 messages
    const recent = MIDI.messageHistory.slice(-20).reverse();

    logEl.innerHTML = recent.map(msg => {
      let detail = '';
      switch(msg.type) {
        case 'cc':
          detail = `CC${msg.controller}: ${msg.value}`;
          break;
        case 'noteon':
          detail = `Note ${msg.note} ON (vel ${msg.velocity})`;
          break;
        case 'noteoff':
          detail = `Note ${msg.note} OFF`;
          break;
        case 'pitchbend':
          detail = `Pitch ${msg.value > 0 ? '+' : ''}${msg.value}`;
          break;
        default:
          detail = msg.type;
      }

      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour12: false });

      return `
        <tr>
          <td>${time.split(':')[2]}</td>
          <td>Ch${msg.channel}</td>
          <td>${msg.type}</td>
          <td>${detail}</td>
        </tr>
      `;
    }).join('');
  }

  function renderCCMeters() {
    const container = U.$('#midi-cc-meters');
    if (!container) return;

    const now = Date.now();
    const activeCCArray = Array.from(MIDI.activeCCs)
      .filter(source => {
        // Keep CCs that have been active in last 10 seconds OR currently non-zero
        const lastUpdate = MIDI.ccLastUpdate[source] || 0;
        const value = MIDI.ccValues[source] || 0;
        return (now - lastUpdate < 10000) || value > 0.01;
      })
      .sort(); // Sort by source name

    if (activeCCArray.length === 0) {
      container.innerHTML = '<div class="kbd" style="grid-column:1/-1;text-align:center;color:#6b7089;padding:20px">Move a knob or fader to see CC meters appear...</div>';
      return;
    }

    const html = activeCCArray.map(source => {
      const value = MIDI.ccValues[source] || 0;
      const match = source.match(/ch(\d+)\.cc(\d+)/);
      const channel = match ? match[1] : '?';
      const cc = match ? match[2] : '?';
      const rawValue = Math.round(value * 127);

      // Check if mapped
      const mappings = NS.Mapper && NS.Mapper.maps ? NS.Mapper.maps[source] : null;
      const isMapped = mappings && mappings.length > 0;
      const mappedParams = isMapped ? mappings.map(m => m.param).join(', ') : 'unmapped';
      const meterColor = isMapped ? '#eb6f92' : '#5a5f75';

      // Activity indicator (fade based on time since last update)
      const timeSinceUpdate = now - (MIDI.ccLastUpdate[source] || 0);
      const activityOpacity = Math.max(0.3, 1 - (timeSinceUpdate / 2000));

      return `
        <div style="background:#0a0f1a;border:1px solid ${isMapped ? '#3a1e2a' : '#1e2a40'};border-radius:6px;padding:8px;opacity:${activityOpacity};transition:opacity 0.3s ease">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="color:${meterColor};font-weight:bold;font-size:11px">CC${cc}</div>
            <div style="color:#cbd3ea;font-weight:bold;font-size:13px">${rawValue}</div>
          </div>
          <div style="height:8px;background:#1a1f2b;border-radius:4px;overflow:hidden;margin-bottom:6px">
            <div style="height:100%;width:${value * 100}%;background:${meterColor};transition:width 0.05s ease"></div>
          </div>
          <div style="color:#6b7089;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${mappedParams}">→ ${mappedParams}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  function populateParameterList() {
    const select = U.$('#midi-param-select');
    if (!select) return;

    // Get all parameters
    const params = Array.from(document.querySelectorAll('[data-param]'));

    const options = params.map(el => {
      const param = el.getAttribute('data-param');
      const label = el.previousElementSibling?.textContent || param;
      return `<option value="${param}">${label.replace(/\s*\d+\.\d+\s*$/, '')} (${param})</option>`;
    }).join('');

    select.innerHTML = '<option value="">-- Select Parameter --</option>' + options;
  }

  function updateCCSelect() {
    const select = U.$('#midi-cc-select');
    if (!select) return;

    // Get active CCs sorted by CC number
    const activeCCArray = Array.from(MIDI.activeCCs).sort((a, b) => {
      const aMatch = a.match(/cc(\d+)/);
      const bMatch = b.match(/cc(\d+)/);
      const aCC = aMatch ? parseInt(aMatch[1]) : 999;
      const bCC = bMatch ? parseInt(bMatch[1]) : 999;
      return aCC - bCC;
    });

    const options = activeCCArray.map(source => {
      const match = source.match(/ch(\d+)\.cc(\d+)/);
      const channel = match ? match[1] : '?';
      const cc = match ? match[2] : '?';
      const value = MIDI.ccValues[source] || 0;
      const rawValue = Math.round(value * 127);

      // Check if mapped
      const mappings = NS.Mapper && NS.Mapper.maps ? NS.Mapper.maps[source] : null;
      const isMapped = mappings && mappings.length > 0;
      const status = isMapped ? '✓' : '○';

      return `<option value="${source}">${status} CC${cc} (Ch${channel}) - ${rawValue}</option>`;
    }).join('');

    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Select CC --</option>' + options;

    // Restore selection if still valid
    if (currentValue && activeCCArray.includes(currentValue)) {
      select.value = currentValue;
    }
  }

  /* ---------- Initialization ---------- */
  function init() {
    console.log('MIDI • Initializing...');

    // Check for Web MIDI API support
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser');
      const statusEl = U.$('#status-midi');
      if (statusEl) statusEl.textContent = 'midi: unsupported';
      return;
    }

    // Request MIDI access
    navigator.requestMIDIAccess({ sysex: false })
      .then(access => {
        console.log('MIDI • Access granted');
        MIDI.access = access;

        // Get initial inputs
        refreshInputs();

        // Listen for device connection/disconnection
        access.onstatechange = (event) => {
          console.log(`MIDI • Device ${event.port.state}: ${event.port.name}`);
          refreshInputs();
        };

        // Update status
        const statusEl = U.$('#status-midi');
        if (statusEl) {
          statusEl.textContent = `midi: ${MIDI.inputs.length} device${MIDI.inputs.length !== 1 ? 's' : ''}`;
        }

        NS.Bus.emit('midi:ready');
      })
      .catch(err => {
        console.error('MIDI • Access denied:', err);
        const statusEl = U.$('#status-midi');
        if (statusEl) statusEl.textContent = 'midi: denied';
      });

    // Attach UI handlers
    attachUI();
  }

  function refreshInputs() {
    if (!MIDI.access) return;

    // Get all inputs
    MIDI.inputs = Array.from(MIDI.access.inputs.values());

    // Attach message handlers to all inputs
    MIDI.inputs.forEach(input => {
      input.onmidimessage = handleMIDIMessage;
    });

    // Update UI
    renderDeviceList();

    // Update status
    const statusEl = U.$('#status-midi');
    if (statusEl) {
      statusEl.textContent = `midi: ${MIDI.inputs.length} device${MIDI.inputs.length !== 1 ? 's' : ''}`;
    }

    console.log(`MIDI • ${MIDI.inputs.length} input(s) available`);
  }

  function attachUI() {
    // Learn mode (already handled by gamepad.js for all [data-param] elements)
    // Just listen for right-click on parameters
    U.$all('[data-param]').forEach(inp => {
      inp.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        MIDI.learnParam = inp.getAttribute('data-param');
        NS.Bus.emit('log:learn', { param: MIDI.learnParam, type: 'midi' });
        console.log(`MIDI Learn mode: waiting for input to map to ${MIDI.learnParam}`);
      });
    });

    // Populate parameter list
    populateParameterList();

    // Assignment button
    const assignBtn = U.$('#midi-assign');
    if (assignBtn) {
      assignBtn.addEventListener('click', () => {
        const ccSelect = U.$('#midi-cc-select');
        const paramSelect = U.$('#midi-param-select');

        const source = ccSelect?.value;
        const param = paramSelect?.value;

        if (!source || !param) {
          alert('Please select both a CC controller and a parameter');
          return;
        }

        // Detect scale type from element attribute
        const el = document.querySelector(`[data-param="${param}"]`);
        const scaleType = el?.getAttribute('data-scale') || 'linear';

        // Create mapping using Mapper API
        if (NS.Mapper) {
          NS.Mapper.addMapping(source, param, 1, 0, false, 0, scaleType);
          NS.Bus.emit('mapper:changed', NS.Mapper.maps);

          // Re-render mapper table
          if (NS.Mapper.renderMappingTable) {
            NS.Mapper.renderMappingTable();
          }

          // Update meters to show new mapping
          renderCCMeters();

          console.log(`MIDI Assign: ${source} → ${param} (${scaleType})`);

          // Visual feedback
          assignBtn.textContent = 'Mapped!';
          assignBtn.style.background = '#1a4d1a';
          setTimeout(() => {
            assignBtn.textContent = 'Create Mapping';
            assignBtn.style.background = '';
          }, 1000);
        }
      });
    }

    // Clear log button
    const clearBtn = U.$('#midi-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        MIDI.messageHistory = [];
        renderMessageLog();
      });
    }

    // Refresh devices button
    const refreshBtn = U.$('#midi-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshInputs();
      });
    }

    // Update CC select when CCs change
    setInterval(() => {
      updateCCSelect();
    }, 500);

    // Update meters periodically (not on every frame to save CPU)
    setInterval(() => {
      renderCCMeters();
    }, 50); // 20 FPS for meters

    // View mode switching
    const viewMode = U.$('#midi-view-mode');
    if (viewMode) {
      viewMode.addEventListener('change', () => {
        const mode = viewMode.value;
        U.$all('.midi-view').forEach(v => v.style.display = 'none');
        const target = U.$(`#midi-view-${mode}`);
        if (target) target.style.display = 'block';
      });
    }
  }

  /* ---------- Public API ---------- */
  MIDI.init = init;
  MIDI.refreshInputs = refreshInputs;

  NS.MIDI = MIDI;

})(window);
