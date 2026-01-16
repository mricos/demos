import { Layer } from '../compositor/Layer.js';
import { SpriteRenderer } from './SpriteRenderer.js';
import { Sprite, BuiltInSprites } from './Sprite.js';
import { HandLandmarkSprite, createStaticHandSprite, LANDMARK_NAMES } from './HandLandmarkSprite.js';

/**
 * VectorVisionLayer - Layer for rendering VectorVision sprites
 * Renders scalable 3D vector sprites as ASCII art
 * Default: blue color, z-index 5
 */
export class VectorVisionLayer extends Layer {
    constructor(element, options = {}) {
        super('vectorvision', {
            element,
            zIndex: options.zIndex ?? 5,
            color: options.color || '#22f',
            glow: options.glow ?? 2,
            ...options
        });

        // Sprite renderer
        this.renderer = new SpriteRenderer(100, 60);

        // Label renderer (separate for different color)
        this.labelRenderer = new SpriteRenderer(100, 60);

        // Label overlay element (orange)
        this.labelElement = null;
        this._createLabelOverlay();

        // Active sprites to render
        this.sprites = new Map();  // id -> Sprite

        // Animation state
        this.time = 0;
        this.autoRotate = false;

        // Hand landmark sprite (static reference)
        this.handLandmarkSprite = null;
        this.showHandLabels = true;
        this.showHeldCube = false;

        // Initialize with some built-in sprites (inactive by default)
        this._initBuiltIns();
    }

