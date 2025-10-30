# Variable Math Markdown System

An interactive framework for presenting mathematical physics papers with living, explorable equations.

## Overview

This system demonstrates the **Variable Scale Transform (VST)** while introducing a new paradigm for mathematical exposition: **Variable Math Markdown**. Instead of static equations, every mathematical element is interactive, clickable, and connected to an explanatory knowledge graph.

## Key Features

### 🎯 Interactive Mathematics
- **Click any variable** in an equation to see its definition, relationships, and visualizations
- **Multi-cursor selection** - Ctrl+click to select multiple terms and see their relationships
- **Automatic highlighting** - Related terms glow when you interact with a concept
- **Rich animations** - Math elements can pulse, glow, wiggle, or breathe to draw attention

### 📐 Three-Column Layout
- **Left Gutter**: Section navigation (collapsible)
- **Center**: Main academic content with improved typography
- **Right Gutter**: Margin notes (click-to-reveal explanations)

### ⚙️ Context-Aware Controls
- **Floating Action Button (FAB)** in bottom-right corner
- **Draggable** - reposition anywhere
- **Context-sensitive** - shows different controls based on current section
- Section 2: Frequency sliders (f₁, f₂)
- Section 3: Transform parameters (α, Q, bins/octave)
- Section 4: Scaling function controls
- Section 5: FFT size and comparison

### 📊 Grammar of Graphics
- **Vega-Lite** integration for all visualizations
- **Responsive charts** that update with parameter changes
- **Embedded in margin notes** for detailed explanations

### 🧠 Knowledge Graph
- **Concept relationships** - knows that λ depends on α, ω derives from f, etc.
- **Automatic cross-linking** - clicking α highlights it everywhere and shows λ(t) in margin
- **Extensible** - easy to add new concepts and relationships

## Architecture

### File Structure
```
vst/
├── index.html              # Main HTML with content
├── css/
│   ├── layout.css         # 3-column grid system
│   ├── typography.css     # Academic typography + improved math rendering
│   ├── animations.css     # Pulse, wiggle, glow, scale effects
│   └── components.css     # FAB, gutters, controls
└── js/
    ├── signal-processor.js       # VST computation engine
    ├── knowledge-graph.js        # Concept relationships + Vega integration
    ├── math-symbolizer.js        # KaTeX AST parser → interactive elements
    ├── equation-animator.js      # CSS animation controller
    ├── margin-notes.js           # Right gutter reveal system
    ├── context-fab.js            # Draggable FAB with context controls
    └── main.js                   # Orchestration & initialization
```

### Component Responsibilities

#### `math-symbolizer.js` - The Heart of the System
Automatically parses KaTeX-rendered math and makes individual elements interactive:
```javascript
// After KaTeX renders λ(t) = t^α
window.Symbolizer.init();
// Now you can click on λ, t, or α independently!
```

**How it works:**
1. Scans DOM for `.katex` elements
2. Identifies interesting symbols (variables, Greek letters, functions)
3. Wraps each in `.math-element` with click handlers
4. Connects to knowledge graph for relationships
5. Triggers animations and margin notes on interaction

#### `equation-animator.js` - Bringing Math to Life
Provides 25+ animation effects:
- **Attention**: `pulse`, `wiggle`, `shake`, `tada`
- **Emphasis**: `glow`, `scale-up`, `breathe`
- **Relationships**: `connected`, `flow`
- **Composite**: `emphasize`, `super-emphasize`

```javascript
EquationAnimator.pulse(element);           // Subtle pulse
EquationAnimator.emphasize(element);       // Scale + glow
EquationAnimator.superEmphasize(element);  // Maximum drama
```

