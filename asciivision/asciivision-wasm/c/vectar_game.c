#include "vectar_game.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdio.h>

// ============================================================
// VectorVision - T U B E S
// ============================================================

#define TUNNEL_RINGS 24
#define TUNNEL_RADIUS 1.5f
#define DEFAULT_SPACING 2.0f
#define DEFAULT_SEGMENTS 12

#define DEFAULT_SPEED 8.0f
#define DEFAULT_FOV 1.2f
#define STEER_SPEED 3.0f
#define TWIST_SPEED 2.0f
#define SMOOTHING 0.12f

#define SHOT_SPEED 40.0f
#define SPRITE_SPAWN_RATE 1.5f
#define SPRITE_SPEED 2.0f
#define DEFAULT_GLOW_FALLOFF 0.92f

#define WALL_GRAZE_THRESHOLD 0.7f
#define WALL_HIT_THRESHOLD 0.95f

// ============================================================
// Event Buffer Helpers
// ============================================================

static void event_push(EventBuffer* buf, EventType type, float value, float x, float y, int ring) {
    if (buf->count >= EVENT_BUFFER_SIZE) return;  // Buffer full, drop event

    GameEvent* e = &buf->events[buf->head];
    e->type = type;
    e->value = value;
    e->x = x;
    e->y = y;
    e->ring_index = ring;

    buf->head = (buf->head + 1) % EVENT_BUFFER_SIZE;
    buf->count++;
}

static GameEvent* event_peek(EventBuffer* buf) {
    if (buf->count == 0) return NULL;
    return &buf->events[buf->tail];
}

static void event_pop(EventBuffer* buf) {
    if (buf->count == 0) return;
    buf->tail = (buf->tail + 1) % EVENT_BUFFER_SIZE;
    buf->count--;
}

static void event_clear(EventBuffer* buf) {
    buf->head = 0;
    buf->tail = 0;
    buf->count = 0;
}

// Forward declarations
static void spawn_guards(GameState* game);

// ============================================================
// Game Creation
// ============================================================

EXPORT GameState* game_create(int width, int height) {
    GameState* game = (GameState*)malloc(sizeof(GameState));
    if (!game) return NULL;

    memset(game, 0, sizeof(GameState));

    game->screen_width = width;
    game->screen_height = height;

    // Camera
    game->camera_z = -5.0f;
    game->camera_speed = 0;
    game->camera_twist = 0;
    game->target_twist = 0;
    game->fov = DEFAULT_FOV;

    // Player position
    game->player_x = 0;
    game->player_y = 0;

    // Space flight mode
    game->phase = PHASE_SPACE;
    game->vel_x = 0;
    game->vel_y = 0;
    game->vel_z = 0;
    game->space_x = 0;
    game->space_y = 0;
    game->space_z = 30.0f;  // Start in front of tube entrance
    game->guards_remaining = 6;  // Initial guards to clear
    game->entrance_unlocked = 0;
    game->hit_flash = 0;

    // Tunnel parameters
    game->num_segments = DEFAULT_SEGMENTS;
    game->ring_spacing = DEFAULT_SPACING;
    game->tunnel_dirty = 0;
    game->glow_falloff = DEFAULT_GLOW_FALLOFF;

    // Collision state
    game->wall_distance = 1.0f;
    game->last_ring_passed = -1;
    game->rings_passed = 0;

    // Event buffer
    event_clear(&game->events);

    // Movement
    game->max_speed = 20.0f;

    // Sprites and shots
    for (int i = 0; i < MAX_SPRITES; i++) {
        game->sprites[i].active = 0;
    }
    for (int i = 0; i < MAX_SHOTS; i++) {
        game->shots[i].active = 0;
    }
    game->score = 0;
    game->sprite_spawn_timer = 0;
    game->sprite_spawn_rate = SPRITE_SPAWN_RATE;

    // Column glow
    for (int i = 0; i < MAX_SEGMENTS; i++) {
        game->column_glow[i] = 0;
    }

    // Create tunnel
    game->tunnel = tunnel_create(TUNNEL_RINGS, game->num_segments, TUNNEL_RADIUS, game->ring_spacing);

    // Create track (figure-8)
    game->track = track_create_figure8();
    game->use_track = 1;  // Default to track mode
    game->turn_input = 0;

    // Create render buffer
    game->buffer = vectar_buffer_new(width, height);

    // Output string buffer
    game->output_capacity = width * height + height + 1;  // chars + newlines + null
    game->output_string = (char*)malloc(game->output_capacity);

    // Spawn initial guards
    spawn_guards(game);

    return game;
}

EXPORT void game_free(GameState* game) {
    if (game) {
        tunnel_free(game->tunnel);
        track_free(game->track);
        vectar_buffer_free(game->buffer);
        free(game->output_string);
        free(game);
    }
}

EXPORT void game_resize(GameState* game, int width, int height) {
    if (!game) return;

    game->screen_width = width;
    game->screen_height = height;

    vectar_buffer_resize(game->buffer, width, height);

    free(game->output_string);
    game->output_capacity = width * height + height + 1;
    game->output_string = (char*)malloc(game->output_capacity);
}

// ============================================================
// Game Update
// ============================================================

