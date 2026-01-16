#ifndef VECTAR_GAME_H
#define VECTAR_GAME_H

#include "vectar_math.h"
#include "vectar_raster.h"
#include "vectar_geom.h"
#include "vectar_track.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

// ============================================================
// VectorVision - T U B E S
// ============================================================

#define MAX_SPRITES 16
#define MAX_SHOTS 8
#define MIN_SEGMENTS 4
#define MAX_SEGMENTS 32
#define DEFAULT_SEGMENTS 12

// Sprite types
typedef enum {
    SPRITE_NONE = 0,
    SPRITE_TETRA,       // Rotating tetrahedron (orange, shoot it)
    SPRITE_SQUARE       // Flat square on wall (blue, don't shoot)
} SpriteType;

// ============================================================
// Event System - C pushes events, JS polls and handles
// ============================================================

#define EVENT_BUFFER_SIZE 32

typedef enum {
    EVENT_NONE = 0,
    EVENT_RING_PASS,        // Passed through a tunnel ring
    EVENT_WALL_GRAZE,       // Close to wall (warning)
    EVENT_WALL_HIT,         // Hit the wall
    EVENT_WALL_RUB,         // Rubbing against wall (continuous)
    EVENT_JUNCTION_ENTER,   // Approaching a junction
    EVENT_JUNCTION_TURN,    // Turned at a junction
    EVENT_JUNCTION_BLOCKED, // Tried to go where there's no exit
    EVENT_SHOT_FIRED,       // Player fired a shot
    EVENT_SHOT_HIT_GOOD,    // Shot hit a good target (lose points)
    EVENT_SHOT_HIT_BAD,     // Shot hit a bad target (gain points)
    EVENT_SHOT_MISS,        // Shot reached end without hitting
    EVENT_TARGET_SPAWN,     // New target appeared
    EVENT_COLUMN_GLOW,      // Column glowing from shot
    EVENT_PLAYER_HIT,       // Player was hit by enemy (shake/flash)
    EVENT_ENTRANCE_CLEAR,   // All guards cleared, can enter tube
    EVENT_ENTER_TUBE        // Player entered the tube
} EventType;

// Game phase
typedef enum {
    PHASE_SPACE = 0,        // Flying in space, clearing guards
    PHASE_TUBE              // Inside the tube network
} GamePhase;

typedef struct {
    EventType type;
    float value;            // Event-specific value (e.g., distance, intensity)
    float x, y;             // Position (normalized -1 to 1)
    int ring_index;         // Which ring (for ring events)
} GameEvent;

typedef struct {
    GameEvent events[EVENT_BUFFER_SIZE];
    int head;               // Write position
    int tail;               // Read position
    int count;              // Current count
} EventBuffer;

// ============================================================
// Sprite - 3D object in the tunnel
// ============================================================

typedef struct {
    int active;
    SpriteType type;        // TETRA (orange) or SQUARE (blue)
    int segment;            // Which tunnel segment
    float z;                // Position along tunnel
    float rotation;         // Current rotation angle (for tetra)
    float scale;            // Size multiplier
} Sprite;

// ============================================================
// Shot - Projectile fired down a column
// ============================================================

typedef struct {
    int active;             // Is this shot alive?
    int segment;            // Which tunnel segment it's traveling down
    float z;                // Current position
    float glow_intensity;   // How bright the column glow is
    int glow_ring;          // Which ring is currently glowing
} Shot;

// ============================================================
// Game State
// ============================================================

typedef struct {
    // Screen dimensions
    int screen_width;
    int screen_height;

    // Camera state
    float camera_z;         // Position along tunnel
    float camera_speed;     // Forward velocity (-max to +max, 0 = stopped)
    float camera_twist;     // Twist rotation (radians)
    float target_twist;     // Target twist (for smoothing)
    float fov;              // Field of view factor

    // Player position (within tunnel cross-section, or world coords in space)
    float player_x;         // -1 to 1 in tube, world X in space
    float player_y;         // -1 to 1 in tube, world Y in space

    // Space flight (inertia-based)
    GamePhase phase;        // PHASE_SPACE or PHASE_TUBE
    float vel_x, vel_y, vel_z;  // Velocity with inertia
    float space_x, space_y, space_z;  // Position in space
    int guards_remaining;   // Enemies to clear before entering tube
    int entrance_unlocked;  // Can enter tube?
    float hit_flash;        // Screen flash on damage (0-1)

    // Tunnel parameters (dynamic)
    Tunnel* tunnel;
    int num_segments;       // Current divisions (Y/U to change)
    float ring_spacing;     // Current spacing (O/P to change)
    int tunnel_dirty;       // Need to rebuild tunnel?

    // Track system (figure-8 with branches)
    Track* track;
    int use_track;          // 1 = figure-8 track mode, 0 = infinite tunnel
    int turn_input;         // -1 left, 0 straight, 1 right (for junctions)

    // Collision state
    float wall_distance;
    int last_ring_passed;
    int rings_passed;

    // Movement
    float max_speed;

    // Sprites and shots
    Sprite sprites[MAX_SPRITES];
    Shot shots[MAX_SHOTS];
    int score;
    float sprite_spawn_timer;
    float sprite_spawn_rate;

    // Glow state
    float column_glow[MAX_SEGMENTS];
    float glow_falloff;     // Distance-based glow decay

    // Event buffer
    EventBuffer events;

    // Rendering
    VectarBuffer* buffer;
    char* output_string;
    int output_capacity;

} GameState;

