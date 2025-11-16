# Quadrapong Keyboard Controls

## Overview

Quadrapong supports **keyboard controls** for all 4 paddles, allowing players to override AI control and play manually.

## Default Key Mappings

| Paddle | Keys | Direction |
|--------|------|-----------|
| **Left** (Red) | `W` / `S` | Up / Down |
| **Right** (Green) | `I` / `K` | Up / Down |
| **Top** (Yellow) | `A` / `D` | Left / Right |
| **Bottom** (Purple) | `J` / `L` | Left / Right |

## CLI Commands

### Show Current Controls
```
controls
```

**Output:**
```
=== QUADRAPONG CONTROLS ===

  LEFT (W/S): AI
  RIGHT (I/K): AI
  TOP (A/D): AI
  BOTTOM (J/L): AI

Commands:
  controls.player1 <side> - Assign paddle to Player 1
  controls.ai <side> - Return paddle to AI
  Sides: left, right, top, bottom
```

### Assign Paddle to Player
```
controls.player1 left
```

**Result:** Left paddle switches from AI to keyboard control (W/S keys)

**Available sides:**
- `left` - Red paddle (W/S)
- `right` - Green paddle (I/K)
- `top` - Yellow paddle (A/D)
- `bottom` - Purple paddle (J/L)

### Return Paddle to AI
```
controls.ai left
```

**Result:** Left paddle switches back to AI control

## Usage Examples

### Single Player vs 3 AI
```
quadrapong
controls.player1 left
```
Now play with W/S keys against 3 AI opponents!

### 1v1 Player Match
```
quadrapong
controls.player1 left
controls.player1 right
```
Player 1 uses W/S (left), Player 2 uses I/K (right)

### Free-for-All (4 Players)
```
quadrapong
controls.player1 left    # Player 1: W/S
controls.player1 right   # Player 2: I/K
controls.player1 top     # Player 3: A/D
controls.player1 bottom  # Player 4: J/L
```

## Architecture

### ECS Components

**PlayerControlled Component:**
```javascript
{
  playerNumber: 1,
  upKey: 'w',
  downKey: 's',
  upPressed: false,
  downPressed: false
}
```

**AIControlled Component:**
```javascript
{
  trackingSpeed: 0.8,
  enabled: true
}
```

### How It Works

1. **Default State:** All paddles have `aiControlled` component
2. **Player Assignment:** 
   - Remove `aiControlled`
   - Add `playerControlled` with key mappings
3. **Input Handling:**
   - Global keyboard listeners track key state
   - Update `upPressed`/`downPressed` in component
4. **Movement:**
   - `PlayerControl` system runs before `PaddleAI`
   - Reads component state, moves paddle accordingly

### System Execution Order
```
1. PlayerControl (reads keyboard state)
2. PaddleAI (only for AI paddles)
3. Movement (applies velocity)
4. Collision (ball/paddle)
5. Scoring (out of bounds)
```

## Game Panel Controls

The control system also works from the **Game Panel** CLI tab:

1. Click **Game FAB** button
2. Select **Quadrapong**
3. Click **CLI** tab
4. Type `controls` to see mappings
5. Use `controls.player1 <side>` to assign

## Future Enhancements

- [ ] Gamepad support (use existing gamepad system)
- [ ] Custom key remapping
- [ ] Player 2/3/4 assignments
- [ ] Visual indicators for player-controlled paddles
- [ ] Control hints in game panel

## Implementation Files

- **Component:** `core/components.js:129-141` - PlayerControlled
- **System:** `core/systems.js:254-294` - PlayerControl
- **Game Logic:** `games/QuadrapongGame.js:27-461`
  - Keyboard handlers: Lines 367-407
  - Paddle assignment: Lines 409-461
  - CLI commands: Lines 481-571

---

**Added:** 2025-01-15
**Discoverable via:** `controls` command in game CLI
**Default:** All paddles start as AI
