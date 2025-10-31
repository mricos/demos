// Lips.js
// Parametric lip shape visualization using scalable DIV rigging

class Lips {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      simple: options.simple || false, // true=single outline, false=upper/lower lips
      width: options.width || 200,
      height: options.height || 120,
      color: options.color || '#e74c3c',
      animate: options.animate !== false
    };

    this.currentShape = null;
    this.lipElements = [];
  }

  // Initialize the lip container
  init() {
    this.container.innerHTML = '';
    this.container.className = 'lips-container';
    this.container.style.width = this.options.width + 'px';
    this.container.style.height = this.options.height + 'px';
    this.container.style.position = 'relative';

    this._createLipElements();
  }

  // Create lip div elements
  _createLipElements() {
    if (this.options.simple) {
      // Single mouth outline
      this.lipElements = [this._createLipDiv('mouth-simple')];
    } else {
      // Upper and lower lips
      this.lipElements = [
        this._createLipDiv('upper-lip'),
        this._createLipDiv('lower-lip')
      ];
    }

    this.lipElements.forEach(el => this.container.appendChild(el));
  }

  // Create a single lip div element
  _createLipDiv(className) {
    const div = document.createElement('div');
    div.className = `lip-part ${className}`;
    div.style.position = 'absolute';
    div.style.borderRadius = '50%';
    div.style.transition = this.options.animate ? 'all 0.3s ease' : 'none';
    return div;
  }

  // Set lip shape for a phoneme
  setPhoneme(ipa, phonemeData = null) {
    const shape = this._getShapeForPhoneme(ipa, phonemeData);
    this.setShape(shape);
    this.currentShape = shape;
  }

  // Map IPA phoneme to lip shape parameters
  _getShapeForPhoneme(ipa, phonemeData) {
    // Lip shape parameters:
    // - openness: 0-1 (closed to wide open)
    // - rounding: 0-1 (spread to rounded)
    // - protrusion: 0-1 (retracted to protruded)
    // - width: 0-1 (narrow to wide)
    // - tension: 0-1 (relaxed/thin border to tense/thick border)

    // Default shapes based on IPA characteristics
    const shapes = {
      // High front vowels (spread, closed, tense)
      'i': { openness: 0.1, rounding: 0.0, protrusion: 0.0, width: 1.0, tension: 0.9 },
      'ɪ': { openness: 0.15, rounding: 0.1, protrusion: 0.0, width: 0.9, tension: 0.5 },

      // Mid front vowels (moderate tension)
      'e': { openness: 0.35, rounding: 0.0, protrusion: 0.0, width: 0.9, tension: 0.3 },

      // Low front vowels (very open, relaxed/thin)
      'æ': { openness: 0.7, rounding: 0.0, protrusion: 0.0, width: 0.95, tension: 0.4 },

      // Low back vowels (very open, relaxed)
      'ɑ': { openness: 0.85, rounding: 0.2, protrusion: 0.1, width: 0.85, tension: 0.2 },
      'ɒ': { openness: 0.7, rounding: 0.4, protrusion: 0.2, width: 0.7, tension: 0.3 },

      // Mid back vowels (moderate rounding, relaxed)
      'ɔ': { openness: 0.5, rounding: 0.6, protrusion: 0.4, width: 0.6, tension: 0.4 },

      // High back vowels (rounded, closed, tense)
      'ʊ': { openness: 0.2, rounding: 0.7, protrusion: 0.5, width: 0.5, tension: 0.6 },
      'u': { openness: 0.15, rounding: 0.9, protrusion: 0.7, width: 0.4, tension: 0.8 },

      // Central vowels (relaxed)
      'ʌ': { openness: 0.5, rounding: 0.2, protrusion: 0.1, width: 0.75, tension: 0.3 },
      'ɜ': { openness: 0.4, rounding: 0.3, protrusion: 0.2, width: 0.7, tension: 0.4 },
      'ə': { openness: 0.3, rounding: 0.2, protrusion: 0.1, width: 0.7, tension: 0.2 }
    };

    return shapes[ipa] || { openness: 0.5, rounding: 0.5, protrusion: 0.3, width: 0.7, tension: 0.5 };
  }

  // Set lip shape from parameters
  setShape({ openness, rounding, protrusion, width, tension }) {
    const w = this.options.width;
    const h = this.options.height;

    if (this.options.simple) {
      // Single mouth outline
      this._setSimpleShape(openness, rounding, width, tension || 0.5, w, h);
    } else {
      // Upper and lower lips
      this._setTwoLipShape(openness, rounding, width, tension || 0.5, w, h);
    }
  }

  // Simple mode: Single mouth outline (border only)
  _setSimpleShape(openness, rounding, width, tension, containerW, containerH) {
    const mouth = this.lipElements[0];

    const mouthWidth = containerW * (0.4 + width * 0.5);
    const mouthHeight = containerH * (0.2 + openness * 0.6);
    const borderRadius = rounding * 50;
    const borderWidth = 2 + tension * 6; // 2-8px based on tension

    mouth.style.width = mouthWidth + 'px';
    mouth.style.height = mouthHeight + 'px';
    mouth.style.left = (containerW - mouthWidth) / 2 + 'px';
    mouth.style.top = (containerH - mouthHeight) / 2 + 'px';
    mouth.style.backgroundColor = 'transparent';
    mouth.style.border = `${borderWidth}px solid ${this.options.color}`;
    mouth.style.borderRadius = borderRadius + '%';
    mouth.style.opacity = 0.9;
  }

  // Double lips mode: Upper and lower lips (border only)
  _setTwoLipShape(openness, rounding, width, tension, containerW, containerH) {
    const [upper, lower] = this.lipElements;

    const lipWidth = containerW * (0.4 + width * 0.5);
    const gap = containerH * openness * 0.4;
    const lipThickness = containerH * 0.25;
    const borderRadius = rounding * 50;
    const borderWidth = 2 + tension * 6; // 2-8px based on tension

    // Upper lip
    upper.style.width = lipWidth + 'px';
    upper.style.height = lipThickness + 'px';
    upper.style.left = (containerW - lipWidth) / 2 + 'px';
    upper.style.top = (containerH / 2 - gap / 2 - lipThickness) + 'px';
    upper.style.backgroundColor = 'transparent';
    upper.style.border = `${borderWidth}px solid ${this.options.color}`;
    upper.style.borderRadius = `${borderRadius}% ${borderRadius}% 20% 20%`;
    upper.style.opacity = 0.9;

    // Lower lip
    lower.style.width = lipWidth + 'px';
    lower.style.height = lipThickness + 'px';
    lower.style.left = (containerW - lipWidth) / 2 + 'px';
    lower.style.top = (containerH / 2 + gap / 2) + 'px';
    lower.style.backgroundColor = 'transparent';
    lower.style.border = `${borderWidth}px solid ${this.options.color}`;
    lower.style.borderRadius = `20% 20% ${borderRadius}% ${borderRadius}%`;
    lower.style.opacity = 0.9;
  }


  // Reset to neutral position
  reset() {
    this.setShape({
      openness: 0.3,
      rounding: 0.3,
      protrusion: 0.2,
      width: 0.7,
      tension: 0.5
    });
  }

  // Make the lips draggable
  makeDraggable() {
    let isDragging = false;
    let startX, startY, offsetX, offsetY;

    this.container.style.cursor = 'move';

    this.container.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.container.getBoundingClientRect();
      offsetX = startX - rect.left;
      offsetY = startY - rect.top;

      this.container.style.opacity = '0.8';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      e.preventDefault();

      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;

      this.container.style.left = x + 'px';
      this.container.style.top = y + 'px';
      this.container.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.container.style.opacity = '1';
      }
    });
  }

  // Toggle between simple and double lips
  setSimpleMode(simple) {
    this.options.simple = simple;
    this.init();
    if (this.currentShape) {
      this.setShape(this.currentShape);
    } else {
      this.reset();
    }
  }

  // Show editor popup on double-click
  showEditor() {
    // Create popup if it doesn't exist
    let popup = document.getElementById('lips-editor-popup');
    if (!popup) {
      popup = this._createEditorPopup();
      document.body.appendChild(popup);
    }

    // Populate with current values
    if (this.currentShape) {
      document.getElementById('edit-openness').value = this.currentShape.openness * 100;
      document.getElementById('edit-rounding').value = this.currentShape.rounding * 100;
      document.getElementById('edit-width').value = this.currentShape.width * 100;
      document.getElementById('edit-tension').value = this.currentShape.tension * 100;
    }

    // Position next to lips container
    const rect = this.container.getBoundingClientRect();
    popup.style.left = (rect.right + 10) + 'px';
    popup.style.top = rect.top + 'px';
    popup.style.display = 'block';
  }

  _createEditorPopup() {
    const popup = document.createElement('div');
    popup.id = 'lips-editor-popup';
    popup.className = 'lips-editor-popup';
    popup.innerHTML = `
      <h4>Mouth Parameters</h4>
      <div class="editor-row">
        <label>Openness: <span id="val-openness">50</span>%</label>
        <input type="range" id="edit-openness" min="0" max="100" value="50">
      </div>
      <div class="editor-row">
        <label>Rounding: <span id="val-rounding">50</span>%</label>
        <input type="range" id="edit-rounding" min="0" max="100" value="50">
      </div>
      <div class="editor-row">
        <label>Width: <span id="val-width">70</span>%</label>
        <input type="range" id="edit-width" min="0" max="100" value="70">
      </div>
      <div class="editor-row">
        <label>Tension: <span id="val-tension">50</span>%</label>
        <input type="range" id="edit-tension" min="0" max="100" value="50">
      </div>
      <button id="close-editor">Close</button>
    `;

    // Wire up sliders
    const sliders = ['openness', 'rounding', 'width', 'tension'];
    sliders.forEach(param => {
      const slider = popup.querySelector(`#edit-${param}`);
      const valueSpan = popup.querySelector(`#val-${param}`);

      slider.addEventListener('input', (e) => {
        const value = e.target.value;
        valueSpan.textContent = value;

        // Update shape in real-time
        const shape = {
          openness: parseFloat(popup.querySelector('#edit-openness').value) / 100,
          rounding: parseFloat(popup.querySelector('#edit-rounding').value) / 100,
          width: parseFloat(popup.querySelector('#edit-width').value) / 100,
          tension: parseFloat(popup.querySelector('#edit-tension').value) / 100
        };
        this.setShape(shape);
        this.currentShape = shape;
      });
    });

    // Close button
    popup.querySelector('#close-editor').addEventListener('click', () => {
      popup.style.display = 'none';
    });

    return popup;
  }

  // Enable double-click editing
  enableEditor() {
    this.container.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.showEditor();
    });
  }
}
