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
    this.isCollapsed = false;
    this.isDismissed = false;
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

        // ALWAYS insert inside #cli-panel, before #cli-output
        // This keeps tines player OUT of the play field
        const cliOutput = document.getElementById('cli-output');
        const cliPanel = document.getElementById('cli-panel');

        if (cliOutput && cliPanel) {
          // Insert before cli-output, inside cli-panel
          cliPanel.insertBefore(container, cliOutput);
          console.log('[tines-visual-player] Inserted into CLI panel');
        } else {
          console.warn('[tines-visual-player] CLI panel not ready, will retry later');
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
        background: rgba(0, 0, 0, 0.85);
        border-bottom: 1px solid rgba(79, 195, 247, 0.3);
        padding: 8px 20px;
        margin: 0;
        max-height: 150px;
        overflow-y: auto;
        position: sticky;
        top: 40px;
        z-index: 5;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        transition: transform 0.3s ease, opacity 0.3s ease;
      }

      .tines-visual-player.collapsed {
        max-height: 32px;
        overflow: hidden;
      }

      .tines-visual-player.collapsed .tines-pattern-row,
      .tines-visual-player.collapsed .tines-no-patterns {
        display: none;
      }

      .tines-visual-player.dismissed {
        transform: translateX(-100%);
        opacity: 0;
        pointer-events: none;
      }

      .tines-toggle-btn {
        background: none;
        border: none;
        color: #4fc3f7;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 0.9em;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .tines-toggle-btn:hover {
        opacity: 1;
      }

      .tines-dismiss-btn {
        background: none;
        border: none;
        color: #ff4444;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 0.9em;
        opacity: 0.5;
        transition: opacity 0.2s;
        margin-left: 8px;
      }

      .tines-dismiss-btn:hover {
        opacity: 1;
      }

      .tines-player-header {
        color: #4fc3f7;
        font-weight: bold;
        font-size: 0.85em;
        margin-bottom: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-shadow: 0 0 3px rgba(79, 195, 247, 0.3);
      }

      .tines-player-clock {
        font-size: 0.85em;
        opacity: 0.7;
      }

      .tines-pattern-row {
        margin: 4px 0;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.3);
        border-left: 2px solid #333;
        border-radius: 2px;
      }

      .tines-pattern-row.active {
        border-left-color: #4fc3f7;
        background: rgba(79, 195, 247, 0.08);
      }

      .tines-pattern-label {
        color: #4fc3f7;
        font-size: 0.75em;
        margin-bottom: 3px;
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .tines-pattern-events {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
      }

      .tines-event {
        padding: 2px 6px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(79, 195, 247, 0.2);
        border-radius: 2px;
        color: #888;
        font-size: 0.8em;
        min-width: 24px;
        text-align: center;
        transition: all 0.1s ease;
      }

      .tines-event.rest {
        color: #444;
        border-color: transparent;
      }

      .tines-event.active {
        background: #4fc3f7;
        color: #000;
        font-weight: bold;
        transform: scale(1.05);
        box-shadow: 0 0 8px rgba(79, 195, 247, 0.8);
        border-color: #4fc3f7;
      }

      .tines-event.played {
        color: #4fc3f7;
        opacity: 0.4;
        border-color: rgba(79, 195, 247, 0.2);
      }

      .tines-no-patterns {
        color: #666;
        font-style: italic;
        text-align: center;
        padding: 8px;
        font-size: 0.85em;
      }

      .tines-controls {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .tines-btn {
        background: rgba(0, 0, 0, 0.5);
        color: #4fc3f7;
        border: 1px solid #4fc3f7;
        padding: 4px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 0.85em;
        transition: all 0.2s;
      }

      .tines-btn:hover {
        background: rgba(79, 195, 247, 0.2);
        box-shadow: 0 0 10px rgba(79, 195, 247, 0.5);
      }

      .tines-btn:active {
        transform: scale(0.95);
      }

      .tines-btn.active {
        background: #4fc3f7;
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
   * Toggle collapsed state
   */
  toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.container.classList.add('collapsed');
    } else {
      this.container.classList.remove('collapsed');
    }
  }

  /**
   * Dismiss (hide) the player
   */
  dismiss() {
    this.isDismissed = true;
    this.container.classList.add('dismissed');
  }

  /**
   * Show the player again
   */
  show() {
    this.isDismissed = false;
    this.container.classList.remove('dismissed');
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

    const toggleIcon = this.isCollapsed ? '▼' : '▲';

    this.container.innerHTML = `
      <div class="tines-player-header">
        ${clockInfo}
        <div>
          <button class="tines-toggle-btn" title="Collapse/Expand">${toggleIcon}</button>
          <button class="tines-dismiss-btn" title="Hide player">✕</button>
        </div>
      </div>
      ${patternsHTML}
    `;

    // Add event listeners to buttons
    const toggleBtn = this.container.querySelector('.tines-toggle-btn');
    const dismissBtn = this.container.querySelector('.tines-dismiss-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleCollapsed());
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismiss());
    }
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
