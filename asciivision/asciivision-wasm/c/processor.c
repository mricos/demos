#include "processor.h"
#include "ascii.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

// Clamp float to range
static inline float clampf(float v, float min, float max) {
    return v < min ? min : (v > max ? max : v);
}

// Convert RGBA to grayscale using luminance formula
static inline uint8_t rgba_to_gray(uint8_t r, uint8_t g, uint8_t b) {
    return (uint8_t)(r * 0.299f + g * 0.587f + b * 0.114f);
}

// Apply brightness and contrast adjustment
static inline uint8_t apply_brightness_contrast(uint8_t gray, float brightness, float contrast) {
    float adjusted = (gray - 127.5f) * contrast + 127.5f;
    adjusted += brightness * 255.0f;
    if (adjusted < 0.0f) return 0;
    if (adjusted > 255.0f) return 255;
    return (uint8_t)adjusted;
}

// Initialize config to defaults
static void config_default(Config* c) {
    c->brightness = 0.0f;
    c->contrast = 1.0f;
    c->use_detailed_ramp = 1;
    c->invert = 0;
}

EXPORT AsciiProcessor* processor_new(void) {
    AsciiProcessor* p = (AsciiProcessor*)malloc(sizeof(AsciiProcessor));
    if (!p) return NULL;

    config_default(&p->config);
    p->buffer_cap = 200 * 100 + 100;  // Same as Rust: 200*100 + 100 for newlines
    p->output_buffer = (char*)malloc(p->buffer_cap);
    p->status_buffer = (char*)malloc(128);

    if (!p->output_buffer || !p->status_buffer) {
        free(p->output_buffer);
        free(p->status_buffer);
        free(p);
        return NULL;
    }

    p->output_buffer[0] = '\0';
    p->status_buffer[0] = '\0';
    return p;
}

EXPORT void processor_free(AsciiProcessor* p) {
    if (p) {
        free(p->output_buffer);
        free(p->status_buffer);
        free(p);
    }
}

EXPORT const char* processor_process_frame(
    AsciiProcessor* p,
    uint8_t* pixels,
    uint32_t src_width,
    uint32_t src_height,
    uint32_t out_width,
    uint32_t out_height
) {
    if (!p || !pixels) return "";

    // Calculate scaling factors
    float scale_x = (float)src_width / (float)out_width;
    float scale_y = (float)src_height / (float)out_height;
    uint32_t bytes_per_row = src_width * 4;  // RGBA = 4 bytes

    char* out = p->output_buffer;
    uint32_t out_idx = 0;
    uint32_t max_idx = p->buffer_cap - 1;

    for (uint32_t y = 0; y < out_height && out_idx < max_idx; y++) {
        for (uint32_t x = 0; x < out_width && out_idx < max_idx; x++) {
            // Mirror horizontally for natural webcam feel
            uint32_t src_x = (uint32_t)((out_width - 1 - x) * scale_x);
            uint32_t src_y = (uint32_t)(y * scale_y);

            // Bounds check
            if (src_x >= src_width) src_x = src_width - 1;
            if (src_y >= src_height) src_y = src_height - 1;

            // RGBA format: R at offset 0, G at 1, B at 2
            uint32_t pixel_offset = src_y * bytes_per_row + src_x * 4;
            uint32_t pixel_max = src_width * src_height * 4;

            if (pixel_offset + 2 >= pixel_max) {
                out[out_idx++] = ' ';
                continue;
            }

            uint8_t r = pixels[pixel_offset];
            uint8_t g = pixels[pixel_offset + 1];
            uint8_t b = pixels[pixel_offset + 2];

            // Convert to grayscale
            uint8_t gray = rgba_to_gray(r, g, b);

            // Apply brightness/contrast
            gray = apply_brightness_contrast(gray, p->config.brightness, p->config.contrast);

            // Apply inversion if enabled
            if (p->config.invert) {
                gray = 255 - gray;
            }

            // Map to ASCII character
            out[out_idx++] = gray_to_ascii(gray, p->config.use_detailed_ramp);
        }
        if (out_idx < max_idx) {
            out[out_idx++] = '\n';
        }
    }
    out[out_idx] = '\0';

    return p->output_buffer;
}

EXPORT void processor_set_brightness(AsciiProcessor* p, float value) {
    if (p) p->config.brightness = clampf(value, -1.0f, 1.0f);
}

EXPORT float processor_get_brightness(AsciiProcessor* p) {
    return p ? p->config.brightness : 0.0f;
}

EXPORT void processor_set_contrast(AsciiProcessor* p, float value) {
    if (p) p->config.contrast = clampf(value, 0.1f, 3.0f);
}

EXPORT float processor_get_contrast(AsciiProcessor* p) {
    return p ? p->config.contrast : 1.0f;
}

EXPORT void processor_set_use_detailed_ramp(AsciiProcessor* p, int value) {
    if (p) p->config.use_detailed_ramp = value ? 1 : 0;
}

EXPORT void processor_toggle_ramp(AsciiProcessor* p) {
    if (p) p->config.use_detailed_ramp = !p->config.use_detailed_ramp;
}

EXPORT void processor_set_invert(AsciiProcessor* p, int value) {
    if (p) p->config.invert = value ? 1 : 0;
}

EXPORT void processor_toggle_invert(AsciiProcessor* p) {
    if (p) p->config.invert = !p->config.invert;
}

EXPORT void processor_reset(AsciiProcessor* p) {
    if (p) config_default(&p->config);
}

EXPORT const char* processor_get_status(AsciiProcessor* p, uint32_t width, uint32_t height) {
    if (!p) return "";
    snprintf(p->status_buffer, 128,
        "[%ux%u] B:%.1f C:%.1f | b/B:bright c/C:contrast r:ramp i:inv +/-:size 0:reset",
        width, height, p->config.brightness, p->config.contrast);
    return p->status_buffer;
}
