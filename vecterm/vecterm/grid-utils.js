/**
 * Grid Utilities for Vecterm
 *
 * Provides algorithms for grid-aware rendering:
 * - Character grid (terminal/ASCII mode)
 * - Square grid (canvas alignment)
 * - Coordinate mapping
 * - Line-grid intersection
 * - Grid snapping
 */

(function(global) {
  'use strict';

/**
 * Grid Cell representation
 * @typedef {Object} GridCell
 * @property {number} col - Column index
 * @property {number} row - Row index
 * @property {number} x - Pixel X coordinate (top-left of cell)
 * @property {number} y - Pixel Y coordinate (top-left of cell)
 * @property {number} width - Cell width in pixels
 * @property {number} height - Cell height in pixels
 */

/**
 * Convert pixel coordinates to character grid cell
 * @param {number} x - Screen X coordinate
 * @param {number} y - Screen Y coordinate
 * @param {Object} charGrid - Character grid config
 * @returns {GridCell}
 */
function pixelToCharacterCell(x, y, charGrid) {
  const col = Math.floor(x / charGrid.charWidth);
  const row = Math.floor(y / charGrid.charHeight);

  return {
    col: Math.max(0, Math.min(col, charGrid.cols - 1)),
    row: Math.max(0, Math.min(row, charGrid.rows - 1)),
    x: col * charGrid.charWidth,
    y: row * charGrid.charHeight,
    width: charGrid.charWidth,
    height: charGrid.charHeight
  };
}

/**
 * Convert pixel coordinates to square grid cell
 * @param {number} x - Screen X coordinate
 * @param {number} y - Screen Y coordinate
 * @param {Object} squareGrid - Square grid config
 * @returns {GridCell}
 */
function pixelToSquareCell(x, y, squareGrid) {
  const cellSize = squareGrid.size / squareGrid.subdivisions;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);

  return {
    col,
    row,
    x: col * cellSize,
    y: row * cellSize,
    width: cellSize,
    height: cellSize
  };
}

/**
 * Snap pixel coordinate to character grid
 * @param {number} x - Screen X coordinate
 * @param {number} y - Screen Y coordinate
 * @param {Object} charGrid - Character grid config
 * @param {string} mode - 'corner' | 'center' (snap to corner or center of cell)
 * @returns {{ x: number, y: number }}
 */
function snapToCharacterGrid(x, y, charGrid, mode = 'corner') {
  const cell = pixelToCharacterCell(x, y, charGrid);

  if (mode === 'center') {
    return {
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2
    };
  }

  return { x: cell.x, y: cell.y };
}

/**
 * Snap pixel coordinate to square grid
 * @param {number} x - Screen X coordinate
 * @param {number} y - Screen Y coordinate
 * @param {Object} squareGrid - Square grid config
 * @param {string} mode - 'corner' | 'center' | 'nearest'
 * @returns {{ x: number, y: number }}
 */
function snapToSquareGrid(x, y, squareGrid, mode = 'corner') {
  const cellSize = squareGrid.size / squareGrid.subdivisions;

  if (mode === 'nearest') {
    return {
      x: Math.round(x / cellSize) * cellSize,
      y: Math.round(y / cellSize) * cellSize
    };
  }

  const cell = pixelToSquareCell(x, y, squareGrid);

  if (mode === 'center') {
    return {
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2
    };
  }

  return { x: cell.x, y: cell.y };
}

/**
 * Get all grid cells that a line segment intersects
 * Uses DDA (Digital Differential Analyzer) algorithm
 *
 * @param {Object} p1 - Start point { x, y }
 * @param {Object} p2 - End point { x, y }
 * @param {Object} gridConfig - Grid configuration
 * @param {string} gridType - 'character' | 'square'
 * @returns {GridCell[]}
 */
function getLineGridIntersections(p1, p2, gridConfig, gridType) {
  const cells = [];
  const getCellFunc = gridType === 'character' ? pixelToCharacterCell : pixelToSquareCell;

  // Get start and end cells
  const startCell = getCellFunc(p1.x, p1.y, gridConfig);
  const endCell = getCellFunc(p2.x, p2.y, gridConfig);

  // If line is entirely within one cell
  if (startCell.col === endCell.col && startCell.row === endCell.row) {
    return [startCell];
  }

  // DDA algorithm for grid traversal
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  const xInc = dx / steps;
  const yInc = dy / steps;

  let x = p1.x;
  let y = p1.y;

  const visited = new Set();

  for (let i = 0; i <= steps; i++) {
    const cell = getCellFunc(x, y, gridConfig);
    const key = `${cell.col},${cell.row}`;

    if (!visited.has(key)) {
      visited.add(key);
      cells.push(cell);
    }

    x += xInc;
    y += yInc;
  }

  return cells;
}

/**
 * Bresenham line algorithm for grid traversal
 * More efficient than DDA, returns only the grid cells crossed
 *
 * @param {number} x0 - Start X
 * @param {number} y0 - Start Y
 * @param {number} x1 - End X
 * @param {number} y1 - End Y
 * @param {Object} gridConfig - Grid configuration
 * @param {string} gridType - 'character' | 'square'
 * @returns {GridCell[]}
 */
function bresenhamGridLine(x0, y0, x1, y1, gridConfig, gridType) {
  const cells = [];
  const getCellFunc = gridType === 'character' ? pixelToCharacterCell : pixelToSquareCell;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  const visited = new Set();

  while (true) {
    const cell = getCellFunc(x, y, gridConfig);
    const key = `${cell.col},${cell.row}`;

    if (!visited.has(key)) {
      visited.add(key);
      cells.push(cell);
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return cells;
}

/**
 * Get the character that best represents a line segment in a cell
 * Based on the line's angle through the cell
 *
 * @param {Object} p1 - Start point { x, y }
 * @param {Object} p2 - End point { x, y }
 * @param {GridCell} cell - The grid cell
 * @returns {string} - ASCII character ('|', '/', '-', '\', '+', etc.)
 */
function getLineCharacter(p1, p2, cell) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Calculate angle in radians
  const angle = Math.atan2(dy, dx);

  // Convert to degrees (0-360)
  let degrees = (angle * 180 / Math.PI + 360) % 360;

  // Map to 8 directions
  if (degrees >= 337.5 || degrees < 22.5) return '─';      // Horizontal right
  if (degrees >= 22.5 && degrees < 67.5) return '╱';       // Diagonal up-right
  if (degrees >= 67.5 && degrees < 112.5) return '│';      // Vertical up
  if (degrees >= 112.5 && degrees < 157.5) return '╲';     // Diagonal up-left
  if (degrees >= 157.5 && degrees < 202.5) return '─';     // Horizontal left
  if (degrees >= 202.5 && degrees < 247.5) return '╱';     // Diagonal down-left
  if (degrees >= 247.5 && degrees < 292.5) return '│';     // Vertical down
  if (degrees >= 292.5 && degrees < 337.5) return '╲';     // Diagonal down-right

  return '+'; // Fallback
}

/**
 * Get simpler ASCII line character (for broader compatibility)
 *
 * @param {Object} p1 - Start point { x, y }
 * @param {Object} p2 - End point { x, y }
 * @returns {string} - ASCII character ('|', '/', '-', '\', '+')
 */
function getSimpleLineCharacter(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const angle = Math.atan2(dy, dx);
  let degrees = (angle * 180 / Math.PI + 360) % 360;

  if (degrees >= 337.5 || degrees < 22.5) return '-';      // Horizontal right
  if (degrees >= 22.5 && degrees < 67.5) return '/';       // Diagonal up-right
  if (degrees >= 67.5 && degrees < 112.5) return '|';      // Vertical up
  if (degrees >= 112.5 && degrees < 157.5) return '\\';    // Diagonal up-left
  if (degrees >= 157.5 && degrees < 202.5) return '-';     // Horizontal left
  if (degrees >= 202.5 && degrees < 247.5) return '/';     // Diagonal down-left
  if (degrees >= 247.5 && degrees < 292.5) return '|';     // Vertical down
  if (degrees >= 292.5 && degrees < 337.5) return '\\';    // Diagonal down-right

  return '+';
}

/**
 * Render character grid to canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} charGrid - Character grid config
 */
function renderCharacterGrid(ctx, width, height, charGrid) {
  if (!charGrid.visible) return;

  ctx.save();
  ctx.strokeStyle = charGrid.color;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]); // Dashed lines
  ctx.beginPath();

  // Vertical lines
  for (let col = 0; col <= charGrid.cols; col++) {
    const x = col * charGrid.charWidth;
    if (x <= width) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
  }

  // Horizontal lines
  for (let row = 0; row <= charGrid.rows; row++) {
    const y = row * charGrid.charHeight;
    if (y <= height) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
  }

  ctx.stroke();
  ctx.setLineDash([]); // Reset
  ctx.restore();
}

