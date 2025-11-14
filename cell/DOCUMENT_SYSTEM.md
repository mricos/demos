# CellUI Document System

A convention-based document system for CellUI that enables:
- **Data-driven controls** with auto-binding to state
- **Reactive variables** with LaTeX rendering
- **HTML-based tabs/subtabs** structure
- **Live documentation** that updates as parameters change

## Quick Start

See `sir-cui/index.html` for a complete working example with the document system integrated.

## Architecture

### 1. Controls (`cui-controls.js`)

Create data-driven controls from JavaScript configuration:

```javascript
CUI.Controls.create({
  containerId: 'controls',
  controls: [
    {
      type: 'range',
      id: 'beta',
      label: 'Transmission rate β',
      min: 0,
      max: 1,
      step: 0.01,
      value: 0.5,
      format: (v) => v.toFixed(2),
      unit: ' 1/s',
      stateKey: 'var.beta',  // Bind to state
      onChange: (value) => {
        // Handle changes
      }
    }
  ]
});
```

**Features:**
- Auto-generates control rows with labels and value displays
- Two-way binding to `CUI.State`
- Custom formatters and units
- Individual and global change handlers
- Optional Redux integration

### 2. Variables (`cui-variables.js`)

Define variables once, reference everywhere:

```html
<!-- Define in HTML -->
<dfn data-var-def="R0" data-latex="R_0" data-value="2.5">
  Basic Reproduction Number
</dfn>

<!-- Reference (auto-updates when value changes) -->
<p>The <span data-var-ref="R0" data-format="latex"></span> is currently
   <span data-var-ref="R0" data-format="value"></span></p>

<!-- Two-way bind to input -->
<input data-var-bind="R0" type="number" />
```

**Data Attributes:**
- `data-var-def="id"` - Define variable
- `data-latex="..."` - LaTeX notation
- `data-value="..."` - Initial value
- `data-unit="..."` - Unit (e.g., "px", "m/s")

**References:**
- `data-var-ref="id"` - Reference variable
- `data-format="plain|latex|value|both"` - Display format
- `data-var-bind="id"` - Two-way binding

**JavaScript API:**
```javascript
// Scan HTML definitions
CUI.Variables.scanDefinitions();

// Bind all references
CUI.Variables.bindAll();

// Manual definition
CUI.Variables.define('beta', {
  latex: '\\beta',
  value: 0.5,
  format: (v) => v.toFixed(2),
  unit: '1/s'
});

// Get/Set values
CUI.Variables.getValue('beta');
CUI.Variables.setValue('beta', 0.7);
```

### 3. LaTeX Rendering (`cui-latex.js`)

Render LaTeX with KaTeX (or fallback to Unicode):

```html
<!-- Include KaTeX CSS/JS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>

<!-- Inline LaTeX -->
<span data-latex-inline="\frac{dS}{dt}"></span>

<!-- Display mode LaTeX -->
<div data-latex-display="\int_0^\infty e^{-x} dx = 1"></div>

<!-- Generic (defaults to inline) -->
<span data-latex="R_0"></span>
```

**JavaScript API:**
```javascript
// Render to string
const html = CUI.LaTeX.render('R_0', true); // inline=true

// Render into element
CUI.LaTeX.renderInto(element, '\\beta', true);

// Auto-render all
CUI.LaTeX.autoRenderAll();
```

**Fallback (no KaTeX):**
Simple Unicode replacement:
- `R_0` → R₀
- `x^2` → x²
- `\beta` → β
- `\gamma` → γ

### 4. Document Panel with Tabs/Subtabs (`cui-docpanel-enhanced.js`)

Build tab structure from HTML:

```html
<div class="docpanel" id="docpanel" data-cui-docpanel>
  <div class="docbody">

    <!-- Main tab -->
    <section data-tab="overview" data-label="Overview">

      <!-- Subtabs within -->
      <div data-subtab="intro" data-label="Introduction">
        <p>Content...</p>
      </div>

      <div data-subtab="math" data-label="Mathematics">
        <p>Equations...</p>
      </div>

    </section>

    <!-- Another main tab -->
    <section data-tab="controls" data-label="Controls">
      <p>Control reference...</p>
    </section>

  </div>
</div>
```

**JavaScript API:**
```javascript
// Create from HTML structure
const panel = CUI.DocPanel.createFromHTML('docpanel');

// Programmatic control
panel.activateTab(1);
panel.activateSubtab(0, 2);

// Get active tab
const activeTab = panel.getActiveTab();

// Listen for changes
CUI.Events.on('cui:docpanel:tab-changed', (data) => {
  console.log('Tab changed:', data.tabId);
});
```

## CSS Classes

### Variables
```css
[data-var-def]     /* Variable definitions (dotted underline) */
.var-ref           /* Variable references (highlighted) */
.var-latex         /* LaTeX-rendered variables */
.var-binding       /* Two-way bound inputs (special border) */
.latex-inline      /* Inline LaTeX */
.latex-display     /* Display mode LaTeX (centered, block) */
```

