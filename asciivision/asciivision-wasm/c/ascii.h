#ifndef ASCII_H
#define ASCII_H

#include <stdint.h>

// 70 characters: dark to light
extern const char ASCII_RAMP_DETAILED[];
extern const int ASCII_RAMP_DETAILED_LEN;

// 10 characters: dark to light
extern const char ASCII_RAMP_SIMPLE[];
extern const int ASCII_RAMP_SIMPLE_LEN;

// Map grayscale (0-255) to ASCII character
char gray_to_ascii(uint8_t gray, int use_detailed);

#endif
