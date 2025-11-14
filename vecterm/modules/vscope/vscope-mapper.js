/**
 * VScope Mapper - Coordinate Transformations
 *
 * Maps coordinates between field canvas and terminal display:
 * - Aspect-ratio preserving scaling
 * - Quadrant targeting (1-4 or full terminal)
 * - Field region to terminal cell mapping
 * - Reverse mapping for interaction
 */

export class VscopeMapper {
  constructor(canvasWidth, canvasHeight, terminalCols, terminalRows, targetQuadrant = 1) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.terminalCols = terminalCols;
    this.terminalRows = terminalRows;
    this.targetQuadrant = targetQuadrant;

    // Source region on canvas (what we're rendering)
    this.sourceRegion = {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight
    };

    // Target region in terminal (where we're rendering)
    this.targetRegion = this.calculateTargetRegion();

    // Transform parameters
    this.scale = { x: 1, y: 1 };
    this.offset = { x: 0, y: 0 };

    this.updateTransform();
  }

  /**
   * Calculate target region in terminal based on quadrant
   */
  calculateTargetRegion() {
    if (this.targetQuadrant === 0) {
      // Full terminal
      return {
        col: 0,
        row: 0,
        cols: this.terminalCols,
        rows: this.terminalRows
      };
    }

    // Quadrant layout:
    // 1 | 2
    // -----
    // 3 | 4

    const halfCols = Math.floor(this.terminalCols / 2);
    const halfRows = Math.floor(this.terminalRows / 2);

    switch (this.targetQuadrant) {
      case 1: // Top-left
        return { col: 0, row: 0, cols: halfCols, rows: halfRows };

      case 2: // Top-right
        return { col: halfCols, row: 0, cols: halfCols, rows: halfRows };

      case 3: // Bottom-left
        return { col: 0, row: halfRows, cols: halfCols, rows: this.terminalRows - halfRows };

      case 4: // Bottom-right
        return { col: halfCols, row: halfRows, cols: halfCols, rows: this.terminalRows - halfRows };

      default:
        return { col: 0, row: 0, cols: halfCols, rows: halfRows };
    }
  }

  /**
   * Update transform parameters (scale and offset)
   */
  updateTransform() {
    const sourceAspect = this.sourceRegion.width / this.sourceRegion.height;
    const targetAspect = this.targetRegion.cols / this.targetRegion.rows;

    // Aspect-ratio preserving fit
    if (sourceAspect > targetAspect) {
      // Source is wider - fit to width
      this.scale.x = this.targetRegion.cols / this.sourceRegion.width;
      this.scale.y = this.scale.x; // Maintain aspect ratio

      // Center vertically
      const scaledHeight = this.sourceRegion.height * this.scale.y;
      this.offset.y = (this.targetRegion.rows - scaledHeight) / 2;
      this.offset.x = 0;
    } else {
      // Source is taller - fit to height
      this.scale.y = this.targetRegion.rows / this.sourceRegion.height;
      this.scale.x = this.scale.y; // Maintain aspect ratio

      // Center horizontally
      const scaledWidth = this.sourceRegion.width * this.scale.x;
      this.offset.x = (this.targetRegion.cols - scaledWidth) / 2;
      this.offset.y = 0;
    }
  }

  /**
   * Map canvas coordinates to terminal coordinates
   */
  canvasToTerminal(canvasX, canvasY) {
    // Translate to source region space
    const relX = canvasX - this.sourceRegion.x;
    const relY = canvasY - this.sourceRegion.y;

    // Scale and offset
    const terminalX = relX * this.scale.x + this.offset.x;
    const terminalY = relY * this.scale.y + this.offset.y;

    // Add target region offset
    const col = Math.floor(this.targetRegion.col + terminalX);
    const row = Math.floor(this.targetRegion.row + terminalY);

    return { col, row };
  }

  /**
   * Map terminal coordinates to canvas coordinates
   */
  terminalToCanvas(col, row) {
    // Remove target region offset
    const relCol = col - this.targetRegion.col;
    const relRow = row - this.targetRegion.row;

    // Reverse scale and offset
    const relX = (relCol - this.offset.x) / this.scale.x;
    const relY = (relRow - this.offset.y) / this.scale.y;

    // Translate to canvas space
    const canvasX = this.sourceRegion.x + relX;
    const canvasY = this.sourceRegion.y + relY;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Check if terminal cell is within target region
   */
  isInTargetRegion(col, row) {
    return (
      col >= this.targetRegion.col &&
      col < this.targetRegion.col + this.targetRegion.cols &&
      row >= this.targetRegion.row &&
      row < this.targetRegion.row + this.targetRegion.rows
    );
  }

  /**
   * Get terminal cells for iterating over target region
   */
  *iterateTerminalCells() {
    for (let row = 0; row < this.targetRegion.rows; row++) {
      for (let col = 0; col < this.targetRegion.cols; col++) {
        const terminalCol = this.targetRegion.col + col;
        const terminalRow = this.targetRegion.row + row;

        // CRITICAL FIX: terminalToCanvas expects ABSOLUTE terminal coordinates,
        // not relative offsets. We need to pass terminalCol/terminalRow, not col/row
        const canvasTopLeft = this.terminalToCanvas(terminalCol, terminalRow);
        const canvasBottomRight = this.terminalToCanvas(terminalCol + 1, terminalRow + 1);

        yield {
          terminalCol,
          terminalRow,
          canvasRegion: {
            x: canvasTopLeft.x,
            y: canvasTopLeft.y,
            width: canvasBottomRight.x - canvasTopLeft.x,
            height: canvasBottomRight.y - canvasTopLeft.y
          }
        };
      }
    }
  }

  /**
   * Set source region (what part of canvas to render)
   */
  setSourceRegion(region) {
    this.sourceRegion = { ...region };
    this.updateTransform();
  }

  /**
   * Set target quadrant
   */
  setTargetQuadrant(quadrant) {
    this.targetQuadrant = quadrant;
    this.targetRegion = this.calculateTargetRegion();
    this.updateTransform();
  }

  /**
   * Get target region
   */
  getTargetRegion() {
    return { ...this.targetRegion };
  }

  /**
   * Get source region
   */
  getSourceRegion() {
    return { ...this.sourceRegion };
  }

  /**
   * Get transform parameters
   */
  getTransform() {
    return {
      scale: { ...this.scale },
      offset: { ...this.offset }
    };
  }

  /**
   * Get corner points for connection lines
   */
  getCornerPoints() {
    // Canvas corners (source region)
    const canvasCorners = [
      { x: this.sourceRegion.x, y: this.sourceRegion.y }, // Top-left
      { x: this.sourceRegion.x + this.sourceRegion.width, y: this.sourceRegion.y }, // Top-right
      { x: this.sourceRegion.x + this.sourceRegion.width, y: this.sourceRegion.y + this.sourceRegion.height }, // Bottom-right
      { x: this.sourceRegion.x, y: this.sourceRegion.y + this.sourceRegion.height } // Bottom-left
    ];

    // Terminal corners (target region) - need to convert to canvas pixel coordinates
    // This depends on where the terminal is rendered on screen
    // For now, return terminal cell coordinates
    const terminalCorners = [
      { col: this.targetRegion.col, row: this.targetRegion.row }, // Top-left
      { col: this.targetRegion.col + this.targetRegion.cols, row: this.targetRegion.row }, // Top-right
      { col: this.targetRegion.col + this.targetRegion.cols, row: this.targetRegion.row + this.targetRegion.rows }, // Bottom-right
      { col: this.targetRegion.col, row: this.targetRegion.row + this.targetRegion.rows } // Bottom-left
    ];

    return {
      canvas: canvasCorners,
      terminal: terminalCorners
    };
  }
}
