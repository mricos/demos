/**
 * QUADRAPONG - Entity Component System Game Engine
 * With VT100 Terminal Simulation
 */

const Quadrapong = (() => {

  // ==========================================
  // VT100 TERMINAL SIMULATOR
  // ==========================================

  class VT100 {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.config = {
        phosphorColor: '#00ff00',
        phosphorDecay: 0.95,
        scanlineIntensity: 0.15,
        scanlineCount: 2,
        bloom: 3,
        brightness: 1.1,
        contrast: 1.2,
        // Flyback circuit parameters (bad caps simulation)
        rasterWave: {
          enabled: true,
          frequency: 0.5,      // Hz - how fast the wave oscillates
          amplitude: 2,        // pixels - how far it waves
          drift: 0.1,          // slow drift amount
          jitter: 0.5          // random jitter amount
        },
        // Screen geometry distortion
        geometry: {
          barrel: 0.05,        // barrel distortion
          pincushion: 0.0,     // pincushion distortion
          tilt: 0.0            // rotation in degrees
        },
        // Phosphor persistence
        persistence: {
          enabled: true,
          fadeRate: 0.02
        }
      };

      this.time = 0;
      this.rasterOffset = 0;
      this.scanlinePosition = 0;
    }

    applyEffects(deltaTime) {
      this.time += deltaTime;

      // Apply CRT shader effects
      this.ctx.save();

      // Wavy raster effect (bad flyback caps)
      if (this.config.rasterWave.enabled) {
        this.updateRasterWave();
      }

      this.ctx.restore();
    }

    updateRasterWave() {
      const wave = this.config.rasterWave;

      // Primary wave from bad caps
      const primaryWave = Math.sin(this.time * wave.frequency * Math.PI * 2) * wave.amplitude;

      // Slow drift
      const drift = Math.sin(this.time * 0.1) * wave.drift;

      // Random jitter
      const jitter = (Math.random() - 0.5) * wave.jitter;

      this.rasterOffset = primaryWave + drift + jitter;
    }

    renderScanlines() {
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;

      // Horizontal scanlines
      ctx.globalAlpha = this.config.scanlineIntensity;
      ctx.fillStyle = '#000000';

      for (let y = 0; y < height; y += this.config.scanlineCount) {
        ctx.fillRect(0, y, width, 1);
      }

      ctx.globalAlpha = 1.0;
    }

    renderPhosphorGlow(entities) {
      const ctx = this.ctx;

      if (!this.config.bloom) return;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = `blur(${this.config.bloom}px)`;
      ctx.globalAlpha = 0.5;

      entities.forEach(entity => {
        if (!entity.renderable || !entity.renderable.visible) return;

        ctx.fillStyle = entity.color || this.config.phosphorColor;

        if (entity.type === 'circle') {
          ctx.beginPath();
          ctx.arc(
            entity.x + entity.width / 2 + this.rasterOffset,
            entity.y + entity.height / 2,
            entity.width / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else {
          ctx.fillRect(
            entity.x + this.rasterOffset,
            entity.y,
            entity.width,
            entity.height
          );
        }
      });

      ctx.restore();
    }

    setConfig(key, value) {
      const keys = key.split('.');
      let target = this.config;

      for (let i = 0; i < keys.length - 1; i++) {
        target = target[keys[i]];
      }

      target[keys[keys.length - 1]] = value;
      return this;
    }

    getConfig(key) {
      if (!key) return this.config;

      const keys = key.split('.');
      let value = this.config;

      for (const k of keys) {
        value = value[k];
      }

      return value;
    }
  }

  // ==========================================
  // ECS CORE
  // ==========================================

  class ECS {
    constructor(store) {
      this.store = store;
      this.systems = [];
      this.nextEntityId = 1;
    }

    createEntity(components = {}) {
      const entityId = `entity-${this.nextEntityId++}`;

      this.store.dispatch({
        type: 'ADD_ENTITY',
        payload: {
          id: entityId,
          ...components
        }
      });

      return entityId;
    }

    addComponent(entityId, componentName, componentData) {
      this.store.dispatch({
        type: 'UPDATE_ENTITY',
        payload: {
          id: entityId,
          updates: {
            [componentName]: componentData
          }
        }
      });
    }

    removeEntity(entityId) {
      this.store.dispatch({
        type: 'DELETE_ENTITY',
        payload: entityId
      });
    }

    query(...componentNames) {
      const state = this.store.getState();
      if (!state || !state.entities) return [];

      return state.entities.filter(entity =>
        componentNames.every(name => entity[name] !== undefined)
      );
    }

    // Query entities in a specific namespace
    queryNamespace(namespace, ...componentNames) {
      const state = this.store.getState();
      if (!state || !state.entities) return [];

      return state.entities.filter(entity =>
        entity.namespace && entity.namespace.id === namespace &&
        componentNames.every(name => entity[name] !== undefined)
      );
    }

    // Get all entities in a namespace
    getEntitiesInNamespace(namespace) {
      const state = this.store.getState();
      if (!state || !state.entities) return [];

      return state.entities.filter(entity =>
        entity.namespace && entity.namespace.id === namespace
      );
    }

    addSystem(system) {
      this.systems.push(system);
    }

    update(deltaTime, canvas) {
      this.systems.forEach(system => {
        if (system.enabled !== false) {
          system.execute(this, deltaTime, canvas);
        }
      });
    }
  }

  // ==========================================
  // COMPONENTS
  // ==========================================

  const Components = {
    Position: (x, y) => ({ x, y }),
    Velocity: (vx, vy) => ({ vx, vy }),
    Size: (width, height) => ({ width, height }),
    AABB: (width, height) => ({ width, height }),
    Renderable: (type, color) => ({ type, color, visible: true }),
    Trail: (maxLength = 10) => ({ points: [], maxLength }),

    Paddle: (side, length, thickness) => ({
      side,
      length,
      thickness,
      speed: 8
    }),

    Ball: (size, speed) => ({
      size,
      baseSpeed: speed,
      currentSpeed: speed
    }),

    AIControlled: (trackingSpeed = 1.0) => ({
      trackingSpeed,
      enabled: true
    }),

    Score: () => ({ value: 0 }),
    Tags: (...tags) => ({ tags: new Set(tags) }),

    // 3D Components
    Transform3D: (position, rotation, scale) => ({
      position: position || new VectermMath.Vector3(0, 0, 0),
      rotation: rotation || new VectermMath.Vector3(0, 0, 0),
      scale: scale || new VectermMath.Vector3(1, 1, 1)
    }),

    Mesh3D: (mesh, color) => ({
      mesh: mesh,  // Vecterm.Mesh instance
      color: color || '#00ff00'
    }),

    Camera3D: (fov, near, far) => ({
      fov: fov || Math.PI / 4,
      near: near || 0.1,
      far: far || 1000
    }),

    // Namespace component for multiplayer
    Namespace: (id) => ({ id })
  };

  // ==========================================
  // SYSTEMS
  // ==========================================

  const Systems = {
    Movement: {
      execute(ecs, dt) {
        const entities = ecs.query('position', 'velocity');

        entities.forEach(entity => {
          const newX = entity.position.x + entity.velocity.vx;
          const newY = entity.position.y + entity.velocity.vy;

          ecs.addComponent(entity.id, 'position',
            Components.Position(newX, newY)
          );
        });
      }
    },

    PaddleAI: {
      execute(ecs, dt, canvas) {
        const paddles = ecs.query('paddle', 'position', 'aiControlled');
        const balls = ecs.query('ball', 'position');

        if (balls.length === 0) return;
        const ball = balls[0];

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        paddles.forEach(paddle => {
          if (!paddle.aiControlled.enabled) return;

          const speed = paddle.paddle.speed * paddle.aiControlled.trackingSpeed;
          let target, current, newPos;

          if (paddle.paddle.side === 'left' || paddle.paddle.side === 'right') {
            target = ball.position.y;
            current = paddle.position.y + paddle.paddle.length / 2;

            if (Math.abs(target - current) > speed) {
              const delta = target > current ? speed : -speed;
              newPos = paddle.position.y + delta;
              newPos = Math.max(60, Math.min(canvasHeight - paddle.paddle.length - 60, newPos));

              ecs.addComponent(paddle.id, 'position',
                Components.Position(paddle.position.x, newPos)
              );
            }
          } else {
            target = ball.position.x;
            current = paddle.position.x + paddle.paddle.length / 2;

            if (Math.abs(target - current) > speed) {
              const delta = target > current ? speed : -speed;
              newPos = paddle.position.x + delta;
              newPos = Math.max(60, Math.min(canvasWidth - paddle.paddle.length - 60, newPos));

              ecs.addComponent(paddle.id, 'position',
                Components.Position(newPos, paddle.position.y)
              );
            }
          }
        });
      }
    },

    Collision: {
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

          ecs.addComponent(ball.id, 'velocity',
            Components.Velocity(newVx, newVy)
          );
        }
      }
    },

    Scoring: {
      execute(ecs, dt, canvas) {
        const balls = ecs.query('ball', 'position');

        balls.forEach(ball => {
          let scoringSide = null;

          if (ball.position.x < 40) scoringSide = 'left';
          else if (ball.position.x > canvas.width - 40) scoringSide = 'right';
          else if (ball.position.y < 40) scoringSide = 'top';
          else if (ball.position.y > canvas.height - 40) scoringSide = 'bottom';

          if (scoringSide) {
            const paddles = ecs.query('paddle', 'score');
            const scoringPaddle = paddles.find(p => p.paddle.side === scoringSide);

            if (scoringPaddle) {
              ecs.addComponent(scoringPaddle.id, 'score', {
                value: scoringPaddle.score.value + 1
              });
            }

            this.resetBall(ecs, ball, canvas);
          }
        });
      },

      resetBall(ecs, ball, canvas) {
        const centerX = canvas.width / 2 - ball.ball.size / 2;
        const centerY = canvas.height / 2 - ball.ball.size / 2;

        ecs.addComponent(ball.id, 'position',
          Components.Position(centerX, centerY)
        );

        const speed = ball.ball.baseSpeed;
        ecs.addComponent(ball.id, 'velocity',
          Components.Velocity(
            speed * (Math.random() > 0.5 ? 1 : -1),
            speed * (Math.random() > 0.5 ? 1 : -1)
          )
        );
      }
    }
  };

  // ==========================================
  // GAME CLASS
  // ==========================================

  class Game {
    constructor(store, canvas, mode = '2d') {
      this.ecs = new ECS(store);
      this.canvas = canvas;
      this.mode = mode;  // '2d' or '3d'

      // Initialize renderer based on mode
      if (mode === '3d' && typeof Vecterm !== 'undefined') {
        this.vecterm = new Vecterm(canvas);
        this.camera = new VectermMath.Camera(
          new VectermMath.Vector3(0, 10, 20),
          new VectermMath.Vector3(0, 0, 0)
        );
      } else {
        // Fallback to 2D VT100 if available
        if (typeof VT100 !== 'undefined') {
          this.vt100 = new VT100(canvas);
        }
      }

      this.running = false;
      this.lastTime = 0;
      this.gameLoop = null;
      this.namespace = 'default';  // Namespace for multiplayer

      this.config = {
        paddleLength: 150,
        paddleThickness: 20,
        ballSize: 20,
        ballSpeed: 6,
        paddleSpeed: 8,
        colors: {
          paddle: '#00ff00',
          ball: '#00ff88'
        }
      };

      this.setupSystems();
    }

    setupSystems() {
      this.ecs.addSystem(Systems.Movement);
      this.ecs.addSystem(Systems.PaddleAI);
      this.ecs.addSystem(Systems.Collision);
      this.ecs.addSystem(Systems.Scoring);
    }

    initialize() {
      const entities = this.ecs.store.getState().entities || [];
      entities.forEach(e => this.ecs.removeEntity(e.id));

      this.canvas.classList.add('crt-mode');

      if (this.mode === '3d') {
        return this.initialize3D();
      }

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      // Create ball
      this.ballId = this.ecs.createEntity({
        position: Components.Position(centerX - this.config.ballSize / 2, centerY - this.config.ballSize / 2),
        velocity: Components.Velocity(
          this.config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
          this.config.ballSpeed * (Math.random() > 0.5 ? 1 : -1)
        ),
        ball: Components.Ball(this.config.ballSize, this.config.ballSpeed),
        aabb: Components.AABB(this.config.ballSize, this.config.ballSize),
        renderable: Components.Renderable('circle', this.config.colors.ball),
        type: 'circle',
        width: this.config.ballSize,
        height: this.config.ballSize,
        color: this.config.colors.ball,
        x: centerX - this.config.ballSize / 2,
        y: centerY - this.config.ballSize / 2,
        label: 'ball',
        layerId: 'layer-1'
      });

      // Create paddles
      this.paddles = {
        left: this.createPaddle('left', 40, centerY - this.config.paddleLength / 2),
        right: this.createPaddle('right', this.canvas.width - 60, centerY - this.config.paddleLength / 2),
        top: this.createPaddle('top', centerX - this.config.paddleLength / 2, 40),
        bottom: this.createPaddle('bottom', centerX - this.config.paddleLength / 2, this.canvas.height - 60)
      };

      return this;
    }

    initialize3D() {
      // Create 3D ball at origin
      const ballMesh = VectermMesh.sphere(1, 1);
      this.ballId = this.ecs.createEntity({
        transform3D: Components.Transform3D(
          new VectermMath.Vector3(0, 0, 0),
          new VectermMath.Vector3(0, 0, 0),
          new VectermMath.Vector3(1, 1, 1)
        ),
        mesh3D: Components.Mesh3D(ballMesh, this.config.colors.ball),
        velocity: Components.Velocity(
          this.config.ballSpeed * (Math.random() > 0.5 ? 1 : -1) * 0.1,
          this.config.ballSpeed * (Math.random() > 0.5 ? 1 : -1) * 0.1
        ),
        ball: Components.Ball(1, this.config.ballSpeed * 0.1),
        namespace: Components.Namespace(this.namespace)
      });

      // Create 3D paddles as boxes on four sides
      const paddleWidth = 3;
      const paddleHeight = 1;
      const paddleDepth = 8;
      const distance = 12;

      this.paddles = {
        left: this.createPaddle3D('left', -distance, 0, 0, paddleHeight, paddleWidth, paddleDepth),
        right: this.createPaddle3D('right', distance, 0, 0, paddleHeight, paddleWidth, paddleDepth),
        top: this.createPaddle3D('top', 0, distance, 0, paddleDepth, paddleHeight, paddleWidth),
        bottom: this.createPaddle3D('bottom', 0, -distance, 0, paddleDepth, paddleHeight, paddleWidth)
      };

      return this;
    }

    createPaddle3D(side, x, y, z, width, height, depth) {
      const paddleMesh = VectermMesh.box(width, height, depth);

      return this.ecs.createEntity({
        transform3D: Components.Transform3D(
          new VectermMath.Vector3(x, y, z),
          new VectermMath.Vector3(0, 0, 0),
          new VectermMath.Vector3(1, 1, 1)
        ),
        mesh3D: Components.Mesh3D(paddleMesh, this.config.colors.paddle),
        velocity: Components.Velocity(0, 0),
        paddle: Components.Paddle(side, depth, width),
        aiControlled: Components.AIControlled(1.0),
        score: Components.Score(),
        namespace: Components.Namespace(this.namespace)
      });
    }

    createPaddle(side, x, y) {
      const isVertical = side === 'left' || side === 'right';
      const width = isVertical ? this.config.paddleThickness : this.config.paddleLength;
      const height = isVertical ? this.config.paddleLength : this.config.paddleThickness;

      return this.ecs.createEntity({
        position: Components.Position(x, y),
        velocity: Components.Velocity(0, 0),
        paddle: Components.Paddle(side, this.config.paddleLength, this.config.paddleThickness),
        aabb: Components.AABB(width, height),
        aiControlled: Components.AIControlled(1.0),
        score: Components.Score(),
        renderable: Components.Renderable('rect', this.config.colors.paddle),
        type: 'rect',
        width,
        height,
        x,
        y,
        color: this.config.colors.paddle,
        label: `paddle-${side}`,
        layerId: 'layer-1'
      });
    }

    start() {
      if (this.running) return this;

      this.running = true;
      this.lastTime = performance.now();

      const tick = (currentTime) => {
        if (!this.running) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update ECS
        this.ecs.update(deltaTime, this.canvas);

        // Render based on mode
        if (this.mode === '3d' && this.vecterm) {
          this.render3D(deltaTime);
        } else if (this.vt100) {
          this.vt100.applyEffects(deltaTime);
        }

        this.gameLoop = requestAnimationFrame(tick);
      };

      this.gameLoop = requestAnimationFrame(tick);
      return this;
    }

    render3D(deltaTime) {
      // Collect all entities with 3D mesh components
      const meshEntities = this.ecs.query('transform3D', 'mesh3D');

      // Convert to Vecterm mesh format
      const meshes = meshEntities.map(entity => ({
        mesh: entity.mesh3D.mesh,
        transform: entity.transform3D,
        color: entity.mesh3D.color
      }));

      // Render with Vecterm
      this.vecterm.render(meshes, this.camera, deltaTime);
    }

    stop() {
      this.running = false;
      if (this.gameLoop) {
        cancelAnimationFrame(this.gameLoop);
        this.gameLoop = null;
      }
      return this;
    }

    pause() {
      this.running = false;
      return this;
    }

    resume() {
      if (!this.running) {
        this.lastTime = performance.now();
        this.start();
      }
      return this;
    }

    getScores() {
      const paddles = this.ecs.query('paddle', 'score');
      return paddles.reduce((scores, paddle) => {
        scores[paddle.paddle.side] = paddle.score.value;
        return scores;
      }, {});
    }

    // VT100 API
    vt100Config(key, value) {
      if (value !== undefined) {
        this.vt100.setConfig(key, value);
        return this;
      }
      return this.vt100.getConfig(key);
    }

    addCustomSystem(system) {
      this.ecs.addSystem(system);
      return this;
    }

    // VScope API - provide line segments for vectorscope visualization
    getLineSegments() {
      if (this.vecterm && this.vecterm.renderer && this.vecterm.renderer.lines) {
        // Return lines from Vecterm renderer
        return this.vecterm.renderer.lines;
      }
      return [];
    }
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  return {
    Game,
    ECS,
    Components,
    Systems,
    VT100,

    // Factory method
    create(store, canvas, mode = '2d') {
      return new Game(store, canvas, mode);
    }
  };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Quadrapong;
} else {
  window.Quadrapong = Quadrapong;
}