// Simple random (LCG)
static unsigned int rand_state = 12345;
static int simple_rand(void) {
    rand_state = rand_state * 1103515245 + 12345;
    return (rand_state >> 16) & 0x7FFF;
}

// Get segment from player position (cursor)
static int get_player_segment(GameState* game);

// Spawn a new sprite from cursor direction
static void spawn_sprite(GameState* game) {
    for (int i = 0; i < MAX_SPRITES; i++) {
        if (!game->sprites[i].active) {
            Sprite* s = &game->sprites[i];
            s->active = 1;
            // 60% tetrahedron (orange, shoot), 40% square (blue, don't)
            s->type = (simple_rand() % 10) < 6 ? SPRITE_TETRA : SPRITE_SQUARE;

            // Spawn in the segment the player is aiming at (cursor direction)
            // with slight random offset
            int base_seg = get_player_segment(game);
            int offset = (simple_rand() % 5) - 2;  // -2 to +2 segments
            s->segment = (base_seg + offset + game->num_segments) % game->num_segments;

            s->z = game->camera_z - 50.0f;
            s->rotation = (simple_rand() % 360) * PI / 180.0f;
            s->scale = 0.8f + (simple_rand() % 50) / 100.0f;

            event_push(&game->events, EVENT_TARGET_SPAWN,
                      s->type == SPRITE_TETRA ? 1.0f : 0.0f,
                      game->player_x, game->player_y, s->segment);
            break;
        }
    }
}

// Update shots and check collisions
static void update_shots(GameState* game, float dt) {
    for (int i = 0; i < MAX_SHOTS; i++) {
        Shot* shot = &game->shots[i];
        if (!shot->active) continue;

        shot->z -= SHOT_SPEED * dt;
        shot->glow_intensity *= game->glow_falloff;

        if (shot->segment < game->num_segments) {
            game->column_glow[shot->segment] = fmaxf(game->column_glow[shot->segment], shot->glow_intensity);
        }

        if (shot->glow_intensity > 0.1f) {
            event_push(&game->events, EVENT_COLUMN_GLOW, shot->glow_intensity, 0, 0, shot->segment);
        }

        // Check collision with sprites
        for (int j = 0; j < MAX_SPRITES; j++) {
            Sprite* sprite = &game->sprites[j];
            if (!sprite->active) continue;
            if (sprite->segment != shot->segment) continue;

            if (fabsf(shot->z - sprite->z) < 3.0f) {
                if (sprite->type == SPRITE_TETRA) {
                    game->score += 100;
                    event_push(&game->events, EVENT_SHOT_HIT_BAD, 1.0f, 0, 0, sprite->segment);
                } else {
                    game->score -= 50;
                    event_push(&game->events, EVENT_SHOT_HIT_GOOD, 1.0f, 0, 0, sprite->segment);
                }
                sprite->active = 0;
                shot->active = 0;
                break;
            }
        }

        if (shot->z < game->camera_z - 60.0f) {
            event_push(&game->events, EVENT_SHOT_MISS, 0, 0, 0, shot->segment);
            shot->active = 0;
        }
    }

    // Decay column glow
    for (int i = 0; i < game->num_segments; i++) {
        game->column_glow[i] *= game->glow_falloff;
    }
}

// Update sprites
static void update_sprites(GameState* game, float dt) {
    for (int i = 0; i < MAX_SPRITES; i++) {
        Sprite* s = &game->sprites[i];
        if (!s->active) continue;

        // Sprites drift toward camera
        s->z += SPRITE_SPEED * dt;

        // Rotate tetrahedrons
        if (s->type == SPRITE_TETRA) {
            s->rotation += dt * 2.0f;
        }

        if (s->z > game->camera_z + 5.0f) {
            s->active = 0;
        }
    }

    // Spawn new sprites
    game->sprite_spawn_timer += dt;
    if (game->sprite_spawn_timer >= game->sprite_spawn_rate) {
        game->sprite_spawn_timer = 0;
        spawn_sprite(game);
    }
}

// Check wall collision
static void check_wall_collision(GameState* game) {
    float player_dist = sqrtf(game->player_x * game->player_x + game->player_y * game->player_y);
    game->wall_distance = 1.0f - player_dist;

    static int graze_cooldown = 0;
    if (player_dist > WALL_GRAZE_THRESHOLD && player_dist < WALL_HIT_THRESHOLD) {
        if (graze_cooldown <= 0) {
            event_push(&game->events, EVENT_WALL_GRAZE, player_dist,
                      game->player_x, game->player_y, 0);
            graze_cooldown = 10;
        } else {
            graze_cooldown--;
        }
    }

    if (player_dist >= WALL_HIT_THRESHOLD) {
        event_push(&game->events, EVENT_WALL_HIT, player_dist,
                  game->player_x, game->player_y, 0);
        game->camera_speed *= 0.8f;
    }
}

// Check ring pass
static void check_ring_pass(GameState* game) {
    float ring_spacing = game->tunnel->ring_spacing;
    int current_ring = (int)(-game->camera_z / ring_spacing);

    if (current_ring != game->last_ring_passed) {
        game->rings_passed++;
        game->last_ring_passed = current_ring;
        event_push(&game->events, EVENT_RING_PASS, game->wall_distance,
                  game->player_x, game->player_y, game->rings_passed);
    }
}

