#include "vectar_geom.h"
#include <stdlib.h>
#include <math.h>

// ============================================================
// Ring Implementation
// ============================================================

Ring* ring_create(Vec3 center, float radius, int segments) {
    Ring* ring = (Ring*)malloc(sizeof(Ring));
    if (!ring) return NULL;

    ring->center = center;
    ring->radius = radius;
    ring->segments = segments;
    ring->vertices = (Vec3*)malloc(sizeof(Vec3) * segments);

    if (!ring->vertices) {
        free(ring);
        return NULL;
    }

    ring_update(ring);
    return ring;
}

void ring_free(Ring* ring) {
    if (ring) {
        free(ring->vertices);
        free(ring);
    }
}

void ring_update(Ring* ring) {
    if (!ring || !ring->vertices) return;

    float angle_step = 2.0f * PI / ring->segments;

    for (int i = 0; i < ring->segments; i++) {
        float angle = i * angle_step;
        ring->vertices[i] = (Vec3){
            ring->center.x + ring->radius * cosf(angle),
            ring->center.y + ring->radius * sinf(angle),
            ring->center.z
        };
    }
}

void ring_render(Ring* ring, VectarBuffer* buf, float camera_z, float camera_rot, float fov) {
    if (!ring || !buf || ring->segments < 3) return;

    Vec2* screen_points = (Vec2*)malloc(sizeof(Vec2) * ring->segments);
    if (!screen_points) return;

    // Build camera transform
    Mat4 cam_translate = mat4_translate(0, 0, -camera_z);
    Mat4 cam_rotate = mat4_rotate_y(camera_rot);
    Mat4 cam_transform = mat4_multiply(cam_rotate, cam_translate);

    int valid_points = 0;

    // Transform and project each vertex
    for (int i = 0; i < ring->segments; i++) {
        // Transform to camera space
        Vec3 cam_pos = mat4_transform_point(cam_transform, ring->vertices[i]);

        // Project to screen
        screen_points[i] = project_to_screen(cam_pos, buf->width, buf->height, fov);

        // Check if point is valid (in front of camera and on screen)
        if (screen_points[i].x >= -100 && screen_points[i].x < buf->width + 100 &&
            screen_points[i].y >= -100 && screen_points[i].y < buf->height + 100) {
            valid_points++;
        }
    }

    // Only draw if most points are visible
    if (valid_points >= ring->segments / 2) {
        vectar_polygon(buf, screen_points, ring->segments, 1);  // closed polygon
    }

    free(screen_points);
}

// ============================================================
// Tunnel Implementation
// ============================================================

Tunnel* tunnel_create(int ring_count, int segments, float radius, float spacing) {
    Tunnel* tunnel = (Tunnel*)malloc(sizeof(Tunnel));
    if (!tunnel) return NULL;

    tunnel->ring_count = ring_count;
    tunnel->segments = segments;
    tunnel->radius = radius;
    tunnel->ring_spacing = spacing;
    tunnel->total_length = ring_count * spacing;

    tunnel->rings = (Ring**)malloc(sizeof(Ring*) * ring_count);
    if (!tunnel->rings) {
        free(tunnel);
        return NULL;
    }

    // Create rings along Z axis
    for (int i = 0; i < ring_count; i++) {
        Vec3 center = {0, 0, -i * spacing};  // Negative Z = in front of camera
        tunnel->rings[i] = ring_create(center, radius, segments);
    }

    return tunnel;
}

void tunnel_free(Tunnel* tunnel) {
    if (tunnel) {
        if (tunnel->rings) {
            for (int i = 0; i < tunnel->ring_count; i++) {
                ring_free(tunnel->rings[i]);
            }
            free(tunnel->rings);
        }
        free(tunnel);
    }
}

