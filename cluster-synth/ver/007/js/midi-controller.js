/**
 * CLUSTER • MIDI Controller Templates
 * Hardware controller mapping and template system
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const MIDIController = {
    profiles: {}, // Loaded profiles from localStorage
    activeProfile: null,
    learningElement: null, // Which UI element is in learn mode
    learningTimeout: null
  };

  /* ---------- Standard 8-Track Template ---------- */
  const TEMPLATE_8TRACK = {
    name: '8-Track Standard',
    description: '8 channels, each with 1 fader, 1 knob, 4 buttons. Plus transport controls.',
    layout: {
      tracks: Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        fader: { type: 'fader', cc: null, label: `Fader ${i + 1}` },
        knob: { type: 'knob', cc: null, label: `Knob ${i + 1}` },
        buttons: [
          { type: 'button', cc: null, label: `S${i + 1}` },    // Solo
          { type: 'button', cc: null, label: `M${i + 1}` },    // Mute
          { type: 'button', cc: null, label: `R${i + 1}` },    // Record
          { type: 'button', cc: null, label: `A${i + 1}` }     // Arm
        ]
      })),
      transport: {
        rewind: { type: 'button', cc: null, label: '⏮' },
        forward: { type: 'button', cc: null, label: '⏭' },
        stop: { type: 'button', cc: null, label: '⏹' },
        play: { type: 'button', cc: null, label: '▶' },
        record: { type: 'button', cc: null, label: '⏺' },
        loop: { type: 'button', cc: null, label: '🔁' }
      },
      global: {
        masterFader: { type: 'fader', cc: null, label: 'Master' },
        masterKnob: { type: 'knob', cc: null, label: 'Master' }
      }
    }
  };

  /* ---------- Controller Profile ---------- */
  function createProfile(name, deviceName, template) {
    return {
      id: Date.now().toString(),
      name: name,
      deviceName: deviceName, // MIDI device name
      template: JSON.parse(JSON.stringify(template)), // Deep clone
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
  }

  /* ---------- Save/Load Profiles ---------- */
  function saveProfiles() {
    localStorage.setItem('cluster.midi-profiles.v1', JSON.stringify(MIDIController.profiles));
  }

  function loadProfiles() {
    const stored = localStorage.getItem('cluster.midi-profiles.v1');
    if (stored) {
      MIDIController.profiles = JSON.parse(stored);
    }
  }

  function saveProfile(profile) {
    profile.modified = new Date().toISOString();
    MIDIController.profiles[profile.id] = profile;
    saveProfiles();
  }

  function deleteProfile(profileId) {
    delete MIDIController.profiles[profileId];
    saveProfiles();
  }

  /* ---------- CC Learning ---------- */
  function startLearning(element) {
    // Clear any existing learning state
    if (MIDIController.learningElement) {
      MIDIController.learningElement.classList.remove('midi-learning');
    }
    clearTimeout(MIDIController.learningTimeout);

    // Set new learning element
    MIDIController.learningElement = element;
    element.classList.add('midi-learning');

    // Show visual feedback
    element.setAttribute('data-learning', 'Waiting for MIDI...');

    // Timeout after 10 seconds
    MIDIController.learningTimeout = setTimeout(() => {
      cancelLearning();
    }, 10000);

    console.log('Learning mode: Move a control on your MIDI controller');
  }

  function cancelLearning() {
    if (MIDIController.learningElement) {
      MIDIController.learningElement.classList.remove('midi-learning');
      MIDIController.learningElement.removeAttribute('data-learning');
      MIDIController.learningElement = null;
    }
    clearTimeout(MIDIController.learningTimeout);
  }

  function assignCC(source, element) {
    if (!MIDIController.learningElement || MIDIController.learningElement !== element) {
      return;
    }

    // Parse CC from source (e.g., "midi.ch0.cc7")
    const match = source.match(/ch(\d+)\.cc(\d+)/);
    if (!match) return;

    const channel = parseInt(match[1]);
    const cc = parseInt(match[2]);

    // Update the element's data
    element.setAttribute('data-cc', source);
    element.setAttribute('data-cc-num', cc);
    element.setAttribute('data-ch', channel);

    // Update the active profile
    if (MIDIController.activeProfile) {
      updateProfileMapping(element, source, cc, channel);
    }

    // Visual feedback
    element.classList.add('midi-assigned');
    element.textContent = `CC${cc}`;

    // Cancel learning
    cancelLearning();

    console.log(`Assigned ${source} to element`, element);
  }

  function updateProfileMapping(element, source, cc, channel) {
    const profile = MIDIController.activeProfile;
    if (!profile) return;

    // Find which control this is
    const trackId = element.getAttribute('data-track');
    const controlType = element.getAttribute('data-control-type');
    const controlIndex = element.getAttribute('data-control-index');

    if (trackId) {
      const track = profile.template.layout.tracks[parseInt(trackId) - 1];
      if (!track) return;

      if (controlType === 'fader') {
        track.fader.cc = source;
      } else if (controlType === 'knob') {
        track.knob.cc = source;
      } else if (controlType === 'button' && controlIndex) {
        track.buttons[parseInt(controlIndex)].cc = source;
      }
    } else if (controlType === 'transport') {
      const transportKey = element.getAttribute('data-transport-key');
      if (transportKey && profile.template.layout.transport[transportKey]) {
        profile.template.layout.transport[transportKey].cc = source;
      }
    } else if (controlType === 'global') {
      const globalKey = element.getAttribute('data-global-key');
      if (globalKey && profile.template.layout.global[globalKey]) {
        profile.template.layout.global[globalKey].cc = source;
      }
    }

    saveProfile(profile);
  }

  /* ---------- Render Template UI ---------- */
  function renderTemplate(profile) {
    const container = U.$('#midi-template-container');
    if (!container) return;

    const template = profile.template;

    let html = `
      <div class="midi-template-header">
        <div>
          <h3 style="color:#8bd5ca;margin:0 0 4px">${profile.name}</h3>
          <div style="font-size:10px;color:#6b7089">${profile.deviceName || 'No device'}</div>
        </div>
        <button class="btn-ghost small" id="midi-template-save">Save Profile</button>
      </div>

      <div class="midi-template-instructions" style="background:#1a2540;border:1px solid #2a3a60;border-radius:6px;padding:8px;margin:8px 0;font-size:11px;color:#9fb2e0">
        <b>Learn Mode:</b> Click any control below, then move the corresponding control on your hardware controller
      </div>

      <div class="midi-template-grid">
    `;

    // Render tracks
    template.layout.tracks.forEach(track => {
      html += `
        <div class="midi-track">
          <div class="midi-track-header">Track ${track.id}</div>
          <div class="midi-control-slot ${track.fader.cc ? 'midi-assigned' : ''}"
               data-track="${track.id}"
               data-control-type="fader"
               data-cc="${track.fader.cc || ''}"
               title="${track.fader.label}">
            ${track.fader.cc ? 'CC' + track.fader.cc.match(/cc(\d+)/)?.[1] : '○ Fader'}
          </div>
          <div class="midi-control-slot ${track.knob.cc ? 'midi-assigned' : ''}"
               data-track="${track.id}"
               data-control-type="knob"
               data-cc="${track.knob.cc || ''}"
               title="${track.knob.label}">
            ${track.knob.cc ? 'CC' + track.knob.cc.match(/cc(\d+)/)?.[1] : '○ Knob'}
          </div>
          <div class="midi-button-group">
            ${track.buttons.map((btn, i) => `
              <div class="midi-control-slot midi-button ${btn.cc ? 'midi-assigned' : ''}"
                   data-track="${track.id}"
                   data-control-type="button"
                   data-control-index="${i}"
                   data-cc="${btn.cc || ''}"
                   title="${btn.label}">
                ${btn.cc ? 'CC' + btn.cc.match(/cc(\d+)/)?.[1] : btn.label}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`; // Close grid

    // Transport controls
    html += `
      <div class="midi-transport-section">
        <h4 style="color:#8bd5ca;margin:16px 0 8px">Transport Controls</h4>
        <div class="midi-transport-grid">
          ${Object.entries(template.layout.transport).map(([key, ctrl]) => `
            <div class="midi-control-slot midi-button ${ctrl.cc ? 'midi-assigned' : ''}"
                 data-control-type="transport"
                 data-transport-key="${key}"
                 data-cc="${ctrl.cc || ''}"
                 title="${ctrl.label}">
              ${ctrl.cc ? 'CC' + ctrl.cc.match(/cc(\d+)/)?.[1] : ctrl.label}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Global controls
    html += `
      <div class="midi-global-section">
        <h4 style="color:#8bd5ca;margin:16px 0 8px">Global Controls</h4>
        <div class="midi-global-grid">
          ${Object.entries(template.layout.global).map(([key, ctrl]) => `
            <div class="midi-control-slot ${ctrl.cc ? 'midi-assigned' : ''}"
                 data-control-type="global"
                 data-global-key="${key}"
                 data-cc="${ctrl.cc || ''}"
                 title="${ctrl.label}">
              ${ctrl.cc ? 'CC' + ctrl.cc.match(/cc(\d+)/)?.[1] : '○ ' + ctrl.label}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach click handlers for learning
    container.querySelectorAll('.midi-control-slot').forEach(el => {
      el.addEventListener('click', () => {
        startLearning(el);
      });
    });

    // Save button
    const saveBtn = U.$('#midi-template-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveProfile(profile);
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = '#1a4d1a';
        setTimeout(() => {
          saveBtn.textContent = 'Save Profile';
          saveBtn.style.background = '';
        }, 1000);
      });
    }
  }

  /* ---------- Profile Manager UI ---------- */
  function renderProfileList() {
    const container = U.$('#midi-profile-list');
    if (!container) return;

    const profiles = Object.values(MIDIController.profiles);

    if (profiles.length === 0) {
      container.innerHTML = '<div class="kbd" style="padding:12px;text-align:center">No profiles yet. Create one below.</div>';
      return;
    }

    const html = profiles.map(profile => {
      const isActive = MIDIController.activeProfile?.id === profile.id;
      return `
        <div class="midi-profile-item ${isActive ? 'active' : ''}" data-profile-id="${profile.id}">
          <div style="flex:1">
            <div style="font-weight:bold;color:#cbd3ea">${profile.name}</div>
            <div style="font-size:10px;color:#6b7089">${profile.deviceName || 'No device'}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn-ghost small midi-profile-load" data-profile-id="${profile.id}">
              ${isActive ? 'Active' : 'Load'}
            </button>
            <button class="btn-ghost small midi-profile-delete" data-profile-id="${profile.id}">×</button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // Load buttons
    container.querySelectorAll('.midi-profile-load').forEach(btn => {
      btn.addEventListener('click', () => {
        const profileId = btn.getAttribute('data-profile-id');
        loadProfile(profileId);
      });
    });

    // Delete buttons
    container.querySelectorAll('.midi-profile-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const profileId = btn.getAttribute('data-profile-id');
        if (confirm('Delete this profile?')) {
          deleteProfile(profileId);
          renderProfileList();
        }
      });
    });
  }

  function loadProfile(profileId) {
    const profile = MIDIController.profiles[profileId];
    if (!profile) return;

    MIDIController.activeProfile = profile;
    renderTemplate(profile);
    renderProfileList();
    console.log('Loaded profile:', profile.name);
  }

  /* ---------- Auto-Detect Controller ---------- */
  function detectControllerType(deviceName) {
    const name = deviceName.toLowerCase();

    // Known 8-track controllers
    if (name.includes('vmx8') || name.includes('vmx-8')) {
      return { type: '8track', name: 'VMX8', template: TEMPLATE_8TRACK };
    }
    if (name.includes('korg') && name.includes('nano')) {
      return { type: '8track', name: 'Korg nanoKONTROL', template: TEMPLATE_8TRACK };
    }
    if (name.includes('akai') && name.includes('midimix')) {
      return { type: '8track', name: 'AKAI MIDImix', template: TEMPLATE_8TRACK };
    }
    if (name.includes('behringer') && name.includes('x-touch')) {
      return { type: '8track', name: 'Behringer X-Touch', template: TEMPLATE_8TRACK };
    }

    // Default: assume 8-track
    return { type: '8track', name: deviceName, template: TEMPLATE_8TRACK };
  }

  /* ---------- Initialization ---------- */
  function init() {
    loadProfiles();

    // Listen for MIDI CC events for learning
    NS.Bus.on('midi:cc', (data) => {
      if (MIDIController.learningElement) {
        assignCC(data.source, MIDIController.learningElement);
      }
    });

    // Listen for new MIDI devices
    NS.Bus.on('midi:ready', () => {
      // Check if we need to suggest a profile
      const devices = NS.MIDI?.inputs || [];
      devices.forEach(device => {
        const existing = Object.values(MIDIController.profiles).find(p => p.deviceName === device.name);
        if (!existing) {
          suggestProfile(device.name);
        }
      });
    });

    // Attach UI
    attachUI();
  }

  function suggestProfile(deviceName) {
    const detection = detectControllerType(deviceName);
    console.log(`Detected ${detection.name} - suggesting 8-track template`);

    // Show suggestion in UI
    const suggestion = U.$('#midi-profile-suggestion');
    if (suggestion) {
      suggestion.innerHTML = `
        <div style="background:#1a3a1a;border:1px solid #2a4a2a;border-radius:6px;padding:12px;margin:8px 0">
          <div style="color:#8bd5ca;font-weight:bold;margin-bottom:4px">✨ New Controller Detected!</div>
          <div style="font-size:11px;color:#9fb2e0;margin-bottom:8px">
            Found: <b>${deviceName}</b><br>
            Suggested template: <b>${detection.name}</b>
          </div>
          <button class="btn-ghost small" id="midi-create-profile-suggested">Create Profile</button>
        </div>
      `;

      const createBtn = U.$('#midi-create-profile-suggested');
      if (createBtn) {
        createBtn.addEventListener('click', () => {
          const profile = createProfile(detection.name, deviceName, detection.template);
          saveProfile(profile);
          loadProfile(profile.id);
          renderProfileList();
          suggestion.innerHTML = '';
        });
      }
    }
  }

  function attachUI() {
    // Create new profile button
    const createBtn = U.$('#midi-create-profile');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const name = prompt('Profile name:', '8-Track Controller');
        if (!name) return;

        const deviceName = prompt('MIDI device name (optional):', '');
        const profile = createProfile(name, deviceName, TEMPLATE_8TRACK);
        saveProfile(profile);
        loadProfile(profile.id);
        renderProfileList();
      });
    }

    // Initial render
    renderProfileList();

    // If no active profile and we have profiles, load the first one
    if (!MIDIController.activeProfile && Object.keys(MIDIController.profiles).length > 0) {
      const firstProfile = Object.values(MIDIController.profiles)[0];
      loadProfile(firstProfile.id);
    }
  }

  /* ---------- Public API ---------- */
  MIDIController.init = init;
  MIDIController.createProfile = createProfile;
  MIDIController.loadProfile = loadProfile;
  MIDIController.detectControllerType = detectControllerType;

  NS.MIDIController = MIDIController;

})(window);