// ============================================================
// Public API (exported to WASM)
// ============================================================

// Create/destroy game
EXPORT GameState* game_create(int width, int height);
EXPORT void game_free(GameState* game);

// Resize screen
EXPORT void game_resize(GameState* game, int width, int height);

// Update game state (call each frame)
// steer_x, steer_y = position (-1 to 1)
// throttle = forward/back (-1 to 1)
// twist = rotation (-1 to 1)
EXPORT void game_update(GameState* game, float dt, float steer_x, float steer_y, float throttle, float twist);

// Render to internal buffer
EXPORT void game_render(GameState* game);

// Get rendered output as string
EXPORT const char* game_get_output(GameState* game);

// Get buffer pointer (for compositing)
EXPORT VectarBuffer* game_get_buffer(GameState* game);

// Camera/tunnel control
EXPORT void game_set_speed(GameState* game, float speed);
EXPORT float game_get_speed(GameState* game);
EXPORT void game_set_fov(GameState* game, float fov);
EXPORT float game_get_fov(GameState* game);
EXPORT float game_get_camera_z(GameState* game);
EXPORT float game_get_twist(GameState* game);

// Tunnel parameters
EXPORT void game_set_segments(GameState* game, int segments);
EXPORT int game_get_segments(GameState* game);
EXPORT void game_set_spacing(GameState* game, float spacing);
EXPORT float game_get_spacing(GameState* game);
EXPORT void game_set_glow_falloff(GameState* game, float falloff);
EXPORT float game_get_glow_falloff(GameState* game);

// Shooting
EXPORT void game_shoot(GameState* game);
EXPORT int game_get_score(GameState* game);

// Reset
EXPORT void game_reset(GameState* game);

// === Event System ===
// Poll next event (returns EVENT_NONE if empty)
EXPORT int game_poll_event_type(GameState* game);
EXPORT float game_poll_event_value(GameState* game);
EXPORT float game_poll_event_x(GameState* game);
EXPORT float game_poll_event_y(GameState* game);
EXPORT void game_pop_event(GameState* game);  // Remove after reading
EXPORT int game_event_count(GameState* game);

// === Player Control ===
EXPORT void game_set_player_pos(GameState* game, float x, float y);
EXPORT float game_get_player_x(GameState* game);
EXPORT float game_get_player_y(GameState* game);
EXPORT float game_get_wall_distance(GameState* game);
EXPORT int game_get_rings_passed(GameState* game);

// === Track Mode ===
EXPORT void game_set_track_mode(GameState* game, int use_track);
EXPORT int game_get_track_mode(GameState* game);
EXPORT void game_set_turn(GameState* game, int turn);  // -1 left, 0 straight, 1 right
EXPORT int game_at_junction(GameState* game);
EXPORT int game_can_go_left(GameState* game);
EXPORT int game_can_go_right(GameState* game);
EXPORT float game_get_track_x(GameState* game);
EXPORT float game_get_track_z(GameState* game);
EXPORT float game_get_track_yaw(GameState* game);

// === Space/Phase ===
EXPORT int game_get_phase(GameState* game);
EXPORT int game_get_guards_remaining(GameState* game);
EXPORT int game_is_entrance_unlocked(GameState* game);
EXPORT float game_get_hit_flash(GameState* game);
EXPORT float game_get_space_x(GameState* game);
EXPORT float game_get_space_y(GameState* game);
EXPORT float game_get_space_z(GameState* game);

#endif // VECTAR_GAME_H
