/**
 * tines.js - Visual Pattern Player
 * Strudel-inspired visual highlighting of playing patterns
 */

export class TinesVisualPlayer {
  constructor(containerId = 'tines-player') {
    this.containerId = containerId;
    this.container = null;
    this.patterns = new Map(); // patternId -> pattern info
    this.clock = null;
    this.currentStep = 0;
    this.animationFrame = null;
  }

  /**
   * Initialize the visual player
   */
  init() {
    try {
      // Create container if it doesn't exist
      let container = document.getElementById(this.containerId);

      if (!container) {
        container = document.createElement('div');
        container.id = this.containerId;
        container.className = 'tines-visual-player';

        // Find a good place to insert it
        const cliOutput = document.querySelector('.cli-output');
        if (cliOutput && cliOutput.parentNode) {
          cliOutput.parentNode.insertBefore(container, cliOutput);
        } else if (document.body) {
          document.body.appendChild(container);
        } else {
          console.warn('[tines-visual-player] Cannot find place to insert, will retry later');
          this.container = null;
          return;
        }
      }

      this.container = container;
      this.addStyles();
      this.render();

      console.log('[tines-visual-player] Initialized');
    } catch (error) {
      console.error('[tines-visual-player] Initialization failed:', error);
      this.container = null;
    }
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('tines-player-styles')) return;

    const style = document.createElement('style');
    style.id = 'tines-player-styles';
    style.textContent = `
      .tines-visual-player {
        font-family: 'Courier New', monospace;
        background: #0a0a0a;
        border: 1px solid #00ff00;
        border-radius: 4px;
        padding: 16px;
        margin: 16px 0;
        max-height: 300px;
        overflow-y: auto;
      }

      .tines-player-header {
        color: #00ff00;
        font-weight: bold;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .tines-player-clock {
        font-size: 0.9em;
        opacity: 0.8;
      }

      .tines-pattern-row {
        margin: 8px 0;
        padding: 8px;
        background: #111;
        border-left: 3px solid #333;
        border-radius: 2px;
      }

      .tines-pattern-row.active {
        border-left-color: #00ff00;
        background: #1a1a1a;
      }

      .tines-pattern-label {
        color: #00ff00;
        font-size: 0.85em;
        margin-bottom: 4px;
        opacity: 0.7;
      }

      .tines-pattern-events {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .tines-event {
        padding: 4px 8px;
        background: #222;
        border-radius: 2px;
        color: #888;
        font-size: 0.9em;
        min-width: 32px;
        text-align: center;
        transition: all 0.1s ease;
      }

      .tines-event.rest {
        color: #444;
      }

      .tines-event.active {
        background: #00ff00;
        color: #000;
        font-weight: bold;
        transform: scale(1.1);
        box-shadow: 0 0 8px #00ff00;
      }

      .tines-event.played {
        color: #00ff00;
        opacity: 0.5;
      }

      .tines-no-patterns {
        color: #666;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }

      .tines-controls {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .tines-btn {
        background: #222;
        color: #00ff00;
        border: 1px solid #00ff00;
        padding: 4px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 0.85em;
        transition: all 0.2s;
      }

      .tines-btn:hover {
        background: #00ff00;
        color: #000;
      }

      .tines-btn:active {
        transform: scale(0.95);
      }

      .tines-btn.active {
        background: #00ff00;
        color: #000;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Register a pattern for visualization
   */
  addPattern(patternId, channel, events, params = {}) {
    this.patterns.set(patternId, {
      id: patternId,
      channel,
      events: Array.isArray(events) ? events : events.split(' '),
      params,
      currentIndex: 0,
      playing: true
    });

    this.render();
  }

  /**
   * Remove a pattern
   */
  removePattern(patternId) {
    this.patterns.delete(patternId);
    this.render();
  }

  /**
   * Clear all patterns
   */
  clearPatterns() {
    this.patterns.clear();
    this.render();
  }

  /**
   * Update current step (called by clock)
   */
  onStep(step) {
    this.currentStep = step;

    // Update pattern indices
    this.patterns.forEach(pattern => {
      pattern.currentIndex = step % pattern.events.length;
    });

    this.render();
  }

  /**
   * Set clock reference
   */
  setClock(clock) {
    this.clock = clock;

    // Listen to clock steps if possible
    if (clock && clock.on) {
      clock.on('step', (step) => this.onStep(step));
    }
  }

  /**
   * Render the visual player
   */
  render() {
    if (!this.container) return;

    const hasPatterns = this.patterns.size > 0;

    const clockInfo = this.clock ? `
      <div class="tines-player-clock">
        BPM: ${this.clock.bpm} |
        Step: ${this.currentStep} |
        ${this.clock.playing ? '▶️ Playing' : '⏸️ Paused'}
      </div>
    ` : '';

    const patternsHTML = hasPatterns
      ? Array.from(this.patterns.values())
          .map(pattern => this.renderPattern(pattern))
          .join('')
      : '<div class="tines-no-patterns">No patterns playing</div>';

    this.container.innerHTML = `
      <div class="tines-player-header">
        ${clockInfo}
      </div>
      ${patternsHTML}
    `;
  }

  /**
   * Render a single pattern
   */
  renderPattern(pattern) {
    const isActive = this.clock && this.clock.playing;

    const eventsHTML = pattern.events
      .map((event, index) => {
        const isRest = event === '~';
        const isCurrentStep = index === pattern.currentIndex;
        const hasPlayed = index < pattern.currentIndex;

        const classes = [
          'tines-event',
          isRest ? 'rest' : '',
          isCurrentStep && isActive ? 'active' : '',
          hasPlayed && !isCurrentStep ? 'played' : ''
        ].filter(Boolean).join(' ');

        const display = isRest ? '·' : event;

        return `<div class="${classes}">${display}</div>`;
      })
      .join('');

    return `
      <div class="tines-pattern-row ${isActive ? 'active' : ''}">
        <div class="tines-pattern-label">
          ${pattern.channel} [${pattern.id.split('_')[0]}]
        </div>
        <div class="tines-pattern-events">
          ${eventsHTML}
        </div>
      </div>
    `;
  }

  /**
   * Start animation loop
   */
  startAnimation() {
    if (this.animationFrame) return;

    const animate = () => {
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Stop animation loop
   */
  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose() {
    this.stopAnimation();
    if (this.container) {
      this.container.remove();
    }
    this.patterns.clear();
  }
}

/**
 * Create global instance
 */
export function createVisualPlayer() {
  const player = new TinesVisualPlayer();
  player.init();
  return player;
}
