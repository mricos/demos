#include "vectar_raster.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

// ============================================================
// Buffer Management
// ============================================================

VectarBuffer* vectar_buffer_new(int width, int height) {
    VectarBuffer* buf = (VectarBuffer*)malloc(sizeof(VectarBuffer));
    if (!buf) return NULL;

    buf->width = width;
    buf->height = height;
    buf->clear_char = ' ';
    buf->buffer = (char*)malloc(width * height);

    if (!buf->buffer) {
        free(buf);
        return NULL;
    }

    vectar_buffer_clear(buf);
    return buf;
}

void vectar_buffer_free(VectarBuffer* buf) {
    if (buf) {
        free(buf->buffer);
        free(buf);
    }
}

void vectar_buffer_clear(VectarBuffer* buf) {
    if (buf && buf->buffer) {
        memset(buf->buffer, buf->clear_char, buf->width * buf->height);
    }
}

void vectar_buffer_resize(VectarBuffer* buf, int width, int height) {
    if (!buf) return;
    char* new_buffer = (char*)realloc(buf->buffer, width * height);
    if (new_buffer) {
        buf->buffer = new_buffer;
        buf->width = width;
        buf->height = height;
        vectar_buffer_clear(buf);
    }
}

const char* vectar_buffer_to_string(VectarBuffer* buf, char* out, int out_size) {
    if (!buf || !out) return "";

    int pos = 0;
    for (int y = 0; y < buf->height && pos < out_size - 2; y++) {
        for (int x = 0; x < buf->width && pos < out_size - 2; x++) {
            out[pos++] = buf->buffer[y * buf->width + x];
        }
        if (pos < out_size - 1) {
            out[pos++] = '\n';
        }
    }
    out[pos] = '\0';
    return out;
}

// ============================================================
// Basic Drawing
// ============================================================

void vectar_put(VectarBuffer* buf, int x, int y, char c) {
    if (!buf || x < 0 || x >= buf->width || y < 0 || y >= buf->height) return;
    buf->buffer[y * buf->width + x] = c;
}

char vectar_get(VectarBuffer* buf, int x, int y) {
    if (!buf || x < 0 || x >= buf->width || y < 0 || y >= buf->height) return ' ';
    return buf->buffer[y * buf->width + x];
}

// ============================================================
// Character Selection
// ============================================================

char vectar_select_line_char(int x1, int y1, int x2, int y2) {
    int dx = x2 - x1;
    int dy = y2 - y1;

    // Handle degenerate cases
    if (dx == 0 && dy == 0) return '*';
    if (dx == 0) return '|';
    if (dy == 0) return '-';

    // Calculate angle in degrees (0-180)
    float angle = atan2f((float)abs(dy), (float)abs(dx)) * 180.0f / PI;

    // Select character based on angle
    // Account for character aspect ratio (~2:1 height:width)
    if (angle < 20.0f) return '-';           // Nearly horizontal
    if (angle < 50.0f) {
        // Diagonal - check direction
        return ((dx > 0) == (dy > 0)) ? '\\' : '/';
    }
    if (angle < 70.0f) {
        // Steep diagonal
        return ((dx > 0) == (dy > 0)) ? '\\' : '/';
    }
    return '|';  // Nearly vertical
}

// ============================================================
// Line Drawing - Bresenham's Algorithm
// ============================================================

void vectar_line(VectarBuffer* buf, int x1, int y1, int x2, int y2) {
    char c = vectar_select_line_char(x1, y1, x2, y2);
    vectar_line_char(buf, x1, y1, x2, y2, c);
}

void vectar_line_char(VectarBuffer* buf, int x1, int y1, int x2, int y2, char c) {
    if (!buf) return;

    int dx = abs(x2 - x1);
    int dy = abs(y2 - y1);
    int sx = x1 < x2 ? 1 : -1;
    int sy = y1 < y2 ? 1 : -1;
    int err = dx - dy;

    while (1) {
        vectar_put(buf, x1, y1, c);

        if (x1 == x2 && y1 == y2) break;

        int e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
    }
}

void vectar_hline(VectarBuffer* buf, int x, int y, int length, char c) {
    for (int i = 0; i < length; i++) {
        vectar_put(buf, x + i, y, c);
    }
}

void vectar_vline(VectarBuffer* buf, int x, int y, int length, char c) {
    for (int i = 0; i < length; i++) {
        vectar_put(buf, x, y + i, c);
    }
}

// ============================================================
// Rectangle
// ============================================================