#### `knowledge-graph.js` - Conceptual Connections
Defines relationships between mathematical concepts:
```javascript
graph.addNode('lambda', {
  name: 'λ(t)',
  type: 'function',
  description: 'Scaling function...'
});

graph.addEdge('lambda', 'alpha', 'parameterized-by');

graph.addNote('lambda', {
  title: 'Scaling Function',
  content: '...',
  math: '\\lambda(t) = t^{\\alpha}',
  viz: vegaSpec,  // Optional Vega-Lite chart
  links: ['alpha', 't']
});
```

#### `margin-notes.js` - Click-to-Explore
Reveals explanatory content in the right gutter:
```javascript
// User clicks on α
MarginNotes.showNote('alpha', {
  title: 'Scaling Exponent',
  content: 'Controls the degree of time warping...',
  math: '0 < \\alpha \\leq 1',
  links: ['lambda']
});
```

#### `context-fab.js` - Adaptive UI
FAB shows different controls per section:
```javascript
// In Section 2 (Two-Tone Problem)
FAB shows: f₁ slider, f₂ slider, "Generate Signal" button

// In Section 3 (VST Formulation)
FAB shows: α slider, Q slider, bins/octave selector
```

## Usage

### Basic Setup
1. **Open `index.html`** in a modern browser
2. **Navigate** using left sidebar or scroll
3. **Click** on any equation element to explore
4. **Use FAB** (bottom-right) for interactive controls

### Interacting with Math

**Single Term:**
```
Click on α in λ(t) = t^α
→ Right margin shows: definition, valid range, relationship to λ
→ All instances of α pulse across the page
→ Related terms (λ, t) highlighted
```

**Multiple Terms (Ctrl+Click):**
```
Click α, then Ctrl+Click λ
→ Both selected
→ Margin shows their relationship
→ Connections between them visualized
```

**Equation Exploration:**
```
Click "Δf" in: Δf(f) ∝ f^(1-α)
→ Shows resolution concept
→ Chart comparing FFT vs VST resolution
→ Links to α, f for deeper exploration
```

### Extending the System

#### Add a New Concept
```javascript
// In knowledge-graph.js or main.js
graph.addNode('sigma', {
  name: 'σ',
  type: 'parameter',
  latex: '\\sigma',
  description: 'Decay parameter',
  color: '#28a745'
});

graph.addEdge('sigma', 'omega', 'derives');

graph.addNote('sigma', {
  title: 'Decay Parameter',
  content: 'Controls frequency selectivity: σ = ω/Q',
  math: '\\sigma = \\frac{\\omega}{Q}',
  links: ['omega', 'q']
});
```

#### Add a New Visualization
```javascript
// Create Vega-Lite spec
const data = [/* your data */];
const spec = graph.createVegaSpec('line', data, {
  xField: 'time',
  yField: 'value',
  xTitle: 'Time (s)',
  yTitle: 'Amplitude'
});

// Render to element
graph.renderChart('my-viz-id', spec);
```

#### Add Section-Specific Controls
```javascript
// In context-fab.js → defineContextControls()
this.controls.set('my-section', {
  title: 'My Section Controls',
  controls: [
    {
      type: 'range',
      id: 'my-param',
      label: 'My Parameter',
      min: 0,
      max: 10,
      value: 5,
      step: 0.1,
      onChange: (value) => {
        // Handle parameter change
      }
    }
  ]
});
```

## Typography & Styling

### Improved Math Rendering
KaTeX default looks dated. We fix this:
- **Larger base size**: 1.15em (inline), 1.25em (display)
- **Better spacing**: Letter-spacing, operator padding
- **Color coding**: Time (blue), frequency (red), parameters (green)
- **Interactive styling**: Hover effects, selection states

### Animation Classes
Apply directly to math elements:
```javascript
element.classList.add('pulse');          // Continuous pulsing
element.classList.add('glow');           // Blue glow
element.classList.add('emphasize');      // Scale + glow combo
element.classList.add('connected');      // Show relationship
```

Or use the animator:
```javascript
EquationAnimator.wiggle(element);        // One-shot wiggle
EquationAnimator.breathe(element);       // Continuous breathing
EquationAnimator.tada(element);          // Celebration!
```

