import { Layer } from '../Layer.js';

/**
 * CameraASCIILayer - Renders camera input as ASCII art via Rust/WASM
 */
export class CameraASCIILayer extends Layer {
    constructor(element, processor, options = {}) {
        super('camera-ascii', {
            element,
            zIndex: 0,
            color: options.color || '#0f0',
            ...options
        });
        this.processor = processor;  // AsciiProcessor from WASM
    }

    /**
     * Render camera frame as ASCII
     * @param {ImageData} imageData - Camera frame
     * @returns {string} ASCII output
     */
    render(imageData) {
        if (!this.visible || !this.processor || !imageData) return '';

        const ascii = this.processor.process_frame(
            imageData.data,
            imageData.width,
            imageData.height,
            this.width,
            this.height
        );

        if (this.element) {
            this.element.textContent = ascii;
        }

        return ascii;
    }

    /**
     * Get processor status
     */
    getStatus() {
        if (this.processor) {
            return this.processor.get_status(this.width, this.height);
        }
        return '';
    }

    /**
     * Toggle ASCII ramp
     */
    toggleRamp() {
        if (this.processor) {
            this.processor.toggle_ramp();
        }
    }

    /**
     * Adjust brightness
     */
    adjustBrightness(delta) {
        if (this.processor) {
            this.processor.adjust_brightness(delta);
        }
    }

    /**
     * Adjust contrast
     */
    adjustContrast(delta) {
        if (this.processor) {
            this.processor.adjust_contrast(delta);
        }
    }

    /**
     * Toggle invert
     */
    toggleInvert() {
        if (this.processor) {
            this.processor.toggle_invert();
        }
    }

    /**
     * Reset processor settings
     */
    reset() {
        if (this.processor) {
            this.processor.reset();
        }
    }
}
