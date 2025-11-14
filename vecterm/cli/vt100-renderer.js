/**
 * VT100 Terminal Renderer
 *
 * True terminal simulation - renders text directly to canvas
 * No DOM elements, no CSS stacking - just absolute positioned canvas surface
 */

class VT100Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas ${canvasId} not found`);
      return;
    }

    this.ctx = this.canvas.getContext('2d');

    // Terminal dimensions (80x24 standard VT100)
    this.cols = 80;
    this.rows = 24;

    // Character cell dimensions
    this.charWidth = 10;
    this.charHeight = 20;

    // Terminal buffer (2D array of characters)
    this.buffer = [];
    this.initBuffer();

    // Cursor position
    this.cursorX = 0;
    this.cursorY = 0;
    this.cursorVisible = true;

    // Colors
    this.fgColor = '#4fc3f7'; // Cyan phosphor
    this.bgColor = '#000';

    // Font
    this.font = '16px "Courier New", monospace';

    // Batched rendering (prevents flicker from multiple writes)
    this.renderPending = false;

    // Dirty region tracking (for partial rendering)
    this.dirtyRegion = null; // {minX, minY, maxX, maxY}

    // Resize canvas
    this.resize();

    // Start cursor blink
    this.startCursorBlink();
  }

  initBuffer() {
    this.buffer = [];
    for (let y = 0; y < this.rows; y++) {
      this.buffer[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.buffer[y][x] = ' ';
      }
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    // Set canvas size
    this.canvas.width = width;
    this.canvas.height = height;

    // Calculate character dimensions based on available space
    this.charWidth = width / this.cols;
    this.charHeight = height / this.rows;

    // Render
    this.render();
  }

  /**
   * Write text to the terminal at current cursor position
   * @param {string} text - Text to write
   * @param {boolean} batchRender - If true, defer rendering until requestRender() called
   */
  write(text, batchRender = false) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '\n') {
        this.cursorX = 0;
        this.cursorY++;
        if (this.cursorY >= this.rows) {
          this.scroll();
        }
      } else if (char === '\r') {
        this.cursorX = 0;
      } else {
        // Write character to buffer
        this.buffer[this.cursorY][this.cursorX] = char;

        // Mark cell as dirty
        this.markDirty(this.cursorX, this.cursorY);

        this.cursorX++;

        // Wrap to next line
        if (this.cursorX >= this.cols) {
          this.cursorX = 0;
          this.cursorY++;
          if (this.cursorY >= this.rows) {
            this.scroll();
          }
        }
      }
    }

    if (batchRender) {
      this.renderPending = true;
    } else {
      this.render();
    }
  }

  /**
   * Mark a cell as dirty (needs redraw)
   */
  markDirty(x, y) {
    if (!this.dirtyRegion) {
      this.dirtyRegion = { minX: x, minY: y, maxX: x, maxY: y };
    } else {
      this.dirtyRegion.minX = Math.min(this.dirtyRegion.minX, x);
      this.dirtyRegion.minY = Math.min(this.dirtyRegion.minY, y);
      this.dirtyRegion.maxX = Math.max(this.dirtyRegion.maxX, x);
      this.dirtyRegion.maxY = Math.max(this.dirtyRegion.maxY, y);
    }
  }

  /**
   * Write text at specific position
   * @param {number} x - Column position
   * @param {number} y - Row position
   * @param {string} text - Text to write
   * @param {boolean} batchRender - If true, defer rendering
   */
  writeAt(x, y, text, batchRender = false) {
    const savedX = this.cursorX;
    const savedY = this.cursorY;

    this.cursorX = x;
    this.cursorY = y;

    this.write(text, batchRender);

    this.cursorX = savedX;
    this.cursorY = savedY;
  }

  /**
   * Request a render (used with batched writes)
   */
  requestRender() {
    if (this.renderPending) {
      this.render();
      this.renderPending = false;
    }
  }

  /**
   * Scroll terminal up one line
   */
  scroll() {
    // Move all lines up
    for (let y = 0; y < this.rows - 1; y++) {
      this.buffer[y] = [...this.buffer[y + 1]];
    }

    // Clear last line
    this.buffer[this.rows - 1] = new Array(this.cols).fill(' ');

    // Move cursor up
    this.cursorY = this.rows - 1;
  }

  /**
   * Clear the terminal
   */
  clear() {
    this.initBuffer();
    this.cursorX = 0;
    this.cursorY = 0;
    this.render();
  }

  /**
   * Clear to end of line from cursor position
   */
  clearEOL() {
    for (let x = this.cursorX; x < this.cols; x++) {
      this.buffer[this.cursorY][x] = ' ';
    }
    this.render();
  }

  /**
   * Render the terminal buffer to canvas
   * Only redraws dirty region if partial rendering is enabled
   */
  render() {
    const ctx = this.ctx;

    // Determine render region
    let minX = 0, minY = 0, maxX = this.cols - 1, maxY = this.rows - 1;

    if (this.dirtyRegion) {
      // Partial render - only dirty region
      minX = this.dirtyRegion.minX;
      minY = this.dirtyRegion.minY;
      maxX = this.dirtyRegion.maxX;
      maxY = this.dirtyRegion.maxY;
    }

    // Clear only the render region
    ctx.fillStyle = this.bgColor;
    const clearX = minX * this.charWidth;
    const clearY = minY * this.charHeight;
    const clearW = (maxX - minX + 1) * this.charWidth;
    const clearH = (maxY - minY + 1) * this.charHeight;
    ctx.fillRect(clearX, clearY, clearW, clearH);

    // Set font
    ctx.font = this.font;
    ctx.fillStyle = this.fgColor;
    ctx.textBaseline = 'top';

    // Add phosphor glow effect
    ctx.shadowColor = this.fgColor;
    ctx.shadowBlur = 5;

    // Render only the dirty region
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const char = this.buffer[y][x];
        if (char !== ' ') {
          const px = x * this.charWidth;
          const py = y * this.charHeight;
          ctx.fillText(char, px, py);
        }
      }
    }

    // Render cursor if in dirty region
    if (this.cursorVisible &&
        this.cursorX >= minX && this.cursorX <= maxX &&
        this.cursorY >= minY && this.cursorY <= maxY) {
      const px = this.cursorX * this.charWidth;
      const py = this.cursorY * this.charHeight;
      ctx.fillRect(px, py, this.charWidth, 2);
    }

    // Clear dirty region after rendering
    this.dirtyRegion = null;
  }

  /**
   * Start cursor blink animation
   */
  startCursorBlink() {
    setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
      this.render();
    }, 500);
  }

  /**
   * Set cursor position
   */
  setCursor(x, y) {
    this.cursorX = Math.max(0, Math.min(x, this.cols - 1));
    this.cursorY = Math.max(0, Math.min(y, this.rows - 1));
    this.render();
  }

  /**
   * Get cursor position
   */
  getCursor() {
    return { x: this.cursorX, y: this.cursorY };
  }
}

export { VT100Renderer };
