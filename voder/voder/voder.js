const ctx = new AudioContext();
let sourceOsc, noise, gain, filters = [];
let isVoiced = true;
let filterStates = Array(10).fill(false);

function createSource() {
  sourceOsc = ctx.createOscillator();
  sourceOsc.type = 'sawtooth';
  sourceOsc.frequency.value = document.getElementById('pitch').value;

  noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;
  noise.loop = true;

  gain = ctx.createGain();
  gain.gain.value = 0.5;
}

function connectFilters(input) {
  const filterBank = [];
  const output = ctx.createGain();
  const freqs = [200, 350, 500, 700, 900, 1100, 1300, 1600, 2000, 2600];
  freqs.forEach((f, i) => {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = f;
    band.Q.value = 10;
    input.connect(band);
    band.connect(output);
    filterBank.push(band);
  });
  filters = filterBank;
  output.connect(ctx.destination);
}

function updateFilterStates() {
  filters.forEach((f, i) => {
    f.gain.value = filterStates[i] ? 1 : 0;
  });
}

function setupUI() {
  const filtersDiv = document.getElementById('filters');
  for (let i = 0; i < 10; i++) {
    const b = document.createElement('button');
    b.innerText = `F${i+1}`;
    b.onclick = () => {
      filterStates[i] = !filterStates[i];
      b.classList.toggle('active', filterStates[i]);
      updateFilterStates();
    };
    filtersDiv.appendChild(b);
  }

  document.getElementById('toggleSource').onclick = () => {
    isVoiced = !isVoiced;
    document.getElementById('toggleSource').innerText = isVoiced ? 'Voiced' : 'Unvoiced';
    startAudio();
  };

  document.getElementById('pitch').oninput = (e) => {
    if (sourceOsc) sourceOsc.frequency.value = e.target.value;
  };

  document.getElementById('start').onclick = () => {
    startAudio();
  };
}

function startAudio() {
  if (ctx.state !== 'running') ctx.resume();
  createSource();
  const input = isVoiced ? sourceOsc : noise;
  connectFilters(input);
  input.connect(gain);
  gain.connect(ctx.destination);
  if (isVoiced) sourceOsc.start();
  else noise.start();
  updateFilterStates();
}

setupUI();
