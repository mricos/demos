# SNN Documentation Protocol

## Overview
The documentation is loaded dynamically from `snn-docs.html` and uses **inline parameter controls** (like SIR) to communicate with the engine.

## Architecture

```
┌─────────────────┐        fetch        ┌──────────────────┐
│  index.html     │ ──────────────────> │  snn-docs.html   │
│  (Main App)     │                     │  (Documentation) │
└────────┬────────┘                     └────────┬─────────┘
         │                                       │
         │  ┌─────────────────────────────────┐  │
         └──┤   docsModal.setParam()          │◄─┘
            │   (Parameter Protocol)           │
            └─────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   app.network    │
              │   (SNN Engine)   │
              └──────────────────┘
```

## Parameter Protocol (SIR-style)

### Inline Parameter Controls

Embed clickable parameter values directly in documentation text using `<span class="param-set">`:

```html
<p>
    Try learning rate
    <span class="param-set" data-param="learningRate" data-value="0.01">η=0.01</span>,
    or faster:
    <span class="param-set" data-param="learningRate" data-value="0.05">η=0.05</span>
</p>
```

### Available Parameters

| Parameter | ID | Range | Description |
|-----------|-----|-------|-------------|
| Learning Rate | `learningRate` | 0.001-0.1 | Network weight update rate |
| Threshold | `threshold` | 0.5-2.0 | Neuron spike threshold V<sub>th</sub> |
| Tau | `tau` | 5-50 | Membrane time constant (ms) |
| Speed | `speed` | 1-100 | Training iterations per frame |

### How It Works

1. User clicks `<span class="param-set" data-param="learningRate" data-value="0.05">η=0.05</span>`
2. `docsModal.setParam('learningRate', '0.05')` is called
3. Function updates:
   - Control panel slider: `document.getElementById('learningRate').value = 0.05`
   - Display value: `document.getElementById('learningRateValue').textContent = 0.05`
   - Network state: `app.network.learningRate = 0.05`
4. Visual feedback: span briefly highlights

### Adding New Parameters

1. **Add to docs** (`snn-docs.html`):
```html
<span class="param-set" data-param="myParam" data-value="42">my=42</span>
```

2. **Add slider** to control panel (`index.html`):
```html
<input type="range" id="myParam" min="0" max="100" value="42">
<span id="myParamValue">42</span>
```

3. **Add handler** to `setParam()` (`app.js`):
```javascript
} else if (param === 'myParam') {
    app.myValue = val;
}
```

## Styling

Variables in text are styled with:
- `.param-set` - Blue background, monospace, clickable
- Hover effect: lighter background, slight lift
- Click feedback: brief highlight

## Console Logging

All parameter changes logged as:
```
[DocProtocol] Parameter set: learningRate = 0.05
```

## Example Usage

```html
<!-- In documentation -->
<p>
    The membrane threshold
    <span class="param-set" data-param="threshold" data-value="1.0">V<sub>th</sub>=1.0</span>
    controls neuron excitability. Try
    <span class="param-set" data-param="threshold" data-value="0.7">lower</span>
    or
    <span class="param-set" data-param="threshold" data-value="1.5">higher</span>
    values.
</p>
```

This creates clickable inline controls that directly manipulate the simulation while reading the documentation.
