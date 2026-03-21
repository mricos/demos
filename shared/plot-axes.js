/**
 * plot-axes.js — SVG chart axis scaffolding
 *
 * Eliminates the most duplicated pattern across demos:
 * margin objects, scale functions, tick loops, gridlines, axis labels.
 *
 * Usage:
 *   import { createPlot } from '/shared/plot-axes.js';
 *
 *   const plot = createPlot(svgElement, {
 *     x: [0, 100],           // data domain
 *     y: [0, 50],
 *     margins: { t: 20, r: 15, b: 30, l: 35 },
 *     xTicks: [0, 25, 50, 75, 100],
 *     yTicks: [0, 10, 20, 30, 40, 50],
 *     xLabel: "time (s)",
 *     yLabel: "amplitude",
 *     grid: true              // default true
 *   });
 *
 *   // Use scale functions for plotting:
 *   plot.sx(50)   // → pixel x for data value 50
 *   plot.sy(25)   // → pixel y for data value 25
 *
 *   // Draw on the SVG:
 *   plot.line(points, { stroke: "#60a5fa", width: 1.5 });
 *   plot.dots(points, { fill: "#ef4444", r: 2.5, opacity: 0.6 });
 *   plot.area(points, { fill: "#3b82f6", opacity: 0.2 });
 *   plot.hline(0, { dash: true });       // horizontal reference line
 *   plot.vline(50, { dash: true });      // vertical reference line
 *   plot.band(upper, lower, { fill: "#64748b", opacity: 0.15 });
 *
 *   // Access internals:
 *   plot.svg     // the SVG element
 *   plot.width   // inner plot width (excluding margins)
 *   plot.height  // inner plot height
 *   plot.clear() // remove all plot content (keeps axes)
 */

const NS = "http://www.w3.org/2000/svg";

function _el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function _txt(parent, attrs, content) {
  const t = _el("text", attrs, parent);
  t.textContent = content;
  return t;
}

// Default dark theme colors
const DEFAULTS = {
  gridColor: "#1e293b",
  gridWidth: "0.5",
  tickColor: "#64748b",
  tickFont: "9",
  labelColor: "#94a3b8",
  labelFont: "10",
  axisColor: "#1e293b"
};

/**
 * Create a plot with axes inside an SVG element.
 *
 * @param {SVGElement} svg — target SVG (must have width/height or viewBox)
 * @param {Object} config
 * @returns {Object} plot API
 */
