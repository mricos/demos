# Game Platform Architecture

## Overview

Vecterm has been restructured from a developer tool with game capabilities into a **game platform with developer tools**, designed for a for-pay gaming site. This document describes the new UI architecture that separates game-related functionality from system settings and introduces platform-specific features.

## Design Philosophy

### Before: Developer Tool
- Flat settings structure
- All controls mixed together
- No user status or game context awareness
- Developer tools always visible

### After: Game Platform
- Hierarchical organization: Game → Vecterm → System Settings → Developer
- Clear separation of concerns
- User status and subscription tier front and center
- Context-aware UI that responds to game/vecterm mode
- Developer tools hidden by default for casual players

---

## UI Structure

### Left Sidebar (NEW)

The new left sidebar is the primary navigation and control surface, organized into 4 main sections:

```
┌─────────────────────────────┐
│  [ VECTERM ]                │
├─────────────────────────────┤
│                             │
│  🎮 GAME                   │
│  ├─ Play Field             │
│  ├─ Multiplayer            │
│  ├─ Camera (3D)            │
│  └─ VT100 Effects          │
│                             │
│  📟 VECTERM                │
│  ├─ Status                 │
│  ├─ User                   │
│  ├─ Game Statistics        │
│  ├─ REPL Config            │
│  └─ Session                │
│                             │
│  ⚙️ SYSTEM SETTINGS        │
│  ├─ Grid System            │
│  ├─ Terminal VT100         │
│  ├─ Input Devices          │
│  └─ UI Controls            │
│                             │
│  🔧 DEVELOPER (hidden)     │
│  └─ Monitor, Theme         │
│                             │
└─────────────────────────────┘
```

---

## Section Details

### 1. Game Section

**Purpose**: All game-related controls and information

**Subsections**:

#### Play Field
```
Active Game: quadrapong
Canvas:      1920×1080
Viewport:    Full
```
Shows current game state and canvas configuration.

#### Multiplayer
```
Players:     2/4
Lobby:       #a3f9
Host:        mricos
[Invite Friends]
```
Multiplayer lobby and player management. Button disabled when not in multiplayer game.

#### Camera (3D)
```
Field of View:  [━━━━━○━━━] 60°
[Reset Camera]
```
**MOVED from System Settings** - Camera is game-specific and belongs with game controls. Synced with old System Settings panel for backward compatibility.

#### VT100 Effects
```
Namespace:      game.vt100.*

Phosphor Glow:  [━━━━━○━━━] 0.50
Scanlines:      [━━━━━○━━━] 0.20
Raster Wave:    [━━━━━○━━━] 3px
```
Game canvas CRT effects using the `game.vt100.*` namespace. Independent from terminal VT100 effects.

**Implementation Note**: These sliders prepare for the dual VT100 system described in `CONTEXT_AWARE_CLI.md`. Currently they just log values; full implementation requires:
- `modules/game-vt100-effects.js` (separate from terminal effects)
- Canvas renderer integration
- Command namespace support in CLI

---

### 2. Vecterm Section

**Purpose**: Platform status, user info, and session metrics for the for-pay gaming site

**Subsections**:

#### Status
```
Mode:     vecterm>
Context:  Terminal
```
Shows current CLI context (vecterm/game) and operating mode. Updates when context switches.

#### User
```
Username:  mricos
Tier:      ⭐ Premium
Credits:   1,250
Rank:      #142
```
**For-pay platform features**:
- **Tier**: Subscription level (Free, Premium, Pro)
- **Credits**: In-game currency for purchases, power-ups, etc.
- **Rank**: Global leaderboard position

**Implementation Note**: Currently shows placeholder data. Full implementation requires:
- User authentication system
- Database for user profiles
- Tier management (subscription handling)
- Credits/currency system
- Leaderboard integration

#### Game Statistics
```
Games Played:  47
Win/Loss:      32/15
Total Score:   128,450
```
Lifetime game statistics for the user.

#### REPL Config
```
Namespace:  vecterm.*
History:    247 commands
Aliases:    12 active
```
Shows current command namespace, command history count, and active aliases. Updates based on context switching.

#### Session
```
Uptime:    02:34:16
Commands:  89
Games:     3
```
Current session metrics. Uptime auto-updates every second.

---

### 3. System Settings Section

**Purpose**: Platform-wide configuration that applies regardless of game/terminal context

