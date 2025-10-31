/**
 * INPUT SYSTEM - Multiplayer Keyboard Input Routing
 * Routes keyboard input to specific player instances via namespaces
 */

class InputSystem {
  constructor(store) {
    this.store = store;
    this.keyState = {};
    this.playerMappings = {
      player1: {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyD'
      },
      player2: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight'
      },
      player3: {
        up: 'KeyI',
        down: 'KeyK',
        left: 'KeyJ',
        right: 'KeyL'
      },
      player4: {
        up: 'Numpad8',
        down: 'Numpad5',
        left: 'Numpad4',
        right: 'Numpad6'
      }
    };

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.keyState[e.code] = true;
      this.dispatchPlayerInput(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.code] = false;
      this.dispatchPlayerInput(e.code, false);
    });
  }

  dispatchPlayerInput(keyCode, pressed) {
    // Find which player this key belongs to
    for (const [playerId, mapping] of Object.entries(this.playerMappings)) {
      const action = this.getActionForKey(mapping, keyCode);
      if (action) {
        this.store.dispatch({
          type: 'PLAYER_INPUT',
          payload: {
            playerId,
            action,
            pressed
          }
        });
      }
    }
  }

  getActionForKey(mapping, keyCode) {
    for (const [action, code] of Object.entries(mapping)) {
      if (code === keyCode) return action;
    }
    return null;
  }

  isKeyPressed(keyCode) {
    return this.keyState[keyCode] || false;
  }

  getPlayerInput(playerId) {
    const mapping = this.playerMappings[playerId];
    if (!mapping) return { up: false, down: false, left: false, right: false };

    return {
      up: this.isKeyPressed(mapping.up),
      down: this.isKeyPressed(mapping.down),
      left: this.isKeyPressed(mapping.left),
      right: this.isKeyPressed(mapping.right)
    };
  }

  // ECS System interface
  execute(ecs, dt, canvas) {
    // Get all player-controlled entities
    const playerEntities = ecs.query('playerControlled', 'velocity', 'position');

    playerEntities.forEach(entity => {
      const playerId = entity.playerControlled.playerId;
      const input = this.getPlayerInput(playerId);
      const speed = entity.playerControlled.speed || 5;

      // Update velocity based on input
      let vx = 0;
      let vy = 0;

      if (input.left) vx -= speed;
      if (input.right) vx += speed;
      if (input.up) vy -= speed;
      if (input.down) vy += speed;

      // Update entity velocity
      ecs.addComponent(entity.id, 'velocity', {
        vx, vy
      });
    });
  }
}

// New component for player control
const PlayerControlled = (playerId, speed = 5) => ({
  playerId,
  speed,
  enabled: true
});

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputSystem, PlayerControlled };
} else {
  window.InputSystem = InputSystem;
  window.PlayerControlled = PlayerControlled;
}