void tunnel_scroll(Tunnel* tunnel, float camera_z) {
    if (!tunnel) return;

    // Find rings that are behind the camera and move them to the front
    // Camera looks down -Z, rings in front have z < camera_z
    // Ring is behind if ring->center.z > camera_z
    for (int i = 0; i < tunnel->ring_count; i++) {
        Ring* ring = tunnel->rings[i];
        if (!ring) continue;

        // If ring is behind camera
        if (ring->center.z > camera_z + tunnel->ring_spacing) {
            // Find the furthest ring in front
            float min_z = camera_z;
            for (int j = 0; j < tunnel->ring_count; j++) {
                if (tunnel->rings[j] && tunnel->rings[j]->center.z < min_z) {
                    min_z = tunnel->rings[j]->center.z;
                }
            }
            // Move this ring to front
            ring->center.z = min_z - tunnel->ring_spacing;
            ring_update(ring);
        }
    }
}

void tunnel_render(Tunnel* tunnel, VectarBuffer* buf, float camera_z, float camera_rot, float fov) {
    if (!tunnel || !buf) return;

    // Sort rings by distance (furthest first for proper overlap)
    // Simple bubble sort is fine for small ring counts
    for (int i = 0; i < tunnel->ring_count - 1; i++) {
        for (int j = 0; j < tunnel->ring_count - i - 1; j++) {
            float z1 = tunnel->rings[j]->center.z + camera_z;
            float z2 = tunnel->rings[j+1]->center.z + camera_z;
            if (z1 > z2) {  // z1 is closer, swap
                Ring* temp = tunnel->rings[j];
                tunnel->rings[j] = tunnel->rings[j+1];
                tunnel->rings[j+1] = temp;
            }
        }
    }

    // Render rings (furthest first)
    for (int i = 0; i < tunnel->ring_count; i++) {
        Ring* ring = tunnel->rings[i];
        if (!ring) continue;

        // Check if ring is in front of camera (ring.z < camera_z)
        // and within visible range
        float dist = camera_z - ring->center.z;  // Positive = in front
        if (dist > 0.5f && dist < 50.0f) {  // Visible range
            ring_render(ring, buf, camera_z, camera_rot, fov);
        }
    }

    // Also draw longitudinal lines connecting rings (optional, adds depth)
    // Connect every Nth vertex between adjacent rings
    int connect_interval = tunnel->segments / 8;  // Connect 8 lines along tunnel
    if (connect_interval < 1) connect_interval = 1;

    for (int seg = 0; seg < tunnel->segments; seg += connect_interval) {
        for (int i = 0; i < tunnel->ring_count - 1; i++) {
            Ring* r1 = tunnel->rings[i];
            Ring* r2 = tunnel->rings[i + 1];
            if (!r1 || !r2) continue;

            float dist1 = camera_z - r1->center.z;
            float dist2 = camera_z - r2->center.z;

            // Only draw if both rings are visible
            if (dist1 > 0.5f && dist1 < 50.0f &&
                dist2 > 0.5f && dist2 < 50.0f) {

                Mat4 cam_translate = mat4_translate(0, 0, -camera_z);
                Mat4 cam_rotate = mat4_rotate_y(camera_rot);
                Mat4 cam_transform = mat4_multiply(cam_rotate, cam_translate);

                Vec3 p1 = mat4_transform_point(cam_transform, r1->vertices[seg]);
                Vec3 p2 = mat4_transform_point(cam_transform, r2->vertices[seg]);

                Vec2 s1 = project_to_screen(p1, buf->width, buf->height, fov);
                Vec2 s2 = project_to_screen(p2, buf->width, buf->height, fov);

                if (s1.x > -100 && s1.x < buf->width + 100 &&
                    s2.x > -100 && s2.x < buf->width + 100) {
                    vectar_line(buf, (int)s1.x, (int)s1.y, (int)s2.x, (int)s2.y);
                }
            }
        }
    }
}

// ============================================================
// Utility
// ============================================================

void generate_polygon_points(Vec3* out, int count, Vec3 center, float radius, float rotation) {
    float angle_step = 2.0f * PI / count;
    for (int i = 0; i < count; i++) {
        float angle = i * angle_step + rotation;
        out[i] = (Vec3){
            center.x + radius * cosf(angle),
            center.y + radius * sinf(angle),
            center.z
        };
    }
}