// Rebuild tunnel if parameters changed
static void rebuild_tunnel_if_needed(GameState* game) {
    if (!game->tunnel_dirty) return;

    if (game->tunnel) {
        tunnel_free(game->tunnel);
    }
    game->tunnel = tunnel_create(TUNNEL_RINGS, game->num_segments, TUNNEL_RADIUS, game->ring_spacing);
    game->tunnel_dirty = 0;
}

// ============================================================
// Space Flight Mode
// ============================================================

#define SPACE_ACCEL 15.0f
#define SPACE_DRAG 0.98f
#define SPACE_MAX_VEL 25.0f
#define GUARD_SPAWN_DIST 20.0f
#define ENTRANCE_Z 0.0f
#define COLLISION_RADIUS 2.0f

// Spawn guards around the tube entrance
static void spawn_guards(GameState* game) {
    game->guards_remaining = 0;
    for (int i = 0; i < 6; i++) {
        if (i >= MAX_SPRITES) break;
        Sprite* s = &game->sprites[i];
        s->active = 1;
        s->type = SPRITE_TETRA;
        // Arrange in a circle around entrance
        float angle = i * PI * 2.0f / 6.0f;
        float radius = 8.0f;
        s->segment = i;  // Repurpose as X position index
        s->z = ENTRANCE_Z - 5.0f + (simple_rand() % 10) * 0.5f;  // Scattered Z
        s->rotation = (simple_rand() % 360) * PI / 180.0f;
        s->scale = 1.5f;
        game->guards_remaining++;
    }
}

// Update space flight mode
static void update_space_mode(GameState* game, float dt, float steer_x, float steer_y, float throttle, float twist) {
    // Apply thrust (inertia-based)
    game->vel_x += steer_x * SPACE_ACCEL * dt;
    game->vel_y += steer_y * SPACE_ACCEL * dt;
    game->vel_z -= throttle * SPACE_ACCEL * dt;  // Negative Z is into screen

    // Apply drag
    game->vel_x *= SPACE_DRAG;
    game->vel_y *= SPACE_DRAG;
    game->vel_z *= SPACE_DRAG;

    // Clamp velocity
    float vel_mag = sqrtf(game->vel_x * game->vel_x + game->vel_y * game->vel_y + game->vel_z * game->vel_z);
    if (vel_mag > SPACE_MAX_VEL) {
        float scale = SPACE_MAX_VEL / vel_mag;
        game->vel_x *= scale;
        game->vel_y *= scale;
        game->vel_z *= scale;
    }

    // Update position
    game->space_x += game->vel_x * dt;
    game->space_y += game->vel_y * dt;
    game->space_z += game->vel_z * dt;

    // Update twist (for aiming)
    game->target_twist += twist * TWIST_SPEED * dt;
    game->camera_twist = lerpf(game->camera_twist, game->target_twist, SMOOTHING);

    // Decay hit flash
    if (game->hit_flash > 0) {
        game->hit_flash -= dt * 3.0f;
        if (game->hit_flash < 0) game->hit_flash = 0;
    }

    // Update guard sprites (they orbit/move slightly)
    game->guards_remaining = 0;
    for (int i = 0; i < MAX_SPRITES; i++) {
        Sprite* s = &game->sprites[i];
        if (!s->active) continue;

        game->guards_remaining++;

        // Rotate tetrahedrons
        if (s->type == SPRITE_TETRA) {
            s->rotation += dt * 2.0f;
        }

        // Guards orbit around entrance
        float angle = (float)s->segment * PI * 2.0f / 6.0f + game->camera_z * 0.1f;
        float gx = cosf(angle) * 8.0f;
        float gy = sinf(angle) * 8.0f;
        float gz = s->z;

        // Check player collision with guard
        float dx = game->space_x - gx;
        float dy = game->space_y - gy;
        float dz = game->space_z - gz;
        float dist = sqrtf(dx*dx + dy*dy + dz*dz);

        if (dist < COLLISION_RADIUS * s->scale) {
            // Player hit!
            game->hit_flash = 1.0f;
            game->score -= 25;
            event_push(&game->events, EVENT_PLAYER_HIT, 1.0f, game->space_x, game->space_y, i);

            // Bounce player back
            if (dist > 0.1f) {
                game->vel_x = dx / dist * 10.0f;
                game->vel_y = dy / dist * 10.0f;
                game->vel_z = dz / dist * 10.0f;
            }
        }
    }

    // Check if entrance is clear
    if (game->guards_remaining == 0 && !game->entrance_unlocked) {
        game->entrance_unlocked = 1;
        event_push(&game->events, EVENT_ENTRANCE_CLEAR, 1.0f, 0, 0, 0);
    }

    // Check if player enters tube (close to entrance and cleared)
    if (game->entrance_unlocked) {
        float dist_to_entrance = sqrtf(game->space_x * game->space_x +
                                        game->space_y * game->space_y +
                                        game->space_z * game->space_z);
        if (dist_to_entrance < 3.0f && game->space_z < 2.0f) {
            // Enter tube!
            game->phase = PHASE_TUBE;
            game->camera_z = -5.0f;
            game->player_x = 0;
            game->player_y = 0;
            event_push(&game->events, EVENT_ENTER_TUBE, 1.0f, 0, 0, 0);
        }
    }

    // Update shots in space
    for (int i = 0; i < MAX_SHOTS; i++) {
        Shot* shot = &game->shots[i];
        if (!shot->active) continue;

        // Shots fly forward from player
        shot->z -= SHOT_SPEED * dt;
        shot->glow_intensity *= 0.95f;

        // Check shot collision with guards
        for (int j = 0; j < MAX_SPRITES; j++) {
            Sprite* s = &game->sprites[j];
            if (!s->active) continue;

            // Guard position
            float angle = (float)s->segment * PI * 2.0f / 6.0f + game->camera_z * 0.1f;
            float gx = cosf(angle) * 8.0f;
            float gy = sinf(angle) * 8.0f;
            float gz = s->z;

            // Shot position (simplified - along Z from player start)
            float sx = game->space_x;
            float sy = game->space_y;
            float sz = game->space_z - (game->space_z - shot->z);

            float dx = sx - gx;
            float dy = sy - gy;
            float dz = sz - gz;
            float dist = sqrtf(dx*dx + dy*dy + dz*dz);

            if (dist < COLLISION_RADIUS * s->scale * 1.5f) {
                // Hit!
                s->active = 0;
                shot->active = 0;
                game->score += 100;
                event_push(&game->events, EVENT_SHOT_HIT_BAD, 1.0f, gx, gy, j);
                break;
            }
        }

        // Remove old shots
        if (shot->z < game->space_z - 50.0f) {
            shot->active = 0;
        }
    }

    // Sync camera position for rendering
    game->camera_z = -game->space_z;
    game->player_x = game->space_x / 10.0f;  // Normalize for crosshair
    game->player_y = game->space_y / 10.0f;
}

