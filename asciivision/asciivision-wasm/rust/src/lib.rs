use wasm_bindgen::prelude::*;

mod ascii;
mod config;
mod processor;

use config::Config;

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct AsciiProcessor {
    config: Config,
    output_buffer: String,
}

#[wasm_bindgen]
impl AsciiProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> AsciiProcessor {
        AsciiProcessor {
            config: Config::default(),
            output_buffer: String::with_capacity(200 * 100 + 100),
        }
    }

    /// Process RGBA frame data and return ASCII string
    #[wasm_bindgen]
    pub fn process_frame(
        &mut self,
        pixels: &[u8],
        src_width: u32,
        src_height: u32,
        out_width: u32,
        out_height: u32,
    ) -> String {
        processor::process_frame(
            &self.config,
            pixels,
            src_width,
            src_height,
            out_width,
            out_height,
            &mut self.output_buffer,
        );
        self.output_buffer.clone()
    }

    #[wasm_bindgen]
    pub fn set_brightness(&mut self, value: f32) {
        self.config.brightness = value.clamp(-1.0, 1.0);
    }

    #[wasm_bindgen]
    pub fn get_brightness(&self) -> f32 {
        self.config.brightness
    }

    #[wasm_bindgen]
    pub fn set_contrast(&mut self, value: f32) {
        self.config.contrast = value.clamp(0.1, 3.0);
    }

    #[wasm_bindgen]
    pub fn get_contrast(&self) -> f32 {
        self.config.contrast
    }

    #[wasm_bindgen]
    pub fn set_use_detailed_ramp(&mut self, value: bool) {
        self.config.use_detailed_ramp = value;
    }

    #[wasm_bindgen]
    pub fn toggle_ramp(&mut self) {
        self.config.use_detailed_ramp = !self.config.use_detailed_ramp;
    }

    #[wasm_bindgen]
    pub fn set_invert(&mut self, value: bool) {
        self.config.invert = value;
    }

    #[wasm_bindgen]
    pub fn toggle_invert(&mut self) {
        self.config.invert = !self.config.invert;
    }

    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.config = Config::default();
    }

    #[wasm_bindgen]
    pub fn get_status(&self, width: u32, height: u32) -> String {
        format!(
            "[{}x{}] B:{:.1} C:{:.1} | b/B:bright c/C:contrast r:ramp i:inv +/-:size 0:reset",
            width,
            height,
            self.config.brightness,
            self.config.contrast
        )
    }
}

impl Default for AsciiProcessor {
    fn default() -> Self {
        Self::new()
    }
}
