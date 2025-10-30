const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playFormant(vowel) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Default frequency: simulate base pitch
  osc.frequency.value = 120;

  // Simulate formant frequency boost via bandpass
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';

  switch (vowel) {
    case 'a': filter.frequency.value = 800; break;
    case 'e': filter.frequency.value = 400; break;
    case 'i': filter.frequency.value = 300; break;
    case 'o': filter.frequency.value = 600; break;
    case 'u': filter.frequency.value = 350; break;
    default: filter.frequency.value = 500; break;
  }

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  osc.type = 'sawtooth';
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function playNoise(type) {
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";

  switch (type) {
    case 's': filter.frequency.value = 5000; break;
    case 'sh': filter.frequency.value = 3000; break;
    case 'f': filter.frequency.value = 2500; break;
    case 'h': filter.frequency.value = 1500; break;
    default: filter.frequency.value = 2000; break;
  }

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
  noise.stop(audioCtx.currentTime + 0.3);
}

function playClick() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.value = 50;
  gain.gain.setValueAtTime(1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}