EXPORT void game_update(GameState* game, float dt, float steer_x, float steer_y, float throttle, float twist) {
    if (!game) return;
    if (dt > 0.1f) dt = 0.1f;

    // Space flight phase - clear guards before entering tube
    if (game->phase == PHASE_SPACE) {
        update_space_mode(game, dt, steer_x, steer_y, throttle, twist);
        return;
    }

    // Track mode vs infinite tunnel mode
    if (game->use_track && game->track) {
        // Track mode: steer within tube, throttle moves along track
        // twist input sets turn direction at junctions
        game->turn_input = (twist < -0.3f) ? -1 : (twist > 0.3f) ? 1 : 0;

        // Check for junction approach
        static int last_junction = 0;
        int at_junc = track_at_junction(game->track);
        if (at_junc && !last_junction) {
            event_push(&game->events, EVENT_JUNCTION_ENTER, 1.0f, 0, 0, 0);
        }
        last_junction = at_junc;

        // Update track position
        track_update(game->track, dt, steer_x, steer_y, throttle, game->turn_input);

        // Get wall distance for rubbing sound
        float wall_dist = track_get_wall_distance(game->track);
        game->wall_distance = wall_dist;

        // Wall rubbing event (continuous when close to wall)
        static int rub_cooldown = 0;
        if (wall_dist < 0.2f) {
            if (rub_cooldown <= 0) {
                event_push(&game->events, EVENT_WALL_RUB, 1.0f - wall_dist * 5.0f, 0, 0, 0);
                rub_cooldown = 3;  // Throttle events
            } else {
                rub_cooldown--;
            }
        }

        // Sync camera position with track
        Vec3 pos = track_get_position(game->track);
        game->camera_z = -pos.z;  // Track Z becomes camera depth
        game->player_x = game->track->player.tube_x;
        game->player_y = game->track->player.tube_y;
        game->camera_twist = track_get_yaw(game->track);

    } else {
        // Infinite tunnel mode (original behavior)
        rebuild_tunnel_if_needed(game);

        // Update player position (AWSD: up/down/left/right)
        game->player_x += steer_x * STEER_SPEED * dt;
        game->player_y += steer_y * STEER_SPEED * dt;

        // Clamp player position
        float max_pos = 0.9f;
        game->player_x = fmaxf(-max_pos, fminf(max_pos, game->player_x));
        game->player_y = fmaxf(-max_pos, fminf(max_pos, game->player_y));

        // Update twist (JL: rotate view)
        game->target_twist += twist * TWIST_SPEED * dt;
        game->camera_twist = lerpf(game->camera_twist, game->target_twist, SMOOTHING);

        // Update speed (IK: forward/back)
        float target_speed = throttle * game->max_speed;
        game->camera_speed = lerpf(game->camera_speed, target_speed, dt * 3.0f);

        // Move camera
        game->camera_z -= game->camera_speed * dt;

        // Update tunnel scroll
        if (game->tunnel) {
            tunnel_scroll(game->tunnel, game->camera_z);
        }

        check_wall_collision(game);
        check_ring_pass(game);
    }

    // Update game objects (both modes)
    update_shots(game, dt);
    update_sprites(game, dt);
}

// ============================================================
// Rendering
// ============================================================

