# Tines.js Audio Engine API Documentation

**tines.js** is a self-contained, multi-timbral audio engine with BPM awareness, integrated into the vecterm game engine. It features a Strudel-inspired abbreviated syntax for live coding music.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [CLI Interface](#cli-interface)
- [JavaScript API](#javascript-api)
- [Pattern Syntax](#pattern-syntax)
- [Instruments](#instruments)
- [Redux Integration](#redux-integration)

---

## Quick Start

### From CLI (Terminal)

```bash
# Check status
tines.status

# Play a drone
tines.drone C2

# Play a pattern
tines.drone "C2 ~ G2 ~"

# Set BPM
tines.bpm 140

# Set volume
tines.volume 0.7

# Stop all audio
tines.stop

# Get help
tines.help
```

### From JavaScript

```javascript
// Simple API
const { Tines } = window.PJA;

// Play a drone note
Tines.drone('C2');

// Play a pattern
Tines.drone('C2 ~ G2 ~');

// Set BPM
Tines.bpm(140);

// Stop all
Tines.stop();

// Get status
console.log(Tines.status());
```

---

## Architecture

### Components

```
audio/
├── tines-engine.js           # Core Web Audio engine
├── tines-clock.js            # Independent BPM timing system
├── tines-manager.js          # Redux-integrated manager
├── pattern-parser.js         # Strudel-like notation parser
└── instruments/
    ├── drone.js              # ✅ Drone synthesizer (IMPLEMENTED)
    ├── synth.js              # ⏳ Melodic synthesizer (TODO)
    ├── bells.js              # ⏳ Tonal bells (TODO)
    └── drums.js              # ⏳ Percussion (TODO)
```

### Design Principles

1. **Self-contained**: No external dependencies, pure Web Audio API
2. **Multi-timbral**: 4+ independent channels (drone, synth, bells, drums)
3. **BPM-aware**: Independent clock system with 16th-note resolution
4. **Redux-integrated**: All state flows through Redux for debugging
5. **Live coding**: Strudel-inspired syntax for compact pattern notation
6. **Vecterm-aligned**: Follows vecterm factory pattern and boot sequence

---

## CLI Interface

All CLI commands use the `tines.` namespace.

### Commands

#### `tines.status`
Show engine status including BPM, volume, active voices, and channel states.

```bash
tines.status
```

Output:
```
Tines Audio Engine Status:
  Initialized: true
  BPM: 120
  Playing: YES
  Master Volume: 0.70
  Active Voices: 3 / 16
  Active Patterns: 1
  Channels:
    drone: vol=1.00, voices=3
    synth: vol=1.00, voices=0
    bells: vol=1.00, voices=0
    drums: vol=1.00, voices=0
```

#### `tines.drone <pattern>`
Play a drone pattern.

```bash
# Single note
tines.drone C2

# Pattern with rests
tines.drone "C2 ~ G2 ~"

# Repeated notes
tines.drone "C2*4"

# Complex pattern
tines.drone "[C2 G2]*2 <A2 D2>/4"
```

#### `tines.stop [channel]`
Stop all audio or specific channel.

```bash
# Stop all
tines.stop

# Stop specific channel
tines.stop drone
```

#### `tines.bpm <bpm>`
Set BPM (20-300).

```bash
tines.bpm 140
```

#### `tines.volume <volume>`
Set master volume (0-1).

```bash
tines.volume 0.7
```

#### `tines.channel <channel> <volume>`
Set channel volume (0-1).

```bash
tines.channel drone 0.5
tines.channel synth 0.8
```

#### `tines.mute <channel>` / `tines.unmute <channel>`
Mute/unmute a channel.

```bash
tines.mute drone
tines.unmute drone
```

#### `tines.start` / `tines.pause` / `tines.resume`
Control the clock.

```bash
tines.start    # Start clock
tines.pause    # Pause clock
tines.resume   # Resume clock
```

#### `tines.help`
Show help and pattern syntax guide.

```bash
tines.help
```

---

## JavaScript API

### Global API (window.PJA.Tines)

The global API provides a simple interface for game integration.

#### Quick Play Methods

```javascript
const { Tines } = window.PJA;

// Play drone
const voice = Tines.drone('C2', {
  volume: 0.5,
  waveform: 'sawtooth',
  detune: 15
});

// Stop the voice
voice.stop();
```

#### Pattern Method

```javascript
// Play pattern on channel
const pattern = Tines.pattern('drone', 'C2 ~ G2 ~', {
  volume: 0.7
});

// Stop pattern
pattern.stop();
```

#### Control Methods

```javascript
Tines.stop();              // Stop all audio
Tines.stopChannel('drone'); // Stop channel
Tines.bpm(140);            // Set BPM
Tines.volume(0.7);         // Set master volume
Tines.status();            // Get status object
```

#### Clock Control

```javascript
Tines.start();   // Start clock
Tines.pause();   // Pause clock
Tines.resume();  // Resume clock
```

### Manager API (Advanced)

For advanced usage, access the manager directly:

```javascript
const manager = Tines.manager;

// Play pattern
const patternId = manager.playPattern('drone', 'C2 ~ G2 ~', {
  volume: 0.5
});

// Stop pattern
manager.stopPattern(patternId);

// Access engine directly
manager.engine.setMasterVolume(0.7);

// Access clock directly
manager.clock.setBPM(140);

// Get instrument
const drone = manager.getInstrument('drone');
```

---

## Pattern Syntax

Tines.js uses a Strudel-inspired abbreviated syntax for compact pattern notation.

### Basic Syntax

```javascript
// Space-separated notes
"C4 E4 G4"     // Play C4, E4, G4 in sequence

// Rests
"C4 ~ E4 ~"    // Play C4, rest, E4, rest

// Note notation
"C4"           // Middle C
"C#4" "Db4"    // C sharp / D flat
"A2"           // A two octaves below middle C
```

### Repetition

```javascript
// Repeat single note
"C4*3"         // C4 C4 C4

// Repeat group
"[C4 E4]*2"    // C4 E4 C4 E4
```

### Grouping

```javascript
// Square brackets group events
"[C4 E4 G4]"   // Chord or group

// Nested groups
"[[C4 E4]*2 G4]"
```

### Alternation

```javascript
// Angle brackets alternate between options
"<C4 E4>"      // Rotates: C4, E4, C4, E4...
"<C4 E4 G4>"   // Rotates: C4, E4, G4, C4...
```

### Duration/Subdivision

```javascript
// Forward slash sets duration in steps
"C4/2"         // C4 lasts 2 steps (sustain)
"C4/4"         // C4 lasts 4 steps

// Combined with rest
"C4/2 ~ ~"     // Equivalent to above
```

### Complex Patterns

```javascript
// Combine operators
"[C4 E4]*2 <G4 A4>/2"

// Nested structures
"<[C4*2 E4] [G4 A4*2]>"
```

### Examples

```javascript
// Ambient drone
"<C2 G2>/8"

// Rhythmic bass
"C2 ~ C2 ~ G2 ~ G2 ~"

// Melody
"[C4 E4 G4]*2 <C5 D5>/2"

// Complex
"[[C2 G2]*2 <A2 D2>]/4"
```

---

## Instruments

### Drone (Implemented)

Multi-oscillator drone synthesizer with detuning and LFO modulation.

#### Parameters

```javascript
{
  frequency: 110,           // Base frequency (Hz) or note name
  waveform: 'sawtooth',     // 'sine', 'square', 'sawtooth', 'triangle'
  detune: 10,               // Cents of detuning for richness
  voices: 3,                // Number of detuned oscillators
  filterFreq: 2000,         // Low-pass filter frequency (Hz)
  filterQ: 1,               // Filter resonance
  lfoRate: 0.2,             // LFO frequency (Hz)
  lfoDepth: 0.3,            // LFO modulation depth (0-1)
  volume: 0.5,              // Voice volume (0-1)
  attack: 2.0,              // Attack time (seconds)
  release: 2.0              // Release time (seconds)
}
```

#### CLI Usage

```bash
# Play with defaults
tines.drone C2

# Pattern
tines.drone "C2 ~ G2 ~"
```

#### JavaScript Usage

```javascript
// Simple
Tines.drone('C2');

// With parameters
Tines.drone('C2', {
  waveform: 'square',
  detune: 20,
  voices: 5,
  volume: 0.7
});

// Direct instrument access
const drone = manager.getInstrument('drone');
const voice = drone.play('A2', {
  filterFreq: 1000,
  lfoRate: 0.5
});

// Real-time parameter control
voice.setParam('filterFreq', 500);
voice.setParam('lfoDepth', 0.5);

// Glide to new frequency
voice.glide(220, 2.0); // Glide to 220Hz over 2 seconds
```

### Synth (TODO)

Polyphonic melodic synthesizer with filter envelope.

### Bells (TODO)

FM synthesis bells with metallic timbre.

### Drums (TODO)

Percussion: kick, snare, hi-hat, cymbal.

---

## Redux Integration

All audio state flows through Redux for debugging and time-travel.

### State Structure

```javascript
{
  audio: {
    initialized: false,
    bpm: 120,
    masterVolume: 0.7,
    playing: false,
    patterns: {
      'drone_1234567890': {
        id: 'drone_1234567890',
        channel: 'drone',
        pattern: 'C2 ~ G2 ~',
        params: {},
        playing: true
      }
    },
    channels: {
      drone: { volume: 1.0, muted: false },
      synth: { volume: 1.0, muted: false },
      bells: { volume: 1.0, muted: false },
      drums: { volume: 1.0, muted: false }
    },
    config: {
      maxVoices: 16,
      swing: 0,
      subdivision: 16,
      drone: {
        waveform: 'sawtooth',
        detune: 10,
        voices: 3,
        // ...
      }
    },
    presets: {}
  }
}
```

### Actions

```javascript
// Import actions
import { audioActions } from './core/actions.js';

// Dispatch actions
store.dispatch(audioActions.playPattern('drone', 'C2 ~ G2 ~'));
store.dispatch(audioActions.setBPM(140));
store.dispatch(audioActions.setMasterVolume(0.7));
store.dispatch(audioActions.stopAll());
```

### Action Types

- `AUDIO_INIT` / `AUDIO_DISPOSE`
- `AUDIO_PLAY_PATTERN` / `AUDIO_STOP_PATTERN` / `AUDIO_STOP_ALL` / `AUDIO_STOP_CHANNEL`
- `AUDIO_SET_BPM`
- `AUDIO_SET_MASTER_VOLUME`
- `AUDIO_SET_CHANNEL_VOLUME` / `AUDIO_SET_CHANNEL_MUTE`
- `AUDIO_SET_CONFIG`
- `AUDIO_CLOCK_START` / `AUDIO_CLOCK_STOP` / `AUDIO_CLOCK_PAUSE` / `AUDIO_CLOCK_RESUME`
- `AUDIO_LOAD_PRESET`

### Middleware Integration

Audio actions are dispatched through Redux middleware, allowing:
- Automatic state persistence to localStorage
- Debug logging of audio events
- Pattern validation
- Integration with game events

---

## Future Enhancements

### Phase 2 (Next Steps)

- [ ] **Synth instrument**: Polyphonic melodic synthesizer
- [ ] **Bells instrument**: FM synthesis with metallic timbre
- [ ] **Drums instrument**: Kick, snare, hi-hat, cymbal
- [ ] **Tab completion**: Complete tines commands in CLI
- [ ] **Pattern presets**: Save/load common patterns
- [ ] **Effects bus**: Reverb, delay for all channels

### Phase 3 (Advanced)

- [ ] **Spatial audio**: Sync with vecterm 3D camera
- [ ] **MIDI support**: External controller integration
- [ ] **Pattern sequencer**: Chain multiple patterns
- [ ] **Visual feedback**: Waveform display in terminal
- [ ] **Recording**: Export patterns to audio files

---

## Performance

### Optimization

- **Voice limiting**: Max 16 concurrent voices (configurable)
- **Lazy instrument loading**: Load on first use
- **Efficient scheduling**: Look-ahead scheduling (100ms)
- **CPU target**: < 5% usage

### Browser Compatibility

- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (may require user interaction to start audio)
- Edge: ✅ Full support

---

## Examples

### Ambient Drone

```javascript
// CLI
tines.bpm 60
tines.drone "<C2 G2 D2>/8"
tines.channel drone 0.5

// JS
Tines.bpm(60);
Tines.drone('<C2 G2 D2>/8', { volume: 0.5 });
```

### Rhythmic Pattern

```javascript
// CLI
tines.bpm 140
tines.drone "C2 ~ ~ ~ G2 ~ ~ ~"

// JS
Tines.bpm(140);
Tines.drone('C2 ~ ~ ~ G2 ~ ~ ~');
```

### Game Integration

```javascript
// Trigger audio on game events
store.subscribe(() => {
  const state = store.getState();
  const field = state.fields.instances['my-game'];

  if (field && field.status === 'running') {
    // Play game music
    Tines.drone('<C2 G2>/4');
    Tines.bpm(120);
  } else {
    // Stop music
    Tines.stop();
  }
});
```

---

## Troubleshooting

### Audio not playing

1. Check browser autoplay policy (user interaction required)
2. Verify audio context state: `Tines.status()`
3. Check master/channel volumes
4. Ensure pattern syntax is correct

### Choppy audio

1. Reduce max voices in config
2. Increase schedule-ahead time
3. Check CPU usage
4. Simplify patterns

### CLI commands not working

1. Ensure tines is initialized: `tines.status`
2. Check boot logs for errors
3. Verify command syntax: `tines.help`

---

## Credits

- **Inspired by**: [Strudel.cc](https://strudel.cc/) - Live coding patterns
- **Built for**: vecterm game engine
- **Architecture**: Redux-Canvas pattern
- **Audio**: Web Audio API

---

## License

Part of the vecterm project.
