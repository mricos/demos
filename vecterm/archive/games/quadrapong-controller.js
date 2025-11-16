/**
 * Quadrapong Game Controller
 * Handles game-specific commands and state for Quadrapong
 */

import { QuadrapongECS } from './quadrapong-ecs.js';

export class QuadrapongController {
  constructor(store) {
    this.store = store;
    this.paused = false;
    this.ecsGame = null;
  }

  /**
   * Initialize the ECS game instance
   */
  initializeECS(canvas) {
    if (!this.ecsGame) {
      this.ecsGame = new QuadrapongECS(this.store);
      this.ecsGame.initialize(canvas);
      console.log('[QUADRAPONG] ECS initialized');
    }
  }

  /**
   * Get the ECS game instance
   */
  getECS() {
    return this.ecsGame;
  }

  processCommand(command) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    console.log('[QUADRAPONG] Command:', cmd, args);

    // Mirror to main terminal
    if (window.cliLog) {
      window.cliLog(`quadrapong> ${command}`, 'command');
    }

    switch (cmd) {
      case 'pause':
      case 'resume':
        this.togglePause();
        break;
      case 'reset':
        this.reset();
        break;
      case 'stop':
        this.stop();
        break;
      case 'tines.play':
        this.playAudio(args);
        break;
      case 'tines.stop':
        this.stopAudio();
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        // Check if it starts with tines.
        if (cmd.startsWith('tines.')) {
          this.playAudio(command);
        } else {
          this.addTerminalLine(`Unknown command: ${cmd}`);
        }
    }
  }

  togglePause() {
    this.paused = !this.paused;
    this.addTerminalLine(this.paused ? 'Game paused' : 'Game resumed');
    // TODO: Dispatch pause action to Redux
  }

  reset() {
    this.addTerminalLine('Resetting game...');
    if (window.processCLICommand) {
      window.processCLICommand('quadrapong.reset');
    }
  }

  stop() {
    this.addTerminalLine('Stopping game...');
    if (window.processCLICommand) {
      window.processCLICommand('stop');
    }
  }

  playAudio(pattern) {
    if (!pattern || pattern.trim() === '') {
      this.addTerminalLine('Usage: tines.play <pattern>', 'error');
      return;
    }

    this.addTerminalLine(`Playing: ${pattern}`);
    if (window.processCLICommand) {
      window.processCLICommand(`tines.play ${pattern}`);
    }
  }

  stopAudio() {
    this.addTerminalLine('Stopping audio');
    if (window.processCLICommand) {
      window.processCLICommand('tines.stop');
    }
  }

  showHelp() {
    this.addTerminalLine('Commands:');
    this.addTerminalLine('  pause/resume - Toggle pause');
    this.addTerminalLine('  reset - Reset game');
    this.addTerminalLine('  stop - Stop game');
    this.addTerminalLine('  tines.play <pattern> - Play audio pattern');
    this.addTerminalLine('  tines.stop - Stop audio');
  }

  // Play a sound by name from the saved sound library
  playSoundByName(soundName) {
    const savedSounds = localStorage.getItem('vecterm-quadrapong-sounds');
    if (!savedSounds) return;

    try {
      const sounds = JSON.parse(savedSounds);
      const sound = sounds.find(s => s.name === soundName);
      if (sound && window.processCLICommand) {
        window.processCLICommand(`tines.play ${sound.pattern}`);
        console.log(`[QUADRAPONG] Playing sound: ${soundName} -> ${sound.pattern}`);
      }
    } catch (e) {
      console.error('[QUADRAPONG] Failed to play sound:', e);
    }
  }

  // Trigger event sound based on saved event triggers
  triggerEventSound(eventName) {
    const trigger = document.querySelector(`#quadrapong-view .tines-trigger-item [data-event="${eventName}"]`);
    if (!trigger) return;

    const select = trigger.closest('.tines-trigger-item')?.querySelector('.tines-trigger-sound');
    const soundName = select?.value;

    if (soundName) {
      this.playSoundByName(soundName);
    }
  }

  addTerminalLine(text, type = 'info') {
    const output = document.getElementById('quadrapong-output');
    if (!output) return;

    const line = document.createElement('div');
    line.className = 'game-terminal-line';

    const prompt = document.createElement('span');
    prompt.className = 'game-prompt';
    prompt.textContent = 'quadrapong>';

    const textSpan = document.createElement('span');
    textSpan.className = type === 'error' ? 'game-text-error' : 'game-text';
    textSpan.textContent = text;

    line.appendChild(prompt);
    line.appendChild(textSpan);
    output.appendChild(line);

    // Auto-scroll
    output.scrollTop = output.scrollHeight;
  }
}