    /**
     * Create separate overlay element for orange labels
     */
    _createLabelOverlay() {
        if (!this.element) return;

        this.labelElement = document.createElement('pre');
        this.labelElement.id = 'vectorvision-labels';
        this.labelElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 10px;
            line-height: 1.0;
            letter-spacing: 0;
            white-space: pre;
            color: #f80;
            font-family: 'Courier New', monospace;
            pointer-events: none;
            text-shadow: 0 0 3px #f50;
            z-index: 6;
        `;

        // Insert after the main vectorvision element
        this.element.parentNode?.appendChild(this.labelElement);
    }

    /**
     * Initialize built-in sprites (not added to active list)
     */
    _initBuiltIns() {
        this.builtIns = {};
        for (const [name, def] of Object.entries(BuiltInSprites)) {
            this.builtIns[name] = Sprite.fromJSON(def);
        }
    }

    /**
     * Resize the renderer
     */
    resize(width, height) {
        super.resize(width, height);
        this.renderer.resize(width, height);
        this.labelRenderer.resize(width, height);
    }

    /**
     * Add a sprite to render
     */
    addSprite(id, sprite) {
        if (typeof sprite === 'string') {
            // Use built-in
            if (this.builtIns[sprite]) {
                sprite = this.builtIns[sprite].clone();
            } else {
                console.warn(`Unknown built-in sprite: ${sprite}`);
                return null;
            }
        }
        this.sprites.set(id, sprite);
        return sprite;
    }

    /**
     * Remove a sprite
     */
    removeSprite(id) {
        this.sprites.delete(id);
    }

    /**
     * Get a sprite by id
     */
    getSprite(id) {
        return this.sprites.get(id);
    }

    /**
     * Clear all sprites
     */
    clearSprites() {
        this.sprites.clear();
    }

    /**
     * Create hand sprite from tracking landmarks
     * @param {Array} landmarks - 21 MediaPipe hand landmarks
     * @param {number} scale - Scale factor
     */
    createHandSprite(landmarks, scale = 1) {
        if (!landmarks || landmarks.length < 21) return null;

        const sprite = new Sprite('tracked-hand', { char: 'o' });

        // Add all 21 landmarks as vertices
        for (const lm of landmarks) {
            // Convert from 0-1 to centered coordinates
            const x = (lm.x - 0.5) * 2 * scale;
            const y = (lm.y - 0.5) * 2 * scale;
            const z = (lm.z || 0) * scale;
            sprite.addVertex(x, y, z);
        }

        // MediaPipe hand connections
        const connections = [
            // Thumb
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm
            [5, 9], [9, 13], [13, 17]
        ];

        for (const [a, b] of connections) {
            sprite.addEdge(a, b);
        }

        return sprite;
    }

    /**
     * Update layer state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.time += dt;

        if (this.autoRotate) {
            for (const sprite of this.sprites.values()) {
                sprite.transform.rotY += dt * 0.5;
            }
        }
    }

    /**
     * Render all sprites
     * @param {Object} data - Optional render data
     *   - renderHand: if true, render hand from landmarks
     *   - landmarks: hand tracking landmarks
     *   - sprites: additional sprites to render this frame
     */
    render(data = {}) {
        if (!this.visible) return '';

        this.renderer.clear();
        this.labelRenderer.clear();

        // Only render hand if explicitly requested (not by default - skeleton layer handles that)
        if (data.renderHand && data.landmarks) {
            const handSprite = this.createHandSprite(data.landmarks, data.scale || 1);
            if (handSprite) {
                this.renderer.renderSprite(handSprite, { char: 'o' });
            }
        }

        // Render registered sprites
        for (const [id, sprite] of this.sprites.entries()) {
            this.renderer.renderSprite(sprite);

            // If this is the hand landmark sprite with labels enabled, render labels
            if (id === 'hand-landmarks' && sprite.showLabels) {
                this._renderHandLabels(sprite);
            }
        }

        // Render additional sprites passed in data
        if (data.sprites) {
            for (const sprite of data.sprites) {
                this.renderer.renderSprite(sprite);
            }
        }

        const output = this.renderer.toString();

        if (this.element) {
            this.element.textContent = output;
            this.applyEffects();
        }

        // Render labels to separate orange overlay
        if (this.labelElement) {
            const labelOutput = this.labelRenderer.toString();
            this.labelElement.textContent = labelOutput;
            // Match font size with main element
            if (this.element) {
                this.labelElement.style.fontSize = this.element.style.fontSize;
            }
        }

        return output;
    }

    /**
     * Render landmark labels (0-20) for hand sprite to separate label renderer
     */
    _renderHandLabels(handSprite) {
        const transformed = handSprite.getTransformedVertices();

        for (let i = 0; i < 21 && i < transformed.length; i++) {
            const v = transformed[i];
            const p = this.renderer.project(v.x, v.y, v.z);

            if (p) {
                // Offset label slightly to not overlap the vertex
                const labelX = Math.floor(p.x) + 1;
                const labelY = Math.floor(p.y);
                const label = String(i);

                // Draw the label to the orange label renderer
                this.labelRenderer.drawText(labelX, labelY, label);
            }
        }
    }

    /**
     * Clear the display
     */
    clear() {
        if (this.element) {
            this.element.textContent = '';
        }
        if (this.labelElement) {
            this.labelElement.textContent = '';
        }
    }

    /**
     * Demo mode - show rotating cube
     */
    startDemo() {
        const cube = this.addSprite('demo-cube', 'cube');
        cube.setScale(0.3);
        cube.setPosition(0, 0, 0);
        this.autoRotate = true;
    }

    /**
     * Stop demo
     */
    stopDemo() {
        this.removeSprite('demo-cube');
        this.autoRotate = false;
    }

    /**
     * Show static hand landmark display
     * @param {Object} options - {showLabels: true, showCube: false}
     */
    showStaticHand(options = {}) {
        this.handLandmarkSprite = createStaticHandSprite({
            showLabels: options.showLabels ?? true,
            showCube: options.showCube ?? false,
            scale: options.scale ?? 0.8
        });
        this.showHandLabels = this.handLandmarkSprite.showLabels;
        this.showHeldCube = this.handLandmarkSprite.showCube;
        this.addSprite('hand-landmarks', this.handLandmarkSprite);
        return this.handLandmarkSprite;
    }

    /**
     * Hide static hand landmark display
     */
    hideStaticHand() {
        this.removeSprite('hand-landmarks');
        this.removeSprite('held-cube');
        this.handLandmarkSprite = null;
    }

    /**
     * Toggle hand labels (0-20)
     * @returns {boolean} new state
     */
    toggleHandLabels() {
        if (this.handLandmarkSprite) {
            this.showHandLabels = this.handLandmarkSprite.toggleLabels();
        } else {
            this.showHandLabels = !this.showHandLabels;
        }
        return this.showHandLabels;
    }

    /**
     * Toggle held cube display
     * @returns {boolean} new state
     */
    toggleHeldCube() {
        if (this.handLandmarkSprite) {
            this.showHeldCube = this.handLandmarkSprite.toggleCube();
            if (this.showHeldCube) {
                const cube = this.handLandmarkSprite.createHeldCube();
                this.addSprite('held-cube', cube);
            } else {
                this.removeSprite('held-cube');
            }
        } else {
            this.showHeldCube = !this.showHeldCube;
        }
        return this.showHeldCube;
    }

    /**
     * Set cube size
     * @param {number} size - Size relative to hand (0.1 - 0.5)
     */
    setCubeSize(size) {
        if (this.handLandmarkSprite) {
            this.handLandmarkSprite.cubeSize = Math.max(0.05, Math.min(0.5, size));
            if (this.showHeldCube) {
                // Recreate cube with new size
                const cube = this.handLandmarkSprite.createHeldCube();
                this.addSprite('held-cube', cube);
            }
        }
    }

    /**
     * Get sprite list for debugging
     */
    getSpriteList() {
        return Array.from(this.sprites.keys());
    }

    /**
     * Get built-in sprite names
     */
    getBuiltInNames() {
        return Object.keys(this.builtIns);
    }
}
