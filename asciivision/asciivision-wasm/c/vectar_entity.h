#ifndef VECTAR_ENTITY_H
#define VECTAR_ENTITY_H

#include "vectar_math.h"

// ============================================================
// Generic Entity System
// ============================================================
// Entities are the base for all game objects: player, sprites,
// shots, etc. Each has position, velocity, and collision bounds.

// Entity flags
#define ENT_ACTIVE      (1 << 0)
#define ENT_VISIBLE     (1 << 1)
#define ENT_SOLID       (1 << 2)
#define ENT_PLAYER      (1 << 3)
#define ENT_ENEMY       (1 << 4)
#define ENT_PROJECTILE  (1 << 5)
#define ENT_PICKUP      (1 << 6)

// Entity type IDs
typedef enum {
    ENT_TYPE_NONE = 0,
    ENT_TYPE_PLAYER,
    ENT_TYPE_TETRA,      // Rotating tetrahedron (enemy, shoot it)
    ENT_TYPE_SQUARE,     // Flat square (friendly, don't shoot)
    ENT_TYPE_SHOT,       // Player projectile
    ENT_TYPE_GUARD,      // Space guard
    ENT_TYPE_MAX
} EntityType;

// Core entity structure
typedef struct {
    // Identity
    int id;                 // Unique ID
    EntityType type;        // What kind of entity
    unsigned int flags;     // ENT_* flags

    // Transform
    Vec3 pos;               // World position
    Vec3 vel;               // Velocity (for inertia)
    float rotation;         // Current rotation (radians)
    float rot_speed;        // Rotation velocity
    float scale;            // Size multiplier

    // Collision
    float radius;           // Collision radius
    int collision_mask;     // What it collides with (flags)

    // Gameplay
    int health;             // HP (0 = destroyed)
    int damage;             // Damage dealt on collision
    int score_value;        // Points when destroyed
    float lifetime;         // Time remaining (-1 = infinite)

    // Visual
    int segment;            // Tunnel segment (for tube mode)
    float glow;             // Glow intensity (0-1)

    // User data
    void* data;             // Type-specific data pointer
} Entity;

// ============================================================
// Entity Pool - Fixed-size pool for fast allocation
// ============================================================

#define MAX_ENTITIES 64

typedef struct {
    Entity entities[MAX_ENTITIES];
    int count;              // Active count
    int next_id;            // ID counter
} EntityPool;

// ============================================================
// Entity API
// ============================================================

// Pool management
void entity_pool_init(EntityPool* pool);
void entity_pool_clear(EntityPool* pool);

// Entity lifecycle
Entity* entity_spawn(EntityPool* pool, EntityType type);
void entity_destroy(EntityPool* pool, Entity* ent);
Entity* entity_get(EntityPool* pool, int id);

// Entity iteration (returns NULL when done)
Entity* entity_first(EntityPool* pool);
Entity* entity_next(EntityPool* pool, Entity* current);

// Count entities by type
int entity_count_type(EntityPool* pool, EntityType type);
int entity_count_flags(EntityPool* pool, unsigned int flags);

// ============================================================
// Entity Physics
// ============================================================

// Apply velocity with drag
void entity_apply_velocity(Entity* ent, float dt, float drag);

// Apply acceleration (thrust)
void entity_apply_thrust(Entity* ent, float ax, float ay, float az, float dt);

// Clamp velocity to max speed
void entity_clamp_velocity(Entity* ent, float max_speed);

// Update rotation
void entity_update_rotation(Entity* ent, float dt);

// ============================================================
// Entity Collision
// ============================================================

// Check if two entities collide (sphere-sphere)
int entity_collides(Entity* a, Entity* b);

// Get distance between entities
float entity_distance(Entity* a, Entity* b);

// Check collision with point
int entity_contains_point(Entity* ent, float x, float y, float z);

// Bounce entity off another (elastic collision)
void entity_bounce(Entity* ent, Entity* other, float elasticity);

// ============================================================
// Entity Defaults
// ============================================================

// Initialize entity with type-specific defaults
void entity_init_defaults(Entity* ent, EntityType type);

#endif // VECTAR_ENTITY_H
