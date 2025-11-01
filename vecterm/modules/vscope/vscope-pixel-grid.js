/**
 * VScope Pixel Grid - Vector Registration System
 *
 * Discretizes the field canvas into a pixel grid and tracks which vectors
 * intersect each grid cell. Used for pixel rendering mode and vector density visualization.
 *
 * Features:
 * - Configurable grid resolution
 * - Vector-to-cell mapping using DDA/Bresenham
 * - Density calculation per cell
 * - Grid cell queries
 */

export class VscopePixelGrid {
  constructor(canvasWidth, canvasHeight, resolution = 100) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.resolution = resolution;

    // Grid dimensions
    this.cols = resolution;
    this.rows = Math.floor(resolution * (canvasHeight / canvasWidth));

    // Cell size in canvas pixels
    this.cellWidth = canvasWidth / this.cols;
    this.cellHeight = canvasHeight / this.rows;

    // Grid data: each cell stores vector count/density
    this.grid = this.createGrid();
  }

  /**
   * Create empty grid
   */
  createGrid() {
    const grid = [];
    for (let row = 0; row < this.rows; row++) {
      const rowData = [];
      for (let col = 0; col < this.cols; col++) {
        rowData.push({
          density: 0,
          vectors: []
        });
      }
      grid.push(rowData);
    }
    return grid;
  }

  /**
   * Clear grid (reset all cells)
   */
  clear() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.grid[row][col].density = 0;
        this.grid[row][col].vectors = [];
      }
    }
  }

  /**
   * Register a line segment (vector) in the grid
   */
  registerVector(x1, y1, x2, y2, vectorData = null) {
    // Get all cells intersected by this line using DDA
    const cells = this.getLineCells(x1, y1, x2, y2);

    // Register vector in each cell
    for (const cell of cells) {
      if (this.isValidCell(cell.col, cell.row)) {
        this.grid[cell.row][cell.col].density++;
        if (vectorData) {
          this.grid[cell.row][cell.col].vectors.push(vectorData);
        }
      }
    }
  }

  /**
   * Get all grid cells intersected by a line (DDA algorithm)
   */
  getLineCells(x1, y1, x2, y2) {
    const cells = [];
    const visited = new Set();

    // Convert to grid coordinates
    const startCol = this.canvasToGridCol(x1);
    const startRow = this.canvasToGridRow(y1);
    const endCol = this.canvasToGridCol(x2);
    const endRow = this.canvasToGridRow(y2);

    // DDA algorithm
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {
      // Single point
      if (this.isValidCell(startCol, startRow)) {
        cells.push({ col: startCol, row: startRow });
      }
      return cells;
    }

    const xInc = dx / steps;
    const yInc = dy / steps;

    let x = x1;
    let y = y1;

    for (let i = 0; i <= steps; i++) {
      const col = this.canvasToGridCol(x);
      const row = this.canvasToGridRow(y);

      const key = `${col},${row}`;
      if (!visited.has(key) && this.isValidCell(col, row)) {
        cells.push({ col, row });
        visited.add(key);
      }

      x += xInc;
      y += yInc;
    }

    return cells;
  }

  /**
   * Convert canvas X coordinate to grid column
   */
  canvasToGridCol(x) {
    return Math.floor(x / this.cellWidth);
  }

  /**
   * Convert canvas Y coordinate to grid row
   */
  canvasToGridRow(y) {
    return Math.floor(y / this.cellHeight);
  }

  /**
   * Convert grid cell to canvas coordinates (top-left corner)
   */
  gridToCanvas(col, row) {
    return {
      x: col * this.cellWidth,
      y: row * this.cellHeight,
      width: this.cellWidth,
      height: this.cellHeight
    };
  }

  /**
   * Check if cell coordinates are valid
   */
  isValidCell(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  /**
   * Get cell data
   */
  getCell(col, row) {
    if (this.isValidCell(col, row)) {
      return this.grid[row][col];
    }
    return null;
  }

  /**
   * Get cell density
   */
  getCellDensity(col, row) {
    const cell = this.getCell(col, row);
    return cell ? cell.density : 0;
  }

  /**
   * Get maximum density in grid (for normalization)
   */
  getMaxDensity() {
    let max = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        max = Math.max(max, this.grid[row][col].density);
      }
    }
    return max;
  }

  /**
   * Set grid resolution (recreates grid)
   */
  setResolution(resolution) {
    this.resolution = resolution;
    this.cols = resolution;
    this.rows = Math.floor(resolution * (this.canvasHeight / this.canvasWidth));
    this.cellWidth = this.canvasWidth / this.cols;
    this.cellHeight = this.canvasHeight / this.rows;
    this.grid = this.createGrid();
  }

  /**
   * Get grid dimensions
   */
  getDimensions() {
    return {
      cols: this.cols,
      rows: this.rows,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight
    };
  }

  /**
   * Iterate over all cells
   */
  *iterateCells() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        yield {
          col,
          row,
          density: this.grid[row][col].density,
          vectors: this.grid[row][col].vectors,
          canvas: this.gridToCanvas(col, row)
        };
      }
    }
  }

  /**
   * Get cell at canvas coordinates
   */
  getCellAtCanvas(x, y) {
    const col = this.canvasToGridCol(x);
    const row = this.canvasToGridRow(y);
    return this.getCell(col, row);
  }

  /**
   * Register multiple vectors (batch operation)
   */
  registerVectors(vectors) {
    this.clear();

    for (const vector of vectors) {
      if (vector.p1 && vector.p2) {
        this.registerVector(
          vector.p1.x,
          vector.p1.y,
          vector.p2.x,
          vector.p2.y,
          vector
        );
      }
    }
  }

  /**
   * Get density map as 2D array (for visualization)
   */
  getDensityMap() {
    const map = [];
    for (let row = 0; row < this.rows; row++) {
      const rowData = [];
      for (let col = 0; col < this.cols; col++) {
        rowData.push(this.grid[row][col].density);
      }
      map.push(rowData);
    }
    return map;
  }
}
