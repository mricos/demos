/**
 * tines.js - Independent BPM Clock & Scheduler
 * Precise timing system for pattern sequencing
 */

export class TinesClock {
  constructor(engine, config = {}) {
    this.engine = engine;
    this.bpm = config.bpm || 120;
    this.subdivision = config.subdivision || 16; // 16th notes
    this.swing = config.swing || 0; // 0-1, amount of swing

    this.playing = false;
    this.startTime = 0;
    this.currentStep = 0;
    this.schedulerInterval = null;
    this.scheduleAheadTime = 0.1; // Schedule 100ms ahead
    this.nextNoteTime = 0;

    this.patterns = new Map(); // Active patterns
    this.callbacks = new Map(); // Step callbacks
  }

  /**
   * Start the clock
   */
  start() {
    if (this.playing) return;

    this.playing = true;
    this.currentStep = 0;
    this.startTime = this.engine.now();
    this.nextNoteTime = this.startTime;

    // Start scheduler (runs every 25ms to schedule upcoming notes)
    this.schedulerInterval = setInterval(() => {
      this.schedule();
    }, 25);

    console.log('[tines-clock] Started', { bpm: this.bpm });
  }

  /**
   * Stop the clock
   */
  stop() {
    if (!this.playing) return;

    this.playing = false;

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    console.log('[tines-clock] Stopped');
  }

  /**
   * Pause (preserves position)
   */
  pause() {
    if (!this.playing) return;

    this.playing = false;

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /**
   * Resume from pause
   */
  resume() {
    if (this.playing) return;

    this.playing = true;
    this.nextNoteTime = this.engine.now();

    this.schedulerInterval = setInterval(() => {
      this.schedule();
    }, 25);
  }

  /**
   * Set BPM
   */
  setBPM(bpm) {
    const oldBPM = this.bpm;
    this.bpm = Math.max(20, Math.min(300, bpm)); // Clamp 20-300 BPM

    // Adjust nextNoteTime to maintain phase
    if (this.playing) {
      const ratio = oldBPM / this.bpm;
      const elapsed = this.engine.now() - this.startTime;
      this.nextNoteTime = this.startTime + elapsed * ratio;
    }

    console.log('[tines-clock] BPM changed:', this.bpm);
  }

  /**
   * Set swing amount (0-1)
   */
  setSwing(swing) {
    this.swing = Math.max(0, Math.min(1, swing));
  }

  /**
   * Calculate step duration in seconds
   */
  getStepDuration() {
    // Duration of one subdivision step
    const beatsPerSecond = this.bpm / 60;
    const stepsPerBeat = this.subdivision / 4; // 16th notes = 4 steps per beat
    return 1 / (beatsPerSecond * stepsPerBeat);
  }

  /**
   * Apply swing to step time
   */
  applySwing(step) {
    if (this.swing === 0) return 0;

    // Swing applies to off-beats (odd steps)
    if (step % 2 === 1) {
      return this.getStepDuration() * this.swing * 0.5;
    }
    return 0;
  }

  /**
   * Main scheduler function
   */
  schedule() {
    if (!this.playing) return;

    const currentTime = this.engine.now();

    // Schedule all notes that need to play before scheduleAheadTime
    while (this.nextNoteTime < currentTime + this.scheduleAheadTime) {
      // Fire callbacks for this step
      this.callbacks.forEach((callback, id) => {
        try {
          callback(this.currentStep, this.nextNoteTime);
        } catch (error) {
          console.error(`[tines-clock] Callback error (${id}):`, error);
        }
      });

      // Trigger patterns
      this.patterns.forEach((pattern, id) => {
        this.triggerPattern(pattern, this.currentStep, this.nextNoteTime);
      });

      // Advance to next step
      const stepDuration = this.getStepDuration();
      const swingOffset = this.applySwing(this.currentStep);

      this.nextNoteTime += stepDuration + swingOffset;
      this.currentStep++;
    }
  }

  /**
   * Register a pattern
   */
  registerPattern(id, pattern) {
    this.patterns.set(id, {
      ...pattern,
      currentIndex: 0,
      id
    });
    console.log(`[tines-clock] Pattern registered: ${id}`);
  }

  /**
   * Unregister a pattern
   */
  unregisterPattern(id) {
    this.patterns.delete(id);
    console.log(`[tines-clock] Pattern unregistered: ${id}`);
  }

  /**
   * Clear all patterns
   */
  clearPatterns() {
    this.patterns.clear();
  }

  /**
   * Register a step callback
   */
  on(eventName, callback) {
    if (eventName === 'step') {
      const id = `callback_${Date.now()}_${Math.random()}`;
      this.callbacks.set(id, callback);
      return id;
    }
  }

  /**
   * Unregister a callback
   */
  off(callbackId) {
    this.callbacks.delete(callbackId);
  }

  /**
   * Trigger a pattern at a specific step
   */
  triggerPattern(pattern, step, time) {
    // Check if this pattern should trigger on this step
    const patternLength = pattern.events.length;
    const patternStep = step % patternLength;

    const event = pattern.events[patternStep];
    if (!event) return;

    // Fire the pattern's callback with the event
    if (pattern.callback && event !== '~') { // ~ is rest
      try {
        pattern.callback(event, time, patternStep);
      } catch (error) {
        console.error(`[tines-clock] Pattern callback error:`, error);
      }
    }
  }

  /**
   * Get current position info
   */
  getPosition() {
    const stepDuration = this.getStepDuration();
    const totalSteps = this.currentStep;
    const totalBeats = totalSteps / (this.subdivision / 4);
    const totalBars = totalBeats / 4; // Assuming 4/4 time

    return {
      step: this.currentStep,
      beat: Math.floor(totalBeats % 4),
      bar: Math.floor(totalBars),
      playing: this.playing,
      bpm: this.bpm,
      nextNoteTime: this.nextNoteTime
    };
  }

  /**
   * Get clock status
   */
  getStatus() {
    return {
      playing: this.playing,
      bpm: this.bpm,
      swing: this.swing,
      subdivision: this.subdivision,
      currentStep: this.currentStep,
      activePatterns: this.patterns.size,
      position: this.getPosition()
    };
  }
}
