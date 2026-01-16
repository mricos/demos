#ifndef VECVISION_ENTITY_H
#define VECVISION_ENTITY_H

#include "vectar_math.h"

// ============================================================
// VecVision Entity System
// Generic entities for player, sprites, shots, etc.
// ============================================================

// Entity flags (bitmask)
#define ENT_ACTIVE      (1 << 0)
#define ENT_VISIBLE     (1 << 1)
#define ENT_SOLID       (1 << 2)
#define ENT_PLAYER      (1 << 3)
#define ENT_ENEMY       (1 << 4)
#define ENT_PROJECTILE  (1 << 5)
#define ENT_FRIENDLY    (1 << 6)

// Entity types
typedef enum {
    ENT_NONE = 0,
    ENT_PLAYER_SHIP,
    ENT_TETRA,          // Rotating tetrahedron (shoot it)
    ENT_SQUARE,         // Flat square (don't shoot)
    ENT_SHOT,           // Projectile
    ENT_GUARD,          // Space guard
    ENT_TYPE_COUNT
} EntType;

// ============================================================
// Entity Structure
// ============================================================

typedef struct {
    // Identity
    int id;
    EntType type;
    unsigned int flags;

    // Transform
    Vec3 pos;           // Position
    Vec3 vel;           // Velocity
    float rot;          // Rotation angle
    float rot_vel;      // Rotation speed
    float scale;        // Size

    // Collision
    float radius;

    // Gameplay
    int health;
    int damage;
    int points;         // Score when destroyed
    float life;         // Remaining lifetime (-1 = infinite)

    // Rendering
    int segment;        // Tunnel segment index
    float glow;         // Glow intensity
} Entity;

// ============================================================
// Entity Pool
// ============================================================

#define ENT_POOL_SIZE 64

typedef struct {
    Entity ents[ENT_POOL_SIZE];
    int next_id;
} EntPool;

// Pool management
void ent_pool_init(EntPool* p);
void ent_pool_clear(EntPool* p);

// Spawn/destroy
Entity* ent_spawn(EntPool* p, EntType type);
void ent_kill(Entity* e);

// Iteration
Entity* ent_first(EntPool* p, unsigned int flags);
Entity* ent_next(EntPool* p, Entity* e, unsigned int flags);
int ent_count(EntPool* p, unsigned int flags);

// ============================================================
// Entity Physics
// ============================================================

void ent_move(Entity* e, float dt, float drag);
void ent_thrust(Entity* e, float ax, float ay, float az, float dt);
void ent_clamp_speed(Entity* e, float max);
void ent_rotate(Entity* e, float dt);

// ============================================================
// Entity Collision
// ============================================================

int ent_collide(Entity* a, Entity* b);
float ent_dist(Entity* a, Entity* b);
void ent_bounce(Entity* e, Entity* other, float power);

// ============================================================
// Entity Defaults
// ============================================================

void ent_set_defaults(Entity* e, EntType type);

#endif // VECVISION_ENTITY_H
