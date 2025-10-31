# Interactive Terminal Controls API - Demo Guide

## Overview

The Interactive Controls API provides a powerful way to create clickable, interactive elements directly in the CLI terminal output. This allows you to build rich, responsive terminal UIs with color-coded tokens, mini popup controls, and Redux state manipulation.

## Features

### 1. **Colored Tab Completions** ✓ Implemented

Tab completions now use category-based color accents:

```
Possible completions: vecterm.demo, vecterm.spawn, console.vt100.help, game.vt100.wave
```

- **Base commands** → Cyan (`help`, `clear`, `state`)
- **vecterm.*** → Green (`vecterm.demo`, `vecterm.spawn`)
- **console.vt100.*** → Orange (`console.vt100.help`, `console.vt100.scanlines`)
- **game.vt100.*** → Purple (`game.vt100.wave`, `game.vt100.drift`)
- **gamepad.*** → Blue (`gamepad.status`, `gamepad.enable`)

### 2. **Clickable Tokens**

Create clickable text elements in terminal output:

```javascript
import { createClickableToken, cliLogHtml } from './cli/interactive-controls.js';

// Simple clickable token
const token = createClickableToken(
  'Click here',
  'green',
  () => console.log('Clicked!')
);

cliLogHtml(`Message: ${token}`);
```

**Options:**
- `text` - Display text
- `color` - Color class: `'cyan'`, `'green'`, `'orange'`, `'purple'`, `'blue'`
- `onClick` - Click handler callback
- `options.tooltip` - Hover tooltip text
- `options.underline` - Show underline (default: true)

### 3. **Mini Control Popups**

Interactive controls that appear inline in terminal output:

#### Slider Control

```javascript
import { addInteractiveControl } from './cli/interactive-controls.js';

addInteractiveControl({
  type: 'slider',
  label: 'Brightness',
  min: 0.5,
  max: 2.0,
  step: 0.05,
  value: 1.0,
  unit: '',
  onChange: (value) => {
    store.dispatch({ type: 'SET_BRIGHTNESS', payload: value });
  }
});
```

#### Toggle Control

```javascript
addInteractiveControl({
  type: 'toggle',
  label: 'VT100 Effects',
  value: true,
  onChange: (enabled) => {
    store.dispatch({ type: 'TOGGLE_VT100', payload: enabled });
  }
});
```

#### Select/Dropdown Control

```javascript
addInteractiveControl({
  type: 'select',
  label: 'Grid Type',
  options: [
    { label: 'Cartesian', value: 'cartesian' },
    { label: 'Polar', value: 'polar' },
    { label: 'None', value: 'none' }
  ],
  value: 'cartesian',
  onChange: (gridType) => {
    store.dispatch({ type: 'SET_GRID_TYPE', payload: gridType });
  }
});
```

#### Button Group Control

```javascript
addInteractiveControl({
  type: 'buttons',
  label: 'Quick Actions',
  buttons: [
    { label: 'Reset', value: 'reset' },
    { label: 'Save', value: 'save' },
    { label: 'Load', value: 'load' }
  ],
  onChange: (action) => {
    handleQuickAction(action);
  }
});
```

### 4. **Command Token Groups**

Create groups of clickable command shortcuts:

```javascript
import { createCommandTokens, cliLogHtml } from './cli/interactive-controls.js';

const tokens = createCommandTokens([
  {
    text: 'vecterm.demo',
    color: 'green',
    onClick: () => processCLICommand('vecterm.demo'),
    tooltip: 'Launch demo mode'
  },
  {
    text: 'console.vt100.reset',
    color: 'orange',
    onClick: () => processCLICommand('console.vt100.reset'),
    tooltip: 'Reset VT100 effects'
  },
  {
    text: 'help',
    color: 'cyan',
    onClick: () => processCLICommand('help'),
    tooltip: 'Show help'
  }
]);

cliLogHtml(`Quick commands: ${tokens}`);
```

## Usage Examples

### Example 1: Interactive Settings Panel

