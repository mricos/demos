/**
 * QUADRAPONG GAME - IIFE Pattern
 * 4-player pong using core ECS architecture
 * Self-contained game with clean public API
 */

const QuadrapongGame = (() => {
  'use strict';

  // ==========================================
  // GAME CLASS
  // ==========================================

  class Game {
    constructor(store, canvas) {
      this.store = store;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.running = false;
      this.paused = false;
      this.animationId = null;
      this.lastTime = 0;

      // ECS instance
      this.ecs = new window.ECS(store);

      // Camera system (normalized coordinates)
      if (!window.NormalizedCamera && !window.Camera) {
        console.error('[QUADRAPONG] Camera class not loaded! Make sure camera.js is included before QuadrapongGame.js');
        console.error('[QUADRAPONG] window.NormalizedCamera:', window.NormalizedCamera);
        console.error('[QUADRAPONG] window.Camera:', window.Camera);
        throw new Error('Camera class not available');
      }
      const CameraClass = window.NormalizedCamera || window.Camera;
      this.camera = new CameraClass(canvas);
      this.camera.setMode('2d');
      this.camera.init();

      // Output sync - register to receive main CLI output
      this.unregisterOutputSync = null;
      if (window.registerOutputSync) {
        this.unregisterOutputSync = window.registerOutputSync((message, type) => {
          // Only sync game-relevant output (controls, game commands, etc.)
          // Filter out unrelated CLI noise
          if (this.shouldSyncOutput(message)) {
            this.addTerminalLine(message.replace(/^vecterm>\s*/, ''), type);
          }
        });
      }

      // Control mapping
      this.keyMap = {
        left: { player: null, up: 'w', down: 's', side: 'left' },
        right: { player: null, up: 'i', down: 'k', side: 'right' },
        top: { player: null, up: 'a', down: 'd', side: 'top' },
        bottom: { player: null, up: 'j', down: 'l', side: 'bottom' }
      };

      // Keyboard state
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);

      // Entity references
      this.entities = {
        ball: null,
        paddles: {
          left: null,
          right: null,
          top: null,
          bottom: null
        }
      };

      // Game configuration (NORMALIZED COORDINATES: -1 to 1)
      this.config = {
        paddleLength: 0.2,        // normalized units (20% of screen)
        paddleThickness: 0.02,    // normalized units (2% of screen)
        ballSize: 0.03,           // normalized units (3% of screen)
        ballSpeed: 0.8            // normalized units per second
      };
    }

    /**
     * Initialize game entities and systems
     */
    initialize() {
      const { Components, Systems } = window;
      const { width, height } = this.canvas;

      // Create ball entity (NORMALIZED: center at 0, 0)
      this.entities.ball = this.ecs.createEntity({
        position: Components.Position(0, 0),
        velocity: Components.Velocity(
          this.config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
          this.config.ballSpeed * (Math.random() > 0.5 ? 1 : -1)
        ),
        ball: Components.Ball(this.config.ballSize, this.config.ballSpeed),
        aabb: Components.AABB(this.config.ballSize, this.config.ballSize),
        renderable: Components.Renderable('circle', '#4FC3F7'),
        trail: Components.Trail(20),
        tags: Components.Tags('ball', 'quadrapong')
      });

      // Create paddles (NORMALIZED: positions in -1 to 1 range)
      const cfg = this.config;
      const edgeOffset = 0.05;  // Distance from edge

      // Left paddle (P1 - Red) - vertical, near left edge
      this.entities.paddles.left = this.ecs.createEntity({
        position: Components.Position(-1 + edgeOffset, -cfg.paddleLength / 2),
        paddle: Components.Paddle('left', cfg.paddleLength, cfg.paddleThickness),
        aabb: Components.AABB(cfg.paddleThickness, cfg.paddleLength),
        renderable: Components.Renderable('rect', '#F44336'),
        aiControlled: Components.AIControlled(0.8),
        score: Components.Score(),
        tags: Components.Tags('paddle', 'quadrapong', 'player1')
      });

      // Right paddle (P2 - Green) - vertical, near right edge
      this.entities.paddles.right = this.ecs.createEntity({
        position: Components.Position(1 - edgeOffset - cfg.paddleThickness, -cfg.paddleLength / 2),
        paddle: Components.Paddle('right', cfg.paddleLength, cfg.paddleThickness),
        aabb: Components.AABB(cfg.paddleThickness, cfg.paddleLength),
        renderable: Components.Renderable('rect', '#4CAF50'),
        aiControlled: Components.AIControlled(0.8),
        score: Components.Score(),
        tags: Components.Tags('paddle', 'quadrapong', 'player2')
      });

      // Top paddle (P3 - Yellow) - horizontal, near top edge
      this.entities.paddles.top = this.ecs.createEntity({
        position: Components.Position(-cfg.paddleLength / 2, 1 - edgeOffset - cfg.paddleThickness),
        paddle: Components.Paddle('top', cfg.paddleLength, cfg.paddleThickness),
        aabb: Components.AABB(cfg.paddleLength, cfg.paddleThickness),
        renderable: Components.Renderable('rect', '#FFC107'),
        aiControlled: Components.AIControlled(0.8),
        score: Components.Score(),
        tags: Components.Tags('paddle', 'quadrapong', 'player3')
      });

      // Bottom paddle (P4 - Purple) - horizontal, near bottom edge
      this.entities.paddles.bottom = this.ecs.createEntity({
        position: Components.Position(-cfg.paddleLength / 2, -1 + edgeOffset),
        paddle: Components.Paddle('bottom', cfg.paddleLength, cfg.paddleThickness),
        aabb: Components.AABB(cfg.paddleLength, cfg.paddleThickness),
        renderable: Components.Renderable('rect', '#9C27B0'),
        aiControlled: Components.AIControlled(0.8),
        score: Components.Score(),
        tags: Components.Tags('paddle', 'quadrapong', 'player4')
      });

      // Register systems
      console.log('[QUADRAPONG] Available Systems:', window.Systems);

      if (!window.Systems) {
        console.error('[QUADRAPONG] Systems not loaded!');
        return this;
      }

      this.ecs.addSystem(window.Systems.PlayerControl);  // Player controls first
      this.ecs.addSystem(window.Systems.PaddleAI);       // Then AI
      this.ecs.addSystem(window.Systems.Movement);       // Then movement
      this.ecs.addSystem(window.Systems.Collision);
      this.ecs.addSystem(window.Systems.Scoring);

      console.log('[QUADRAPONG] Game initialized with ECS, systems:', this.ecs.systems.length);
      return this;
    }

    /**
     * Start the game loop
     */
    start() {
      if (this.running) return;

      this.running = true;
      this.lastTime = performance.now();

      // Add keyboard listeners
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);

      this.gameLoop(this.lastTime);

      console.log('[QUADRAPONG] Game started');
      return this;
    }

    /**
     * Main game loop
     */
    gameLoop(currentTime) {
      if (!this.running) return;

      const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
      this.lastTime = currentTime;

      // Update
      if (!this.paused) {
        this.update(deltaTime);
      }

      // Render
      this.render();

      // Continue loop
      this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Update game logic
     */
    update(deltaTime) {
      this.ecs.update(deltaTime, this.canvas);
    }

    /**
     * Draw grid in normalized coordinate space (-1 to 1)
     */
    drawGridNormalized(ctx) {
      const gridLines = 10;  // 10x10 grid
      const step = 2 / gridLines;  // Step size in normalized space

      ctx.strokeStyle = 'rgba(79, 195, 247, 0.1)';
      ctx.lineWidth = 0.01;  // Thin lines in normalized space

      // Vertical lines
      for (let i = 0; i <= gridLines; i++) {
        const x = -1 + i * step;
        ctx.beginPath();
        ctx.moveTo(x, -1);
        ctx.lineTo(x, 1);
        ctx.stroke();
      }

      // Horizontal lines
      for (let i = 0; i <= gridLines; i++) {
        const y = -1 + i * step;
        ctx.beginPath();
        ctx.moveTo(-1, y);
        ctx.lineTo(1, y);
        ctx.stroke();
      }

      // Draw center crosshair
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.3)';
      ctx.lineWidth = 0.015;
      ctx.beginPath();
      ctx.moveTo(-1, 0);
      ctx.lineTo(1, 0);
      ctx.moveTo(0, -1);
      ctx.lineTo(0, 1);
      ctx.stroke();

      // Draw boundary
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.2)';
      ctx.lineWidth = 0.02;
      ctx.strokeRect(-1, -1, 2, 2);
    }

    /**
     * Render game
     */
    render() {
      const ctx = this.ctx;
      const { width, height } = this.canvas;

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Apply camera transform
      this.camera.applyTransform(ctx);

      // Draw grid in normalized space
      this.drawGridNormalized(ctx);

      // Get all renderable entities
      const renderables = this.ecs.query('renderable', 'position');

      renderables.forEach(entity => {
        if (!entity.renderable.visible) return;

        ctx.fillStyle = entity.renderable.color;

        if (entity.renderable.type === 'rect') {
          const w = entity.aabb ? entity.aabb.width : 10;
          const h = entity.aabb ? entity.aabb.height : 10;
          ctx.fillRect(entity.position.x, entity.position.y, w, h);
        } else if (entity.renderable.type === 'circle') {
          const radius = entity.ball ? entity.ball.size / 2 : 5;
          ctx.beginPath();
          ctx.arc(
            entity.position.x + radius,
            entity.position.y + radius,
            radius,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // Draw trail if it exists
          if (entity.trail && entity.trail.points.length > 0) {
            entity.trail.points.forEach((point, i) => {
              const alpha = i / entity.trail.points.length;
              ctx.fillStyle = entity.renderable.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
              ctx.beginPath();
              ctx.arc(point.x + radius, point.y + radius, radius * 0.5, 0, Math.PI * 2);
              ctx.fill();
            });

            // Add current position to trail
            entity.trail.points.push({ x: entity.position.x, y: entity.position.y });
            if (entity.trail.points.length > entity.trail.maxLength) {
              entity.trail.points.shift();
            }
          }
        }
      });

      // Restore camera transform
      this.camera.restoreTransform(ctx);
    }

    /**
     * Stop the game
     */
    stop() {
      this.running = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      // Remove keyboard listeners
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);

      // Unregister output sync
      if (this.unregisterOutputSync) {
        this.unregisterOutputSync();
        this.unregisterOutputSync = null;
      }

      // Cleanup camera
      if (this.camera) {
        this.camera.destroy();
      }

      console.log('[QUADRAPONG] Game stopped');
    }

    /**
     * Pause/Resume
     */
    togglePause() {
      this.paused = !this.paused;
      return this.paused;
    }

    /**
     * Reset the game
     */
    reset() {
      const { Components } = window;

      // Reset ball to center (NORMALIZED: 0, 0)
      const ball = this.ecs.getEntityById(this.entities.ball);
      if (ball) {
        this.ecs.addComponent(ball.id, 'position',
          Components.Position(0, 0)
        );
        this.ecs.addComponent(ball.id, 'velocity',
          Components.Velocity(
            this.config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
            this.config.ballSpeed * (Math.random() > 0.5 ? 1 : -1)
          )
        );
      }

      // Reset scores
      Object.values(this.entities.paddles).forEach(paddleId => {
        const paddle = this.ecs.getEntityById(paddleId);
        if (paddle) {
          this.ecs.addComponent(paddle.id, 'score', Components.Score());
        }
      });

      console.log('[QUADRAPONG] Game reset');
    }

    /**
     * Handle game-specific commands from CLI
     * @param {string} cmd - Command name
     * @param {Array} args - Command arguments
     * @returns {boolean} - True if command was handled
     */
    handleCommand(cmd, args) {
      switch (cmd) {
        case 'reset':
          this.reset();
          return true;

        case 'pause':
          this.paused = true;
          return true;

        case 'resume':
          this.paused = false;
          return true;

        default:
          return false; // Command not handled
      }
    }

    // ==========================================
    // INSPECTION API (for game panel tabs)
    // ==========================================

    /**
     * Get all entities
     */
    getAllEntities() {
      return this.ecs.getAllEntities();
    }

    /**
     * Get entities grouped by component type
     */
    getEntitiesByComponent() {
      const entities = this.getAllEntities();
      const componentMap = {};

      entities.forEach(entity => {
        Object.keys(entity).forEach(key => {
          if (key !== 'id' && entity[key] !== undefined) {
            if (!componentMap[key]) {
              componentMap[key] = [];
            }
            componentMap[key].push(entity);
          }
        });
      });

      return componentMap;
    }

    /**
     * Get active systems
     */
    getSystems() {
      return this.ecs.systems.map(system => ({
        name: system.name,
        enabled: system.enabled !== false
      }));
    }

    /**
     * Get player scores
     */
    getScores() {
      const paddles = this.ecs.query('paddle', 'score');
      const scores = { p1: 0, p2: 0, p3: 0, p4: 0 };

      paddles.forEach(paddle => {
        if (paddle.paddle.side === 'left') scores.p1 = paddle.score.value;
        else if (paddle.paddle.side === 'right') scores.p2 = paddle.score.value;
        else if (paddle.paddle.side === 'top') scores.p3 = paddle.score.value;
        else if (paddle.paddle.side === 'bottom') scores.p4 = paddle.score.value;
      });

      return scores;
    }

    /**
     * Get ECS instance (for external systems)
     */
    getECS() {
      return this.ecs;
    }

    // ==========================================
    // KEYBOARD INPUT HANDLING
    // ==========================================

    /**
     * Handle keydown events
     */
    handleKeyDown(e) {
      const key = e.key.toLowerCase();

      // Find which paddle this key controls
      Object.values(this.keyMap).forEach(control => {
        if (control.player !== null) {
          const paddle = this.ecs.getEntityById(this.entities.paddles[control.side]);
          if (paddle && paddle.playerControlled) {
            if (key === control.up) {
              paddle.playerControlled.upPressed = true;
            } else if (key === control.down) {
              paddle.playerControlled.downPressed = true;
            }
          }
        }
      });
    }

    /**
     * Handle keyup events
     */
    handleKeyUp(e) {
      const key = e.key.toLowerCase();

      // Find which paddle this key controls
      Object.values(this.keyMap).forEach(control => {
        if (control.player !== null) {
          const paddle = this.ecs.getEntityById(this.entities.paddles[control.side]);
          if (paddle && paddle.playerControlled) {
            if (key === control.up) {
              paddle.playerControlled.upPressed = false;
            } else if (key === control.down) {
              paddle.playerControlled.downPressed = false;
            }
          }
        }
      });
    }

    /**
     * Assign a paddle to player control
     */
    assignPaddleToPlayer(side, playerNumber) {
      const paddleId = this.entities.paddles[side];
      const control = this.keyMap[side];

      if (!paddleId || !control) {
        return false;
      }

      // Remove AI control, add player control
      this.ecs.removeComponent(paddleId, 'aiControlled');
      this.ecs.addComponent(paddleId, 'playerControlled',
        Components.PlayerControlled(playerNumber, control.up, control.down)
      );

      control.player = playerNumber;
      return true;
    }

    /**
     * Return paddle to AI control
     */
    returnPaddleToAI(side) {
      const paddleId = this.entities.paddles[side];
      const control = this.keyMap[side];

      if (!paddleId || !control) {
        return false;
      }

      // Remove player control, add AI control
      this.ecs.removeComponent(paddleId, 'playerControlled');
      this.ecs.addComponent(paddleId, 'aiControlled',
        Components.AIControlled(0.8)
      );

      control.player = null;
      return true;
    }

    /**
     * Get current control mappings
     */
    getControlMappings() {
      return {
        left: { ...this.keyMap.left },
        right: { ...this.keyMap.right },
        top: { ...this.keyMap.top },
        bottom: { ...this.keyMap.bottom }
      };
    }

    // ==========================================
    // COMMAND PROCESSING (for game panel CLI)
    // ==========================================

    /**
     * Process commands from game panel terminal
     * This delegates to main CLI for unified command processing
     */
    processCommand(command) {
      // Delegate ALL commands to main CLI for unified processing
      if (window.processCLICommand) {
        window.processCLICommand(command);
        return;
      }

      // Fallback if main CLI not available (shouldn't happen)
      const parts = command.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      console.log('[QUADRAPONG] Command (fallback):', cmd, args);
      this.addTerminalLine(`> ${command}`, 'command');

      switch (cmd) {
        case 'controls':
          const mappings = this.getControlMappings();
          this.addTerminalLine('=== QUADRAPONG CONTROLS ===');
          this.addTerminalLine('');
          Object.keys(mappings).forEach(side => {
            const map = mappings[side];
            const status = map.player ? `Player ${map.player}` : 'AI';
            const keys = `${map.up.toUpperCase()}/${map.down.toUpperCase()}`;
            this.addTerminalLine(`  ${side.toUpperCase()} (${keys}): ${status}`);
          });
          this.addTerminalLine('');
          this.addTerminalLine('Commands:');
          this.addTerminalLine('  controls.player1 <side> - Assign paddle to Player 1');
          this.addTerminalLine('  controls.ai <side> - Return paddle to AI');
          this.addTerminalLine('  Sides: left, right, top, bottom');
          break;

        case 'controls.player1':
          if (!args || !['left', 'right', 'top', 'bottom'].includes(args)) {
            this.addTerminalLine('Usage: controls.player1 <left|right|top|bottom>', 'error');
          } else {
            if (this.assignPaddleToPlayer(args, 1)) {
              const map = this.keyMap[args];
              this.addTerminalLine(`${args.toUpperCase()} paddle assigned to Player 1 (${map.up.toUpperCase()}/${map.down.toUpperCase()})`);
            } else {
              this.addTerminalLine(`Failed to assign ${args} paddle`, 'error');
            }
          }
          break;

        case 'controls.ai':
          if (!args || !['left', 'right', 'top', 'bottom'].includes(args)) {
            this.addTerminalLine('Usage: controls.ai <left|right|top|bottom>', 'error');
          } else {
            if (this.returnPaddleToAI(args)) {
              this.addTerminalLine(`${args.toUpperCase()} paddle returned to AI control`);
            } else {
              this.addTerminalLine(`Failed to return ${args} paddle to AI`, 'error');
            }
          }
          break;

        case 'pause':
        case 'resume':
          const paused = this.togglePause();
          this.addTerminalLine(paused ? 'Game paused' : 'Game resumed');
          break;

        case 'reset':
          this.reset();
          this.addTerminalLine('Game reset');
          break;

        case 'stop':
          this.stop();
          this.addTerminalLine('Game stopped');
          // Also send to main CLI
          if (window.processCLICommand) {
            window.processCLICommand('stop');
          }
          break;

        case 'tines.play':
          if (!args) {
            this.addTerminalLine('Usage: tines.play <pattern>', 'error');
          } else {
            this.addTerminalLine(`Playing: ${args}`);
            if (window.processCLICommand) {
              window.processCLICommand(`tines.play ${args}`);
            }
          }
          break;

        case 'tines.stop':
          this.addTerminalLine('Stopping audio');
          if (window.processCLICommand) {
            window.processCLICommand('tines.stop');
          }
          break;

        case 'help':
          this.addTerminalLine('Commands:');
          this.addTerminalLine('  controls - Show control mappings');
          this.addTerminalLine('  controls.player1 <side> - Assign paddle to player');
          this.addTerminalLine('  controls.ai <side> - Return to AI control');
          this.addTerminalLine('  pause/resume - Toggle pause');
          this.addTerminalLine('  reset - Reset game');
          this.addTerminalLine('  stop - Stop game');
          this.addTerminalLine('  tines.play <pattern> - Play audio');
          this.addTerminalLine('  tines.stop - Stop audio');
          break;

        default:
          // Check if it starts with tines.
          if (cmd.startsWith('tines.')) {
            if (window.processCLICommand) {
              window.processCLICommand(command);
            }
          } else {
            this.addTerminalLine(`Unknown command: ${cmd}`, 'error');
          }
      }
    }

    /**
     * Determine if CLI output should be synced to game panel
     * Filters out unrelated CLI noise, keeping only game-relevant output
     */
    shouldSyncOutput(message) {
      // Skip prompts - they're already shown
      if (message.startsWith('vecterm>') || message.startsWith('>')) {
        return false;
      }

      // Include output from game/controls commands
      const relevantPrefixes = [
        '=== GAME CONTROLS ===',
        'paddle assigned',
        'paddle returned',
        'GAME CONTROLS',
        'LEFT (',
        'RIGHT (',
        'TOP (',
        'BOTTOM (',
        'Commands:'
      ];

      return relevantPrefixes.some(prefix => message.includes(prefix));
    }

    /**
     * Add line to game panel terminal
     */
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

  // ==========================================
  // PUBLIC API
  // ==========================================

  return {
    /**
     * Create a new game instance
     * @param {Object} store - Redux store
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {Game} - Game instance
     */
    create(store, canvas) {
      return new Game(store, canvas);
    },

    /**
     * Game version
     */
    version: '2.0.0'
  };

})();

// Export for module systems and global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuadrapongGame;
} else {
  window.QuadrapongGame = QuadrapongGame;
}
