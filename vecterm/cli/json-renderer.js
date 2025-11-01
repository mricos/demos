/**
 * JSON Renderer Plugin
 *
 * Renders JSON with vecterm design token colors and collapsible functionality.
 */

/**
 * Design token color mapping for JSON types
 */
const JSON_COLORS = {
  key: 'var(--color-base-1)',           // Cyan for keys
  string: 'var(--color-base-4)',        // Green for string values
  number: 'var(--color-base-6)',        // Orange for numbers
  boolean: 'var(--color-triad-1)',      // Magenta for booleans
  null: 'var(--color-base-5)',          // Red for null
  brace: 'var(--color-base-2)',         // Light cyan for braces/brackets
  collapsed: 'var(--color-base-7)',     // Purple for collapsed indicator
  expandIcon: 'var(--color-base-3)'     // Accent blue for expand/collapse icons
};

/**
 * Create a collapsible JSON viewer
 *
 * @param {Object} data - JSON data to render
 * @param {Object} options - Rendering options
 * @returns {HTMLElement} DOM element with rendered JSON
 */
export function createJsonViewer(data, options = {}) {
  const {
    collapsedDepth = 2,     // Auto-collapse after this depth
    maxArrayItems = 100,    // Show first N items in arrays
    maxStringLength = 500,  // Truncate long strings
    showDataTypes = false,  // Show type annotations
    rootCollapsed = false,  // Start with root collapsed
    enableMapping = false,  // Enable MIDI mapping via long-click
    onMapParameter = null   // Callback when parameter is long-clicked: (path, value) => {}
  } = options;

  const container = document.createElement('div');
  container.className = 'json-viewer';
  container.style.fontFamily = 'var(--font-code)';
  container.style.fontSize = 'var(--font-size-sm)';
  container.style.lineHeight = '1.5';
  container.style.userSelect = 'text';

  let uniqueId = 0;
  let pressTimer = null;

  // Build parameter path as we traverse the tree
  function buildPath(pathParts) {
    return pathParts.filter(p => p !== null).join('.');
  }

  function render(obj, depth = 0, key = null, parentDiv = container, pathParts = []) {
    const currentPath = key !== null ? [...pathParts, key] : pathParts;
    const line = document.createElement('div');
    line.style.paddingLeft = `${depth * 16}px`;
    line.style.display = 'flex';
    line.style.alignItems = 'flex-start';

    const isCollapsible = obj !== null && typeof obj === 'object' && Object.keys(obj).length > 0;
    const shouldAutoCollapse = depth >= collapsedDepth || (depth === 0 && rootCollapsed);

    // Collapse/expand icon
    if (isCollapsible) {
      const toggleId = `json-toggle-${uniqueId++}`;
      const icon = document.createElement('span');
      icon.id = toggleId;
      icon.style.color = JSON_COLORS.expandIcon;
      icon.style.cursor = 'pointer';
      icon.style.marginRight = 'var(--space-xs)';
      icon.style.fontWeight = 'bold';
      icon.style.userSelect = 'none';
      icon.style.minWidth = '12px';
      icon.textContent = shouldAutoCollapse ? '▶' : '▼';

      const contentDiv = document.createElement('div');
      contentDiv.id = `${toggleId}-content`;
      contentDiv.style.display = shouldAutoCollapse ? 'none' : 'block';
      contentDiv.style.width = '100%';

      icon.addEventListener('click', () => {
        const isCollapsed = contentDiv.style.display === 'none';
        contentDiv.style.display = isCollapsed ? 'block' : 'none';
        icon.textContent = isCollapsed ? '▼' : '▶';
      });

      line.appendChild(icon);

      // Render key if exists
      if (key !== null) {
        const keySpan = document.createElement('span');
        keySpan.style.color = JSON_COLORS.key;
        keySpan.style.fontWeight = 'bold';
        keySpan.textContent = `"${key}": `;
        line.appendChild(keySpan);
      }

      // Opening brace/bracket
      const openBrace = document.createElement('span');
      openBrace.style.color = JSON_COLORS.brace;
      openBrace.textContent = Array.isArray(obj) ? '[' : '{';
      line.appendChild(openBrace);

      // Collapsed indicator
      if (shouldAutoCollapse) {
        const collapsedIndicator = document.createElement('span');
        collapsedIndicator.style.color = JSON_COLORS.collapsed;
        collapsedIndicator.style.marginLeft = 'var(--space-xs)';
        collapsedIndicator.style.fontStyle = 'italic';
        const count = Array.isArray(obj) ? obj.length : Object.keys(obj).length;
        collapsedIndicator.textContent = Array.isArray(obj)
          ? `${count} items`
          : `${count} keys`;
        line.appendChild(collapsedIndicator);
      }

      parentDiv.appendChild(line);

      // Render children
      if (Array.isArray(obj)) {
        const itemsToShow = obj.slice(0, maxArrayItems);
        itemsToShow.forEach((item, index) => {
          render(item, depth + 1, null, contentDiv, currentPath);
        });
        if (obj.length > maxArrayItems) {
          const ellipsis = document.createElement('div');
          ellipsis.style.paddingLeft = `${(depth + 1) * 16}px`;
          ellipsis.style.color = JSON_COLORS.collapsed;
          ellipsis.style.fontStyle = 'italic';
          ellipsis.textContent = `... ${obj.length - maxArrayItems} more items`;
          contentDiv.appendChild(ellipsis);
        }
      } else {
        Object.entries(obj).forEach(([k, v]) => {
          render(v, depth + 1, k, contentDiv, currentPath);
        });
      }

      // Closing brace/bracket
      const closeLine = document.createElement('div');
      closeLine.style.paddingLeft = `${depth * 16}px`;
      const closeBrace = document.createElement('span');
      closeBrace.style.color = JSON_COLORS.brace;
      closeBrace.textContent = Array.isArray(obj) ? ']' : '}';
      closeLine.appendChild(closeBrace);
      contentDiv.appendChild(closeLine);

      parentDiv.appendChild(contentDiv);

    } else {
      // Non-collapsible (primitives)
      const fullPath = buildPath(currentPath);

      // Make line interactive if mapping is enabled
      if (enableMapping && (typeof obj === 'number' || typeof obj === 'boolean')) {
        line.style.cursor = 'pointer';
        line.style.transition = 'background-color 0.2s';
        line.dataset.path = fullPath;
        line.dataset.value = obj;

        // Hover effect
        line.addEventListener('mouseenter', () => {
          line.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
        });
        line.addEventListener('mouseleave', () => {
          line.style.backgroundColor = 'transparent';
        });

        // Long-press to map (desktop)
        line.addEventListener('mousedown', (e) => {
          pressTimer = setTimeout(() => {
            line.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
            if (onMapParameter) {
              onMapParameter(fullPath, obj);
            }
          }, 800); // 800ms long press
        });

        line.addEventListener('mouseup', () => {
          clearTimeout(pressTimer);
        });

        line.addEventListener('mouseleave', () => {
          clearTimeout(pressTimer);
        });

        // Touch support for long-press (mobile)
        line.addEventListener('touchstart', (e) => {
          pressTimer = setTimeout(() => {
            line.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
            if (onMapParameter) {
              onMapParameter(fullPath, obj);
            }
          }, 800);
        });

        line.addEventListener('touchend', () => {
          clearTimeout(pressTimer);
        });

        line.addEventListener('touchcancel', () => {
          clearTimeout(pressTimer);
        });
      }

      // Render key if exists
      if (key !== null) {
        const keySpan = document.createElement('span');
        keySpan.style.color = JSON_COLORS.key;
        keySpan.style.fontWeight = 'bold';
        keySpan.textContent = `"${key}": `;
        line.appendChild(keySpan);
      }

      // Render value
      const valueSpan = document.createElement('span');

      if (obj === null) {
        valueSpan.style.color = JSON_COLORS.null;
        valueSpan.textContent = 'null';
      } else if (typeof obj === 'boolean') {
        valueSpan.style.color = JSON_COLORS.boolean;
        valueSpan.textContent = obj.toString();
      } else if (typeof obj === 'number') {
        valueSpan.style.color = JSON_COLORS.number;
        valueSpan.textContent = obj.toString();
      } else if (typeof obj === 'string') {
        valueSpan.style.color = JSON_COLORS.string;
        const displayString = obj.length > maxStringLength
          ? obj.substring(0, maxStringLength) + '...'
          : obj;
        valueSpan.textContent = `"${displayString}"`;
      } else {
        // Fallback for other types
        valueSpan.style.color = '#fff';
        valueSpan.textContent = String(obj);
      }

      line.appendChild(valueSpan);

      // Mapping indicator
      if (enableMapping && (typeof obj === 'number' || typeof obj === 'boolean')) {
        const mapIcon = document.createElement('span');
        mapIcon.style.color = 'var(--color-base-3)';
        mapIcon.style.marginLeft = 'var(--space-sm)';
        mapIcon.style.fontSize = 'var(--font-size-xs)';
        mapIcon.style.opacity = '0.5';
        mapIcon.textContent = ' [hold to map]';
        line.appendChild(mapIcon);
      }

      // Type annotation
      if (showDataTypes) {
        const typeSpan = document.createElement('span');
        typeSpan.style.color = 'var(--color-base-7)';
        typeSpan.style.marginLeft = 'var(--space-sm)';
        typeSpan.style.fontSize = 'var(--font-size-xs)';
        typeSpan.style.fontStyle = 'italic';
        typeSpan.textContent = `(${typeof obj})`;
        line.appendChild(typeSpan);
      }

      parentDiv.appendChild(line);
    }
  }

  render(data);
  return container;
}