// Project a point in tunnel to screen coordinates
static int project_sprite(GameState* game, int segment, float z, int* out_x, int* out_y) {
    if (!game) return 0;

    float dist = game->camera_z - z;
    if (dist < 1.0f || dist > 50.0f) return 0;

    // Get segment angle with twist
    float angle = (float)segment / game->num_segments * 2.0f * PI + game->camera_twist;
    float radius = TUNNEL_RADIUS * 0.75f;

    float x3d = radius * cosf(angle);
    float y3d = radius * sinf(angle);

    float scale = game->fov / dist;
    *out_x = (int)(game->screen_width / 2 + x3d * scale * game->screen_width * 0.4f);
    *out_y = (int)(game->screen_height / 2 + y3d * scale * game->screen_height * 0.4f);

    return (*out_x >= 0 && *out_x < game->screen_width &&
            *out_y >= 0 && *out_y < game->screen_height);
}

// Draw tetrahedron (rotating, orange indicator) - size affects detail
static void draw_tetrahedron(VectarBuffer* buf, int cx, int cy, float rotation, float size) {
    int phase = ((int)(rotation * 4 / PI)) % 4;

    if (size > 3.0f) {
        // Large: full 3D tetrahedron ASCII art
        int h = (int)(size * 1.5f);
        int w = (int)(size * 2.0f);
        switch (phase % 2) {
            case 0:
                // Point up
                for (int row = 0; row < h; row++) {
                    int span = (row * w) / h;
                    vectar_put(buf, cx - span, cy - h/2 + row, '/');
                    vectar_put(buf, cx + span, cy - h/2 + row, '\\');
                    if (row == h - 1) {
                        for (int x = -span; x <= span; x++) {
                            vectar_put(buf, cx + x, cy - h/2 + row, '_');
                        }
                    }
                }
                vectar_put(buf, cx, cy - h/2, '^');
                break;
            case 1:
                // Point down
                for (int row = 0; row < h; row++) {
                    int span = ((h - 1 - row) * w) / h;
                    vectar_put(buf, cx - span, cy - h/2 + row, '\\');
                    vectar_put(buf, cx + span, cy - h/2 + row, '/');
                    if (row == 0) {
                        for (int x = -span; x <= span; x++) {
                            vectar_put(buf, cx + x, cy - h/2, '_');
                        }
                    }
                }
                vectar_put(buf, cx, cy + h/2, 'v');
                break;
        }
    } else if (size > 1.5f) {
        // Medium: simple pyramid
        switch (phase) {
            case 0:
                vectar_put(buf, cx, cy-1, '^');
                vectar_text(buf, cx-1, cy, "/|\\");
                vectar_text(buf, cx-2, cy+1, "/___\\");
                break;
            case 1:
                vectar_text(buf, cx-1, cy-1, "___");
                vectar_text(buf, cx-1, cy, "\\|/");
                vectar_put(buf, cx, cy+1, 'v');
                break;
            case 2:
                vectar_put(buf, cx, cy-1, '^');
                vectar_text(buf, cx-1, cy, "\\|/");
                vectar_text(buf, cx-2, cy+1, "\\___/");
                break;
            case 3:
                vectar_text(buf, cx-1, cy-1, "___");
                vectar_text(buf, cx-1, cy, "/|\\");
                vectar_put(buf, cx, cy+1, 'v');
                break;
        }
    } else {
        // Small: minimal
        switch (phase) {
            case 0: vectar_text(buf, cx-1, cy, "/\\"); break;
            case 1: vectar_text(buf, cx-1, cy, "<>"); break;
            case 2: vectar_text(buf, cx-1, cy, "\\/"); break;
            case 3: vectar_text(buf, cx-1, cy, "><"); break;
        }
    }
}

// Draw flat square (on wall, blue indicator) - size affects detail
static void draw_square(VectarBuffer* buf, int cx, int cy, float size) {
    if (size > 2.5f) {
        // Large box
        int h = (int)(size);
        int w = (int)(size * 1.5f);
        for (int row = -h; row <= h; row++) {
            vectar_put(buf, cx - w, cy + row, '|');
            vectar_put(buf, cx + w, cy + row, '|');
            if (row == -h || row == h) {
                for (int x = -w; x <= w; x++) {
                    vectar_put(buf, cx + x, cy + row, row == -h ? '_' : '-');
                }
            }
        }
    } else if (size > 1.2f) {
        // Medium
        vectar_text(buf, cx-2, cy-1, "+--+");
        vectar_text(buf, cx-2, cy,   "|  |");
        vectar_text(buf, cx-2, cy+1, "+--+");
    } else {
        // Small
        vectar_put(buf, cx-1, cy, '[');
        vectar_put(buf, cx, cy, ' ');
        vectar_put(buf, cx+1, cy, ']');
    }
}