```javascript
import { addInteractiveControl, cliLog } from './cli/interactive-controls.js';

function showSettingsPanel() {
  cliLog('VT100 Display Settings', 'success');

  addInteractiveControl({
    type: 'slider',
    label: 'Scanlines',
    min: 0,
    max: 1,
    step: 0.05,
    value: 0.15,
    onChange: (v) => store.dispatch(setScanlines(v))
  });

  addInteractiveControl({
    type: 'slider',
    label: 'Glow',
    min: 0,
    max: 1,
    step: 0.05,
    value: 0.4,
    onChange: (v) => store.dispatch(setGlow(v))
  });

  addInteractiveControl({
    type: 'toggle',
    label: 'Effects',
    value: true,
    onChange: (enabled) => store.dispatch(toggleEffects(enabled))
  });
}
```

### Example 2: Game Selector with Clickable Tokens

```javascript
import { createClickableToken, cliLogHtml } from './cli/interactive-controls.js';

function showAvailableGames(games) {
  const gameTokens = games.map(game =>
    createClickableToken(
      game.name,
      'cyan',
      () => processCLICommand(`load ${game.id}`),
      { tooltip: `Load ${game.name}` }
    )
  ).join(' | ');

  cliLogHtml(`Available games: ${gameTokens}`);
}
```

### Example 3: Context Menu

```javascript
import { addInteractiveControl } from './cli/interactive-controls.js';

function showContextMenu(entityId) {
  addInteractiveControl({
    type: 'buttons',
    label: `Entity ${entityId}`,
    buttons: [
      { label: 'Inspect', value: 'inspect' },
      { label: 'Delete', value: 'delete' },
      { label: 'Clone', value: 'clone' }
    ],
    onChange: (action) => handleEntityAction(entityId, action)
  });
}
```

## Integration with Existing Code

### In Command Processor

```javascript
// cli/command-processor.js
import { addInteractiveControl, createClickableToken } from './interactive-controls.js';

// Add to command handlers
case 'settings':
  showInteractiveSettings();
  break;

function showInteractiveSettings() {
  cliLog('Interactive Settings Panel', 'success');

  addInteractiveControl({
    type: 'slider',
    label: 'Camera Zoom',
    min: 0.5,
    max: 3.0,
    step: 0.1,
    value: 1.0,
    onChange: (zoom) => {
      store.dispatch({ type: 'SET_CAMERA_ZOOM', payload: zoom });
    }
  });
}
```

### In Tab Completion (Already Integrated)

```javascript
// cli/tab-completion.js
import { cliLogHtml } from './terminal.js';

// Colored completions
const coloredCompletions = formatCompletionsWithColors(matches);
cliLogHtml(`Possible completions: ${coloredCompletions}`, 'success');
```

## Color Palette

The token colors map to the design system:

- **Cyan** (`token-cyan`): `#4fc3f7` - Primary, base commands
- **Green** (`token-green`): `#00ff88` - Success, vecterm commands
- **Orange** (`token-orange`): `#ffa726` - Warning, console commands
- **Purple** (`token-purple`): `#ab47bc` - Secondary, game commands
- **Blue** (`token-blue`): `#29b6f6` - Accent, input commands

## API Reference

### Functions

#### `createClickableToken(text, color, onClick, options)`
Returns HTML string for clickable token.

#### `createMiniControl(config)`
Returns HTMLElement for interactive control.

#### `addInteractiveControl(config)`
Adds control to CLI output, returns HTMLElement.

#### `createCommandTokens(commands)`
Returns HTML string with multiple clickable tokens.

### Control Types

- `slider` - Range slider with value display
- `toggle` - ON/OFF button
- `select` - Dropdown menu
- `buttons` - Button group

## Styling

All controls use the existing design token system and match the VT100 aesthetic:

- Background: `rgba(79, 195, 247, 0.08)`
- Border: `var(--color-base-1)`
- Font: `var(--font-code)`
- Animations: Slide-in effects

## Future Enhancements

Potential additions to the API:

1. **Color picker control**
2. **Text input field**
3. **Multi-select checkbox group**
4. **Nested menu controls**
5. **Drag-and-drop file uploader**
6. **Progress bar indicator**
7. **Chart/graph mini-visualizations**

## Notes

- All click handlers are stored in `window._cliClickHandlers` registry
- Controls auto-scroll the terminal output
- Close button (×) on all popup controls
- Hover effects and transitions included
- Fully keyboard accessible

## Testing

Try it out in the vecterm console:

1. Open the vecterm demo
2. Press Tab after typing partial commands
3. See colored completions
4. Type `vecterm.camera.zoom` and press Tab
5. Interact with the slider control

Enjoy building rich, interactive terminal experiences!
