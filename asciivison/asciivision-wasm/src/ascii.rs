/// Detailed ASCII ramp (70 characters) - from dark to light
pub const ASCII_RAMP_DETAILED: &[u8] =
    b" .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

/// Simple ASCII ramp (10 characters)
pub const ASCII_RAMP_SIMPLE: &[u8] = b" .:-=+*#%@";

/// Map a grayscale value (0-255) to an ASCII character
#[inline]
pub fn gray_to_ascii(gray: u8, use_detailed: bool) -> char {
    let ramp = if use_detailed {
        ASCII_RAMP_DETAILED
    } else {
        ASCII_RAMP_SIMPLE
    };
    let ramp_len = ramp.len();
    let index = (gray as usize * (ramp_len - 1)) / 255;
    ramp[index] as char
}
