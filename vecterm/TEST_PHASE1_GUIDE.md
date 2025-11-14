# Phase 1 Test Guide

## Running the Tests

Open in your browser:
```
http://localhost:8003/test-phase1.html
```

## Test Suite Overview

The test page includes 4 comprehensive test suites:

### Test 1: World Architecture
Tests the platonic simulation space:
- ✓ Entity creation with custom IDs and labels
- ✓ Component storage and retrieval
- ✓ Query by components (e.g., entities with position + velocity)
- ✓ Query by labels (e.g., `{type: 'paddle', player: '1'}`)
- ✓ Query by regex (e.g., `{position: /left/}`)
- ✓ Spatial queries (find entities in region)
- ✓ Scene partitioning (main/debug scenes)
- ✓ Metrics tracking
- ✓ Serialization/deserialization

### Test 2: Field Runtime
Tests the runtime container:
- ✓ Field creation with owned World
- ✓ System framework (MovementSystem example)
- ✓ Fixed timestep simulation (60 FPS)
- ✓ Tick execution with entity updates
- ✓ Pause/resume functionality
- ✓ Deterministic RNG with seeds
- ✓ Checkpoint save/restore
- ✓ Metrics (tick count, elapsed time, tick rate)

### Test 3: Surface Rendering
Tests rendering targets:
- ✓ Canvas2DSurface creation
- ✓ Frame with primitives (rect, circle, line, text)
- ✓ Rendering to HTML canvas
- ✓ Viewport creation with camera
- ✓ VT100Surface with character grid
- ✓ Terminal primitives (box, line, text)
- ✓ Bresenham line algorithm for terminal

**Visual Output:**
- Top canvas: Canvas2D primitives (shapes, lines, text)
- Bottom canvas: VT100 terminal rendering (character-based)

### Test 4: Full Integration
Tests complete World → Field → Surface pipeline:
- ✓ Creates mini-game simulation
- ✓ Ball entity with position, velocity, renderable components
- ✓ Paddle entity
- ✓ MovementSystem (updates position from velocity)
- ✓ BounceSystem (bounces ball off boundaries)
- ✓ Render loop (projects entities to canvas)
- ✓ 3-second animation (180 frames at 60 FPS)

**Watch the animation:** Ball bounces around the canvas!

## What to Look For

### 1. Console Output
Green text = tests passing
Red text = tests failing
Check for assertion messages

### 2. Canvas Rendering
**Top canvas (test-canvas):**
- Cyan rectangle outline
- Green filled circle
- Yellow diagonal line
- "Phase 1 Test" text
- **Animation:** Bouncing green ball and cyan paddle (during integration test)

**Bottom canvas (test-vt100):**
- "VECTERM TERMINAL TEST" header
- "Phase 1 Architecture" subtitle
- "World / Field / Surface" text
- Green rectangle made of characters
- Cyan diagonal line made of characters

### 3. Test Metrics
At the end of each test, you'll see:
- Entity counts
- Component counts
- Tick counts
- Position updates
- Frame counts

## Expected Results

All tests should pass with green checkmarks:
```
✓ World created with ID
✓ Entity created with custom ID
✓ Component data stored correctly
✓ Query by components works
✓ Label query finds multiple entities
✓ Spatial query finds entities in range
✓ Field created with ID
✓ System added to field
✓ Entity moved after tick
✓ RNG is deterministic with same seed
✓ Checkpoint saved
✓ Canvas2D surface created
✓ Rendered primitives to Canvas2D surface
✓ VT100 surface has correct columns
✓ Simulation ran for 180 frames
```

## Architecture Validated

These tests prove:
1. **World** - Pure simulation space works (entities, components, queries)
2. **Field** - Runtime container works (time, systems, RNG, checkpoints)
3. **Surface** - Rendering abstraction works (Canvas2D, VT100, frames)
4. **Integration** - Full pipeline works (World → Field → Surface)

## Troubleshooting

### Tests don't run
- Check browser console for module import errors
- Ensure you're accessing via `localhost:8003` (not `file://`)
- Verify core/*.js files exist

### Canvas is blank
- Check browser console for rendering errors
- Verify canvas elements exist in DOM
- Check that primitives are being created

### Animation doesn't play
- Integration test runs last (after 1.5 seconds)
- Watch the top canvas for bouncing ball
- Check console for "Simulation ran for 180 frames"

## Next Steps

Once all tests pass:
- ✅ Phase 1 is validated
- 🚀 Ready for Phase 2 (Query Language)

If any tests fail:
- Check console for error details
- Review the failing assertion
- Check core/*.js implementations