void vectar_rect(VectarBuffer* buf, int x, int y, int w, int h) {
    if (w < 1 || h < 1) return;

    // Corners
    vectar_put(buf, x, y, '+');
    vectar_put(buf, x + w - 1, y, '+');
    vectar_put(buf, x, y + h - 1, '+');
    vectar_put(buf, x + w - 1, y + h - 1, '+');

    // Top and bottom edges
    for (int i = 1; i < w - 1; i++) {
        vectar_put(buf, x + i, y, '-');
        vectar_put(buf, x + i, y + h - 1, '-');
    }

    // Left and right edges
    for (int i = 1; i < h - 1; i++) {
        vectar_put(buf, x, y + i, '|');
        vectar_put(buf, x + w - 1, y + i, '|');
    }
}

void vectar_fill_rect(VectarBuffer* buf, int x, int y, int w, int h, char c) {
    for (int py = y; py < y + h; py++) {
        for (int px = x; px < x + w; px++) {
            vectar_put(buf, px, py, c);
        }
    }
}

// ============================================================
// Circle - Midpoint Algorithm
// ============================================================

void vectar_circle(VectarBuffer* buf, int cx, int cy, int r) {
    if (r < 1) {
        vectar_put(buf, cx, cy, 'o');
        return;
    }

    int x = r, y = 0;
    int p = 1 - r;

    // Draw initial points
    vectar_put(buf, cx + x, cy, '-');
    vectar_put(buf, cx - x, cy, '-');
    vectar_put(buf, cx, cy + r/2, '|');  // Adjust for aspect ratio
    vectar_put(buf, cx, cy - r/2, '|');

    while (x > y) {
        y++;
        if (p <= 0) {
            p = p + 2 * y + 1;
        } else {
            x--;
            p = p + 2 * y - 2 * x + 1;
        }

        if (x < y) break;

        // Adjust y for character aspect ratio (~2:1)
        int ay = y / 2;

        // 8-way symmetry with character selection
        vectar_put(buf, cx + x, cy + ay, '/');
        vectar_put(buf, cx - x, cy + ay, '\\');
        vectar_put(buf, cx + x, cy - ay, '\\');
        vectar_put(buf, cx - x, cy - ay, '/');

        if (x != y) {
            int ax = x / 2;
            vectar_put(buf, cx + y, cy + ax, '\\');
            vectar_put(buf, cx - y, cy + ax, '/');
            vectar_put(buf, cx + y, cy - ax, '/');
            vectar_put(buf, cx - y, cy - ax, '\\');
        }
    }
}

// ============================================================
// Text
// ============================================================

void vectar_text(VectarBuffer* buf, int x, int y, const char* str) {
    if (!str) return;
    while (*str) {
        if (*str == '\n') {
            y++;
            x = 0;  // Reset to left (or could save original x)
        } else {
            vectar_put(buf, x++, y, *str);
        }
        str++;
    }
}

// ============================================================
// Polygon
// ============================================================

void vectar_polygon(VectarBuffer* buf, Vec2* points, int count, int closed) {
    if (!points || count < 2) return;

    for (int i = 0; i < count - 1; i++) {
        vectar_line(buf,
            (int)points[i].x, (int)points[i].y,
            (int)points[i+1].x, (int)points[i+1].y
        );
    }

    if (closed && count > 2) {
        vectar_line(buf,
            (int)points[count-1].x, (int)points[count-1].y,
            (int)points[0].x, (int)points[0].y
        );
    }
}

// ============================================================
// Compositing
// ============================================================

void vectar_composite(VectarBuffer* vec, char* ascii_buffer, VectarCompositeMode mode) {
    if (!vec || !ascii_buffer) return;

    int size = vec->width * vec->height;

    switch (mode) {
        case VECTAR_MODE_OVERLAY:
            // Vector overwrites wherever it's not space
            for (int i = 0; i < size; i++) {
                if (vec->buffer[i] != ' ') {
                    ascii_buffer[i] = vec->buffer[i];
                }
            }
            break;

        case VECTAR_MODE_UNDER:
            // Vector only shows where ASCII is space
            for (int i = 0; i < size; i++) {
                if (ascii_buffer[i] == ' ' && vec->buffer[i] != ' ') {
                    ascii_buffer[i] = vec->buffer[i];
                }
            }
            break;

        case VECTAR_MODE_XOR:
            // Toggle: if vec has content, toggle ASCII visibility
            for (int i = 0; i < size; i++) {
                if (vec->buffer[i] != ' ') {
                    if (ascii_buffer[i] == ' ') {
                        ascii_buffer[i] = vec->buffer[i];
                    } else {
                        ascii_buffer[i] = ' ';
                    }
                }
            }
            break;

        case VECTAR_MODE_BLEND:
            // Future: smart blend based on character density
            // For now, same as overlay
            for (int i = 0; i < size; i++) {
                if (vec->buffer[i] != ' ') {
                    ascii_buffer[i] = vec->buffer[i];
                }
            }
            break;
    }
}
