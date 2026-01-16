#ifndef PROCESSOR_H
#define PROCESSOR_H

#include <stdint.h>

typedef struct {
    float brightness;       // -1.0 to 1.0
    float contrast;         // 0.1 to 3.0
    int use_detailed_ramp;  // 1 = 70 chars, 0 = 10 chars
    int invert;             // 1 = inverted
} Config;

typedef struct {
    Config config;
    char* output_buffer;
    uint32_t buffer_cap;
    char* status_buffer;
} AsciiProcessor;

// Constructor/destructor
AsciiProcessor* processor_new(void);
void processor_free(AsciiProcessor* p);

// Main processing function
const char* processor_process_frame(
    AsciiProcessor* p,
    uint8_t* pixels,
    uint32_t src_width,
    uint32_t src_height,
    uint32_t out_width,
    uint32_t out_height
);

// Config setters/getters
void processor_set_brightness(AsciiProcessor* p, float value);
float processor_get_brightness(AsciiProcessor* p);
void processor_set_contrast(AsciiProcessor* p, float value);
float processor_get_contrast(AsciiProcessor* p);
void processor_set_use_detailed_ramp(AsciiProcessor* p, int value);
void processor_toggle_ramp(AsciiProcessor* p);
void processor_set_invert(AsciiProcessor* p, int value);
void processor_toggle_invert(AsciiProcessor* p);
void processor_reset(AsciiProcessor* p);
const char* processor_get_status(AsciiProcessor* p, uint32_t width, uint32_t height);

#endif
