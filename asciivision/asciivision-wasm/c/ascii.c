#include "ascii.h"

const char ASCII_RAMP_DETAILED[] = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const int ASCII_RAMP_DETAILED_LEN = 70;

const char ASCII_RAMP_SIMPLE[] = " .:-=+*#%@";
const int ASCII_RAMP_SIMPLE_LEN = 10;

char gray_to_ascii(uint8_t gray, int use_detailed) {
    const char* ramp = use_detailed ? ASCII_RAMP_DETAILED : ASCII_RAMP_SIMPLE;
    int ramp_len = use_detailed ? ASCII_RAMP_DETAILED_LEN : ASCII_RAMP_SIMPLE_LEN;
    int index = (gray * (ramp_len - 1)) / 255;
    return ramp[index];
}
