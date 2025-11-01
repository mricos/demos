/**
 * MIDI UI - Visual MIDI Controller
 *
 * Canvas-based visual controller with:
 * - 8 rotary knobs (1k-8k)
 * - 8 vertical sliders (1s-8s)
 * - 4x4 button grid (1-4: a,b,c,d)
 * - Transport controls
 *
 * Supports both mouse and touch interaction
 */

import { midiActions } from './midi-context.js';

export class MIDIVisualController {
  constructor(store) {
    this.store = store;
    this.canvas = null;
    this.ctx = null;
    this.container = null;

    // Interaction state
    this.activeControl = null;
    this.isDragging = false;
    this.dragStartY = 0;
    this.dragStartValue = 0;

    // Layout constants
    this.MARGIN = 20;
    this.KNOB_RADIUS = 25;
    this.KNOB_SPACING = 65;
    this.SLIDER_WIDTH = 30;
    this.SLIDER_HEIGHT = 120;
    this.SLIDER_SPACING = 50;
    this.BUTTON_SIZE = 35;
    this.BUTTON_SPACING = 45;

    // Colors
    this.COLORS = {
      background: '#1a1a1a',
      panel: '#2a2a2a',
      knobBody: '#3a3a3a',
      knobIndicator: '#00ff88',
      knobHighlight: '#4a4a4a',
      sliderTrack: '#3a3a3a',
      sliderFill: '#00ff88',
      sliderThumb: '#ffffff',
      buttonOff: '#3a3a3a',
      buttonOn: '#ff4400',
      text: '#888888',
      textBright: '#ffffff',
      border: '#444444'
    };

    this.controlPositions = new Map();
  }

  /**
   * Initialize visual controller
   */
  initialize() {
    this.createUI();
    this.calculateLayout();
    this.setupEventListeners();
    this.startRenderLoop();
    console.log('✓ MIDI Visual Controller initialized');
  }

  /**
   * Create DOM elements
   */
  createUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'midi-visual-controller';
    this.container.style.cssText = `
      position: fixed;
      top: 100px;
      left: 20px;
      width: 540px;
      height: 600px;
      background: ${this.COLORS.background};
      border: 2px solid ${this.COLORS.border};
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 1000;
      display: none;
      font-family: monospace;
    `;

