# ScrollPhase.js

A global view orchestrator for implementing ASDR-style envelope transitions on scrolling content.

## Overview

ScrollPhase.js provides a clean, modular way to create smooth visual transitions based on scroll position. Content elements transition through phases similar to an ADSR envelope in audio synthesis:

- **Attack**: Item enters viewport (small, faded)
- **Sustain**: Item is in full view (full size, full opacity)
- **Decay**: Item begins to exit (fading)
- **Release**: Item leaves viewport (small, faded)

## Features

- ✨ ASDR-style envelope-based transitions
- 🎯 Precise scroll position tracking
- 📌 Automatic pinning support (sticky top/bottom)
- 🚀 GPU-accelerated animations
- 🔄 IntersectionObserver for performance
- 🎛️ Customizable envelopes per item
- 🪝 Event callbacks for state changes
- 🐛 Built-in debug panel
- 📦 Zero dependencies

## Quick Start

```html
<!-- Include ScrollPhase -->
<script src="ScrollPhase.js"></script>

<!-- Inject default CSS -->
<script>
  ScrollPhase.injectCSS();
</script>

<!-- Create instance and register items -->
<script>
  const scrollPhase = new ScrollPhase();

  // Register elements
  const element = document.querySelector('.my-element');
  scrollPhase.register('my-item', element);
</script>
```

## Installation

Simply include `ScrollPhase.js` in your HTML:

```html
<script src="ScrollPhase.js"></script>
```

Or import as a module:

```javascript
import ScrollPhase from './ScrollPhase.js';
```

## Basic Usage

### 1. Create an Instance

```javascript
const scrollPhase = new ScrollPhase({
  // Optional configuration
  debug: false,
  throttleMs: 16,
  useIntersectionObserver: true
});
```

### 2. Inject Default CSS

```javascript
ScrollPhase.injectCSS();
```

This adds base styles for transitions, size variants, and pinning.

### 3. Register Elements

```javascript
// Register with auto-generated ID from data attribute
document.querySelectorAll('[data-scroll-phase]').forEach(el => {
  const id = el.getAttribute('data-scroll-phase');
  scrollPhase.register(id, el);
});
```

### 4. Customize (Optional)

```javascript
// Custom envelope for specific item
scrollPhase.setEnvelope('my-item', {
  attackEnd: 0.15,
  sustainStart: 0.35,
  sustainEnd: 0.65,
  decayEnd: 0.85
});
```

## Configuration Options

### Constructor Options

```javascript
new ScrollPhase({
  // ASDR envelope thresholds (0.0 to 1.0)
  envelope: {
    attackEnd: 0.2,      // End of attack phase
    sustainStart: 0.4,   // Start of sustain (full view)
    sustainEnd: 0.6,     // End of sustain
    decayEnd: 0.8        // End of decay phase
  },

  // Visual state presets
  states: {
    entering: { size: 'small', opacity: 0.3, pinned: null },
    rising: { size: 'small', opacity: 1, pinned: null },
    full: { size: 'full', opacity: 1, pinned: null },
    fading: { size: 'full', opacity: 0.6, pinned: null },
    exiting: { size: 'small', opacity: 0.3, pinned: null },
    pinnedTop: { size: 'small', opacity: 0.8, pinned: 'top' },
    pinnedBottom: { size: 'small', opacity: 0.8, pinned: 'bottom' }
  },

  // Event callbacks
  onStateChange: (item, prevState, newState) => {
    console.log(`${item.id}: ${prevState} → ${newState}`);
  },

  onPin: (item, position) => {
    console.log(`${item.id} pinned to ${position}`);
  },

  onUnpin: (item) => {
    console.log(`${item.id} unpinned`);
  },

  // Performance
  throttleMs: 16,                    // Throttle scroll events (~60fps)
  useIntersectionObserver: true,     // Use IO for efficiency

  // Debug
  debug: false                        // Enable debug panel
});
```

## API Reference

### Methods

#### `register(id, element, customEnvelope?)`

Register an element for scroll phase tracking.

```javascript
const item = scrollPhase.register('header', headerElement, {
  attackEnd: 0.15,
  sustainStart: 0.3,
  sustainEnd: 0.7,
  decayEnd: 0.85
});
```

