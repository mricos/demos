/**
 * ECS Systems Library
 * Reusable systems for game logic
 */

const Systems = {
  // ==========================================
  // MOVEMENT & PHYSICS
  // ==========================================

  /**
   * Movement System - Updates positions based on velocity
   */
  Movement: {
    name: 'Movement',
    execute(ecs, dt) {
      const entities = ecs.query('position', 'velocity');

      entities.forEach(entity => {
        const newX = entity.position.x + entity.velocity.vx * dt;
        const newY = entity.position.y + entity.velocity.vy * dt;

        ecs.addComponent(entity.id, 'position', { x: newX, y: newY });
      });
    }
  },

  /**
   * Rotation System - Updates entity rotation based on RotationBehavior
   */
  RotationSystem: {
    name: 'RotationSystem',
    execute(ecs, dt) {
      const entities = ecs.query('transform', 'rotationBehavior');

      entities.forEach(entity => {
        const rotation = entity.rotationBehavior;
        if (!rotation.enabled) return;

        const transform = entity.transform;

        if (transform.is3D) {
          // 3D rotation
          const deltaRotation = {
            x: rotation.axis.x ? rotation.speed * dt : 0,
            y: rotation.axis.y ? rotation.speed * dt : 0,
            z: rotation.axis.z ? rotation.speed * dt : 0
          };

          // Update rotation
          const newRotation = {
            x: transform.rotation.x + deltaRotation.x,
            y: transform.rotation.y + deltaRotation.y,
            z: transform.rotation.z + deltaRotation.z
          };

          // Update accumulated rotation in behavior
          rotation.current.x += deltaRotation.x;
          rotation.current.y += deltaRotation.y;
          rotation.current.z += deltaRotation.z;

          // Create new transform with updated rotation
          const newTransform = {
            ...transform,
            rotation: typeof VectermMath !== 'undefined'
              ? new VectermMath.Vector3(newRotation.x, newRotation.y, newRotation.z)
              : newRotation
          };

          ecs.addComponent(entity.id, 'transform', newTransform);
        } else {
          // 2D rotation
          const newRotation = transform.rotation + rotation.speed * dt;
          rotation.current.z = newRotation;

          const newTransform = {
            ...transform,
            rotation: newRotation
          };

          ecs.addComponent(entity.id, 'transform', newTransform);
        }

        // Update the rotation behavior component with accumulated rotation
        ecs.addComponent(entity.id, 'rotationBehavior', rotation);
      });
    }
  },

  /**
   * ViewModeAdapter System - Transforms entities when global view mode changes
   * This system adapts entity geometry and components based on the active view mode
   */
  ViewModeAdapter: {
    name: 'ViewModeAdapter',
    currentMode: '2d',

    execute(ecs, dt, context) {
      // Get global view mode from Redux store
      const state = ecs.store.getState();
      const globalViewMode = state.viewMode || '2d';

      // Only adapt if mode changed
      if (this.currentMode === globalViewMode) return;

      const previousMode = this.currentMode;
      this.currentMode = globalViewMode;

      // Query entities with ViewMode component
      const entities = ecs.query('viewMode', 'transform');

      entities.forEach(entity => {
        const viewMode = entity.viewMode;

        // Check if entity supports the new mode
        if (!viewMode.supportedModes.includes(globalViewMode)) {
          console.warn(`Entity ${entity.id} doesn't support view mode: ${globalViewMode}`);
          return;
        }

        // Already in this mode
        if (viewMode.currentMode === globalViewMode) return;

        // Transform entity based on mode
        this.adaptEntity(ecs, entity, previousMode, globalViewMode);

        // Update current mode
        viewMode.currentMode = globalViewMode;
        ecs.addComponent(entity.id, 'viewMode', viewMode);
      });
    },

    adaptEntity(ecs, entity, fromMode, toMode) {
      const geometryMap = entity.viewMode.geometryMap;
      const transform = entity.transform;

      if (fromMode === '2d' && toMode === '3d') {
        // 2D → 3D transformation
        const position = typeof VectermMath !== 'undefined'
          ? new VectermMath.Vector3(
              (transform.position.x / 800) * 20 - 10,  // Normalize to 3D space
              (transform.position.y / 600) * 20 - 10,
              0
            )
          : { x: 0, y: 0, z: 0 };

        const rotation = typeof VectermMath !== 'undefined'
          ? new VectermMath.Vector3(0, transform.rotation, 0)
          : { x: 0, y: transform.rotation, z: 0 };

        const scale = typeof VectermMath !== 'undefined'
          ? new VectermMath.Vector3(transform.scale.x, transform.scale.y, 1)
          : { x: transform.scale.x, y: transform.scale.y, z: 1 };

        const newTransform = {
          is3D: true,
          position,
          rotation,
          scale
        };

        ecs.addComponent(entity.id, 'transform', newTransform);

        // Change geometry if mapping exists
        if (entity.renderable && geometryMap['3d']) {
          const renderable = { ...entity.renderable, mode: '3d' };
          ecs.addComponent(entity.id, 'renderable', renderable);

          // If there's a mesh mapping, create the 3D mesh
          if (geometryMap['3d'] === 'cube' && typeof VectermMesh !== 'undefined') {
            const mesh = VectermMesh.cube(1);
            ecs.addComponent(entity.id, 'mesh3D', { mesh, color: entity.renderable.color });
          }
        }

      } else if (fromMode === '3d' && toMode === '2d') {
        // 3D → 2D transformation
        const position = {
          x: (transform.position.x + 10) / 20 * 800,  // Denormalize from 3D space
          y: (transform.position.y + 10) / 20 * 600
        };

        const rotation = transform.rotation.y || 0;

        const scale = {
          x: transform.scale.x || 1,
          y: transform.scale.y || 1
        };

        const newTransform = {
          is3D: false,
          position,
          rotation,
          scale
        };

        ecs.addComponent(entity.id, 'transform', newTransform);

        // Change geometry if mapping exists
        if (entity.renderable && geometryMap['2d']) {
          const renderable = { ...entity.renderable, mode: '2d' };
          ecs.addComponent(entity.id, 'renderable', renderable);

          // Remove 3D mesh if present
          if (entity.mesh3D) {
            ecs.removeComponent(entity.id, 'mesh3D');
          }
        }
      }
    }
  },

  /**
   * ParameterSync System - Syncs entity parameters to component values
   */
  ParameterSync: {
    name: 'ParameterSync',
    execute(ecs, dt) {
      const entities = ecs.query('parameterSet');

      entities.forEach(entity => {
        const params = entity.parameterSet.parameters;

        // Sync rotation speed if entity has rotation behavior
        if (entity.rotationBehavior && params.rotationSpeed) {
          const rotation = { ...entity.rotationBehavior };
          rotation.speed = params.rotationSpeed.value;
          ecs.addComponent(entity.id, 'rotationBehavior', rotation);
        }

        // Sync size if entity has transform
        if (entity.transform && params.size) {
          const transform = { ...entity.transform };
          const sizeValue = params.size.value;

          if (transform.is3D) {
            transform.scale = typeof VectermMath !== 'undefined'
              ? new VectermMath.Vector3(sizeValue, sizeValue, sizeValue)
              : { x: sizeValue, y: sizeValue, z: sizeValue };
          } else {
            transform.scale = { x: sizeValue, y: sizeValue };
          }

          ecs.addComponent(entity.id, 'transform', transform);
        }
      });
    }
  },

  // ==========================================
  // AI & GAME LOGIC
  // ==========================================

  /**
   * PlayerControl System - Keyboard control for paddles
   * NORMALIZED COORDINATES: -1 to 1 range
   */
  PlayerControl: {
    name: 'PlayerControl',
    execute(ecs, dt, canvas) {
      const paddles = ecs.query('paddle', 'position', 'playerControlled');

      paddles.forEach(paddle => {
        const control = paddle.playerControlled;
        const speed = paddle.paddle.speed * dt;  // Frame-rate independent!
        let newPos;

        if (paddle.paddle.side === 'left' || paddle.paddle.side === 'right') {
          // Vertical movement (normalized: -1 bottom to 1 top)
          if (control.upPressed) {
            newPos = paddle.position.y + speed;  // Up is positive Y
            newPos = Math.max(-1, Math.min(1 - paddle.paddle.length, newPos));
            ecs.addComponent(paddle.id, 'position', { x: paddle.position.x, y: newPos });
          } else if (control.downPressed) {
            newPos = paddle.position.y - speed;  // Down is negative Y
            newPos = Math.max(-1, Math.min(1 - paddle.paddle.length, newPos));
            ecs.addComponent(paddle.id, 'position', { x: paddle.position.x, y: newPos });
          }
        } else {
          // Horizontal movement (normalized: -1 left to 1 right)
          if (control.upPressed) {
            newPos = paddle.position.x - speed;  // Left is negative X
            newPos = Math.max(-1, Math.min(1 - paddle.paddle.length, newPos));
            ecs.addComponent(paddle.id, 'position', { x: newPos, y: paddle.position.y });
          } else if (control.downPressed) {
            newPos = paddle.position.x + speed;  // Right is positive X
            newPos = Math.max(-1, Math.min(1 - paddle.paddle.length, newPos));
            ecs.addComponent(paddle.id, 'position', { x: newPos, y: paddle.position.y });
          }
        }
      });
    }
  },

  /**
   * PaddleAI System - AI control for paddles in pong-style games
   * NORMALIZED COORDINATES: -1 to 1 range
   */
  PaddleAI: {
    name: 'PaddleAI',
    execute(ecs, dt, canvas) {
      const paddles = ecs.query('paddle', 'position', 'aiControlled');
      const balls = ecs.query('ball', 'position');

      if (balls.length === 0) return;
      const ball = balls[0];

      paddles.forEach(paddle => {
        if (!paddle.aiControlled.enabled) return;

        const speed = paddle.paddle.speed * paddle.aiControlled.trackingSpeed * dt;  // Frame-rate independent!
        let target, current, newPos;

        if (paddle.paddle.side === 'left' || paddle.paddle.side === 'right') {
          // Vertical paddles track ball's Y position
          target = ball.position.y;
          current = paddle.position.y + paddle.paddle.length / 2;  // Center of paddle

          if (Math.abs(target - current) > speed) {
            const delta = target > current ? speed : -speed;
            newPos = paddle.position.y + delta;
            newPos = Math.max(-1, Math.min(1 - paddle.paddle.length, newPos));  // Normalized bounds

            ecs.addComponent(paddle.id, 'position', { x: paddle.position.x, y: newPos });
          }
        } else {
          // Horizontal paddles track ball's X position
          target = ball.position.x;
          current = paddle.position.x + paddle.paddle.length / 2;  // Center of paddle

          if (Math.abs(target - current) > speed) {
            const delta = target > current ? speed : -speed;
            newPos = paddle.position.x + delta;
            newPos = Math.max(-1, Math.min(1 - paddle.paddle.length, newPos));  // Normalized bounds

            ecs.addComponent(paddle.id, 'position', { x: newPos, y: paddle.position.y });
          }
        }
      });
    }
  },

  /**
   * Collision System - AABB collision detection and response
   */
  Collision: {
    name: 'Collision',
    execute(ecs, dt) {
      const balls = ecs.query('ball', 'position', 'velocity', 'aabb');
      const paddles = ecs.query('paddle', 'position', 'aabb');

      balls.forEach(ball => {
        paddles.forEach(paddle => {
          if (this.checkAABBCollision(ball, paddle)) {
            this.handlePaddleBallCollision(ecs, ball, paddle);
          }
        });
      });
    },

    checkAABBCollision(entityA, entityB) {
      return entityA.position.x < entityB.position.x + entityB.aabb.width &&
             entityA.position.x + entityA.aabb.width > entityB.position.x &&
             entityA.position.y < entityB.position.y + entityB.aabb.height &&
             entityA.position.y + entityA.aabb.height > entityB.position.y;
    },

    handlePaddleBallCollision(ecs, ball, paddle) {
      const side = paddle.paddle.side;

      if ((side === 'left' && ball.velocity.vx < 0) ||
          (side === 'right' && ball.velocity.vx > 0) ||
          (side === 'top' && ball.velocity.vy < 0) ||
          (side === 'bottom' && ball.velocity.vy > 0)) {

        let newVx = ball.velocity.vx;
        let newVy = ball.velocity.vy;

        if (side === 'left' || side === 'right') {
          newVx *= -1.05;
          newVy += (Math.random() - 0.5) * 2;
        } else {
          newVy *= -1.05;
          newVx += (Math.random() - 0.5) * 2;
        }

        ecs.addComponent(ball.id, 'velocity', { vx: newVx, vy: newVy });
      }
    }
  },

  /**
   * Scoring System - Track scoring events in pong-style games
   * NORMALIZED COORDINATES: -1 to 1 range
   */
  Scoring: {
    name: 'Scoring',
    execute(ecs, dt, canvas) {
      const balls = ecs.query('ball', 'position');

      balls.forEach(ball => {
        let scoringSide = null;

        // Check if ball is out of bounds (normalized: -1 to 1)
        if (ball.position.x < -1) scoringSide = 'left';
        else if (ball.position.x > 1) scoringSide = 'right';
        else if (ball.position.y > 1) scoringSide = 'top';
        else if (ball.position.y < -1) scoringSide = 'bottom';

        if (scoringSide) {
          const paddles = ecs.query('paddle', 'score');
          const scoringPaddle = paddles.find(p => p.paddle.side === scoringSide);

          if (scoringPaddle) {
            ecs.addComponent(scoringPaddle.id, 'score', {
              value: scoringPaddle.score.value + 1
            });
          }

          this.resetBall(ecs, ball);
        }
      });
    },

    resetBall(ecs, ball) {
      // Reset to center in normalized coordinates (0, 0)
      ecs.addComponent(ball.id, 'position', { x: 0, y: 0 });

      const speed = ball.ball.baseSpeed;
      ecs.addComponent(ball.id, 'velocity', {
        vx: speed * (Math.random() > 0.5 ? 1 : -1),
        vy: speed * (Math.random() > 0.5 ? 1 : -1)
      });
    }
  }
};

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Systems;
} else {
  window.Systems = Systems;
}
