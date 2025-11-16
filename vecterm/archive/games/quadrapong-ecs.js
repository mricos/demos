/**
 * Quadrapong ECS Implementation
 * Uses the core ECS system to create a complete 4-player pong game
 */

export class QuadrapongECS {
  constructor(store) {
    this.store = store;
    this.ecs = new window.ECS(store);
    this.canvas = null;
    this.entityIds = {
      ball: null,
      paddles: {
        left: null,
        right: null,
        top: null,
        bottom: null
      }
    };
    this.initialized = false;
  }

  /**
   * Initialize the game entities and systems
   */
  initialize(canvas) {
    if (this.initialized) {
      console.log('[QUADRAPONG ECS] Already initialized');
      return;
    }

    this.canvas = canvas;
    const { Components, Systems } = window;

    // Create ball entity
    this.entityIds.ball = this.ecs.createEntity({
      position: Components.Position(canvas.width / 2 - 5, canvas.height / 2 - 5),
      velocity: Components.Velocity(3 * (Math.random() > 0.5 ? 1 : -1), 3 * (Math.random() > 0.5 ? 1 : -1)),
      ball: Components.Ball(10, 3),
      aabb: Components.AABB(10, 10),
      renderable: Components.Renderable('circle', '#4FC3F7'),
      trail: Components.Trail(20),
      tags: Components.Tags('ball', 'quadrapong')
    });

    // Create paddles
    const paddleLength = 80;
    const paddleThickness = 10;

    // Left paddle (P1)
    this.entityIds.paddles.left = this.ecs.createEntity({
      position: Components.Position(20, canvas.height / 2 - paddleLength / 2),
      paddle: Components.Paddle('left', paddleLength, paddleThickness),
      aabb: Components.AABB(paddleThickness, paddleLength),
      renderable: Components.Renderable('rect', '#F44336'),
      aiControlled: Components.AIControlled(0.8),
      score: Components.Score(),
      tags: Components.Tags('paddle', 'quadrapong', 'player1')
    });

    // Right paddle (P2)
    this.entityIds.paddles.right = this.ecs.createEntity({
      position: Components.Position(canvas.width - 30, canvas.height / 2 - paddleLength / 2),
      paddle: Components.Paddle('right', paddleLength, paddleThickness),
      aabb: Components.AABB(paddleThickness, paddleLength),
      renderable: Components.Renderable('rect', '#4CAF50'),
      aiControlled: Components.AIControlled(0.8),
      score: Components.Score(),
      tags: Components.Tags('paddle', 'quadrapong', 'player2')
    });

    // Top paddle (P3)
    this.entityIds.paddles.top = this.ecs.createEntity({
      position: Components.Position(canvas.width / 2 - paddleLength / 2, 20),
      paddle: Components.Paddle('top', paddleLength, paddleThickness),
      aabb: Components.AABB(paddleLength, paddleThickness),
      renderable: Components.Renderable('rect', '#FFC107'),
      aiControlled: Components.AIControlled(0.8),
      score: Components.Score(),
      tags: Components.Tags('paddle', 'quadrapong', 'player3')
    });

    // Bottom paddle (P4)
    this.entityIds.paddles.bottom = this.ecs.createEntity({
      position: Components.Position(canvas.width / 2 - paddleLength / 2, canvas.height - 30),
      paddle: Components.Paddle('bottom', paddleLength, paddleThickness),
      aabb: Components.AABB(paddleLength, paddleThickness),
      renderable: Components.Renderable('rect', '#9C27B0'),
      aiControlled: Components.AIControlled(0.8),
      score: Components.Score(),
      tags: Components.Tags('paddle', 'quadrapong', 'player4')
    });

    // Add systems
    this.ecs.addSystem(Systems.Movement);
    this.ecs.addSystem(Systems.PaddleAI);
    this.ecs.addSystem(Systems.Collision);
    this.ecs.addSystem(Systems.Scoring);

    this.initialized = true;
    console.log('[QUADRAPONG ECS] Initialized with entities:', this.entityIds);
  }

  /**
   * Update game logic
   */
  update(deltaTime) {
    if (!this.initialized) return;
    this.ecs.update(deltaTime, this.canvas);
  }

  /**
   * Render all entities
   */
  render(ctx) {
    if (!this.initialized) return;

    const renderables = this.ecs.query('renderable', 'position');

    renderables.forEach(entity => {
      if (!entity.renderable.visible) return;

      ctx.fillStyle = entity.renderable.color;

      if (entity.renderable.type === 'rect') {
        const width = entity.aabb ? entity.aabb.width : 10;
        const height = entity.aabb ? entity.aabb.height : 10;
        ctx.fillRect(entity.position.x, entity.position.y, width, height);
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
  }

  /**
   * Get all entities for debugging/inspection
   */
  getAllEntities() {
    const state = this.store.getState();
    return state.entities || [];
  }

  /**
   * Get entities grouped by component
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
   * Get scores for all paddles
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
   * Reset the game
   */
  reset() {
    if (!this.canvas) return;

    const ball = this.ecs.getEntityById(this.entityIds.ball);
    if (ball) {
      const { Components } = window;
      this.ecs.addComponent(ball.id, 'position',
        Components.Position(this.canvas.width / 2 - 5, this.canvas.height / 2 - 5)
      );
      this.ecs.addComponent(ball.id, 'velocity',
        Components.Velocity(3 * (Math.random() > 0.5 ? 1 : -1), 3 * (Math.random() > 0.5 ? 1 : -1))
      );
    }

    // Reset scores
    Object.values(this.entityIds.paddles).forEach(paddleId => {
      const paddle = this.ecs.getEntityById(paddleId);
      if (paddle) {
        this.ecs.addComponent(paddle.id, 'score', { value: 0 });
      }
    });

    console.log('[QUADRAPONG ECS] Game reset');
  }

  /**
   * Cleanup
   */
  destroy() {
    this.ecs.clear();
    this.initialized = false;
    console.log('[QUADRAPONG ECS] Destroyed');
  }
}
