#ifndef VECTAR_RASTER_H
#define VECTAR_RASTER_H

#include "vectar_math.h"
#include <stdint.h>

// ============================================================
// Vectar Buffer - Character framebuffer for vector rendering
// ============================================================

typedef enum {
    VECTAR_MODE_OVERLAY = 0,  // Vector overwrites (default)
    VECTAR_MODE_UNDER,        // Vector only where ASCII is space
    VECTAR_MODE_XOR,          // Toggle character
    VECTAR_MODE_BLEND         // Smart blend (future)
} VectarCompositeMode;

typedef struct {
    char* buffer;           // Character buffer (width * height)
    int width;
    int height;
    char clear_char;        // Character to clear with (space)
} VectarBuffer;

// ============================================================
// Buffer Management
// ============================================================

VectarBuffer* vectar_buffer_new(int width, int height);
void vectar_buffer_free(VectarBuffer* buf);
void vectar_buffer_clear(VectarBuffer* buf);
void vectar_buffer_resize(VectarBuffer* buf, int width, int height);

// Get buffer as null-terminated string (adds newlines)
const char* vectar_buffer_to_string(VectarBuffer* buf, char* out, int out_size);

// ============================================================
// Drawing Primitives
// ============================================================

// Put a single character (with bounds checking)
void vectar_put(VectarBuffer* buf, int x, int y, char c);

// Get character at position
char vectar_get(VectarBuffer* buf, int x, int y);

// Draw line with auto-selected character based on angle
void vectar_line(VectarBuffer* buf, int x1, int y1, int x2, int y2);

// Draw line with specific character
void vectar_line_char(VectarBuffer* buf, int x1, int y1, int x2, int y2, char c);

// Draw horizontal line
void vectar_hline(VectarBuffer* buf, int x, int y, int length, char c);

// Draw vertical line
void vectar_vline(VectarBuffer* buf, int x, int y, int length, char c);

// Draw rectangle outline
void vectar_rect(VectarBuffer* buf, int x, int y, int w, int h);

// Draw filled rectangle
void vectar_fill_rect(VectarBuffer* buf, int x, int y, int w, int h, char c);

// Draw circle outline
void vectar_circle(VectarBuffer* buf, int cx, int cy, int r);

// Draw text
void vectar_text(VectarBuffer* buf, int x, int y, const char* str);

// Draw connected points (polygon outline)
void vectar_polygon(VectarBuffer* buf, Vec2* points, int count, int closed);

// ============================================================
// Compositing
// ============================================================

// Composite vectar buffer over ASCII buffer
// ascii_buffer should be same dimensions as vectar buffer
void vectar_composite(VectarBuffer* vec, char* ascii_buffer, VectarCompositeMode mode);

// ============================================================
// Character Selection
// ============================================================

// Select best line character based on angle
char vectar_select_line_char(int x1, int y1, int x2, int y2);

#endif // VECTAR_RASTER_H
