#include "vectar_track.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

// ============================================================
// Figure-8 Track Layout (box with center cross)
//
//     0 -------- 1
//     |          |
//     |    4     |   (4 is center junction)
//     |          |
//     3 -------- 2
//
// Plus diagonal connections through center for figure-8
// ============================================================

static void init_node(TrackNode* n, float x, float y, float z, float yaw) {
    n->position.x = x;
    n->position.y = y;
    n->position.z = z;
    n->yaw = yaw;
    n->is_junction = 0;
    for (int i = 0; i < MAX_NODE_CONNECTIONS; i++) {
        n->connections[i] = -1;
    }
}

static void connect_nodes(Track* t, int a, int b, TrackDirection dir_from_a) {
    t->nodes[a].connections[dir_from_a] = b;
    // Reverse direction
    TrackDirection reverse = (dir_from_a == DIR_FORWARD) ? DIR_BACK :
                             (dir_from_a == DIR_BACK) ? DIR_FORWARD :
                             (dir_from_a == DIR_LEFT) ? DIR_RIGHT : DIR_LEFT;
    t->nodes[b].connections[reverse] = a;
}

EXPORT Track* track_create_figure8(void) {
    Track* t = (Track*)malloc(sizeof(Track));
    if (!t) return NULL;
    memset(t, 0, sizeof(Track));

    float size = 30.0f;  // Track size
    float half = size / 2;

    // Corner nodes (0-3) and center (4)
    init_node(&t->nodes[0], -half, 0, -half, 0);          // Top-left
    init_node(&t->nodes[1],  half, 0, -half, PI/2);       // Top-right
    init_node(&t->nodes[2],  half, 0,  half, PI);         // Bottom-right
    init_node(&t->nodes[3], -half, 0,  half, -PI/2);      // Bottom-left
    init_node(&t->nodes[4],  0,    0,  0,    0);          // Center junction

    t->num_nodes = 5;

    // Mark center as junction
    t->nodes[4].is_junction = 1;

    // Connect outer ring: 0 -> 1 -> 2 -> 3 -> 0
    connect_nodes(t, 0, 1, DIR_FORWARD);
    connect_nodes(t, 1, 2, DIR_FORWARD);
    connect_nodes(t, 2, 3, DIR_FORWARD);
    connect_nodes(t, 3, 0, DIR_FORWARD);

    // Connect center to all corners (cross tubes)
    t->nodes[4].connections[DIR_FORWARD] = 1;  // Center -> Top-right
    t->nodes[4].connections[DIR_LEFT] = 0;     // Center -> Top-left
    t->nodes[4].connections[DIR_RIGHT] = 2;    // Center -> Bottom-right
    t->nodes[4].connections[DIR_BACK] = 3;     // Center -> Bottom-left

    // Connect corners to center (as side branches)
    t->nodes[0].connections[DIR_RIGHT] = 4;
    t->nodes[1].connections[DIR_LEFT] = 4;
    t->nodes[2].connections[DIR_LEFT] = 4;
    t->nodes[3].connections[DIR_RIGHT] = 4;

    // Bounds for minimap
    t->min_x = -half - 5;
    t->max_x = half + 5;
    t->min_z = -half - 5;
    t->max_z = half + 5;

    // Start player at node 0, heading to node 1
    t->player.current_node = 1;
    t->player.prev_node = 0;
    t->player.progress = 0;
    t->player.tube_x = 0;
    t->player.tube_y = 0;
    t->player.world_yaw = 0;
    t->player.world_pitch = 0;

    return t;
}

EXPORT void track_free(Track* track) {
    free(track);
}

// Interpolate position between two nodes
static Vec3 lerp_pos(Vec3 a, Vec3 b, float t) {
    Vec3 r;
    r.x = a.x + (b.x - a.x) * t;
    r.y = a.y + (b.y - a.y) * t;
    r.z = a.z + (b.z - a.z) * t;
    return r;
}

// Get direction vector from prev to current node
static void get_segment_direction(Track* t, float* dx, float* dz) {
    Vec3 from = t->nodes[t->player.prev_node].position;
    Vec3 to = t->nodes[t->player.current_node].position;
    float len = sqrtf((to.x - from.x) * (to.x - from.x) +
                      (to.z - from.z) * (to.z - from.z));
    if (len < 0.001f) len = 1;
    *dx = (to.x - from.x) / len;
    *dz = (to.z - from.z) / len;
}