/**
 * Render JSON to HTML string (for logging)
 *
 * @param {Object} data - JSON data
 * @param {Object} options - Rendering options
 * @returns {string} HTML string
 */
export function renderJsonToHtml(data, options = {}) {
  const viewer = createJsonViewer(data, options);
  return viewer.outerHTML;
}

/**
 * Create a compact inline JSON preview (single line)
 *
 * @param {Object} data - JSON data
 * @param {number} maxLength - Maximum character length
 * @returns {HTMLElement} DOM element
 */
export function createCompactJsonPreview(data, maxLength = 80) {
  const span = document.createElement('span');
  span.style.fontFamily = 'var(--font-code)';
  span.style.fontSize = 'var(--font-size-sm)';

  let preview = JSON.stringify(data);
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength) + '...';
  }

  // Color primitives
  const colored = preview
    .replace(/"([^"]+)":/g, '<span style="color: var(--color-base-1);">"$1":</span>')
    .replace(/: "([^"]+)"/g, ': <span style="color: var(--color-base-4);">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span style="color: var(--color-base-6);">$1</span>')
    .replace(/: (true|false)/g, ': <span style="color: var(--color-triad-1);">$1</span>')
    .replace(/: null/g, ': <span style="color: var(--color-base-5);">null</span>');

  span.innerHTML = colored;
  return span;
}