**Subsections**:

#### Grid System
```
Grid Type:  [None ▼]
☐ Show Grid Overlay
☐ Snap to Grid
```
Canvas grid configuration. Synced with System Settings modal.

#### Terminal VT100
```
Namespace:      vecterm.vt100.*

Phosphor Glow:  [━━━━━○━━━] 0.30
Scanlines:      [━━━━━○━━━] 0.15
Raster Wave:    [━━━━━○━━━] 2px

[All VT100 Settings...]
```
Quick access to terminal CRT effects. Button opens full System Settings modal with all 11 VT100 controls.

**Note**: These sliders affect the `#cli-panel` terminal, not the game canvas.

#### Input Devices
```
⚠ No gamepad connected

☑ Enable Gamepad Input

Controller Type:  [Xbox ▼]

Controls camera in 3D mode and entities
in game mode. Use 'gamepad.status' for details.
```
**CONSOLIDATED** from old "Gamepad Input" section in System Settings. All gamepad/controller configuration in one place. Synced with System Settings modal.

#### UI Controls
```
[Toggle Monitor Sidebar]
[Toggle Quick Settings]
☐ Show Developer Tools
```
UI management:
- Toggle right sidebar (Monitor)
- Toggle Quick Settings panel
- Show/hide Developer section

---

### 4. Developer Section (Hidden by Default)

**Purpose**: Advanced debugging and development tools

**Visibility**: Hidden by default. Enable via "Show Developer Tools" checkbox in UI Controls.

**Contents**:
```
Status:  See Monitor Sidebar →

[Open Monitor]
[Open Theme Tokens]
```
Shortcuts to open the right sidebar (Monitor) and expand specific sections. Full developer tools remain in the right sidebar.

**Rationale**: Most players don't need Redux state flow, MIDI controller status, or theme tokens. Hiding this section by default creates a cleaner, more game-focused experience.

---

## Context-Aware Behavior

The UI responds to the CLI context (`vecterm>` vs `game>`):

### In `vecterm>` context:
- **Game section**: Subdued/dimmed (no active game)
- **Vecterm section**: Active, shows "vecterm>" mode
- **Terminal VT100**: Active and highlighted
- **Game VT100**: Inactive/dimmed

### In `game>` context:
- **Game section**: Active and highlighted
  - Play Field shows active game info
  - Multiplayer shows lobby status (if applicable)
  - Camera controls enabled
  - Game VT100 effects active
- **Vecterm section**: Shows "game>" mode
- **Terminal VT100**: Still accessible but subdued
- **REPL Config**: Shows "game.*" namespace

**Implementation Note**: Full context-aware behavior requires:
1. Context manager integration (see `CONTEXT_AWARE_CLI.md`)
2. CSS classes for active/inactive states
3. Event listeners on context change
4. Dynamic content updates

### Context Triggers

Context switches occur when:
1. User starts a game: `vecterm> play quadrapong` → switches to `game>`
2. User stops a game: `game> stop` → switches to `vecterm>`
3. User exits game: `game> exit` → switches to `vecterm>`
4. Manual switch: `vecterm> context game` → switches to `game>`

**TODO**: Implement context change event in `core/context-manager.js` and update left sidebar on context switch.

---

## Synchronization

Many controls in the left sidebar sync with the legacy System Settings modal for backward compatibility:

### Bidirectional Sync:

| Left Sidebar Control | System Settings Control |
|---------------------|------------------------|
| `#game-camera-fov` | `#camera-fov` |
| `#left-grid-type` | `#grid-type-select` |
| `#left-grid-visible` | `#grid-visible-checkbox` |
| `#left-grid-snap` | `#grid-snap-checkbox` |
| `#terminal-glow` | `#glow-intensity` |
| `#terminal-scanlines` | `#scanline-intensity` |
| `#terminal-wave` | `#wave-amplitude` |
| `#left-gamepad-enabled` | `#gamepad-enabled-checkbox` |
| `#left-gamepad-preset` | `#gamepad-preset-select` |

When a slider is moved in the left sidebar, it updates the corresponding control in the System Settings modal, and vice versa.

**Implementation**: See `ui/event-handlers.js` → `initializeLeftSidebar()` for sync logic.

---

## State Persistence

### localStorage Keys

