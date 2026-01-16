/// Configuration settings for ASCII processing
pub struct Config {
    /// Brightness adjustment (-1.0 to 1.0)
    pub brightness: f32,
    /// Contrast adjustment (0.1 to 3.0)
    pub contrast: f32,
    /// Use detailed (70 char) or simple (10 char) ASCII ramp
    pub use_detailed_ramp: bool,
    /// Invert colors
    pub invert: bool,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            brightness: 0.0,
            contrast: 1.0,
            use_detailed_ramp: true,
            invert: false,
        }
    }
}