/**
 * Render square grid to canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} squareGrid - Square grid config
 */
function renderSquareGrid(ctx, width, height, squareGrid) {
  if (!squareGrid.visible) return;

  const cellSize = squareGrid.size / squareGrid.subdivisions;

  ctx.save();
  ctx.strokeStyle = squareGrid.color;
  ctx.lineWidth = 1;
  ctx.beginPath();

  // Vertical lines
  for (let x = 0; x <= width; x += cellSize) {
    // Draw major grid lines thicker
    if (squareGrid.subdivisions > 1 && x % squareGrid.size === 0) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = squareGrid.color;
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = squareGrid.color + '80'; // 50% opacity
    }
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.beginPath();
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += cellSize) {
    if (squareGrid.subdivisions > 1 && y % squareGrid.size === 0) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = squareGrid.color;
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = squareGrid.color + '80';
    }
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.beginPath();
  }

  ctx.restore();
}

/**
 * Convert rendered line segments to ASCII art
 * @param {Array} lineSegments - Array of { p1, p2, gridCells }
 * @param {Object} charGrid - Character grid config
 * @returns {string} - ASCII art representation
 */
function linesToASCII(lineSegments, charGrid) {
  // Initialize 2D array with spaces
  const grid = Array(charGrid.rows).fill(null).map(() =>
    Array(charGrid.cols).fill(' ')
  );

  // Draw each line segment
  lineSegments.forEach(segment => {
    if (!segment.gridCells) return;

    segment.gridCells.forEach(cell => {
      if (cell.row >= 0 && cell.row < charGrid.rows &&
          cell.col >= 0 && cell.col < charGrid.cols) {

        const char = getSimpleLineCharacter(segment.p1, segment.p2);

        // If cell already has a character, use '+' for intersection
        if (grid[cell.row][cell.col] !== ' ' &&
            grid[cell.row][cell.col] !== char) {
          grid[cell.row][cell.col] = '+';
        } else {
          grid[cell.row][cell.col] = char;
        }
      }
    });
  });

  // Convert to string
  return grid.map(row => row.join('')).join('\n');
}

/**
 * Get grid statistics for debugging
 * @param {Array} lineSegments - Array of line segments with grid cells
 * @returns {Object} - Statistics
 */
function getGridStats(lineSegments) {
  const cellsSet = new Set();
  let totalCells = 0;

  lineSegments.forEach(segment => {
    if (segment.gridCells) {
      segment.gridCells.forEach(cell => {
        cellsSet.add(`${cell.col},${cell.row}`);
        totalCells++;
      });
    }
  });

  return {
    totalLineSegments: lineSegments.length,
    totalCellsCrossed: totalCells,
    uniqueCellsCrossed: cellsSet.size,
    averageCellsPerLine: lineSegments.length > 0 ? totalCells / lineSegments.length : 0
  };
}

// Export to global
const VectermGridUtils = {
  pixelToCharacterCell,
  pixelToSquareCell,
  snapToCharacterGrid,
  snapToSquareGrid,
  getLineGridIntersections,
  bresenhamGridLine,
  getLineCharacter,
  getSimpleLineCharacter,
  renderCharacterGrid,
  renderSquareGrid,
  linesToASCII,
  getGridStats
};

// Make available globally
global.VectermGridUtils = VectermGridUtils;

// Also export for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VectermGridUtils;
}

})(window);