// Render space mode (tube entrance in distance, guards around it)
static void render_space_mode(GameState* game) {
    VectarBuffer* buf = game->buffer;
    int cx = game->screen_width / 2;
    int cy = game->screen_height / 2;

    // Draw tube entrance in distance (circle/ring)
    float entrance_dist = game->space_z;
    if (entrance_dist > 1.0f) {
        float scale = game->fov * 20.0f / entrance_dist;
        int radius = (int)(scale * 5);
        if (radius > 1 && radius < game->screen_width / 2) {
            // Draw ring
            for (int a = 0; a < 32; a++) {
                float angle = a * PI * 2.0f / 32.0f;
                int rx = cx - (int)(game->space_x * scale) + (int)(cosf(angle) * radius);
                int ry = cy - (int)(game->space_y * scale) + (int)(sinf(angle) * radius * 0.5f);
                if (rx >= 0 && rx < game->screen_width && ry >= 0 && ry < game->screen_height) {
                    vectar_put(buf, rx, ry, game->entrance_unlocked ? 'O' : 'X');
                }
            }
        }
    }

    // Draw guards
    for (int i = 0; i < MAX_SPRITES; i++) {
        Sprite* s = &game->sprites[i];
        if (!s->active) continue;

        // Guard position (orbiting)
        float angle = (float)s->segment * PI * 2.0f / 6.0f + game->camera_z * 0.1f;
        float gx = cosf(angle) * 8.0f;
        float gy = sinf(angle) * 8.0f;
        float gz = s->z;

        // Project to screen
        float dz = game->space_z - gz;
        if (dz < 1.0f) continue;

        float scale = game->fov * 15.0f / dz;
        int sx = cx + (int)((gx - game->space_x) * scale);
        int sy = cy + (int)((gy - game->space_y) * scale * 0.5f);

        if (sx >= 2 && sx < game->screen_width - 2 && sy >= 2 && sy < game->screen_height - 2) {
            float size = s->scale * scale * 0.5f;
            draw_tetrahedron(buf, sx, sy, s->rotation, fminf(size, 8.0f));
        }
    }

    // Draw shots
    for (int i = 0; i < MAX_SHOTS; i++) {
        Shot* shot = &game->shots[i];
        if (!shot->active) continue;

        float dz = game->space_z - shot->z;
        if (dz < 0.5f || dz > 50.0f) continue;

        float scale = game->fov * 15.0f / dz;
        int sx = cx;
        int sy = cy;

        if (sx >= 0 && sx < game->screen_width && sy >= 0 && sy < game->screen_height) {
            vectar_put(buf, sx, sy, '*');
        }
    }

    // Draw crosshair
    vectar_put(buf, cx, cy, '+');
    vectar_put(buf, cx - 1, cy, '-');
    vectar_put(buf, cx + 1, cy, '-');
    vectar_put(buf, cx, cy - 1, '|');
    vectar_put(buf, cx, cy + 1, '|');

    // Draw status
    char status[32];
    if (!game->entrance_unlocked) {
        snprintf(status, sizeof(status), "GUARDS: %d", game->guards_remaining);
    } else {
        snprintf(status, sizeof(status), "ENTRANCE CLEAR!");
    }
    vectar_text(buf, 2, 1, status);

    // Hit flash effect (invert some chars)
    if (game->hit_flash > 0.5f) {
        for (int y = 0; y < game->screen_height; y += 2) {
            for (int x = 0; x < game->screen_width; x += 2) {
                if (buf->buffer[y * buf->width + x] == ' ') {
                    buf->buffer[y * buf->width + x] = '.';
                }
            }
        }
    }

    // Draw radar map in corner (top-down view of space)
    int map_w = 16;
    int map_h = 10;
    int map_x = game->screen_width - map_w - 1;
    int map_y = 1;

    // Border
    for (int x = map_x; x < map_x + map_w; x++) {
        vectar_put(buf, x, map_y, '-');
        vectar_put(buf, x, map_y + map_h - 1, '-');
    }
    for (int y = map_y; y < map_y + map_h; y++) {
        vectar_put(buf, map_x, y, '|');
        vectar_put(buf, map_x + map_w - 1, y, '|');
    }

    // Scale: map covers -20 to +20 in X/Y
    float scale = (map_w - 2) / 40.0f;
    int mcx = map_x + map_w / 2;
    int mcy = map_y + map_h / 2;

    // Draw entrance at center
    vectar_put(buf, mcx, mcy, 'O');

    // Draw guards
    for (int i = 0; i < MAX_SPRITES; i++) {
        Sprite* s = &game->sprites[i];
        if (!s->active) continue;

        float angle = (float)s->segment * PI * 2.0f / 6.0f + game->camera_z * 0.1f;
        float gx = cosf(angle) * 8.0f;
        float gy = sinf(angle) * 8.0f;

        int rx = mcx + (int)(gx * scale);
        int ry = mcy + (int)(gy * scale * 0.5f);
        if (rx > map_x && rx < map_x + map_w - 1 && ry > map_y && ry < map_y + map_h - 1) {
            vectar_put(buf, rx, ry, '*');
        }
    }

    // Draw player
    int px = mcx + (int)(game->space_x * scale);
    int py = mcy + (int)(game->space_y * scale * 0.5f);
    if (px > map_x && px < map_x + map_w - 1 && py > map_y && py < map_y + map_h - 1) {
        vectar_put(buf, px, py, '@');
    }
}

