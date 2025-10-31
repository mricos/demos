const ctx = new AudioContext();
let sourceOsc, noiseSource, masterGain, filterNodes = [];
let isVoiced = true;
let isRunning = false;
let filterStates = Array(10).fill(false);
let plosiveTimeouts = {};

const FREQUENCIES = [200, 350, 500, 700, 900, 1100, 1300, 1600, 2000, 2600];

function createNoise() {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function initAudio() {
  if (isRunning) return;

  // Create oscillator for voiced sounds
  sourceOsc = ctx.createOscillator();
  sourceOsc.type = 'sawtooth';
  sourceOsc.frequency.value = document.getElementById('pitch').value;

  // Create noise for unvoiced sounds
  noiseSource = createNoise();

  // Create master gain
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(ctx.destination);

  // Create filter bank
  FREQUENCIES.forEach((freq, i) => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 10;

    const filterGain = ctx.createGain();
    filterGain.gain.value = 0;

    // Connect both sources to each filter
    sourceOsc.connect(filter);
    noiseSource.connect(filter);
    filter.connect(filterGain);
    filterGain.connect(masterGain);

    filterNodes.push({ filter, gain: filterGain });
  });

  sourceOsc.start();
  noiseSource.start();
  isRunning = true;

  updateSource();
}

function updateSource() {
  if (!isRunning) return;

  // Adjust gain based on voiced/unvoiced
  filterNodes.forEach(({ gain }, i) => {
    const shouldBeActive = filterStates[i];
    gain.gain.value = shouldBeActive ? 1 : 0;
  });
}

function toggleVoiced() {
  isVoiced = !isVoiced;
  const status = document.getElementById('status');
  status.textContent = isVoiced ? 'Voiced' : 'Unvoiced';
  status.classList.toggle('unvoiced', !isVoiced);

  // Adjust oscillator frequency for voiced/unvoiced
  if (sourceOsc) {
    if (isVoiced) {
      sourceOsc.frequency.value = document.getElementById('pitch').value;
    } else {
      // Lower frequency for unvoiced sounds
      sourceOsc.frequency.value = 0;
    }
  }
}

function triggerPlosive(index) {
  // Plosives create brief bursts
  const burstDuration = 0.05; // 50ms

  // Clear any existing timeout for this plosive
  if (plosiveTimeouts[index]) {
    clearTimeout(plosiveTimeouts[index]);
  }

  // Activate multiple filters briefly for plosive effect
  const now = ctx.currentTime;
  const plosiveFilters = [index * 3, index * 3 + 1, index * 3 + 2].filter(i => i < filterNodes.length);

  plosiveFilters.forEach(i => {
    if (filterNodes[i]) {
      filterNodes[i].gain.gain.cancelScheduledValues(now);
      filterNodes[i].gain.gain.setValueAtTime(0, now);
      filterNodes[i].gain.gain.linearRampToValueAtTime(1, now + 0.005);
      filterNodes[i].gain.gain.linearRampToValueAtTime(0, now + burstDuration);
    }
  });

  // Visual feedback
  document.querySelectorAll('.plosive').forEach((el, i) => {
    if (i === index) {
      el.classList.add('active');
      plosiveTimeouts[index] = setTimeout(() => {
        el.classList.remove('active');
      }, burstDuration * 1000);
    }
  });
}

function setupKeyboard() {
  // Handle keyboard input
  document.addEventListener('keydown', (e) => {
    // Skip voder keyboard handling when user is typing in text input
    if (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toLowerCase();

    // Spacebar toggles voiced/unvoiced
    if (key === ' ') {
      e.preventDefault();
      if (!isRunning) {
        initAudio();
      }
      toggleVoiced();
      const spaceEl = document.querySelector('.spacebar');
      if (spaceEl) spaceEl.classList.add('active');
      return;
    }

    // Plosives: C, V, Y
    if (key === 'c') {
      e.preventDefault();
      if (!isRunning) initAudio();
      triggerPlosive(0);
      return;
    }
    if (key === 'v') {
      e.preventDefault();
      if (!isRunning) initAudio();
      triggerPlosive(1);
      return;
    }
    if (key === 'b') {
      e.preventDefault();
      if (!isRunning) initAudio();
      triggerPlosive(2);
      return;
    }

    // Filter keys
    const filterKeys = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', 'g', 'h'];
    const filterIndex = filterKeys.indexOf(key);

    if (filterIndex !== -1) {
      e.preventDefault();
      if (!isRunning) initAudio();

      filterStates[filterIndex] = true;
      updateSource();

      // Visual feedback
      const keyEl = document.querySelector(`.filter[data-filter="${filterIndex}"]`);
      if (keyEl) keyEl.classList.add('active');
    }
  });

  document.addEventListener('keyup', (e) => {
    // Skip voder keyboard handling when user is typing in text input
    if (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toLowerCase();

    // Spacebar
    if (key === ' ') {
      const spaceEl = document.querySelector('.spacebar');
      if (spaceEl) spaceEl.classList.remove('active');
      return;
    }

    // Filter keys (in keyup handler)
    const filterKeys = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', 'g', 'h'];
    const filterIndex = filterKeys.indexOf(key);

    if (filterIndex !== -1) {
      filterStates[filterIndex] = false;
      updateSource();

      // Visual feedback
      const keyEl = document.querySelector(`.filter[data-filter="${filterIndex}"]`);
      if (keyEl) keyEl.classList.remove('active');
    }
  });

  // Pitch control
  document.getElementById('pitch').addEventListener('input', (e) => {
    if (sourceOsc && isVoiced) {
      sourceOsc.frequency.value = e.target.value;
    }
  });

  // Start button
  document.getElementById('start').addEventListener('click', () => {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (!isRunning) {
      initAudio();
    }
  });

  // Click handlers for visual keyboard
  document.querySelectorAll('.filter').forEach(keyEl => {
    const filterIndex = parseInt(keyEl.getAttribute('data-filter'));

    keyEl.addEventListener('mousedown', () => {
      if (!isRunning) initAudio();
      filterStates[filterIndex] = true;
      updateSource();
      keyEl.classList.add('active');
    });

    keyEl.addEventListener('mouseup', () => {
      filterStates[filterIndex] = false;
      updateSource();
      keyEl.classList.remove('active');
    });

    keyEl.addEventListener('mouseleave', () => {
      filterStates[filterIndex] = false;
      updateSource();
      keyEl.classList.remove('active');
    });
  });

  // Plosive click handlers
  document.querySelectorAll('.plosive').forEach((keyEl, index) => {
    keyEl.addEventListener('click', () => {
      if (!isRunning) initAudio();
      triggerPlosive(index);
    });
  });

  // Spacebar click handler
  const spacebarEl = document.querySelector('.spacebar');
  if (spacebarEl) {
    spacebarEl.addEventListener('click', () => {
      if (!isRunning) initAudio();
      toggleVoiced();
      spacebarEl.classList.add('active');
      setTimeout(() => spacebarEl.classList.remove('active'), 100);
    });
  }
}

setupKeyboard();
