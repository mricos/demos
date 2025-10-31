/**
 * Canvas Renderer
 *
 * Handles all canvas drawing operations for the main display area.
 * Includes grid rendering, entity drawing, and scene composition.
 */

/**
 * Draw a grid on the canvas
 */
function drawGrid(ctx, canvas, gridSize) {
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.1)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Origin marker
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(0, 0, 4, 4);
}

/**
 * Draw a single entity on the canvas
 */
function drawEntity(ctx, entity, isSelected) {
  const { x, y, width = 64, height = 64, color = '#4fc3f7', type = 'rect', label } = entity;

  // Draw entity shape
  ctx.fillStyle = color;
  ctx.strokeStyle = isSelected ? '#00ff88' : '#4fc3f7';
  ctx.lineWidth = isSelected ? 3 : 1;

  if (type === 'rect') {
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  } else if (type === 'circle') {
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw entity label
  if (label) {
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, y + height / 2);
  }

  // Draw ID for selected entities
  if (isSelected) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left';
    ctx.fillText(entity.id, x, y - 5);
  }
}

/**
 * Render the entire scene
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} state - Redux state
 */
function renderScene(ctx, canvas, state) {
  // Clear canvas
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid if enabled
  if (state.grid.enabled) {
    drawGrid(ctx, canvas, state.grid.size);
  }

  // Get current namespace (demo by default)
  const namespace = state.namespaces.demo || { entities: [], layers: [] };
  const layers = namespace.layers || [];
  const entities = state.entities || namespace.entities || [];

  // Draw entities by layer
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  sortedLayers.forEach(layer => {
    if (!layer.visible) return;

    const layerEntities = entities.filter(e => e.layerId === layer.id);

    layerEntities.forEach(entity => {
      const isSelected = state.selectedEntityIds.includes(entity.id);
      drawEntity(ctx, entity, isSelected);
    });
  });

  // Draw active tool indicator
  ctx.font = '14px monospace';
  ctx.fillStyle = '#4fc3f7';
  ctx.textAlign = 'left';
  ctx.fillText(`Tool: ${state.activeTool.toUpperCase()}`, 20, 30);
  const activeLayer = layers.find(l => l.id === namespace.activeLayerId);
  ctx.fillText(`Layer: ${activeLayer?.name || 'N/A'}`, 20, 50);
  ctx.fillText(`Entities: ${entities.length}`, 20, 70);
}

export { drawGrid, drawEntity, renderScene };
