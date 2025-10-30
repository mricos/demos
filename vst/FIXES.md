# VST Demo - Fixes Applied

## Problem
When accessing the demo at `http://localhost:8002/vst-demo`, the browser was requesting resources at incorrect paths:
- Browser requested: `http://localhost:8002/css/layout.css` ❌
- Should request: `http://localhost:8002/vst-demo/css/layout.css` ✓

This caused 404 errors for all CSS and JS files.

## Root Cause
The HTML file used relative paths (`css/layout.css`, `js/main.js`), which browsers resolve relative to the current page URL. Without a base tag, these were resolved incorrectly.

## Solution Applied
Added `<base href="/vst-demo/">` tag to `vst-demo/index.html` at line 6.

This tells the browser that all relative URLs should be resolved relative to `/vst-demo/`, fixing all resource paths automatically.

## Additional Changes
1. **Organized legacy files** - Moved old standalone HTML files to `legacy/` directory:
   - `legacy/vst-demo.html` (old standalone version)
   - `legacy/vst-academic-demo.html` (academic theme)
   - `legacy/graph-viewer.html` (replaced by Flask route)

2. **Fixed vargraph.js path** - Changed from `static/js/vargraph.js` to `/static/js/vargraph.js` (absolute path)

## How to Access
✅ **Correct URL**: `http://localhost:8002/vst-demo`

The server runs on port 8002 (set via PORT environment variable).