    // Create title bar
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      background: ${this.COLORS.panel};
      padding: 8px 12px;
      border-bottom: 1px solid ${this.COLORS.border};
      color: ${this.COLORS.textBright};
      font-size: 14px;
      cursor: move;
      user-select: none;
    `;
    titleBar.textContent = '⦿ MIDI Controller';
    this.container.appendChild(titleBar);

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 540;
    this.canvas.height = 560;
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Add to document
    document.body.appendChild(this.container);

    // Make draggable
    this.makeDraggable(titleBar);
  }

  /**
   * Calculate positions of all controls
   */
  calculateLayout() {
    const m = this.MARGIN;

    // Knobs (top row)
    const knobY = m + this.KNOB_RADIUS + 20;
    for (let i = 1; i <= 8; i++) {
      const x = m + this.KNOB_RADIUS + (i - 1) * this.KNOB_SPACING;
      this.controlPositions.set(`${i}k`, {
        type: 'knob',
        x,
        y: knobY,
        radius: this.KNOB_RADIUS
      });
    }

    // Sliders (middle row)
    const sliderY = knobY + this.KNOB_RADIUS + 80;
    for (let i = 1; i <= 8; i++) {
      const x = m + this.SLIDER_WIDTH / 2 + (i - 1) * this.SLIDER_SPACING + 10;
      this.controlPositions.set(`${i}s`, {
        type: 'slider',
        x,
        y: sliderY,
        width: this.SLIDER_WIDTH,
        height: this.SLIDER_HEIGHT
      });
    }

    // Buttons (4x4 grid)
    const buttonStartY = sliderY + this.SLIDER_HEIGHT + 60;
    const rows = [1, 2, 3, 4];
    const cols = ['a', 'b', 'c', 'd'];

    cols.forEach((col, colIdx) => {
      rows.forEach((row, rowIdx) => {
        const x = m + this.BUTTON_SIZE / 2 + colIdx * this.BUTTON_SPACING + 150;
        const y = buttonStartY + rowIdx * this.BUTTON_SPACING;
        this.controlPositions.set(`${row}${col}`, {
          type: 'button',
          x,
          y,
          size: this.BUTTON_SIZE
        });
      });
    });

    // Transport controls
    this.controlPositions.set('transport_play', {
      type: 'transport',
      x: m + 20,
      y: buttonStartY + 20,
      size: 30,
      action: 'play'
    });

    this.controlPositions.set('transport_stop', {
      type: 'transport',
      x: m + 70,
      y: buttonStartY + 20,
      size: 30,
      action: 'stop'
    });

    this.controlPositions.set('transport_record', {
      type: 'transport',
      x: m + 20,
      y: buttonStartY + 70,
      size: 30,
      action: 'record'
    });
  }

  /**
   * Set up mouse/touch event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Listen to Redux state changes
    this.store.subscribe(this.handleStateChange.bind(this));
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const control = this.findControlAt(x, y);
    if (control) {
      this.activeControl = control;
      this.isDragging = true;
      this.dragStartY = y;
      const state = this.store.getState();
      this.dragStartValue = state.midi?.controls?.[control.id] || 0;

      if (control.pos.type === 'button' || control.pos.type === 'transport') {
        this.handleButtonPress(control.id);
      }
    }
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    if (!this.isDragging || !this.activeControl) return;

    const rect = this.canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;

    if (this.activeControl.pos.type === 'knob') {
      this.handleKnobDrag(y);
    } else if (this.activeControl.pos.type === 'slider') {
      this.handleSliderDrag(y);
    }
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(e) {
    if (this.activeControl && this.activeControl.pos.type === 'button') {
      this.handleButtonRelease(this.activeControl.id);
    }

    this.isDragging = false;
    this.activeControl = null;
  }

  /**
   * Handle touch events
   */
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  handleTouchEnd(e) {
    e.preventDefault();
    this.handleMouseUp({});
  }

  /**
   * Find control at position
   */
  findControlAt(x, y) {
    for (const [id, pos] of this.controlPositions) {
      if (pos.type === 'knob') {
        const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (dist <= pos.radius) {
          return { id, pos };
        }
      } else if (pos.type === 'slider') {
        if (x >= pos.x - pos.width / 2 && x <= pos.x + pos.width / 2 &&
            y >= pos.y && y <= pos.y + pos.height) {
          return { id, pos };
        }
      } else if (pos.type === 'button' || pos.type === 'transport') {
        if (x >= pos.x - pos.size / 2 && x <= pos.x + pos.size / 2 &&
            y >= pos.y - pos.size / 2 && y <= pos.y + pos.size / 2) {
          return { id, pos };
        }
      }
    }
    return null;
  }

  /**
   * Handle knob drag
   */
  handleKnobDrag(y) {
    const deltaY = this.dragStartY - y; // Inverted: up = increase
    const deltaValue = deltaY / 100; // 100px = full range
    let newValue = Math.max(0, Math.min(1, this.dragStartValue + deltaValue));

    this.store.dispatch(midiActions.controlChange(this.activeControl.id, newValue));
  }

  /**
   * Handle slider drag
   */
  handleSliderDrag(y) {
    const pos = this.activeControl.pos;
    const relativeY = y - pos.y;
    const value = 1 - Math.max(0, Math.min(1, relativeY / pos.height));

    this.store.dispatch(midiActions.controlChange(this.activeControl.id, value));
  }

  /**
   * Handle button press
   */
  handleButtonPress(buttonId) {
    if (buttonId.startsWith('transport_')) {
      const action = buttonId.replace('transport_', '');
      if (action === 'play') {
        this.store.dispatch(midiActions.transportPlay());
      } else if (action === 'stop') {
        this.store.dispatch(midiActions.transportStop());
      } else if (action === 'record') {
        const state = this.store.getState();
        const recording = !state.midi?.transport?.recording;
        this.store.dispatch(midiActions.transportRecord(recording));
      }
    } else {
      this.store.dispatch(midiActions.buttonPress(buttonId));
    }
  }

  /**
   * Handle button release
   */
  handleButtonRelease(buttonId) {
    if (!buttonId.startsWith('transport_')) {
      this.store.dispatch(midiActions.buttonRelease(buttonId));
    }
  }

  /**
   * Handle Redux state changes
   */
  handleStateChange() {
    const state = this.store.getState();
    const visible = state.midi?.visual?.visible;

    if (visible !== undefined) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Render loop
   */
  startRenderLoop() {
    const render = () => {
      if (this.container.style.display === 'block') {
        this.render();
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  /**
   * Render the controller
   */
  render() {
    const ctx = this.ctx;
    const state = this.store.getState();
    const controls = state.midi?.controls || {};
    const mappings = state.midi?.mappings || {};
    const transport = state.midi?.transport || {};

    // Clear
    ctx.fillStyle = this.COLORS.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render all controls
    for (const [id, pos] of this.controlPositions) {
      const value = controls[id] || 0;
      const mapping = mappings[id];

      if (pos.type === 'knob') {
        this.renderKnob(ctx, id, pos, value, mapping);
      } else if (pos.type === 'slider') {
        this.renderSlider(ctx, id, pos, value, mapping);
      } else if (pos.type === 'button') {
        this.renderButton(ctx, id, pos, value, mapping);
      } else if (pos.type === 'transport') {
        this.renderTransport(ctx, id, pos, transport);
      }
    }
  }

  /**
   * Render knob
   */
  renderKnob(ctx, id, pos, value, mapping) {
    const { x, y, radius } = pos;

    // Body
    ctx.fillStyle = this.COLORS.knobBody;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = this.COLORS.knobHighlight;
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Indicator line
    const angle = -Math.PI * 0.75 + value * Math.PI * 1.5;
    ctx.strokeStyle = this.COLORS.knobIndicator;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * radius * 0.7, y + Math.sin(angle) * radius * 0.7);
    ctx.stroke();

    // Label
    ctx.fillStyle = this.COLORS.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(id.toUpperCase(), x, y + radius + 15);

    // Value
    ctx.fillStyle = this.COLORS.textBright;
    ctx.font = '9px monospace';
    ctx.fillText(Math.round(value * 127).toString(), x, y + radius + 27);

    // Mapping
    if (mapping) {
      ctx.fillStyle = this.COLORS.knobIndicator;
      ctx.font = '8px monospace';
      const shortMapping = mapping.split('.').slice(-2).join('.');
      ctx.fillText(shortMapping, x, y + radius + 38);
    }
  }

  /**
   * Render slider
   */
  renderSlider(ctx, id, pos, value, mapping) {
    const { x, y, width, height } = pos;

    // Track
    ctx.fillStyle = this.COLORS.sliderTrack;
    ctx.fillRect(x - width / 2, y, width, height);

    // Fill
    const fillHeight = height * value;
    ctx.fillStyle = this.COLORS.sliderFill;
    ctx.fillRect(x - width / 2, y + height - fillHeight, width, fillHeight);

    // Thumb
    const thumbY = y + height - fillHeight;
    ctx.fillStyle = this.COLORS.sliderThumb;
    ctx.fillRect(x - width / 2 - 2, thumbY - 2, width + 4, 4);

    // Label
    ctx.fillStyle = this.COLORS.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(id.toUpperCase(), x, y + height + 15);

    // Value
    ctx.fillStyle = this.COLORS.textBright;
    ctx.font = '9px monospace';
    ctx.fillText(Math.round(value * 127).toString(), x, y + height + 27);

    // Mapping
    if (mapping) {
      ctx.fillStyle = this.COLORS.knobIndicator;
      ctx.font = '8px monospace';
      const shortMapping = mapping.split('.').slice(-2).join('.');
      ctx.fillText(shortMapping, x, y + height + 38);
    }
  }

  /**
   * Render button
   */
  renderButton(ctx, id, pos, pressed, mapping) {
    const { x, y, size } = pos;

    // Button
    ctx.fillStyle = pressed ? this.COLORS.buttonOn : this.COLORS.buttonOff;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);

    // Border
    ctx.strokeStyle = pressed ? this.COLORS.textBright : this.COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);

    // Label
    ctx.fillStyle = this.COLORS.textBright;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(id.toUpperCase(), x, y);

    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Render transport control
   */
  renderTransport(ctx, id, pos, transport) {
    const { x, y, size, action } = pos;

    let active = false;
    let symbol = '';

    if (action === 'play') {
      active = transport.playing;
      symbol = '▶';
    } else if (action === 'stop') {
      active = !transport.playing;
      symbol = '■';
    } else if (action === 'record') {
      active = transport.recording;
      symbol = '●';
    }

    // Button
    ctx.fillStyle = active ? this.COLORS.buttonOn : this.COLORS.buttonOff;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Symbol
    ctx.fillStyle = this.COLORS.textBright;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, y);

    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Make container draggable
   */
  makeDraggable(titleBar) {
    let offsetX, offsetY, isDragging = false;

    titleBar.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - this.container.offsetLeft;
      offsetY = e.clientY - this.container.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.container.style.left = (e.clientX - offsetX) + 'px';
        this.container.style.top = (e.clientY - offsetY) + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Show/hide controller
   */
  show() {
    this.store.dispatch(midiActions.toggleVisual(true));
  }

  hide() {
    this.store.dispatch(midiActions.toggleVisual(false));
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
