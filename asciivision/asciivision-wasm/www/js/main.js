import init, { AsciiProcessor as RustProcessor } from '../pkg/asciivision_wasm.js';
import { AsciiProcessor as CProcessor, initWasm as initCWasm } from '../pkg-c/wrapper.js';
import { Camera } from './camera.js';
import { setupControls } from './controls.js';
import { HandTracker } from './handtracker.js';

// Compositor imports
import { LayerManager } from './compositor/LayerManager.js';
import { CameraASCIILayer } from './compositor/layers/CameraASCIILayer.js';
import { SkeletonLayer } from './compositor/layers/SkeletonLayer.js';
import { HUDLayer } from './compositor/layers/HUDLayer.js';
import { HandTrackingHub } from './tracking/HandTrackingHub.js';

// Geometry configuration
import { getGeometryConfig, CharacterRamps } from './GeometryConfig.js';

// VectorVision - scalable 3D ASCII sprites
import { VectorVisionLayer } from './vectorvision/index.js';

// REPL imports - new data-driven system
import { ParamRegistry, REPL, Presets } from './repl/index.js';

// Shared modules
import { CoordinateSystem } from './shared/world/CoordinateSystem.js';

class AsciiVision {
    constructor() {
        this.processor = null;
        this.rustProcessor = null;
        this.cProcessor = null;
        this.camera = null;
        this.handTracker = null;
        this.trackingHub = null;
        this.layerManager = null;
        this.running = false;

        // Parameter registry
        this.registry = new ParamRegistry();

        // Geometry configuration (singleton)
        this.geometry = getGeometryConfig();

        // Coordinate system for conversions
        this.coords = new CoordinateSystem({
            screenWidth: 1280,
            screenHeight: 720,
            gridCols: 100,
            gridRows: 60
        });

        // REPL instance
        this.repl = null;

        // Internal state (legacy - gradually migrate to geometry)
        this._state = {
            cols: 100,
            rows: 60,
            phase: 0,
            reverse: false,
            offsetX: 0,
            offsetY: 0,
            broadcast: true,
            engine: 'rust',  // 'rust' or 'c'
        };

        // FPS tracking
        this._frameTimes = [];
        this._lastFrameTime = 0;
        this._fps = 0;

        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('columns')) this._state.cols = parseInt(urlParams.get('columns'));
        if (urlParams.get('rows')) this._state.rows = parseInt(urlParams.get('rows'));

        // Sync geometry config with state
        this.geometry.setAscii(this._state.cols, this._state.rows);

