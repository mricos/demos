use crate::ascii::gray_to_ascii;
use crate::config::Config;

/// Apply brightness and contrast adjustment to a grayscale value
#[inline]
fn apply_brightness_contrast(gray: u8, brightness: f32, contrast: f32) -> u8 {
    // Apply contrast around midpoint (127.5)
    let mut adjusted = (gray as f32 - 127.5) * contrast + 127.5;

    // Apply brightness (-1.0 to 1.0 maps to -255 to +255)
    adjusted += brightness * 255.0;

    // Clamp to valid range
    adjusted.clamp(0.0, 255.0) as u8
}

/// Convert RGBA pixel to grayscale using luminance formula
/// Same as original: 0.299*R + 0.587*G + 0.114*B
#[inline]
fn rgba_to_gray(r: u8, g: u8, b: u8) -> u8 {
    ((r as f32 * 0.299) + (g as f32 * 0.587) + (b as f32 * 0.114)) as u8
}

/// Process a frame of RGBA pixels and produce ASCII output
pub fn process_frame(
    config: &Config,
    pixels: &[u8],
    src_width: u32,
    src_height: u32,
    out_width: u32,
    out_height: u32,
    output: &mut String,
) {
    output.clear();

    // Calculate scaling factors
    // ASCII chars are ~2x taller than wide, so we sample more Y pixels
    let scale_x = src_width as f32 / out_width as f32;
    let scale_y = src_height as f32 / out_height as f32;

    let bytes_per_row = src_width as usize * 4; // RGBA = 4 bytes

    for y in 0..out_height {
        for x in 0..out_width {
            // Mirror horizontally for natural webcam feel
            let src_x = ((out_width - 1 - x) as f32 * scale_x) as usize;
            let src_y = (y as f32 * scale_y) as usize;

            // Bounds checking
            let src_x = src_x.min(src_width as usize - 1);
            let src_y = src_y.min(src_height as usize - 1);

            // RGBA format: R at offset 0, G at 1, B at 2, A at 3
            let pixel_offset = src_y * bytes_per_row + src_x * 4;

            if pixel_offset + 2 >= pixels.len() {
                output.push(' ');
                continue;
            }

            let r = pixels[pixel_offset];
            let g = pixels[pixel_offset + 1];
            let b = pixels[pixel_offset + 2];

            // Convert to grayscale
            let mut gray = rgba_to_gray(r, g, b);

            // Apply brightness/contrast
            gray = apply_brightness_contrast(gray, config.brightness, config.contrast);

            // Apply inversion if enabled
            if config.invert {
                gray = 255 - gray;
            }

            // Map to ASCII character
            let ascii_char = gray_to_ascii(gray, config.use_detailed_ramp);
            output.push(ascii_char);
        }
        output.push('\n');
    }
}
