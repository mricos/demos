# JSON Plugin Documentation

**Status:** Complete
**Version:** 1.0.0
**Date:** 2025-10-31

---

## Overview

The JSON Plugin provides a collapsible, color-coded JSON viewer for vecterm CLI output. It uses design token colors from the vecterm theme and provides interactive expand/collapse functionality.

---

## Features

✅ **Color-Coded Syntax**
- Keys: Cyan (`--color-base-1`)
- Strings: Green (`--color-base-4`)
- Numbers: Orange (`--color-base-6`)
- Booleans: Magenta (`--color-triad-1`)
- Null: Red (`--color-base-5`)
- Braces/Brackets: Light cyan (`--color-base-2`)

✅ **Collapsible Trees**
- Click ▶/▼ icons to expand/collapse
- Auto-collapse after depth 2 by default
- Shows item/key count when collapsed

✅ **Smart Display**
- Arrays: Shows first 50 items, then "... N more items"
- Strings: Truncates after 200 characters
- Max height with custom scrollbar

✅ **Interactive Effects**
- Glow effects on hover
- Smooth transitions
- CRT-themed scrollbar

---

## Commands

### View Full Redux State

```bash
vecterm> state
Redux State:
▼ {
  ▼ auth: {
      isLoggedIn: false
      username: null
    }
  ▼ contexts: {
    ...
  }
}
```

### View State Path

```bash
vecterm> state contexts
state.contexts:
▼ {
  ▼ quadrapong: {
      id: "quadrapong"
      gameId: "quadrapong"
      ...
    }
}
```

### Inspect Context

```bash
vecterm> load quadrapong
Context created: contexts.quadrapong

vecterm> inspect context quadrapong
Context: quadrapong
▼ {
    id: "quadrapong"
    gameId: "quadrapong"
    customName: null
    customizations: {}
    createdAt: "2025-10-31T14:00:00Z"
  }
```

### Inspect Field

```bash
vecterm> play quadrapong
Instance created: fields.quadrapong-001

vecterm> inspect field quadrapong-001
Field: quadrapong-001
▼ {
    id: "quadrapong-001"
    contextId: "quadrapong"
    gameId: "quadrapong"
    status: "running"
    mode: "3d"
    startedAt: "2025-10-31T14:05:00Z"
    instance: "<Game Instance>"
  }
```

---

## API Usage

### In Code

```javascript
import { cliLogJson } from './cli/terminal.js';
import { createJsonViewer } from './cli/json-renderer.js';

// Log JSON to CLI
cliLogJson(myData, {
  collapsedDepth: 2,      // Auto-collapse after depth 2
  maxArrayItems: 50,      // Show first 50 array items
  maxStringLength: 200,   // Truncate strings
  showDataTypes: false,   // Show type annotations
  rootCollapsed: false    // Start with root expanded
});

// Create standalone viewer
const viewer = createJsonViewer(myData, options);
document.body.appendChild(viewer);
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collapsedDepth` | number | 2 | Auto-collapse objects/arrays after this depth |
| `maxArrayItems` | number | 100 | Show first N items in arrays |
| `maxStringLength` | number | 500 | Truncate strings longer than N chars |
| `showDataTypes` | boolean | false | Show type annotations like `(string)` |
| `rootCollapsed` | boolean | false | Start with root object collapsed |

---

## Color Customization

Colors are defined via CSS custom properties in `style.css`:

```css
:root {
  --json-key: var(--color-base-1);           /* Cyan */
  --json-string: var(--color-base-4);        /* Green */
  --json-number: var(--color-base-6);        /* Orange */
  --json-boolean: var(--color-triad-1);      /* Magenta */
  --json-null: var(--color-base-5);          /* Red */
  --json-brace: var(--color-base-2);         /* Light cyan */
  --json-collapsed: var(--color-base-7);     /* Purple */
  --json-expand-icon: var(--color-base-3);   /* Accent blue */
}
```

To customize, override these CSS variables in your own stylesheet.

---

## Styling

The JSON viewer uses these CSS classes:

- `.json-viewer` - Main container
- Custom scrollbar with vecterm theme
- Hover effects with glow
- Smooth transitions

Example custom styling:

```css
.json-viewer {
  background: rgba(0, 0, 0, 0.5);  /* Darker background */
  border-color: var(--color-base-3);  /* Different border */
  max-height: 400px;  /* Shorter max height */
}
```

---

## Interactive Features

### Expand/Collapse

Click the ▶/▼ icon to toggle:
- ▶ = Collapsed (shows item count)
- ▼ = Expanded (shows contents)

### Hover Effects

- **Toggle icons**: Glow effect on hover
- **Keys**: Text shadow on parent div hover
- **Entire viewer**: Custom scrollbar highlights

### Keyboard Navigation

- Use arrow keys to scroll
- Click and drag scrollbar
- Mouse wheel to scroll vertically

---

## Examples

### Complex Nested Object

```bash
vecterm> state vecterm.entities
state.vecterm.entities:
▼ {
  ▼ cube-1: {
      id: "cube-1"
      type: "mesh"
      visible: true
      ▼ transform: {
          ▼ position: { x: 0, y: 0, z: 0 }
          ▼ rotation: { x: 0, y: 0, z: 0 }
          ▼ scale: { x: 1, y: 1, z: 1 }
        }
    }
}
```

### Large Array

```bash
vecterm> state canvasItems
state.canvasItems:
▼ [
    "item1"
    "item2"
    "item3"
    ...
    ... 47 more items
  ]
```

### Null and Boolean Values

```bash
vecterm> inspect context test
Context: test
▼ {
    customName: null          <- Red
    customizations: {}
    enabled: true             <- Magenta
  }
```

---

## Performance

- **Large Objects**: Auto-collapses at depth 2 to prevent slowdown
- **Long Arrays**: Only renders first 50 items by default
- **Long Strings**: Truncates at 200 characters
- **Memory**: Efficient DOM structure, minimal memory footprint

For very large datasets (>10,000 items), consider using `state <path>` to view specific sections.

---

## Integration with Vecterm

The JSON plugin integrates seamlessly with:

- **Redux State Inspector**: `state` command
- **Context Viewer**: `inspect context <name>`
- **Field Viewer**: `inspect field <name>`
- **Future Commands**: Any command that outputs structured data

---

## Future Enhancements

- [ ] Search/filter within JSON
- [ ] Copy path to clipboard
- [ ] Export to file
- [ ] Diff viewer (compare two JSON objects)
- [ ] JSON schema validation
- [ ] Syntax highlighting for regex, dates, etc.
- [ ] Minimap for large JSON trees

---

**End of Documentation**