**Parameters:**
- `id` (string): Unique identifier
- `element` (HTMLElement): DOM element to track
- `customEnvelope` (object, optional): Custom ASDR envelope

**Returns:** Item data object

---

#### `unregister(id)`

Unregister an item.

```javascript
scrollPhase.unregister('header');
```

---

#### `getState(id)`

Get current state of an item.

```javascript
const state = scrollPhase.getState('my-item');
// Returns: { state, ratio, isPinned, isVisible }
```

---

#### `setState(id, stateName)`

Manually override the state for an item.

```javascript
scrollPhase.setState('my-item', 'full');
```

---

#### `setEnvelope(id, envelope)`

Update envelope thresholds for a specific item.

```javascript
scrollPhase.setEnvelope('my-item', {
  attackEnd: 0.25,
  sustainStart: 0.45
});
```

---

#### `updateAllItems()`

Force update of all registered items.

```javascript
scrollPhase.updateAllItems();
```

---

#### `destroy()`

Clean up and destroy the instance.

```javascript
scrollPhase.destroy();
```

---

### Static Methods

#### `ScrollPhase.injectCSS()`

Inject default CSS styles into the page.

```javascript
ScrollPhase.injectCSS();
```

## CSS Classes

ScrollPhase automatically applies these classes to elements:

### State Classes
- `.sp-entering` - Attack phase
- `.sp-rising` - Rising to sustain
- `.sp-full` - Sustain phase
- `.sp-fading` - Decay phase
- `.sp-exiting` - Release phase

### Size Classes
- `.sp-size-small` - Scaled to 75%
- `.sp-size-full` - Full size (100%)

### Pinning Classes
- `.sp-pinned` - Element is pinned
- `.sp-pinned-top` - Pinned to top
- `.sp-pinned-bottom` - Pinned to bottom

### Custom Properties
- `--sp-opacity` - Current opacity value

## Customizing Styles

Override the default styles by targeting the classes:

```css
/* Custom entering state */
.sp-entering {
  transform: scale(0.5) rotate(-5deg);
  filter: blur(4px) grayscale(1);
}

/* Custom full state */
.sp-full {
  transform: scale(1.05);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* Custom transitions */
[data-scroll-phase] {
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.4s ease-out,
              filter 0.5s ease-out;
}
```

## Events and Callbacks

### onStateChange

Called when an item transitions between states.

```javascript
onStateChange: (item, prevState, newState) => {
  console.log(`${item.id} changed from ${prevState} to ${newState}`);

  // Example: Trigger analytics
  if (newState === 'full') {
    analytics.track('content_viewed', { id: item.id });
  }
}
```

### onPin / onUnpin

Called when an item is pinned or unpinned.

```javascript
onPin: (item, position) => {
  console.log(`${item.id} pinned to ${position}`);
  item.element.classList.add('is-sticky');
},

onUnpin: (item) => {
  console.log(`${item.id} unpinned`);
  item.element.classList.remove('is-sticky');
}
```

## Advanced Usage

### Custom State Definitions

Define your own visual states:

```javascript
const scrollPhase = new ScrollPhase({
  states: {
    entering: { size: 'small', opacity: 0, pinned: null },
    spotlight: { size: 'full', opacity: 1, pinned: null },
    dimmed: { size: 'full', opacity: 0.4, pinned: null },
    exiting: { size: 'small', opacity: 0, pinned: null }
  }
});
```

### Per-Item Envelopes

Different items can have different transition timings:

```javascript
// Fast transitions for headers
scrollPhase.setEnvelope('header', {
  attackEnd: 0.1,
  sustainStart: 0.2,
  sustainEnd: 0.8,
  decayEnd: 0.9
});

// Slow, dramatic transitions for hero sections
scrollPhase.setEnvelope('hero', {
  attackEnd: 0.3,
  sustainStart: 0.4,
  sustainEnd: 0.6,
  decayEnd: 0.7
});
```

### Dynamic Registration

Register items dynamically as they're added to the DOM:

