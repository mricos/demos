import { Layer } from '../Layer.js';
import { SkeletonRenderer } from '../../skeleton.js';

/**
 * SkeletonLayer - Renders hand skeleton as UTF-8 overlay
 */
export class SkeletonLayer extends Layer {
    constructor(element, options = {}) {
        super('skeleton', {
            element,
            zIndex: 10,
            color: options.color || '#f22',
            glow: options.glow !== undefined ? options.glow : 3,
            ...options
        });
        this.renderer = null;  // Lazy init
        this.calibration = {
            offsetX: 0,
            offsetY: 0
        };
    }

    /**
     * Resize and initialize renderer
     */
    resize(width, height) {
        super.resize(width, height);
        if (!this.renderer && this.element) {
            this.renderer = new SkeletonRenderer(this.element, width, height);
            this.renderer.calibration = this.calibration;
        } else if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }

    /**
     * Render hand skeleton
     * @param {Array} landmarks - MediaPipe hand landmarks (21 points)
     */
    render(landmarks) {
        if (!this.visible) {
            this.clear();
            return;
        }
        if (this.renderer) {
            this.renderer.render(landmarks);
        }
    }

    /**
     * Clear skeleton display
     */
    clear() {
        if (this.renderer) {
            this.renderer.clear();
        }
    }

    /**
     * Set calibration offsets
     */
    setCalibration(offsetX, offsetY) {
        this.calibration.offsetX = offsetX;
        this.calibration.offsetY = offsetY;
        if (this.renderer) {
            this.renderer.calibration = this.calibration;
        }
    }

    /**
     * Get calibration values
     */
    getCalibration() {
        return { ...this.calibration };
    }
}