```javascript
// Left sidebar collapsed state
'vecterm-left-sidebar-collapsed'          // boolean

// Subsection collapsed states
'vecterm-subsections-collapsed'           // { subsectionName: boolean }

// Developer tools visibility
'vecterm-show-developer-tools'            // boolean

// Right sidebar collapsed state (existing)
'vecterm-sidebar-collapsed'               // boolean

// Quick Settings panel (existing)
'vecterm-quick-settings'                  // [commandNames]
```

### Restoration Flow

On page load:
1. **Left sidebar collapse state** restored from localStorage
2. **Subsection collapse states** restored (Play Field, Multiplayer, etc.)
3. **Developer section visibility** restored based on user preference
4. **Session uptime** starts counting
5. **User data** fetched from backend (TODO)
6. **Game statistics** fetched from backend (TODO)

---

## Legacy System Settings Modal

**Status**: Maintained for backward compatibility

The modal System Settings panel (`#settings-panel`) remains functional:
- Still triggered by ⚙ button in top bar
- Contains all 5 original sections (Grid, VT100, Camera, Gamepad, UI)
- All controls synced with left sidebar
- Will be gradually phased out as users adopt left sidebar

**Migration Path**:
1. **Phase 1** (current): Both left sidebar and modal coexist, fully synced
2. **Phase 2**: Modal becomes "Advanced Settings" with less common controls
3. **Phase 3**: Modal removed, all settings in left sidebar

---

## For-Pay Platform Integration

### Required Backend APIs

To fully implement the for-pay platform features, the following backend endpoints are needed:

#### User Authentication
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
```

#### User Profile
```
GET  /api/user/profile
PUT  /api/user/profile
```
Returns:
```json
{
  "username": "mricos",
  "tier": "premium",
  "credits": 1250,
  "rank": 142,
  "avatar": "https://..."
}
```

#### Game Statistics
```
GET  /api/user/stats
```
Returns:
```json
{
  "gamesPlayed": 47,
  "wins": 32,
  "losses": 15,
  "totalScore": 128450,
  "achievements": [...]
}
```

#### Session Tracking
```
POST /api/session/start
POST /api/session/end
PUT  /api/session/update
```
Tracks:
- Session uptime
- Commands executed
- Games played in session
- Credits earned/spent

#### Multiplayer
```
POST /api/lobby/create
GET  /api/lobby/:id
POST /api/lobby/:id/join
POST /api/lobby/:id/invite
```

### Frontend Integration Points

Update these functions to call backend APIs:

1. **User Data**: `updateUserInfo()` in `ui/user-status.js` (TODO: create)
2. **Game Stats**: `updateGameStats()` in `ui/game-stats.js` (TODO: create)
3. **Session Tracking**: `trackSessionMetrics()` in `core/session-manager.js` (TODO: create)
4. **Multiplayer**: `updateMultiplayerStatus()` in `game/multiplayer.js` (TODO: create)

---

## CSS Architecture

### New Styles

All left sidebar styles are in `style.css` starting at line 536:

```css
/* Left Sidebar */
#left-sidebar { ... }

/* Subsections */
.subsection { ... }
.subsection-title { ... }
.subsection-content { ... }

/* Info Groups */
.info-group { ... }
.info-label { ... }
.info-value { ... }

/* Tier Badge */
.tier-badge { ... }
.tier-icon { ... }
.tier-name { ... }

/* Gamepad Status */
#left-gamepad-status { ... }
#left-gamepad-status.connected { ... }
#left-gamepad-status.disconnected { ... }