## Technical Details

### Dependencies
- **KaTeX 0.16.9** - Math rendering
- **Vega 5** + **Vega-Lite 5** - Visualizations
- **Vanilla JavaScript** - No framework required
- **Modern CSS** - Grid, Custom Properties, Animations

### Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Performance
- **Lazy rendering**: Charts only render when section is visible
- **Event delegation**: Single listener for all math elements
- **Throttled animations**: Respects `prefers-reduced-motion`
- **Efficient re-renders**: Vega views updated in-place, not recreated

### Accessibility
- **Keyboard navigation**: Tab through sections, Esc to close notes
- **ARIA labels**: FAB, gutter toggles
- **Reduced motion**: All animations disabled if user prefers
- **Color contrast**: WCAG AA compliant

## Examples

### Creating a Physics Paper

1. **Write content** in `index.html`:
```html
<div class="equation-block" data-eq-id="schrodinger">
  <div class="equation-content">
    $$i\hbar\frac{\partial}{\partial t}\Psi = \hat{H}\Psi$$
  </div>
  <span class="equation-number">(1)</span>
</div>
```

2. **Define concepts** in knowledge graph:
```javascript
graph.addNode('hbar', {
  name: 'ℏ',
  latex: '\\hbar',
  description: 'Reduced Planck constant'
});

graph.addNote('hbar', {
  title: 'Reduced Planck Constant',
  content: 'ℏ = h/(2π) ≈ 1.055×10⁻³⁴ J·s',
  links: ['h']
});
```

3. **Add controls** for parameters:
```javascript
this.controls.set('quantum', {
  title: 'Quantum Parameters',
  controls: [{
    type: 'range',
    id: 'energy',
    label: 'Energy (eV)',
    min: 0,
    max: 10,
    value: 5,
    step: 0.1
  }]
});
```

4. **Result**: Interactive Schrödinger equation with:
- Click ℏ → See definition + value
- Click Ψ → See wavefunction concept + visualization
- Adjust energy → See wavefunction evolution

## Best Practices

### Equation Design
- **Fewer is better**: 5-7 key equations, deeply explained
- **Progressive disclosure**: Start simple, add complexity in margin notes
- **Visual hierarchy**: Use `featured` class for most important equations

### Margin Notes
- **Concise titles**: 2-4 words
- **Clear explanations**: What it means, why it matters
- **Include math**: Always show the mathematical definition
- **Link liberally**: Connect to 2-3 related concepts

### Animations
- **Purposeful**: Use animations to direct attention, not decorate
- **Consistent**: Same animation = same meaning across paper
- **Subtle**: `pulse` and `gentle-attention` for most cases
- **Dramatic sparingly**: `super-emphasize` for eureka moments only

### Visualizations
- **Responsive**: Charts should adapt to parameter changes
- **Clear axes**: Always label with units
- **Consistent colors**: Match variable colors in equations

## Roadmap

### Planned Features
- [ ] LaTeX → Markdown converter (auto-generate from .tex files)
- [ ] Export to static HTML (for arXiv submission)
- [ ] Touch gestures for mobile
- [ ] Audio narration sync
- [ ] Collaborative annotations
- [ ] Dark mode

### Extension Ideas
- Feynman diagram editor
- 3D visualizations (Three.js integration)
- Symbolic computation (SymPy.js)
- Real-time collaboration
- Version history for equations

## License

MIT License - Use freely for academic papers, educational content, research presentations.

## Citation

If you use this system for a published work, please cite:
```
@software{variable_math_markdown,
  title = {Variable Math Markdown: Interactive Mathematical Exposition},
  author = {[Your Name]},
  year = {2025},
  url = {https://github.com/yourusername/variable-math-markdown}
}
```

---

**Built with ❤️ for making mathematics more accessible and engaging.**
