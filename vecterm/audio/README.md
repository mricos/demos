# Tines.js - Functional Audio Engine

## Running the Server

**Fix CORS Error:** You must serve vecterm via HTTP, not open `index.html` directly.

```bash
# Make serve script executable (first time only)
chmod +x serve.sh

# Start server (default port 8000)
./serve.sh

# Or specify a port
./serve.sh 8003
```

Then open: **http://localhost:8000**

## Functional API (Strudel-inspired)

### Basic Usage

```javascript
const { Tines } = window.PJA;

// Create a pattern
const pat = Tines.p('C2 ~ G2 ~')
  .fast(2)           // Play twice as fast
  .volume(0.7)       // Set volume
  .lpf(1000);        // Low-pass filter

// Play it
Tines.pattern('drone', pat);
```

### Chainable Methods

```javascript
// Fast: Speed up
Tines.p('C2 E2 G2')
  .fast(2)           // Double speed
  .play(manager, 'drone');

// Slow: Slow down (add rests)
Tines.p('C2 E2 G2')
  .slow(2)           // Half speed
  .play(manager, 'drone');

// Repeat: Repeat N times
Tines.p('C2 E2')
  .repeat(4)         // C2 E2 C2 E2 C2 E2 C2 E2
  .play(manager, 'drone');

// Reverse
Tines.p('C2 E2 G2')
  .rev()             // G2 E2 C2
  .play(manager, 'drone');

// Palindrome: Forward then backward
Tines.p('C2 E2 G2')
  .palindrome()      // C2 E2 G2 G2 E2 C2
  .play(manager, 'drone');

// Degrade: Randomly remove events
Tines.p('C2 E2 G2 A2')
  .degrade(0.5)      // 50% chance to remove each note
  .play(manager, 'drone');

// Stutter: Repeat each event
Tines.p('C2 E2 G2')
  .stutter(3)        // C2 C2 C2 E2 E2 E2 G2 G2 G2
  .play(manager, 'drone');
```

### Parameter Methods

```javascript
Tines.p('C2 ~ G2 ~')
  .volume(0.5)       // Voice volume
  .attack(1.0)       // Attack time
  .release(2.0)      // Release time
  .lpf(800)          // Filter frequency
  .detune(15)        // Detuning
  .lfo(0.3, 0.5)     // LFO rate, depth
  .wave('square')    // Waveform: sine, square, saw, triangle
  .play(manager, 'drone');
```

### Combinators

```javascript
// Stack: Layer patterns (play simultaneously)
Tines.stack(
  Tines.p('C2 ~ ~ ~'),
  Tines.p('~ ~ G2 ~')
).play(manager, 'drone');

// Sequence: Play in order
Tines.seq(
  'C2 E2',
  'G2 A2'
).play(manager, 'drone');

// Alternate: Interleave patterns
Tines.alt(
  'C2',
  'E2',
  'G2'
).play(manager, 'drone');
```

### From CLI

The CLI still uses the simple string syntax:

```bash
# Simple patterns
tines.drone C2
tines.drone "C2 ~ G2 ~"

# But you can use JavaScript in the browser console
Tines.p('C2 ~ G2 ~').fast(2).volume(0.7).play(Tines.manager, 'drone')
```

## Visual Player

The visual player automatically shows:
- All active patterns
- Current step (highlighted in green)
- Played notes (dimmed green)
- Rests (dots)
- Clock info (BPM, playing state)

It appears at the top of the CLI output.

## Examples

### Ambient Drone

```javascript
Tines.bpm(60);
Tines.p('<C2 G2 D2>/8')
  .volume(0.4)
  .lpf(1200)
  .lfo(0.1, 0.3)
  .play(Tines.manager, 'drone');
```

### Rhythmic Bass

```javascript
Tines.bpm(140);
Tines.p('C2 ~ ~ ~ G2 ~ ~ ~')
  .fast(2)
  .volume(0.6)
  .play(Tines.manager, 'drone');
```

### Generative Pattern

```javascript
Tines.bpm(120);

// Create evolving pattern
Tines.p('C2 E2 G2 A2')
  .degrade(0.3)      // Randomly drop notes
  .slow(2)           // Add space
  .palindrome()      // Make it symmetric
  .volume(0.5)
  .play(Tines.manager, 'drone');
```

### Complex Chain

```javascript
Tines.p('[C2 E2]*2 G2')
  .fast(2)
  .rev()
  .stutter(2)
  .volume(0.6)
  .lpf(1500)
  .detune(20)
  .attack(0.5)
  .release(1.5)
  .play(Tines.manager, 'drone');
```

## Pattern Syntax Reference

### Mini-notation (strings)

```
"C2 E2 G2"         - Sequence
"C2 ~ E2 ~"        - Rests (~)
"C2*3"             - Repeat (C2 C2 C2)
"[C2 E2]*2"        - Group repeat
"<C2 E2 G2>"       - Alternate (rotates)
"C2/4"             - Duration (sustain 4 steps)
```

### Functional (chainable)

```javascript
.fast(n)           - Speed up
.slow(n)           - Slow down
.repeat(n)         - Repeat pattern
.rev()             - Reverse
.palindrome()      - Forward + backward
.degrade(prob)     - Random removal
.stutter(n)        - Repeat each event
.volume(v)         - Voice volume
.attack(t)         - Attack time
.release(t)        - Release time
.lpf(freq)         - Low-pass filter
.detune(amt)       - Detuning
.lfo(rate, depth)  - LFO modulation
.wave(type)        - Waveform
```

## Browser Console Tips

```javascript
// Shorthand aliases
const { p, s, n } = Tines;

// Quick patterns
p('C2 ~ G2 ~').play(Tines.manager, 'drone');

// Chain it
p('C2 E2 G2').fast(2).rev().play(Tines.manager, 'drone');

// Stop
Tines.stop();

// Status
Tines.status();
```

## Visual Player Features

- **Real-time highlighting**: Current step glows green
- **History tracking**: Played notes dimmed
- **Multi-pattern**: Shows all active patterns
- **Clock sync**: Displays BPM and play state
- **Auto-scroll**: Scrolls to keep patterns visible

## Troubleshooting

### CORS Error

**Problem**: `Access to script at 'file://...' has been blocked by CORS policy`

**Solution**: Use `./serve.sh` to run a local HTTP server

### Pattern Not Playing

1. Check engine status: `tines.status`
2. Verify BPM is reasonable: `tines.bpm 120`
3. Check volume: `tines.volume 0.7`
4. Ensure clock is playing: `tines.start`

### Visual Player Not Showing

1. Check console for errors
2. Ensure audio engine initialized
3. Try refreshing the page

## Next Steps

Implement remaining instruments:
- Synth (polyphonic melodic)
- Bells (FM synthesis)
- Drums (kick, snare, hi-hat)

Then you can do:

```javascript
// Multi-instrument compositions
Tines.pattern('synth', p('C4 E4 G4').fast(2));
Tines.pattern('bells', p('C5 ~ E5 ~').slow(2));
Tines.pattern('drums', p('bd ~ sn ~'));
```

Enjoy live coding with Tines! 🎵