/* Developer Section */
.developer-section.hidden { ... }
```

### Design Tokens

Uses existing Vecterm design system:
- **Colors**: `--accent`, `--text`, `--text-muted`, `--success`, `--danger`
- **Fonts**: `--font-code` (Monaco/Courier)
- **Spacing**: `--space-xs`, `--space-sm`, `--space-md`
- **Z-index**: `--z-sidebar`

---

## Event Handling

### Event Handlers

All left sidebar event handlers in `ui/event-handlers.js` → `initializeLeftSidebar()`:

1. **Sidebar toggle** - Collapse/expand left sidebar
2. **Subsection collapse** - Expand/collapse individual subsections
3. **Game controls** - Camera FOV, reset, VT100 effects
4. **System settings sync** - Grid, VT100, gamepad controls
5. **Developer tools toggle** - Show/hide developer section
6. **Navigation** - Open monitor, theme tokens, settings modal

### Initialization

Left sidebar initialized in `core/boot-manager.js`:

```javascript
const { initializeLeftSidebar } = await import('../ui/event-handlers.js');
initializeLeftSidebar(this.store, cliLog);
```

Called during boot phase 4.2 (Event Handlers), after Redux store is ready.

---

## Migration from Old Structure

### What Changed

| Old Location | New Location | Notes |
|-------------|--------------|-------|
| System Settings > Camera | Game > Camera (3D) | Game-specific control |
| System Settings > Gamepad | System Settings > Input Devices | Consolidated with controller settings |
| System Settings > VT100 (all) | System Settings > Terminal VT100 (subset) | Quick access to 3 main effects |
| Right Sidebar (always visible) | Developer (hidden by default) | Optional for power users |
| No user status | Vecterm > User | For-pay platform features |
| No game stats | Vecterm > Game Statistics | Platform engagement metrics |
| No session tracking | Vecterm > Session | Current session info |

### What Stayed the Same

- System Settings modal (⚙ button) - fully functional
- Right sidebar (Monitor) - still available
- Quick Settings panel (⚡) - still dynamic and user-curated
- VT100 Hamburger menu (☰) - terminal overlay still works
- All keyboard shortcuts and CLI commands

---

## Future Enhancements

### Phase 1: Context Awareness (TODO)
- Implement context manager integration
- Dynamic UI updates on context switch
- Highlight active sections based on mode
- Disable irrelevant controls in current context

### Phase 2: Backend Integration (TODO)
- User authentication
- Subscription tier management
- Credits and in-game currency
- Leaderboard and rankings
- Game statistics tracking
- Multiplayer lobby system

### Phase 3: Game VT100 Effects (TODO)
- Implement `modules/game-vt100-effects.js`
- Apply effects to game canvas
- Command namespace support (`game.vt100.*`)
- Dual effect systems (terminal + game)

### Phase 4: Enhanced Game Section (TODO)
- Active game preview/thumbnail
- Game-specific settings (difficulty, speed, etc.)
- In-game achievements display
- Power-ups and inventory

### Phase 5: Social Features (TODO)
- Friend list in User section
- Recent players
- Chat integration
- Spectator mode

---

## Developer Notes

### Key Files

```
index.html                      - Left sidebar HTML structure
style.css                       - Left sidebar CSS (lines 536+)
ui/event-handlers.js            - Left sidebar event handlers
core/boot-manager.js            - Initialization in boot phase 4.2
```

### Testing Checklist

- [ ] Left sidebar toggle works
- [ ] All subsections expand/collapse correctly
- [ ] Collapse states persist across page reload
- [ ] Game camera controls sync with System Settings
- [ ] Terminal VT100 sliders sync with System Settings
- [ ] Grid controls sync with System Settings
- [ ] Gamepad controls sync with System Settings
- [ ] Developer section toggles correctly
- [ ] Session uptime updates every second
- [ ] "All VT100 Settings..." button opens modal
- [ ] "Open Monitor" button shows right sidebar
- [ ] "Open Theme Tokens" button expands theme section

### Known Limitations

1. **User data** - Currently placeholder values, needs backend
2. **Game statistics** - Static values, needs backend API
3. **Multiplayer status** - Mock data, needs lobby system
4. **Game VT100 effects** - Sliders work but don't affect canvas yet
5. **Context awareness** - Manual testing only, needs context manager
6. **Quick Settings toggle** - Button exists but needs implementation

---

## Summary

The new left sidebar transforms Vecterm from a developer-focused terminal emulator into a cohesive game platform. By separating game controls, platform status, system settings, and developer tools into distinct sections, the UI now supports both casual gamers (clean, simple interface) and power users (full access to advanced tools).

The architecture is designed for a for-pay gaming site with user accounts, subscription tiers, credits, leaderboards, and multiplayer support. The current implementation provides the UI foundation; backend integration is the next step.

**Key Takeaways**:
- Game-specific controls (Camera, Multiplayer, Game VT100) are now separate from system settings
- User status and game statistics are front and center for engagement
- Developer tools are hidden by default for casual players
- All new controls sync with legacy System Settings modal for backward compatibility
- Architecture supports future context-aware behavior and backend integration