EXPORT void game_render(GameState* game) {
    if (!game || !game->buffer) return;

    vectar_buffer_clear(game->buffer);

    // Space mode rendering
    if (game->phase == PHASE_SPACE) {
        render_space_mode(game);
        return;
    }

    // Render tunnel with twist
    if (game->tunnel) {
        tunnel_render(game->tunnel, game->buffer,
                     game->camera_z, game->camera_twist, game->fov);
    }

    // Render sprites (sorted by distance - far first)
    for (int i = 0; i < MAX_SPRITES; i++) {
        Sprite* s = &game->sprites[i];
        if (!s->active) continue;

        int sx, sy;
        if (project_sprite(game, s->segment, s->z, &sx, &sy)) {
            // Calculate size based on distance - closer = bigger
            float dist = game->camera_z - s->z;
            float size = s->scale * game->fov * 8.0f / fmaxf(dist, 1.0f);
            size = fminf(size, 10.0f);  // Cap max size

            if (s->type == SPRITE_TETRA) {
                draw_tetrahedron(game->buffer, sx, sy, s->rotation, size);
            } else {
                draw_square(game->buffer, sx, sy, size);
            }
        }
    }

    // Render shots
    for (int i = 0; i < MAX_SHOTS; i++) {
        Shot* shot = &game->shots[i];
        if (!shot->active) continue;

        for (float zoff = 0; zoff < 6.0f; zoff += 1.5f) {
            int sx, sy;
            if (project_sprite(game, shot->segment, shot->z + zoff, &sx, &sy)) {
                vectar_put(game->buffer, sx, sy, '*');
            }
        }
    }

    // Draw crosshair at player position
    int px = game->screen_width / 2 + (int)(game->player_x * game->screen_width * 0.25f);
    int py = game->screen_height / 2 + (int)(game->player_y * game->screen_height * 0.25f);
    if (px >= 1 && px < game->screen_width - 1 && py >= 1 && py < game->screen_height - 1) {
        vectar_put(game->buffer, px, py, '+');
    }

    // Draw minimap in corner (track mode only)
    if (game->use_track && game->track) {
        int map_w = 18;
        int map_h = 12;
        int map_x = game->screen_width - map_w - 1;
        int map_y = 1;
        track_render_minimap(game->track, game->buffer, map_x, map_y, map_w, map_h);
    }
}

EXPORT const char* game_get_output(GameState* game) {
    if (!game || !game->buffer || !game->output_string) return "";

    vectar_buffer_to_string(game->buffer, game->output_string, game->output_capacity);
    return game->output_string;
}

EXPORT VectarBuffer* game_get_buffer(GameState* game) {
    return game ? game->buffer : NULL;
}

// ============================================================
// Camera Control
// ============================================================

EXPORT void game_set_speed(GameState* game, float speed) {
    if (game) game->camera_speed = speed;
}

EXPORT float game_get_speed(GameState* game) {
    return game ? game->camera_speed : 0;
}

EXPORT void game_set_fov(GameState* game, float fov) {
    if (game) game->fov = fov;
}

EXPORT float game_get_camera_z(GameState* game) {
    return game ? game->camera_z : 0;
}

EXPORT float game_get_twist(GameState* game) {
    return game ? game->camera_twist : 0;
}

// Tunnel parameter setters/getters
EXPORT void game_set_segments(GameState* game, int segments) {
    if (!game) return;
    if (segments < MIN_SEGMENTS) segments = MIN_SEGMENTS;
    if (segments > MAX_SEGMENTS) segments = MAX_SEGMENTS;
    if (segments != game->num_segments) {
        game->num_segments = segments;
        game->tunnel_dirty = 1;
    }
}

EXPORT int game_get_segments(GameState* game) {
    return game ? game->num_segments : DEFAULT_SEGMENTS;
}

EXPORT void game_set_spacing(GameState* game, float spacing) {
    if (!game) return;
    if (spacing < 0.5f) spacing = 0.5f;
    if (spacing > 5.0f) spacing = 5.0f;
    if (spacing != game->ring_spacing) {
        game->ring_spacing = spacing;
        game->tunnel_dirty = 1;
    }
}

EXPORT float game_get_spacing(GameState* game) {
    return game ? game->ring_spacing : DEFAULT_SPACING;
}

EXPORT void game_set_glow_falloff(GameState* game, float falloff) {
    if (!game) return;
    if (falloff < 0.5f) falloff = 0.5f;
    if (falloff > 0.99f) falloff = 0.99f;
    game->glow_falloff = falloff;
}

EXPORT float game_get_glow_falloff(GameState* game) {
    return game ? game->glow_falloff : DEFAULT_GLOW_FALLOFF;
}

EXPORT float game_get_fov(GameState* game) {
    return game ? game->fov : DEFAULT_FOV;
}

// ============================================================
// Shooting
// ============================================================

// Calculate which segment the player is aiming at
static int get_player_segment(GameState* game) {
    // Convert player position to angle, offset by twist
    float angle = atan2f(game->player_y, game->player_x) - game->camera_twist;
    if (angle < 0) angle += 2.0f * PI;
    int segment = (int)(angle / (2.0f * PI) * game->num_segments);
    return segment % game->num_segments;
}

EXPORT void game_shoot(GameState* game) {
    if (!game) return;

    // Find inactive shot slot
    for (int i = 0; i < MAX_SHOTS; i++) {
        if (!game->shots[i].active) {
            game->shots[i].active = 1;
            game->shots[i].glow_intensity = 1.0f;
            game->shots[i].glow_ring = 0;

            if (game->phase == PHASE_SPACE) {
                // Space mode: shoot from player position toward entrance
                game->shots[i].z = game->space_z;
                game->shots[i].segment = 0;  // Not used in space
            } else {
                // Tube mode: shoot down a segment
                game->shots[i].segment = get_player_segment(game);
                game->shots[i].z = game->camera_z - 2.0f;
            }

            event_push(&game->events, EVENT_SHOT_FIRED, 1.0f,
                      game->player_x, game->player_y, game->shots[i].segment);
            break;
        }
    }
}