```javascript
function addContent(content) {
  const item = document.createElement('div');
  item.className = 'scroll-item';
  item.innerHTML = content;
  item.dataset.scrollPhase = `item-${Date.now()}`;

  document.body.appendChild(item);

  scrollPhase.register(
    item.dataset.scrollPhase,
    item
  );
}
```

### Scroll Progress Tracking

Use scroll ratio for custom behaviors:

```javascript
onStateChange: (item, prevState, newState) => {
  const state = scrollPhase.getState(item.id);
  const progress = Math.max(0, Math.min(1, state.ratio));

  // Update a progress bar
  item.element.style.setProperty('--progress', progress);
}
```

```css
.scroll-item::after {
  content: '';
  width: calc(var(--progress) * 100%);
  height: 3px;
  background: gold;
}
```

## Performance Tips

1. **Use IntersectionObserver** (enabled by default)
   ```javascript
   useIntersectionObserver: true
   ```

2. **Adjust throttle based on content**
   ```javascript
   throttleMs: 16  // ~60fps (default)
   throttleMs: 33  // ~30fps (for heavy pages)
   ```

3. **GPU-accelerate custom styles**
   ```css
   .scroll-item {
     will-change: transform, opacity;
     transform: translateZ(0); /* Force GPU layer */
   }
   ```

4. **Limit registered items**
   - Only register items that need phase transitions
   - Unregister items that are removed from DOM

## Debug Mode

Enable debug mode to see real-time state information:

```javascript
const scrollPhase = new ScrollPhase({
  debug: true
});
```

This creates a floating panel showing:
- Number of registered items
- Current state of each item
- Scroll ratio
- Pin status
- Visibility status

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

Requires:
- ES6 (classes, arrow functions, Map)
- IntersectionObserver (or fallback to scroll events)
- CSS transforms and transitions

## Examples

### Example 1: Blog Posts

```javascript
ScrollPhase.injectCSS();

const scrollPhase = new ScrollPhase({
  onStateChange: (item, prev, curr) => {
    if (curr === 'full') {
      // Track "read" event when post is fully visible
      trackRead(item.id);
    }
  }
});

document.querySelectorAll('.blog-post').forEach(post => {
  scrollPhase.register(post.id, post);
});
```

### Example 2: Image Gallery

```javascript
const gallery = new ScrollPhase({
  states: {
    entering: { size: 'small', opacity: 0, pinned: null },
    full: { size: 'full', opacity: 1, pinned: null },
    exiting: { size: 'small', opacity: 0, pinned: null }
  },
  envelope: {
    attackEnd: 0.3,
    sustainStart: 0.4,
    sustainEnd: 0.6,
    decayEnd: 0.7
  }
});

document.querySelectorAll('.gallery-item').forEach((img, i) => {
  gallery.register(`img-${i}`, img);
});
```

### Example 3: Sticky Sections

```javascript
const stickyScroll = new ScrollPhase({
  onPin: (item, position) => {
    item.element.classList.add('is-stuck');
  },
  onUnpin: (item) => {
    item.element.classList.remove('is-stuck');
  }
});

document.querySelectorAll('.section-header').forEach(header => {
  stickyScroll.register(header.id, header);
});
```

## Architecture Notes

### State Machine

Each item transitions through states based on its scroll ratio:

```
scrollRatio < 0          → pinnedTop
0 - attackEnd            → entering
attackEnd - sustainStart → rising
sustainStart - sustainEnd → full
sustainEnd - decayEnd    → fading
decayEnd - 1.2           → exiting
scrollRatio > 1.2        → pinnedBottom
```

### Scroll Ratio Calculation

```javascript
const itemCenter = rect.top + rect.height / 2;
const scrollRatio = itemCenter / viewportHeight;
```

- `0.0` = top of viewport
- `0.5` = center of viewport
- `1.0` = bottom of viewport

### Performance Strategy

1. IntersectionObserver identifies visible items
2. Only visible items are updated on scroll
3. RequestAnimationFrame batches DOM updates
4. CSS transforms use GPU acceleration
5. Throttling prevents excessive recalculations

## License

MIT

## Credits

Designed and implemented by mricos based on ASDR envelope synthesis principles.

## Contributing

Issues and pull requests welcome! Please maintain the existing code style and add tests for new features.