EXPORT void track_update(Track* track, float dt, float steer_x, float steer_y,
                         float throttle, int turn_input) {
    if (!track) return;

    TrackPosition* p = &track->player;

    // Update tube position (within cross-section)
    p->tube_x += steer_x * dt * 2.0f;
    p->tube_y += steer_y * dt * 2.0f;

    // Clamp to tube bounds
    float max_tube = 0.85f;
    if (p->tube_x < -max_tube) p->tube_x = -max_tube;
    if (p->tube_x > max_tube) p->tube_x = max_tube;
    if (p->tube_y < -max_tube) p->tube_y = -max_tube;
    if (p->tube_y > max_tube) p->tube_y = max_tube;

    // Move along track
    float speed = throttle * 15.0f * dt;
    p->progress += speed / TRACK_SEGMENT_LENGTH;

    // Check if reached next node
    if (p->progress >= 1.0f) {
        int arrived = p->current_node;
        TrackNode* node = &track->nodes[arrived];

        // At junction - choose direction
        int next = -1;
        if (node->is_junction) {
            // Try turn direction first
            if (turn_input < 0 && node->connections[DIR_LEFT] >= 0) {
                next = node->connections[DIR_LEFT];
            } else if (turn_input > 0 && node->connections[DIR_RIGHT] >= 0) {
                next = node->connections[DIR_RIGHT];
            } else if (node->connections[DIR_FORWARD] >= 0) {
                next = node->connections[DIR_FORWARD];
            }
        }

        // Default: continue forward or find any exit
        if (next < 0) {
            // Find exit that isn't where we came from
            for (int d = 0; d < MAX_NODE_CONNECTIONS; d++) {
                if (node->connections[d] >= 0 && node->connections[d] != p->prev_node) {
                    next = node->connections[d];
                    break;
                }
            }
        }

        // Fallback: go back
        if (next < 0) {
            next = p->prev_node;
        }

        p->prev_node = arrived;
        p->current_node = next;
        p->progress = 0;
    } else if (p->progress < 0) {
        // Going backward
        int temp = p->current_node;
        p->current_node = p->prev_node;
        p->prev_node = temp;
        p->progress = 1.0f + p->progress;
    }

    // Calculate world position
    Vec3 from = track->nodes[p->prev_node].position;
    Vec3 to = track->nodes[p->current_node].position;
    p->world_pos = lerp_pos(from, to, p->progress);

    // Add tube offset
    float dx, dz;
    get_segment_direction(track, &dx, &dz);
    // Perpendicular: (-dz, dx)
    p->world_pos.x += (-dz) * p->tube_x * TRACK_TUBE_RADIUS;
    p->world_pos.z += dx * p->tube_x * TRACK_TUBE_RADIUS;
    p->world_pos.y += p->tube_y * TRACK_TUBE_RADIUS;

    // Calculate yaw (facing direction)
    p->world_yaw = atan2f(dz, dx);
}

EXPORT int track_at_junction(Track* track) {
    if (!track) return 0;
    // Near end of segment approaching junction?
    if (track->player.progress > 0.9f) {
        return track->nodes[track->player.current_node].is_junction;
    }
    return 0;
}

EXPORT int track_can_go(Track* track, TrackDirection dir) {
    if (!track) return 0;
    int node = track->player.current_node;
    return track->nodes[node].connections[dir] >= 0;
}

EXPORT float track_get_wall_distance(Track* track) {
    if (!track) return 1.0f;
    float dist = sqrtf(track->player.tube_x * track->player.tube_x +
                       track->player.tube_y * track->player.tube_y);
    return 1.0f - dist;
}

EXPORT Vec3 track_get_position(Track* track) {
    if (!track) {
        Vec3 zero = {0, 0, 0};
        return zero;
    }
    return track->player.world_pos;
}

EXPORT float track_get_yaw(Track* track) {
    return track ? track->player.world_yaw : 0;
}

EXPORT float track_get_pitch(Track* track) {
    return track ? track->player.world_pitch : 0;
}

EXPORT void track_render_minimap(Track* track, VectarBuffer* buf,
                                  int mx, int my, int mw, int mh) {
    if (!track || !buf) return;

    // Draw border
    for (int x = mx; x < mx + mw; x++) {
        vectar_put(buf, x, my, '-');
        vectar_put(buf, x, my + mh - 1, '-');
    }
    for (int y = my; y < my + mh; y++) {
        vectar_put(buf, mx, y, '|');
        vectar_put(buf, mx + mw - 1, y, '|');
    }
    vectar_put(buf, mx, my, '+');
    vectar_put(buf, mx + mw - 1, my, '+');
    vectar_put(buf, mx, my + mh - 1, '+');
    vectar_put(buf, mx + mw - 1, my + mh - 1, '+');

    // Scale factors
    float sx = (mw - 2) / (track->max_x - track->min_x);
    float sy = (mh - 2) / (track->max_z - track->min_z);

    // Draw track segments
    for (int i = 0; i < track->num_nodes; i++) {
        TrackNode* n = &track->nodes[i];
        int nx = mx + 1 + (int)((n->position.x - track->min_x) * sx);
        int ny = my + 1 + (int)((n->position.z - track->min_z) * sy);

        // Draw node
        vectar_put(buf, nx, ny, n->is_junction ? 'X' : 'o');

        // Draw connections
        for (int d = 0; d < MAX_NODE_CONNECTIONS; d++) {
            int c = n->connections[d];
            if (c >= 0 && c > i) {  // Only draw each segment once
                TrackNode* cn = &track->nodes[c];
                int cx = mx + 1 + (int)((cn->position.x - track->min_x) * sx);
                int cy = my + 1 + (int)((cn->position.z - track->min_z) * sy);

                // Simple line
                int steps = abs(cx - nx) + abs(cy - ny);
                for (int s = 1; s < steps; s++) {
                    int lx = nx + (cx - nx) * s / steps;
                    int ly = ny + (cy - ny) * s / steps;
                    char c = (abs(cx - nx) > abs(cy - ny)) ? '-' : '|';
                    vectar_put(buf, lx, ly, c);
                }
            }
        }
    }

    // Draw player position
    Vec3 pos = track->player.world_pos;
    int px = mx + 1 + (int)((pos.x - track->min_x) * sx);
    int py = my + 1 + (int)((pos.z - track->min_z) * sy);
    vectar_put(buf, px, py, '@');
}

EXPORT int track_get_current_node(Track* track) {
    return track ? track->player.current_node : 0;
}

EXPORT int track_get_next_node(Track* track) {
    return track ? track->player.current_node : 0;
}

EXPORT float track_get_progress(Track* track) {
    return track ? track->player.progress : 0;
}