        // UI elements
        this.ui = {};
    }

    async init() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        const errorMsgEl = document.getElementById('error-message');

        try {
            // Initialize both WASM engines
            await init();
            this.rustProcessor = new RustProcessor();

            // Try to load C engine (may fail if not built)
            try {
                console.log('Waiting for C WASM...');
                await initCWasm();
                console.log('C WASM init done, creating processor...');
                this.cProcessor = new CProcessor();
                console.log('C WASM engine loaded successfully');
            } catch (e) {
                console.warn('C WASM engine not available:', e.message, e);
            }

            // Set active processor
            this.processor = this._state.engine === 'c' && this.cProcessor
                ? this.cProcessor
                : this.rustProcessor;

            // Initialize camera
            this.camera = new Camera(1280, 720);
            await this.camera.start();

            // Initialize hand tracker
            this.handTracker = new HandTracker();
            const handReady = await this.handTracker.init(this.camera.video);
            if (handReady && this._state.broadcast) {
                this.handTracker.startBroadcast('default');
            }

            // Create tracking hub
            this.trackingHub = new HandTrackingHub(this.handTracker);

            // Initialize LayerManager
            this.layerManager = new LayerManager(
                document.getElementById('layer-stack'),
                { cols: this._state.cols, rows: this._state.rows }
            );
            this.layerManager.initChannel();

            // Create and add layers
            const cameraLayer = new CameraASCIILayer(
                document.getElementById('ascii-output'),
                this.processor,
                { color: '#0f0' }
            );

            const skeletonLayer = new SkeletonLayer(
                document.getElementById('skeleton-overlay'),
                { color: '#f22', glow: 3 }
            );

            const hudLayer = new HUDLayer(
                document.getElementById('hud-canvas')
            );

            // VectorVision layer - create element if not in DOM
            let vectorVisionEl = document.getElementById('vectorvision-overlay');
            if (!vectorVisionEl) {
                vectorVisionEl = document.createElement('pre');
                vectorVisionEl.id = 'vectorvision-overlay';
                vectorVisionEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 10px;
                    line-height: 1.0;
                    letter-spacing: 0;
                    white-space: pre;
                    color: #22f;
                    font-family: 'Courier New', monospace;
                    pointer-events: none;
                    text-shadow: 0 0 3px #00f;
                `;
                document.getElementById('layer-stack')?.appendChild(vectorVisionEl);
            }

            const vectorVisionLayer = new VectorVisionLayer(vectorVisionEl, {
                color: '#22f',
                glow: 3,
                zIndex: 5
            });

            this.layerManager.addLayer(cameraLayer);
            this.layerManager.addLayer(skeletonLayer);
            this.layerManager.addLayer(vectorVisionLayer);
            this.layerManager.addLayer(hudLayer);

            // Register parameters
            this._registerParams();

            // Setup UI
            this._setupUI();

            // Setup REPL
            this._setupREPL();

            // Setup keyboard controls
            setupControls(this);

            // Handle window resize
            window.addEventListener('resize', () => this._updateOutputStyle());

            // Initial sizing
            this._updateOutputStyle();

            // Hide loading
            loadingEl.classList.add('hidden');

            // Start render loop
            this.running = true;
            this._renderLoop();

        } catch (error) {
            console.error('Initialization failed:', error);
            loadingEl.classList.add('hidden');
            errorMsgEl.textContent = error.message || 'Failed to initialize';
            errorEl.classList.remove('hidden');
        }
    }

    /**
     * Register all parameters with the registry
     */
    _registerParams() {
        const r = this.registry;
        const state = this._state;

        // === App parameters ===
        // Resolution range: 1x1 to camera resolution
        const camWidth = this.camera?.canvas?.width || 1280;
        const camHeight = this.camera?.canvas?.height || 720;

        r.define('app.cols', {
            min: 1, max: camWidth, default: 100, step: 10,
            group: 'display', description: 'Output columns'
        }, null, {
            get: () => state.cols,
            set: (v) => { state.cols = v; this._onResolutionChange(); }
        });

        r.define('app.rows', {
            min: 1, max: camHeight, default: 60, step: 5,
            group: 'display', description: 'Output rows'
        }, null, {
            get: () => state.rows,
            set: (v) => { state.rows = v; this._onResolutionChange(); }
        });

        r.define('app.phase', {
            min: -180, max: 180, default: 0, step: 5,
            unit: 'deg', group: 'tracking', description: 'Rotation offset'
        }, null, {
            get: () => state.phase,
            set: (v) => { state.phase = v; this._updatePhaseDisplay(); }
        });

        r.define('app.reverse', {
            type: 'boolean', default: false,
            group: 'tracking', description: 'Mirror X axis'
        }, null, {
            get: () => state.reverse,
            set: (v) => { state.reverse = v; }
        });

        r.define('app.offsetX', {
            min: -50, max: 50, default: 0, step: 1,
            unit: '%', group: 'tracking', description: 'X calibration offset'
        }, null, {
            get: () => state.offsetX * 100,
            set: (v) => { state.offsetX = v / 100; this._applyCalibration(); }
        });

        r.define('app.offsetY', {
            min: -50, max: 50, default: 0, step: 1,
            unit: '%', group: 'tracking', description: 'Y calibration offset'
        }, null, {
            get: () => state.offsetY * 100,
            set: (v) => { state.offsetY = v / 100; this._applyCalibration(); }
        });

        r.define('app.broadcast', {
            type: 'boolean', default: true,
            group: 'io', description: 'BroadcastChannel TX'
        }, null, {
            get: () => this.handTracker?.broadcasting ?? false,
            set: (v) => v ? this._startBroadcast() : this._stopBroadcast()
        });

        r.define('app.engine', {
            type: 'enum',
            choices: ['rust', 'c'],
            default: 0,
            group: 'display',
            description: 'WASM engine (rust/c)'
        }, null, {
            get: () => state.engine === 'c' ? 1 : 0,
            set: (v) => this._setEngine(v === 1 ? 'c' : 'rust')
        });

        // === Layer parameters ===
        this.layerManager.forEach(layer => {
            const id = layer.id;
            const prefix = `layer.${id}`;

            r.define(`${prefix}.visible`, {
                type: 'boolean', default: true,
                group: 'layers', description: `${id} visibility`
            }, null, {
                get: () => layer.visible,
                set: (v) => layer.setVisible(v)
            });

            r.define(`${prefix}.opacity`, {
                min: 0, max: 1, default: 1, step: 0.05,
                group: 'layers'
            }, null, {
                get: () => layer.effects.opacity,
                set: (v) => layer.setEffect('opacity', v)
            });

            r.define(`${prefix}.glow`, {
                min: 0, max: 20, default: layer.id === 'skeleton' ? 3 : 0, step: 1,
                unit: 'px', group: 'layers'
            }, null, {
                get: () => layer.effects.glow,
                set: (v) => layer.setEffect('glow', v)
            });

            r.define(`${prefix}.brightness`, {
                min: 0.5, max: 2, default: 1, step: 0.1,
                group: 'layers'
            }, null, {
                get: () => layer.effects.brightness,
                set: (v) => layer.setEffect('brightness', v)
            });

            r.define(`${prefix}.contrast`, {
                min: 0.5, max: 2, default: 1, step: 0.1,
                group: 'layers'
            }, null, {
                get: () => layer.effects.contrast,
                set: (v) => layer.setEffect('contrast', v)
            });

            r.define(`${prefix}.blur`, {
                min: 0, max: 10, default: 0, step: 0.5,
                unit: 'px', group: 'layers'
            }, null, {
                get: () => layer.effects.blur,
                set: (v) => layer.setEffect('blur', v)
            });

            r.define(`${prefix}.invert`, {
                type: 'boolean', default: false,
                group: 'layers'
            }, null, {
                get: () => layer.effects.invert,
                set: (v) => layer.setEffect('invert', v)
            });
        });

        // === Tracking parameters (read-only) ===
        r.define('track.detected', {
            type: 'boolean', readonly: true,
            group: 'tracking', description: 'Hand detected'
        }, null, {
            get: () => this.trackingHub?.detected ?? false,
            set: () => {}
        });

        r.define('track.x', {
            min: -1, max: 1, readonly: true,
            group: 'tracking', description: 'Hand X position'
        }, null, {
            get: () => this.trackingHub?.getViewData('paddle')?.x ?? 0,
            set: () => {}
        });

        r.define('track.y', {
            min: -1, max: 1, readonly: true,
            group: 'tracking', description: 'Hand Y position'
        }, null, {
            get: () => this.trackingHub?.getViewData('paddle')?.y ?? 0,
            set: () => {}
        });

        r.define('track.angle', {
            min: -180, max: 180, unit: 'deg', readonly: true,
            group: 'tracking', description: 'Hand rotation'
        }, null, {
            get: () => {
                const angle = this.trackingHub?.getViewData('paddle')?.angle ?? 0;
                return angle * 180 / Math.PI;
            },
            set: () => {}
        });

        // === Processor parameters ===
        if (this.processor) {
            r.define('proc.brightness', {
                min: 0.5, max: 2, default: 1, step: 0.1,
                group: 'processor', description: 'Image brightness'
            }, null, {
                get: () => this.processor.get_brightness(),
                set: (v) => this.processor.set_brightness(v)
            });

            r.define('proc.contrast', {
                min: 0.5, max: 2, default: 1, step: 0.1,
                group: 'processor', description: 'Image contrast'
            }, null, {
                get: () => this.processor.get_contrast(),
                set: (v) => this.processor.set_contrast(v)
            });

            r.define('proc.invert', {
                type: 'boolean', default: false,
                group: 'processor', description: 'Invert colors'
            }, null, {
                get: () => this.processor.get_invert?.() ?? false,
                set: (v) => this.processor.toggle_invert?.()
            });
        }

        // === Geometry/Charmap parameters ===
        const geo = this.geometry;
        const rampNames = Object.keys(CharacterRamps);

        r.define('geo.ramp', {
            min: 0, max: rampNames.length - 1, default: 0, step: 1,
            group: 'geometry', description: 'Character ramp preset'
        }, null, {
            get: () => rampNames.indexOf(geo.charmap.rampName),
            set: (v) => {
                const idx = Math.floor(v);
                if (idx >= 0 && idx < rampNames.length) {
                    geo.setCharRamp(rampNames[idx]);
                }
            }
        });

        r.define('geo.charInvert', {
            type: 'boolean', default: false,
            group: 'geometry', description: 'Invert character mapping'
        }, null, {
            get: () => geo.charmap.inverted,
            set: (v) => { geo.charmap.inverted = v; }
        });

        r.define('geo.mirror', {
            type: 'boolean', default: true,
            group: 'geometry', description: 'Mirror camera X'
        }, null, {
            get: () => geo.camera.mirrored,
            set: (v) => { geo.camera.mirrored = v; }
        });

        r.define('geo.charAspect', {
            min: 0.3, max: 1.0, default: 0.55, step: 0.05,
            group: 'geometry', description: 'Character aspect ratio'
        }, null, {
            get: () => geo.ascii.charAspect,
            set: (v) => { geo.ascii.charAspect = v; this._updateOutputStyle(); }
        });

        // === VectorVision layer parameters ===
        const vvLayer = this.layerManager?.getLayer('vectorvision');
        if (vvLayer) {
            r.define('vv.demo', {
                type: 'boolean', default: false,
                group: 'vectorvision', description: 'VectorVision demo mode'
            }, null, {
                get: () => vvLayer.autoRotate,
                set: (v) => v ? vvLayer.startDemo() : vvLayer.stopDemo()
            });

            r.define('vv.fov', {
                min: 30, max: 120, default: 60, step: 5,
                unit: 'deg', group: 'vectorvision', description: 'Camera FOV'
            }, null, {
                get: () => vvLayer.renderer.camera.fov,
                set: (v) => { vvLayer.renderer.camera.fov = v; }
            });

            r.define('vv.distance', {
                min: 1, max: 20, default: 10, step: 0.5,
                group: 'vectorvision', description: 'Camera distance'
            }, null, {
                get: () => vvLayer.renderer.camera.distance,
                set: (v) => { vvLayer.renderer.camera.distance = v; }
            });

            r.define('vv.zoom', {
                min: 0.1, max: 2, default: 0.3, step: 0.05,
                group: 'vectorvision', description: 'Viewport zoom'
            }, null, {
                get: () => vvLayer.renderer.camera.zoom,
                set: (v) => { vvLayer.renderer.camera.zoom = v; }
            });

            // Hand landmark display parameters
            r.define('vv.staticHand', {
                type: 'boolean', default: false,
                group: 'vectorvision', description: 'Show static hand landmarks'
            }, null, {
                get: () => !!vvLayer.handLandmarkSprite,
                set: (v) => v ? vvLayer.showStaticHand() : vvLayer.hideStaticHand()
            });

            r.define('vv.labels', {
                type: 'boolean', default: true,
                group: 'vectorvision', description: 'Show landmark labels (0-20)'
            }, null, {
                get: () => vvLayer.showHandLabels,
                set: (v) => {
                    vvLayer.showHandLabels = v;
                    if (vvLayer.handLandmarkSprite) {
                        vvLayer.handLandmarkSprite.showLabels = v;
                    }
                }
            });

            r.define('vv.cube', {
                type: 'boolean', default: false,
                group: 'vectorvision', description: 'Show cube at fingertips'
            }, null, {
                get: () => vvLayer.showHeldCube,
                set: (v) => {
                    if (v && !vvLayer.showHeldCube) vvLayer.toggleHeldCube();
                    else if (!v && vvLayer.showHeldCube) vvLayer.toggleHeldCube();
                }
            });

            r.define('vv.cubeSize', {
                min: 0.05, max: 0.5, default: 0.15, step: 0.02,
                group: 'vectorvision', description: 'Held cube size'
            }, null, {
                get: () => vvLayer.handLandmarkSprite?.cubeSize ?? 0.15,
                set: (v) => vvLayer.setCubeSize(v)
            });
        }
    }

    /**
     * Setup UI element bindings
     */
    _setupUI() {
        this.ui = {
            resSlider: document.getElementById('res-slider'),
            resDisplay: document.getElementById('res-display'),
            phaseSlider: document.getElementById('phase-slider'),
            phaseDisplay: document.getElementById('phase-display'),
            sendIndicator: document.getElementById('send-indicator'),
            hudX: document.getElementById('hud-x'),
            hudY: document.getElementById('hud-y'),
            hudTheta: document.getElementById('hud-theta'),
            status: document.getElementById('status'),
            gameContainer: document.getElementById('game-container'),
        };

        // Resolution slider - 1 to camera width
        if (this.ui.resSlider) {
            this.ui.resSlider.min = 1;
            this.ui.resSlider.max = this.camera?.canvas?.width || 1280;
            this.ui.resSlider.value = this._state.cols;
            this.ui.resSlider.addEventListener('input', (e) => {
                const cols = parseInt(e.target.value);
                const rows = Math.round(cols * 9 / 16);
                this.registry.setValue('app.cols', cols);
                this.registry.setValue('app.rows', rows);
            });
        }

        // Phase slider
        if (this.ui.phaseSlider) {
            this.ui.phaseSlider.addEventListener('input', (e) => {
                this.registry.setValue('app.phase', parseInt(e.target.value));
            });
        }

        // Send indicator click toggle
        if (this.ui.sendIndicator) {
            this.ui.sendIndicator.addEventListener('click', () => {
                const param = this.registry.get('app.broadcast');
                if (param) param.toggle();
            });
        }

        // Initial UI state
        this._updateResDisplay();
        this._updatePhaseDisplay();
        this._updateSendUI();

        // Subscribe to broadcast changes
        this.registry.get('app.broadcast')?.onChange(() => this._updateSendUI());
    }

    /**
     * Setup REPL with registry
     */
    _setupREPL() {
        const replContainer = document.getElementById('repl-container');
        if (!replContainer) return;

        this.repl = new REPL(this.registry, {
            container: replContainer,
            visible: true
        });
    }

    // === Internal callbacks ===

    _onResolutionChange() {
        // Allow extreme values but ensure positive integers
        this._state.cols = Math.max(1, Math.floor(this._state.cols || 100));
        this._state.rows = Math.max(1, Math.floor(this._state.rows || 60));

        this.layerManager?.resize(this._state.cols, this._state.rows);
        this._updateOutputStyle();
        this._updateResDisplay();

        // Sync geometry config
        this.geometry?.setAscii(this._state.cols, this._state.rows);

        // Sync coordinate system
        this.coords?.setGridSize(this._state.cols, this._state.rows);
    }

    _updateOutputStyle() {
        const container = this.ui.gameContainer;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const charRatio = 0.55;
        const fw = rect.width / (this._state.cols * charRatio);
        const fh = rect.height / this._state.rows;
        const fs = Math.max(1, Math.min(fw, fh));

        const asciiOutput = document.getElementById('ascii-output');
        const skeletonOverlay = document.getElementById('skeleton-overlay');

        if (asciiOutput) {
            asciiOutput.style.fontSize = fs + 'px';
            asciiOutput.style.lineHeight = '1.0';
        }
        if (skeletonOverlay) {
            skeletonOverlay.style.fontSize = fs + 'px';
            skeletonOverlay.style.lineHeight = '1.0';
        }
    }

    _updateResDisplay() {
        if (this.ui.resDisplay) {
            this.ui.resDisplay.textContent = `${this._state.cols}x${this._state.rows}`;
        }
        if (this.ui.resSlider) {
            this.ui.resSlider.value = this._state.cols;
        }
    }

    _updatePhaseDisplay() {
        if (this.ui.phaseDisplay) {
            this.ui.phaseDisplay.textContent = `${this._state.phase}°`;
        }
        if (this.ui.phaseSlider) {
            this.ui.phaseSlider.value = this._state.phase;
        }
    }

    _updateSendUI() {
        const isOn = this.handTracker?.broadcasting;
        if (this.ui.sendIndicator) {
            this.ui.sendIndicator.classList.toggle('active', isOn);
            this.ui.sendIndicator.classList.toggle('inactive', !isOn);
        }
    }

    _applyCalibration() {
        const skeletonLayer = this.layerManager?.getLayer('skeleton');
        if (skeletonLayer) {
            skeletonLayer.setCalibration(this._state.offsetX, this._state.offsetY);
        }
    }

    _startBroadcast() {
        if (this.handTracker && !this.handTracker.broadcasting) {
            this.handTracker.startBroadcast('default');
            this._updateSendUI();
        }
    }

    _stopBroadcast() {
        if (this.handTracker?.broadcasting) {
            this.handTracker.stopBroadcast();
            this._updateSendUI();
        }
    }

    _setEngine(engine) {
        if (engine === 'c' && !this.cProcessor) {
            const msg = 'C engine not available - run "make c" to build';
            console.warn(msg);
            return;
        }

        // C engine has memory bugs - disabled for now, Rust wins
        if (engine === 'c') {
            console.warn('C engine disabled due to memory bugs. Rust is safer and works.');
            return;
        }

        this._state.engine = engine;
        this.processor = engine === 'c' ? this.cProcessor : this.rustProcessor;

        // Update the camera layer's processor reference
        const cameraLayer = this.layerManager?.getLayer('camera-ascii');
        if (cameraLayer) {
            cameraLayer.processor = this.processor;
        }

        console.log(`Switched to ${engine.toUpperCase()} engine`);
    }

    _updateHUD(paddleData) {
        if (!paddleData) {
            if (this.ui.hudX) this.ui.hudX.textContent = 'X:--';
            if (this.ui.hudY) this.ui.hudY.textContent = 'Y:--';
            if (this.ui.hudTheta) this.ui.hudTheta.textContent = 'θ:--';
            return;
        }

        let theta = paddleData.angle;
        if (this._state.reverse) theta = -theta;

        if (this.ui.hudX) this.ui.hudX.textContent = `X:${paddleData.x.toFixed(2)}`;
        if (this.ui.hudY) this.ui.hudY.textContent = `Y:${paddleData.y.toFixed(2)}`;
        if (this.ui.hudTheta) this.ui.hudTheta.textContent = `θ:${(theta * 180 / Math.PI + this._state.phase).toFixed(0)}°`;
    }

    // === Public API ===

    setResolution(cols, rows) {
        this.registry.setValue('app.cols', cols);
        this.registry.setValue('app.rows', rows);
    }

    calibrate() {
        const skeletonLayer = this.layerManager?.getLayer('skeleton');
        if (!skeletonLayer || !this.handTracker?.landmarks) return false;

        const landmarks = this.handTracker.landmarks;
        const indexMCP = landmarks[5];
        const pinkyMCP = landmarks[17];

        const centerX = 1 - (indexMCP.x + pinkyMCP.x) / 2;
        const centerY = (indexMCP.y + pinkyMCP.y) / 2;

        this._state.offsetX = 0.5 - centerX;
        this._state.offsetY = 0.5 - centerY;
        this._applyCalibration();

        console.log('Calibrated:', this._state.offsetX, this._state.offsetY);
        return true;
    }

    toggleSkeleton() {
        const param = this.registry.get('layer.skeleton.visible');
        if (param) return param.toggle();
        return false;
    }

    toggleHUD() {
        const param = this.registry.get('layer.hud.visible');
        if (param) return param.toggle();
        return false;
    }

    toggleReverse() {
        const param = this.registry.get('app.reverse');
        if (param) return param.toggle();
        return false;
    }

    toggleBroadcast() {
        const param = this.registry.get('app.broadcast');
        if (param) return param.toggle();
        return false;
    }

    toggleLayer(layerId) {
        const param = this.registry.get(`layer.${layerId}.visible`);
        if (param) return param.toggle();
        return null;
    }

    focusREPL() {
        if (this.repl) this.repl.focus();
    }

    // === Render loop ===

    _renderLoop() {
        if (!this.running) return;

        // FPS tracking
        const now = performance.now();
        if (this._lastFrameTime) {
            this._frameTimes.push(now - this._lastFrameTime);
            if (this._frameTimes.length > 30) this._frameTimes.shift();
            if (this._frameTimes.length >= 10) {
                const avg = this._frameTimes.reduce((a, b) => a + b) / this._frameTimes.length;
                this._fps = Math.round(1000 / avg);
            }
        }
        this._lastFrameTime = now;

        const imageData = this.camera.getFrame();
        if (imageData) {
            const cameraLayer = this.layerManager.getLayer('camera-ascii');
            const skeletonLayer = this.layerManager.getLayer('skeleton');
            const vectorVisionLayer = this.layerManager.getLayer('vectorvision');
            const hudLayer = this.layerManager.getLayer('hud');

            // Render camera ASCII
            cameraLayer.render(imageData);

            // Run hand detection
            let paddleData = null;
            let rawData = null;

            if (this.handTracker?.ready) {
                this.handTracker.detect(performance.now());

                paddleData = this.trackingHub.getViewData('paddle');
                rawData = this.trackingHub.getRawData();

                // Render skeleton
                if (skeletonLayer.visible) {
                    skeletonLayer.render(rawData.landmarks);
                }

                // Render HUD
                if (hudLayer.visible && paddleData) {
                    hudLayer.render({
                        ...paddleData,
                        theta: paddleData.angle,
                        spread: paddleData.squeeze,
                        reverse: this._state.reverse,
                        phase: this._state.phase,
                        landmarks: rawData.landmarks
                    });
                } else {
                    hudLayer.clear();
                }

                this._updateHUD(paddleData);

                // Broadcast with modifiers
                if (this.handTracker.broadcasting && rawData.landmarks) {
                    this._broadcastWithModifiers(rawData.landmarks);
                }
            } else {
                skeletonLayer.clear();
                hudLayer.clear();
                this._updateHUD(null);
            }

            // Render VectorVision layer (independent of hand tracking)
            if (vectorVisionLayer?.visible) {
                vectorVisionLayer.update(1/60);  // ~60fps delta
                vectorVisionLayer.render();
            }

            // Update status
            let status = `${this._state.engine.toUpperCase()} ${this._fps}fps`;
            status += ` | ${cameraLayer.getStatus()}`;
            if (this.handTracker?.ready) {
                status += rawData?.detected ? ' | HAND' : ' | --';
            }
            if (vectorVisionLayer?.sprites.size > 0) {
                status += ' | VV';
            }
            if (this.ui.status) {
                this.ui.status.textContent = status;
            }
        }

        requestAnimationFrame(() => this._renderLoop());
    }

    _broadcastWithModifiers(landmarks) {
        const indexMCP = landmarks[5];
        const pinkyMCP = landmarks[17];
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];

        let centerX = 1 - (indexMCP.x + pinkyMCP.x) / 2;
        let centerY = (indexMCP.y + pinkyMCP.y) / 2;

        const dx = pinkyMCP.x - indexMCP.x;
        const dy = pinkyMCP.y - indexMCP.y;
        let theta = -Math.atan2(dy, dx);

        const spread = Math.abs(
            (thumbTip.x * (indexTip.y - middleTip.y) +
             indexTip.x * (middleTip.y - thumbTip.y) +
             middleTip.x * (thumbTip.y - indexTip.y)) / 2
        );

        let x = centerX * 2 - 1;
        let y = centerY * 2 - 1;

        // Apply modifiers
        if (this._state.reverse) {
            x = -x;
            theta = -theta;
        }
        theta += this._state.phase * Math.PI / 180;

        // Send via hand tracker's channel
        if (this.handTracker.channel) {
            const now = performance.now();
            const ch = this.handTracker.channel;
            const flick = this.handTracker.flick;

            ch.postMessage({
                _src: 'controldeck', _v: 1, _t: now,
                source: 'vision',
                device: 'ASCIIVision-Hand',
                type: 'continuous',
                control: 'hand',
                value: x,
                raw: {
                    x, y, theta, spread,
                    detected: true,
                    reverse: this._state.reverse,
                    phase: this._state.phase,
                    flickAmount: flick.amount,
                    flickDirection: flick.direction
                }
            });

            const sendAxis = (control, value) => {
                ch.postMessage({
                    _src: 'controldeck', _v: 1, _t: now,
                    source: 'vision',
                    device: 'ASCIIVision-Hand',
                    type: 'continuous',
                    control,
                    value: (value + 1) / 2,
                    raw: { value }
                });
            };

            sendAxis('hand-x', x);
            sendAxis('hand-y', y);
            sendAxis('hand-theta', theta / Math.PI);
            sendAxis('hand-spread', Math.min(1, spread * 20) * 2 - 1);
            sendAxis('flick-amount', flick.amount * 2 - 1);
            sendAxis('flick-direction', flick.direction);
        }
    }

    stop() {
        this.running = false;
        this.camera?.stop();
        this.handTracker?.destroy();
        this.layerManager?.destroy();
        this.repl?.destroy();
    }
}

// Start application
const app = new AsciiVision();
app.init().catch(console.error);

// Export for debugging
window.asciiApp = app;
window.params = app.registry;  // Easy access to params
window.geometry = app.geometry; // GeometryConfig access
window.coords = app.coords;     // CoordinateSystem access
window.vv = () => app.layerManager?.getLayer('vectorvision'); // VectorVision access
