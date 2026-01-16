#include "vectar_math.h"
#include <string.h>

// ============================================================
// Mat4 Implementation
// ============================================================

Mat4 mat4_identity(void) {
    Mat4 m = {0};
    m.m[0] = 1.0f;
    m.m[5] = 1.0f;
    m.m[10] = 1.0f;
    m.m[15] = 1.0f;
    return m;
}

Mat4 mat4_multiply(Mat4 a, Mat4 b) {
    Mat4 result = {0};
    for (int col = 0; col < 4; col++) {
        for (int row = 0; row < 4; row++) {
            result.m[col * 4 + row] =
                a.m[0 * 4 + row] * b.m[col * 4 + 0] +
                a.m[1 * 4 + row] * b.m[col * 4 + 1] +
                a.m[2 * 4 + row] * b.m[col * 4 + 2] +
                a.m[3 * 4 + row] * b.m[col * 4 + 3];
        }
    }
    return result;
}

Mat4 mat4_rotate_x(float radians) {
    float c = cosf(radians);
    float s = sinf(radians);
    Mat4 m = mat4_identity();
    m.m[5] = c;
    m.m[6] = s;
    m.m[9] = -s;
    m.m[10] = c;
    return m;
}

Mat4 mat4_rotate_y(float radians) {
    float c = cosf(radians);
    float s = sinf(radians);
    Mat4 m = mat4_identity();
    m.m[0] = c;
    m.m[2] = -s;
    m.m[8] = s;
    m.m[10] = c;
    return m;
}

Mat4 mat4_rotate_z(float radians) {
    float c = cosf(radians);
    float s = sinf(radians);
    Mat4 m = mat4_identity();
    m.m[0] = c;
    m.m[1] = s;
    m.m[4] = -s;
    m.m[5] = c;
    return m;
}

Mat4 mat4_translate(float x, float y, float z) {
    Mat4 m = mat4_identity();
    m.m[12] = x;
    m.m[13] = y;
    m.m[14] = z;
    return m;
}

Mat4 mat4_scale(float x, float y, float z) {
    Mat4 m = mat4_identity();
    m.m[0] = x;
    m.m[5] = y;
    m.m[10] = z;
    return m;
}

Mat4 mat4_perspective(float fov_radians, float aspect, float near, float far) {
    Mat4 m = {0};
    float f = 1.0f / tanf(fov_radians / 2.0f);
    float range_inv = 1.0f / (near - far);

    m.m[0] = f / aspect;
    m.m[5] = f;
    m.m[10] = (near + far) * range_inv;
    m.m[11] = -1.0f;
    m.m[14] = 2.0f * near * far * range_inv;
    return m;
}

Mat4 mat4_look_at(Vec3 eye, Vec3 target, Vec3 up) {
    Vec3 f = vec3_normalize(vec3_sub(target, eye));  // Forward
    Vec3 r = vec3_normalize(vec3_cross(f, up));       // Right
    Vec3 u = vec3_cross(r, f);                        // Up

    Mat4 m = mat4_identity();
    m.m[0] = r.x;   m.m[4] = r.y;   m.m[8] = r.z;
    m.m[1] = u.x;   m.m[5] = u.y;   m.m[9] = u.z;
    m.m[2] = -f.x;  m.m[6] = -f.y;  m.m[10] = -f.z;
    m.m[12] = -vec3_dot(r, eye);
    m.m[13] = -vec3_dot(u, eye);
    m.m[14] = vec3_dot(f, eye);
    return m;
}

Vec3 mat4_transform_point(Mat4 m, Vec3 p) {
    float w = m.m[3] * p.x + m.m[7] * p.y + m.m[11] * p.z + m.m[15];
    if (fabsf(w) < 0.0001f) w = 0.0001f;
    return (Vec3){
        (m.m[0] * p.x + m.m[4] * p.y + m.m[8] * p.z + m.m[12]) / w,
        (m.m[1] * p.x + m.m[5] * p.y + m.m[9] * p.z + m.m[13]) / w,
        (m.m[2] * p.x + m.m[6] * p.y + m.m[10] * p.z + m.m[14]) / w
    };
}

Vec4 mat4_transform_vec4(Mat4 m, Vec4 v) {
    return (Vec4){
        m.m[0] * v.x + m.m[4] * v.y + m.m[8] * v.z + m.m[12] * v.w,
        m.m[1] * v.x + m.m[5] * v.y + m.m[9] * v.z + m.m[13] * v.w,
        m.m[2] * v.x + m.m[6] * v.y + m.m[10] * v.z + m.m[14] * v.w,
        m.m[3] * v.x + m.m[7] * v.y + m.m[11] * v.z + m.m[15] * v.w
    };
}

// ============================================================
// Projection
// ============================================================

Vec2 project_to_screen(Vec3 point, int screen_width, int screen_height, float fov) {
    // Simple perspective projection
    // Assumes camera at origin looking down -Z
    // Points with negative Z are in front of camera

    if (point.z >= -0.1f) {
        // Behind camera or too close - return off-screen
        return (Vec2){-1000, -1000};
    }

    // Perspective divide
    float scale = fov / (-point.z);
    float proj_x = point.x * scale;
    float proj_y = point.y * scale;

    // Convert to screen coordinates
    // Center of screen is (0, 0) in projection space
    // Screen Y is flipped (0 at top)
    float screen_x = (proj_x + 1.0f) * 0.5f * screen_width;
    float screen_y = (1.0f - proj_y) * 0.5f * screen_height;

    return (Vec2){screen_x, screen_y};
}
