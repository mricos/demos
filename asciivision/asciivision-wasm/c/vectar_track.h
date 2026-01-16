#ifndef VECTAR_TRACK_H
#define VECTAR_TRACK_H

#include "vectar_math.h"
#include "vectar_raster.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

// ============================================================
// Track System - Figure-8 with branching tubes
// ============================================================

#define MAX_TRACK_NODES 32
#define MAX_NODE_CONNECTIONS 4
#define TRACK_TUBE_RADIUS 1.5f
#define TRACK_SEGMENT_LENGTH 20.0f

// Direction indices for connections
typedef enum {
    DIR_FORWARD = 0,
    DIR_LEFT = 1,
    DIR_RIGHT = 2,
    DIR_BACK = 3
} TrackDirection;

// A node in the track graph
typedef struct {
    Vec3 position;          // World position
    int connections[MAX_NODE_CONNECTIONS];  // Node indices (-1 = none)
    int is_junction;        // Has multiple exits?
    float yaw;              // Facing direction (radians)
} TrackNode;

// Current position on track
typedef struct {
    int current_node;       // Which node we're at or heading toward
    int prev_node;          // Where we came from
    float progress;         // 0-1 along current segment
    float tube_x;           // Position within tube cross-section (-1 to 1)
    float tube_y;
    Vec3 world_pos;         // Computed world position
    float world_yaw;        // Current facing direction
    float world_pitch;      // Current pitch
} TrackPosition;

// The full track
typedef struct {
    TrackNode nodes[MAX_TRACK_NODES];
    int num_nodes;
    TrackPosition player;

    // For rendering the minimap
    float min_x, max_x;
    float min_z, max_z;
} Track;

// ============================================================
// Track API
// ============================================================

// Create a figure-8 track
EXPORT Track* track_create_figure8(void);

// Free track
EXPORT void track_free(Track* track);

// Update player position along track
// steer_x, steer_y = position within tube
// throttle = forward/back speed
// turn_input = -1 (left), 0 (straight), 1 (right) at junctions
EXPORT void track_update(Track* track, float dt, float steer_x, float steer_y,
                         float throttle, int turn_input);

// Check if at junction and which directions are available
EXPORT int track_at_junction(Track* track);
EXPORT int track_can_go(Track* track, TrackDirection dir);

// Get current wall distance (for collision sounds)
EXPORT float track_get_wall_distance(Track* track);

// Get world position for camera
EXPORT Vec3 track_get_position(Track* track);
EXPORT float track_get_yaw(Track* track);
EXPORT float track_get_pitch(Track* track);

// Render minimap to buffer (top-down view)
EXPORT void track_render_minimap(Track* track, VectarBuffer* buf,
                                  int x, int y, int w, int h);

// Get current segment info for tube rendering
EXPORT int track_get_current_node(Track* track);
EXPORT int track_get_next_node(Track* track);
EXPORT float track_get_progress(Track* track);

#endif // VECTAR_TRACK_H