export function createPlot(svg, config) {
  const m = config.margins || { t: 20, r: 15, b: 30, l: 35 };
  const xDomain = config.x || [0, 1];
  const yDomain = config.y || [0, 1];

  // Get SVG dimensions from viewBox or attributes
  let W, H;
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    W = parts[2];
    H = parts[3];
  } else {
    W = parseInt(svg.getAttribute("width")) || 300;
    H = parseInt(svg.getAttribute("height")) || 200;
  }

  const w = W - m.l - m.r;
  const h = H - m.t - m.b;

  // Scale functions
  const sx = (v) => m.l + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * w;
  const sy = (v) => m.t + h - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * h;

  // Inverse scales (pixel → data)
  const ix = (px) => xDomain[0] + ((px - m.l) / w) * (xDomain[1] - xDomain[0]);
  const iy = (py) => yDomain[0] + ((m.t + h - py) / h) * (yDomain[1] - yDomain[0]);

  // Clear SVG
  svg.innerHTML = "";

  const theme = Object.assign({}, DEFAULTS, config.theme || {});

  // Create groups for layering
  const gGrid = _el("g", { class: "plot-grid" }, svg);
  const gContent = _el("g", { class: "plot-content" }, svg);
  const gAxes = _el("g", { class: "plot-axes" }, svg);

  // Draw grid + ticks
  const showGrid = config.grid !== false;

  if (config.xTicks) {
    config.xTicks.forEach(v => {
      if (v < xDomain[0] || v > xDomain[1]) return;
      if (showGrid) {
        _el("line", {
          x1: sx(v), y1: m.t, x2: sx(v), y2: m.t + h,
          stroke: theme.gridColor, "stroke-width": theme.gridWidth
        }, gGrid);
      }
      _txt(gAxes, {
        x: sx(v), y: m.t + h + 14,
        fill: theme.tickColor, "font-size": theme.tickFont,
        "text-anchor": "middle"
      }, v);
    });
  }

  if (config.yTicks) {
    config.yTicks.forEach(v => {
      if (v < yDomain[0] || v > yDomain[1]) return;
      if (showGrid) {
        _el("line", {
          x1: m.l, y1: sy(v), x2: m.l + w, y2: sy(v),
          stroke: theme.gridColor, "stroke-width": theme.gridWidth
        }, gGrid);
      }
      _txt(gAxes, {
        x: m.l - 5, y: sy(v) + 3,
        fill: theme.tickColor, "font-size": theme.tickFont,
        "text-anchor": "end"
      }, v);
    });
  }

  // Axis labels
  if (config.xLabel) {
    _txt(gAxes, {
      x: m.l + w / 2, y: H - 2,
      fill: theme.labelColor, "font-size": theme.labelFont,
      "text-anchor": "middle"
    }, config.xLabel);
  }

  if (config.yLabel) {
    _txt(gAxes, {
      x: 8, y: m.t + h / 2,
      fill: theme.labelColor, "font-size": theme.labelFont,
      "text-anchor": "middle",
      transform: "rotate(-90,8," + (m.t + h / 2) + ")"
    }, config.yLabel);
  }

  // ── Drawing API ──────────────────────────────

  function line(points, opts) {
    opts = opts || {};
    if (points.length < 2) return;
    const d = points.map((p, i) =>
      (i === 0 ? "M" : "L") + sx(p[0]) + "," + sy(p[1])
    ).join(" ");
    return _el("path", {
      d: d,
      stroke: opts.stroke || "#e2e8f0",
      "stroke-width": opts.width || "1.5",
      fill: "none",
      opacity: opts.opacity || "1"
    }, gContent);
  }

  function dots(points, opts) {
    opts = opts || {};
    points.forEach(p => {
      _el("circle", {
        cx: sx(p[0]), cy: sy(p[1]),
        r: opts.r || "2.5",
        fill: opts.fill || "#e2e8f0",
        opacity: opts.opacity || "1"
      }, gContent);
    });
  }

  function area(points, opts) {
    opts = opts || {};
    if (points.length < 2) return;
    let d = points.map((p, i) =>
      (i === 0 ? "M" : "L") + sx(p[0]) + "," + sy(p[1])
    ).join(" ");
    // Close to baseline
    d += "L" + sx(points[points.length - 1][0]) + "," + sy(yDomain[0]);
    d += "L" + sx(points[0][0]) + "," + sy(yDomain[0]) + "Z";
    return _el("path", {
      d: d,
      fill: opts.fill || "#3b82f6",
      opacity: opts.opacity || "0.3",
      stroke: "none"
    }, gContent);
  }

  function band(upper, lower, opts) {
    opts = opts || {};
    if (upper.length < 2) return;
    let d = upper.map((p, i) =>
      (i === 0 ? "M" : "L") + sx(p[0]) + "," + sy(p[1])
    ).join(" ");
    for (let i = lower.length - 1; i >= 0; i--) {
      d += "L" + sx(lower[i][0]) + "," + sy(lower[i][1]);
    }
    d += "Z";
    return _el("path", {
      d: d,
      fill: opts.fill || "#64748b",
      opacity: opts.opacity || "0.15",
      stroke: "none"
    }, gContent);
  }

  function hline(yVal, opts) {
    opts = opts || {};
    return _el("line", {
      x1: m.l, y1: sy(yVal), x2: m.l + w, y2: sy(yVal),
      stroke: opts.stroke || theme.labelColor,
      "stroke-width": opts.width || "1",
      "stroke-dasharray": opts.dash ? "3,3" : "none"
    }, gContent);
  }

  function vline(xVal, opts) {
    opts = opts || {};
    return _el("line", {
      x1: sx(xVal), y1: m.t, x2: sx(xVal), y2: m.t + h,
      stroke: opts.stroke || theme.labelColor,
      "stroke-width": opts.width || "1",
      "stroke-dasharray": opts.dash ? "3,3" : "none"
    }, gContent);
  }

  function text(xVal, yVal, content, opts) {
    opts = opts || {};
    return _txt(gContent, {
      x: sx(xVal), y: sy(yVal),
      fill: opts.fill || theme.labelColor,
      "font-size": opts.size || theme.labelFont,
      "text-anchor": opts.anchor || "middle"
    }, content);
  }

  function clear() {
    gContent.innerHTML = "";
  }

  function el(tag, attrs) {
    return _el(tag, attrs, gContent);
  }

  return {
    svg, sx, sy, ix, iy,
    width: w, height: h,
    margins: m,
    contentGroup: gContent,
    line, dots, area, band, hline, vline, text, clear, el
  };
}