### Tabs
```css
.tabs              /* Tab container */
.tab               /* Tab button */
.tab[aria-selected="true"]  /* Active tab */

.subtabs           /* Subtab container */
.subtabs.active    /* Visible subtabs */
.subtab            /* Subtab button */
.subtab[aria-selected="true"]  /* Active subtab */
```

## State Management

All systems integrate with `CUI.State`:

```javascript
// Controls automatically set state
CUI.Controls.create({...});  // Sets state on change

// Variables read/write state
CUI.Variables.setValue('beta', 0.5);  // Sets state.var.beta

// Subscribe to changes
CUI.State.subscribe('var.beta', (newValue, oldValue) => {
  console.log('Beta changed:', newValue);
});
```

**State keys:**
- Controls: `stateKey` config option (default: control ID)
- Variables: `var.{variableId}`

## Integration with Existing Code

### With Redux
```javascript
CUI.Controls.create({
  useRedux: true,
  controls: [
    {
      id: 'beta',
      reduxAction: 'UPDATE_BETA',  // Redux action type
      // ...
    }
  ]
});
```

### With Existing Sliders
```javascript
// Bind existing input to variable system
const input = document.getElementById('existingSlider');
CUI.Variables.bindInput(input, 'beta');
```

## Example: Complete Document

```html
<!doctype html>
<html>
<head>
  <!-- KaTeX -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">

  <!-- CUI Styles -->
  <link rel="stylesheet" href="css/cui-base.css">
  <link rel="stylesheet" href="css/cui-components.css">
</head>
<body>

<!-- Define variables in documentation -->
<dfn data-var-def="beta" data-latex="\beta" data-value="0.5">
  Transmission Rate
</dfn>

<!-- Reference variables (auto-updates) -->
<p>Current β = <span data-var-ref="beta" data-format="value"></span></p>

<!-- Controls drawer -->
<div class="drawer" id="drawer">
  <div class="drawer-controls" id="controls"></div>
</div>

<!-- Documentation with tabs -->
<div class="docpanel" id="docpanel" data-cui-docpanel>
  <div class="docbody">
    <section data-tab="overview" data-label="Overview">
      <div data-subtab="intro" data-label="Introduction">...</div>
      <div data-subtab="math" data-label="Mathematics">...</div>
    </section>
  </div>
</div>

<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="js/cui-core.js"></script>
<script src="js/cui-tokens.js"></script>
<script src="js/cui-lifecycle.js"></script>
<script src="js/cui-fab.js"></script>
<script src="js/cui-latex.js"></script>
<script src="js/cui-variables.js"></script>
<script src="js/cui-controls.js"></script>
<script src="js/cui-docpanel-enhanced.js"></script>

<script>
CUI.ready(() => {
  // Initialize variables
  CUI.Variables.scanDefinitions();
  CUI.Variables.bindAll();

  // Create controls
  CUI.Controls.create({
    containerId: 'controls',
    controls: [
      {
        type: 'range',
        id: 'beta',
        label: 'Transmission β',
        min: 0,
        max: 1,
        step: 0.01,
        value: 0.5,
        stateKey: 'var.beta'  // Bind to variable
      }
    ]
  });

  // Create documentation panel
  CUI.DocPanel.createFromHTML('docpanel');
});
</script>

</body>
</html>
```

## Benefits

### Convention over Configuration
- Use HTML `data-*` attributes instead of complex configs
- Content lives in HTML, not JavaScript objects
- Self-documenting code

### Reactive by Default
- Variables automatically update UI when changed
- Controls automatically sync with state
- No manual DOM manipulation

### LaTeX Support
- Full KaTeX rendering for equations
- Fallback to Unicode symbols
- Define once, render everywhere

### Modular & Composable
- Each module works independently
- Integrate what you need
- Build on existing CUI.State system

## Module Loading Order

```html
<!-- Core (required first) -->
<script src="js/cui-core.js"></script>
<script src="js/cui-tokens.js"></script>
<script src="js/cui-lifecycle.js"></script>

<!-- Base components -->
<script src="js/cui-fab.js"></script>

<!-- Document system (order doesn't matter) -->
<script src="js/cui-latex.js"></script>
<script src="js/cui-variables.js"></script>
<script src="js/cui-controls.js"></script>
<script src="js/cui-docpanel-enhanced.js"></script>
```

## Browser Compatibility

- Modern browsers (ES6+)
- KaTeX requires IE 11+ or modern browsers
- Fallback rendering works without KaTeX

## Performance

- **Variable binding**: O(n) where n = number of references
- **LaTeX rendering**: Cached by KaTeX, fast re-renders
- **State updates**: Only affected elements re-render
- **Tab switching**: Show/hide, no re-rendering

## See Also

- `sir-cui/index.html` - Complete working example with document system
- `js/cui-*.js` - Module source code
- `css/cui-components.css` - Variable & component styles
- `README.md` - Main CellUI documentation