EXPORT int game_get_score(GameState* game) {
    return game ? game->score : 0;
}

// ============================================================
// Reset
// ============================================================

EXPORT void game_reset(GameState* game) {
    if (!game) return;

    // Reset to space mode
    game->phase = PHASE_SPACE;
    game->space_x = 0;
    game->space_y = 0;
    game->space_z = 30.0f;
    game->vel_x = 0;
    game->vel_y = 0;
    game->vel_z = 0;
    game->entrance_unlocked = 0;
    game->hit_flash = 0;

    game->camera_z = -5.0f;
    game->camera_twist = 0;
    game->target_twist = 0;
    game->camera_speed = 0;

    game->player_x = 0;
    game->player_y = 0;
    game->wall_distance = 1.0f;
    game->last_ring_passed = -1;
    game->rings_passed = 0;

    game->score = 0;
    game->sprite_spawn_timer = 0;

    for (int i = 0; i < MAX_SPRITES; i++) {
        game->sprites[i].active = 0;
    }
    for (int i = 0; i < MAX_SHOTS; i++) {
        game->shots[i].active = 0;
    }
    for (int i = 0; i < MAX_SEGMENTS; i++) {
        game->column_glow[i] = 0;
    }

    event_clear(&game->events);

    // Spawn guards
    spawn_guards(game);
}

// ============================================================
// Event System API
// ============================================================

EXPORT int game_poll_event_type(GameState* game) {
    if (!game) return EVENT_NONE;
    GameEvent* e = event_peek(&game->events);
    return e ? (int)e->type : EVENT_NONE;
}

EXPORT float game_poll_event_value(GameState* game) {
    if (!game) return 0;
    GameEvent* e = event_peek(&game->events);
    return e ? e->value : 0;
}

EXPORT float game_poll_event_x(GameState* game) {
    if (!game) return 0;
    GameEvent* e = event_peek(&game->events);
    return e ? e->x : 0;
}

EXPORT float game_poll_event_y(GameState* game) {
    if (!game) return 0;
    GameEvent* e = event_peek(&game->events);
    return e ? e->y : 0;
}

EXPORT void game_pop_event(GameState* game) {
    if (game) event_pop(&game->events);
}

EXPORT int game_event_count(GameState* game) {
    return game ? game->events.count : 0;
}

// ============================================================
// Player Control API
// ============================================================

EXPORT void game_set_player_pos(GameState* game, float x, float y) {
    if (!game) return;
    // Clamp to valid range
    game->player_x = x < -1 ? -1 : (x > 1 ? 1 : x);
    game->player_y = y < -1 ? -1 : (y > 1 ? 1 : y);
}

EXPORT float game_get_player_x(GameState* game) {
    return game ? game->player_x : 0;
}

EXPORT float game_get_player_y(GameState* game) {
    return game ? game->player_y : 0;
}

EXPORT float game_get_wall_distance(GameState* game) {
    return game ? game->wall_distance : 1;
}

EXPORT int game_get_rings_passed(GameState* game) {
    return game ? game->rings_passed : 0;
}

// ============================================================
// Track Mode API
// ============================================================

EXPORT void game_set_track_mode(GameState* game, int use_track) {
    if (game) game->use_track = use_track;
}

EXPORT int game_get_track_mode(GameState* game) {
    return game ? game->use_track : 0;
}

EXPORT void game_set_turn(GameState* game, int turn) {
    if (game) game->turn_input = turn;
}

EXPORT int game_at_junction(GameState* game) {
    if (!game || !game->track) return 0;
    return track_at_junction(game->track);
}

EXPORT int game_can_go_left(GameState* game) {
    if (!game || !game->track) return 0;
    return track_can_go(game->track, DIR_LEFT);
}

EXPORT int game_can_go_right(GameState* game) {
    if (!game || !game->track) return 0;
    return track_can_go(game->track, DIR_RIGHT);
}

EXPORT float game_get_track_x(GameState* game) {
    if (!game || !game->track) return 0;
    return track_get_position(game->track).x;
}

EXPORT float game_get_track_z(GameState* game) {
    if (!game || !game->track) return 0;
    return track_get_position(game->track).z;
}

EXPORT float game_get_track_yaw(GameState* game) {
    if (!game || !game->track) return 0;
    return track_get_yaw(game->track);
}

// ============================================================
// Space/Phase API
// ============================================================

EXPORT int game_get_phase(GameState* game) {
    return game ? game->phase : 0;
}

EXPORT int game_get_guards_remaining(GameState* game) {
    return game ? game->guards_remaining : 0;
}

EXPORT int game_is_entrance_unlocked(GameState* game) {
    return game ? game->entrance_unlocked : 0;
}

EXPORT float game_get_hit_flash(GameState* game) {
    return game ? game->hit_flash : 0;
}

EXPORT float game_get_space_x(GameState* game) {
    return game ? game->space_x : 0;
}

EXPORT float game_get_space_y(GameState* game) {
    return game ? game->space_y : 0;
}

EXPORT float game_get_space_z(GameState* game) {
    return game ? game->space_z : 0;
}
