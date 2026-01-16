#ifndef VECTAR_MATH_H
#define VECTAR_MATH_H

#include <math.h>

// ============================================================
// Vector Types
// ============================================================

typedef struct { float x, y; } Vec2;
typedef struct { float x, y, z; } Vec3;
typedef struct { float x, y, z, w; } Vec4;

// 4x4 Matrix (column-major for OpenGL compatibility)
typedef struct { float m[16]; } Mat4;

// ============================================================
// Vec2 Operations
// ============================================================

static inline Vec2 vec2(float x, float y) {
    return (Vec2){x, y};
}

static inline Vec2 vec2_add(Vec2 a, Vec2 b) {
    return (Vec2){a.x + b.x, a.y + b.y};
}

static inline Vec2 vec2_sub(Vec2 a, Vec2 b) {
    return (Vec2){a.x - b.x, a.y - b.y};
}

static inline Vec2 vec2_scale(Vec2 v, float s) {
    return (Vec2){v.x * s, v.y * s};
}

// ============================================================
// Vec3 Operations
// ============================================================

static inline Vec3 vec3(float x, float y, float z) {
    return (Vec3){x, y, z};
}

static inline Vec3 vec3_add(Vec3 a, Vec3 b) {
    return (Vec3){a.x + b.x, a.y + b.y, a.z + b.z};
}

static inline Vec3 vec3_sub(Vec3 a, Vec3 b) {
    return (Vec3){a.x - b.x, a.y - b.y, a.z - b.z};
}

static inline Vec3 vec3_scale(Vec3 v, float s) {
    return (Vec3){v.x * s, v.y * s, v.z * s};
}

static inline Vec3 vec3_neg(Vec3 v) {
    return (Vec3){-v.x, -v.y, -v.z};
}

static inline float vec3_dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

static inline Vec3 vec3_cross(Vec3 a, Vec3 b) {
    return (Vec3){
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
    };
}

static inline float vec3_length(Vec3 v) {
    return sqrtf(vec3_dot(v, v));
}

static inline Vec3 vec3_normalize(Vec3 v) {
    float len = vec3_length(v);
    if (len > 0.0001f) {
        return vec3_scale(v, 1.0f / len);
    }
    return v;
}

// ============================================================
// Mat4 Operations
// ============================================================

// Matrix layout (column-major):
// m[0] m[4] m[8]  m[12]    | xx yx zx tx |
// m[1] m[5] m[9]  m[13]    | xy yy zy ty |
// m[2] m[6] m[10] m[14]    | xz yz zz tz |
// m[3] m[7] m[11] m[15]    | 0  0  0  1  |

Mat4 mat4_identity(void);
Mat4 mat4_multiply(Mat4 a, Mat4 b);
Mat4 mat4_rotate_x(float radians);
Mat4 mat4_rotate_y(float radians);
Mat4 mat4_rotate_z(float radians);
Mat4 mat4_translate(float x, float y, float z);
Mat4 mat4_scale(float x, float y, float z);
Mat4 mat4_perspective(float fov_radians, float aspect, float near, float far);
Mat4 mat4_look_at(Vec3 eye, Vec3 target, Vec3 up);

// Transform a point by a matrix
Vec3 mat4_transform_point(Mat4 m, Vec3 p);
Vec4 mat4_transform_vec4(Mat4 m, Vec4 v);

// ============================================================
// Projection
// ============================================================

// Project a 3D point to 2D screen coordinates
// Returns screen coords with (0,0) at top-left
// z component of input should be negative (in front of camera)
Vec2 project_to_screen(Vec3 point, int screen_width, int screen_height, float fov);

// ============================================================
// Utilities
// ============================================================

#define PI 3.14159265358979323846f
#define DEG_TO_RAD(d) ((d) * PI / 180.0f)
#define RAD_TO_DEG(r) ((r) * 180.0f / PI)

static inline float clampf(float v, float min, float max) {
    return v < min ? min : (v > max ? max : v);
}

static inline float lerpf(float a, float b, float t) {
    return a + (b - a) * t;
}

#endif // VECTAR_MATH_H
