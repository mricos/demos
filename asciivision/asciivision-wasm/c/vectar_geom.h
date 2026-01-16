#ifndef VECTAR_GEOM_H
#define VECTAR_GEOM_H

#include "vectar_math.h"
#include "vectar_raster.h"

// ============================================================
// Ring - Single cross-section of tunnel
// ============================================================

typedef struct {
    Vec3 center;        // Position along tunnel axis (usually on Z)
    float radius;       // Ring radius
    int segments;       // Number of vertices
    Vec3* vertices;     // Array of segment vertices
} Ring;

// Create/free ring
Ring* ring_create(Vec3 center, float radius, int segments);
void ring_free(Ring* ring);

// Regenerate vertices (call after changing center/radius)
void ring_update(Ring* ring);

// Render ring to buffer (project and draw)
void ring_render(Ring* ring, VectarBuffer* buf, float camera_z, float camera_rot, float fov);

// ============================================================
// Tunnel - Series of rings for infinite tunnel
// ============================================================

typedef struct {
    Ring** rings;           // Array of ring pointers
    int ring_count;         // Number of rings
    float ring_spacing;     // Distance between rings
    float radius;           // Tunnel radius
    int segments;           // Segments per ring
    float total_length;     // Total length (ring_count * ring_spacing)
} Tunnel;

// Create tunnel with specified parameters
Tunnel* tunnel_create(int ring_count, int segments, float radius, float spacing);
void tunnel_free(Tunnel* tunnel);

// Update tunnel for infinite scrolling
// As camera moves forward, rings behind camera wrap to front
void tunnel_scroll(Tunnel* tunnel, float camera_z);

// Render visible portion of tunnel
void tunnel_render(Tunnel* tunnel, VectarBuffer* buf, float camera_z, float camera_rot, float fov);

// ============================================================
// Utility
// ============================================================

// Generate points for a regular polygon (useful for rings)
void generate_polygon_points(Vec3* out, int count, Vec3 center, float radius, float rotation);

#endif // VECTAR_GEOM_H
