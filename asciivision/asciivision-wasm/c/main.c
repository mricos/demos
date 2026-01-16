// CLI entry point for WASI build
// Usage: asciivision-wasi <src_width> <src_height> <out_cols> <out_rows>
// Reads raw RGBA from stdin, outputs ASCII to stdout
//
// Example with ffmpeg:
//   ffmpeg -i image.png -f rawvideo -pix_fmt rgba - | wasmtime asciivision-wasi.wasm 640 480 80 40
//
// Example with ImageMagick:
//   convert image.png -depth 8 rgba:- | wasmtime asciivision-wasi.wasm 640 480 80 40

#include "processor.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifndef WASI_BUILD
// main() only included when WASI_BUILD is defined
#else

void print_usage(const char* prog) {
    fprintf(stderr, "ASCII Art Generator - WASI CLI\n");
    fprintf(stderr, "Usage: %s <src_width> <src_height> <out_cols> <out_rows> [options]\n", prog);
    fprintf(stderr, "\nReads raw RGBA pixels from stdin, outputs ASCII to stdout.\n");
    fprintf(stderr, "\nOptions:\n");
    fprintf(stderr, "  -b <val>   Brightness (-1.0 to 1.0, default 0.0)\n");
    fprintf(stderr, "  -c <val>   Contrast (0.1 to 3.0, default 1.0)\n");
    fprintf(stderr, "  -i         Invert output\n");
    fprintf(stderr, "  -s         Simple ramp (fewer characters)\n");
    fprintf(stderr, "\nExample:\n");
    fprintf(stderr, "  ffmpeg -i photo.jpg -f rawvideo -pix_fmt rgba - 2>/dev/null | \\\n");
    fprintf(stderr, "    wasmtime %s 1920 1080 120 60\n", prog);
}

int main(int argc, char** argv) {
    if (argc < 5) {
        print_usage(argv[0]);
        return 1;
    }

    uint32_t src_width = atoi(argv[1]);
    uint32_t src_height = atoi(argv[2]);
    uint32_t out_cols = atoi(argv[3]);
    uint32_t out_rows = atoi(argv[4]);

    if (src_width == 0 || src_height == 0 || out_cols == 0 || out_rows == 0) {
        fprintf(stderr, "Error: Invalid dimensions\n");
        return 1;
    }

    // Parse options
    float brightness = 0.0f;
    float contrast = 1.0f;
    int invert = 0;
    int detailed_ramp = 1;

    for (int i = 5; i < argc; i++) {
        if (strcmp(argv[i], "-b") == 0 && i + 1 < argc) {
            brightness = atof(argv[++i]);
        } else if (strcmp(argv[i], "-c") == 0 && i + 1 < argc) {
            contrast = atof(argv[++i]);
        } else if (strcmp(argv[i], "-i") == 0) {
            invert = 1;
        } else if (strcmp(argv[i], "-s") == 0) {
            detailed_ramp = 0;
        }
    }

    // Allocate buffer for RGBA pixels
    size_t pixel_count = (size_t)src_width * src_height;
    size_t buffer_size = pixel_count * 4;  // RGBA = 4 bytes per pixel
    uint8_t* pixels = (uint8_t*)malloc(buffer_size);

    if (!pixels) {
        fprintf(stderr, "Error: Failed to allocate %zu bytes for image\n", buffer_size);
        return 1;
    }

    // Read RGBA data from stdin
    size_t bytes_read = fread(pixels, 1, buffer_size, stdin);

    if (bytes_read < buffer_size) {
        fprintf(stderr, "Warning: Expected %zu bytes, got %zu\n", buffer_size, bytes_read);
        // Zero out remaining pixels
        memset(pixels + bytes_read, 0, buffer_size - bytes_read);
    }

    // Create processor and configure
    AsciiProcessor* proc = processor_new();
    if (!proc) {
        fprintf(stderr, "Error: Failed to create processor\n");
        free(pixels);
        return 1;
    }

    processor_set_brightness(proc, brightness);
    processor_set_contrast(proc, contrast);
    processor_set_invert(proc, invert);
    processor_set_use_detailed_ramp(proc, detailed_ramp);

    // Process and output
    const char* output = processor_process_frame(proc, pixels, src_width, src_height, out_cols, out_rows);
    printf("%s", output);

    // Cleanup
    processor_free(proc);
    free(pixels);

    return 0;
}

#endif
