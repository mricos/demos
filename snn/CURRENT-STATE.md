# SNN Demo - Current State (Updated: 2025-10-31)

## Overview

This document describes the **actual current state** of the SNN demo codebase after recent changes.

## Current State: Hybrid Architecture

The codebase is in a **hybrid state**:
- ✅ **New directory structure** exists (core/, renderers/, figures/)
- ✅ **Refactored renderer files** exist in renderers/
- ⚠️ **Main files restored** to original monolithic versions
- ✅ **Import paths fixed** to work with new structure

## File Structure (As Of Now)

```
/demos/snn/
├── core/                           # Core framework (ACTIVE)
│   ├── ActiveFigure.js            (288 lines)
│   ├── LIFModel.js                (261 lines)
│   └── theme.js                   (40 lines)
│
├── renderers/                      # Refactored renderers (EXIST but MAY NOT BE USED)
│   ├── BiologicalRenderer.js
│   ├── DiagramRenderer.js
│   ├── TraceRenderer.js
│   ├── SpikeTrainRenderer.js
│   ├── CombinedTraceRenderer.js
│   ├── TTFSRenderer.js
│   ├── NeuronRendererBase.js
│   └── BiologicalRenderer.js.bak  (backup file)
│
│   Total: ~1323 lines across all renderers
│
├── figures/                        # Figure implementations (ACTIVE)
│   └── LIFNeuronFigure.js         (332 lines)
│
├── NeuronRenderer.js              (714 lines - MONOLITHIC, RESTORED)
├── app.js                         (1066 lines - RESTORED)
├── index.html                     (with debug script)
├── app.css
└── snn-docs.html
```

## What Actually Happened

### 1. Original Refactoring (Oct 30)
- Broke up 715-line NeuronRenderer.js into 7 specialized renderers
- Moved core files to core/
- Created figures/ directory
- Updated all import paths

### 2. Restoration (Oct 31)
- **Restored NeuronRenderer.js to original 714-line monolithic version**
- **Restored app.js to original version**
- **Restored index.html (debug script came back)**
- Refactored files in renderers/ still exist but may not be imported

### 3. Import Path Fixes (Oct 31)
Fixed broken imports after restoration:

**app.js line 4:**
```javascript
import { LIFNeuronFigure } from './figures/LIFNeuronFigure.js';
```

**NeuronRenderer.js line 9:**
```javascript
import { theme } from './core/theme.js';
```

## Current Import Chain

```
index.html
  └── app.js
      └── figures/LIFNeuronFigure.js
          ├── core/ActiveFigure.js
          ├── core/LIFModel.js
          └── NeuronRenderer.js (714 lines - monolithic)
              └── core/theme.js
```

**Note:** The specialized renderers in `renderers/` directory exist but are **NOT imported** by the current NeuronRenderer.js (which is the old monolithic version).

## Current Files Being Used

### Active (Imported and Used)
- ✅ `core/ActiveFigure.js` - Base animation class
- ✅ `core/LIFModel.js` - Physics simulation
- ✅ `core/theme.js` - Color palette
- ✅ `figures/LIFNeuronFigure.js` - Main figure
- ✅ `NeuronRenderer.js` - **Monolithic 714-line version**
- ✅ `app.js` - Main application

### Inactive (Exist but Not Imported)
- ⚠️ `renderers/BiologicalRenderer.js`
- ⚠️ `renderers/DiagramRenderer.js`
- ⚠️ `renderers/TraceRenderer.js`
- ⚠️ `renderers/SpikeTrainRenderer.js`
- ⚠️ `renderers/CombinedTraceRenderer.js`
- ⚠️ `renderers/TTFSRenderer.js`
- ⚠️ `renderers/NeuronRendererBase.js`

## Known Issues

1. **Backup file**: `renderers/BiologicalRenderer.js.bak` should be removed
2. **Debug script**: index.html has debug console.log statements
3. **Refactored renderers unused**: 1300+ lines of code in renderers/ not being used
4. **Old docs**: REFACTOR-SUMMARY.md describes a state that no longer exists

## To Return to Refactored State

If you want to use the refactored renderers again:

1. **Update NeuronRenderer.js** to use composition pattern:
   ```javascript
   import { BiologicalRenderer } from './renderers/BiologicalRenderer.js';
   // etc...
   ```

2. **Remove old rendering code** from NeuronRenderer.js

3. **Test** that all visualizations still work

## To Clean Up

If staying with current monolithic approach:

1. **Remove unused renderers/**:
   ```bash
   rm -rf renderers/
   ```

2. **Remove old docs**:
   ```bash
   rm REFACTOR-SUMMARY.md
   ```

3. **Remove debug script** from index.html

## Working State

✅ The demo **currently works** with:
- Monolithic NeuronRenderer.js (714 lines)
- Files organized in new directory structure
- Correct import paths
- All functionality intact

The refactored modular renderers exist but are not being used.

## Metrics (Current Reality)

**Main Files:**
- NeuronRenderer.js: 714 lines (monolithic)
- app.js: 1066 lines
- LIFNeuronFigure.js: 332 lines

**Directory Structure:**
- core/: 3 files, 589 lines total (USED)
- renderers/: 8 files, ~1323 lines (NOT USED)
- figures/: 1 file, 332 lines (USED)

**Total Codebase:** ~4024 lines across all .js files

## Recommendation

**Option A: Commit Current State**
- Working hybrid architecture
- Keep unused renderers/ for future refactoring
- Update docs to match reality
- Clean up backup files and debug scripts

**Option B: Complete the Refactoring**
- Update NeuronRenderer.js to use modular renderers
- Remove monolithic rendering code
- Achieve full separation of concerns
- Reduce NeuronRenderer.js to ~100 lines

**Option C: Revert to Fully Monolithic**
- Remove renderers/ directory
- Remove core/ directory
- Move all files to root
- Single-file architecture (simplest)

Current state (Option A) is **functional** but has unused code.
