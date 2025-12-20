import init, { AsciiProcessor } from '../pkg/asciivision_wasm.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { setupControls } from './controls.js';
import { HandTracker } from './handtracker.js';

class AsciiVision {
    constructor() {
        this.processor = null;
        this.camera = null;
        this.renderer = null;
        this.handTracker = null;
        this.running = false;
        this.outputWidth = 120;
        this.outputHeight = 40;
        this.handTrackingEnabled = true;
        this.broadcastEnabled = true;
    }

    async init() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        const errorMsgEl = document.getElementById('error-message');

        try {
            // Initialize WASM
            await init();
            this.processor = new AsciiProcessor();

            // Initialize camera
            this.camera = new Camera(1280, 720);
            await this.camera.start();

            // Initialize hand tracker
            this.handTracker = new HandTracker();
            const handReady = await this.handTracker.init(this.camera.video);
            if (handReady && this.broadcastEnabled) {
                this.handTracker.startBroadcast('default');
            }

            // Initialize renderer
            this.renderer = new Renderer(
                document.getElementById('ascii-output'),
                document.getElementById('status')
            );

            // Setup keyboard controls
            setupControls(this);

            // Hide loading
            loadingEl.classList.add('hidden');

            // Start render loop
            this.running = true;
            this.renderLoop();

        } catch (error) {
            console.error('Initialization failed:', error);
            loadingEl.classList.add('hidden');
            errorMsgEl.textContent = error.message || 'Failed to initialize';
            errorEl.classList.remove('hidden');
        }
    }

    renderLoop() {
        if (!this.running) return;

        const imageData = this.camera.getFrame();
        if (imageData) {
            // Process ASCII
            const ascii = this.processor.process_frame(
                imageData.data,
                imageData.width,
                imageData.height,
                this.outputWidth,
                this.outputHeight
            );

            this.renderer.render(ascii);

            // Run hand detection
            if (this.handTrackingEnabled && this.handTracker?.ready) {
                this.handTracker.detect(performance.now());
            }

            // Build status with hand tracking info
            let status = this.processor.get_status(
                this.outputWidth,
                this.outputHeight
            );

            if (this.handTracker?.ready) {
                const hv = this.handTracker.getValues();
                if (hv.detected) {
                    status += ` | HAND x:${hv.x.toFixed(2)} y:${hv.y.toFixed(2)} θ:${(hv.theta * 180 / Math.PI).toFixed(0)}° spread:${hv.spread.toFixed(3)}`;
                } else {
                    status += ' | HAND: not detected';
                }
                if (this.handTracker.broadcasting) {
                    status += ' [TX]';
                }
            }

            this.renderer.updateStatus(status);
        }

        requestAnimationFrame(() => this.renderLoop());
    }

    toggleHandTracking() {
        this.handTrackingEnabled = !this.handTrackingEnabled;
        return this.handTrackingEnabled;
    }

    toggleBroadcast() {
        if (this.handTracker) {
            if (this.handTracker.broadcasting) {
                this.handTracker.stopBroadcast();
            } else {
                this.handTracker.startBroadcast('default');
            }
            this.broadcastEnabled = this.handTracker.broadcasting;
        }
        return this.broadcastEnabled;
    }

    stop() {
        this.running = false;
        if (this.camera) {
            this.camera.stop();
        }
        if (this.handTracker) {
            this.handTracker.destroy();
        }
    }
}

// Start application
const app = new AsciiVision();
app.init().catch(console.error);

// Export for debugging
window.asciiApp = app;
