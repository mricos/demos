/**
 * ASCIIVision Unified API
 *
 * Provides a unified interface for video capture and MediaPipe hand tracking
 * with toggleable backends (JS or WASM). Consumers like PaddleVision subscribe
 * to events rather than managing MediaPipe directly.
 *
 * Usage:
 *   await ASCIIVision.init({ backend: 'js' });
 *   ASCIIVision.on('landmarks', (data) => { ... });
 *   ASCIIVision.camera.select(deviceId);
 */
(function() {
    'use strict';

    // ========================================
    // Constants
    // ========================================
    const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8';
    const DEFAULT_WIDTH = 1280;
    const DEFAULT_HEIGHT = 720;

    // ========================================
    // State
    // ========================================
    let initialized = false;
    let currentBackend = null;
    let videoElement = null;
    let canvasElement = null;
    let canvasCtx = null;
    let mediaStream = null;
    let handLandmarker = null;
    let animationFrameId = null;
    let running = false;

    // Stats tracking
    const stats = {
        fps: 0,
        latency: 0,
        confidence: 0,
        frameCount: 0,
        lastFrameTime: 0,
        fpsHistory: []
    };

    // Event subscribers
    const subscribers = {
        frame: [],
        landmarks: [],
        pose: [],
        error: [],
        ready: [],
        stats: []
    };

    // Current detection results
    let currentLandmarks = null;
    let currentPose = null;

    // Camera info cache
    let cameraList = [];
    let currentCameraId = null;

    // ========================================
    // Backend Implementations
    // ========================================

    /**
     * JS Backend - Uses @mediapipe/tasks-vision from CDN
     */
    const JSBackend = {
        name: 'js',

        async init() {
            // Load MediaPipe vision tasks
            const vision = await import(`${MEDIAPIPE_CDN}/vision_bundle.mjs`);
            const { HandLandmarker, FilesetResolver } = vision;

            // Load WASM files
            const wasmFileset = await FilesetResolver.forVisionTasks(
                `${MEDIAPIPE_CDN}/wasm`
            );

            // Create hand landmarker
            handLandmarker = await HandLandmarker.createFromOptions(wasmFileset, {
                baseOptions: {
                    modelAssetPath: `${MEDIAPIPE_CDN}/hand_landmarker.task`,
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 1,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            return true;
        },

        detect(timestamp) {
            if (!handLandmarker || !videoElement) return null;

            const startTime = performance.now();
            const results = handLandmarker.detectForVideo(videoElement, timestamp);
            stats.latency = performance.now() - startTime;

            if (results.landmarks && results.landmarks.length > 0) {
                stats.confidence = results.handedness?.[0]?.[0]?.score || 0;
                return {
                    landmarks: results.landmarks[0],
                    handedness: results.handedness?.[0]?.[0]?.categoryName || 'unknown',
                    worldLandmarks: results.worldLandmarks?.[0] || null
                };
            }
            return null;
        },

        destroy() {
            if (handLandmarker) {
                handLandmarker.close();
                handLandmarker = null;
            }
        }
    };

    /**
     * WASM Backend - Uses compiled C/Rust WASM module
     * This is a placeholder that will be implemented when livepipe WASM is ready
     */
    const WASMBackend = {
        name: 'wasm',

        async init() {
            // TODO: Load livepipe WASM module for hand detection
            // For now, fall back to JS backend with a warning
            console.warn('[ASCIIVision] WASM backend not yet implemented, falling back to JS');
            return JSBackend.init();
        },

        detect(timestamp) {
            // Uses same detection as JS for now
            return JSBackend.detect(timestamp);
        },

        destroy() {
            JSBackend.destroy();
        }
    };

    // Backend registry
    const backends = {
        js: JSBackend,
        wasm: WASMBackend
    };

    // ========================================
    // Camera Management
    // ========================================

    const camera = {
        /**
         * List available cameras
         * @returns {Promise<CameraInfo[]>}
         */
        async list() {
            try {
                // Request permission first to get labels
                await navigator.mediaDevices.getUserMedia({ video: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                cameraList = devices
                    .filter(d => d.kind === 'videoinput')
                    .map(d => ({
                        deviceId: d.deviceId,
                        label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
                        groupId: d.groupId
                    }));
                return cameraList;
            } catch (err) {
                emit('error', { type: 'camera', message: err.message });
                return [];
            }
        },

        /**
         * Select a specific camera
         * @param {string} deviceId
         */
        async select(deviceId) {
            // Stop current stream
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
            }

            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: deviceId ? { exact: deviceId } : undefined,
                        width: { ideal: DEFAULT_WIDTH },
                        height: { ideal: DEFAULT_HEIGHT }
                    }
                });

                currentCameraId = deviceId || mediaStream.getVideoTracks()[0]?.getSettings()?.deviceId;
                videoElement.srcObject = mediaStream;
                await videoElement.play();

                emit('ready', { camera: currentCameraId });
            } catch (err) {
                emit('error', { type: 'camera', message: err.message });
                throw err;
            }
        },

        /**
         * Get current camera info
         * @returns {CameraInfo|null}
         */
        getInfo() {
            if (!currentCameraId) return null;
            const track = mediaStream?.getVideoTracks()[0];
            const settings = track?.getSettings() || {};
            return {
                deviceId: currentCameraId,
                label: cameraList.find(c => c.deviceId === currentCameraId)?.label || 'Unknown',
                width: settings.width || DEFAULT_WIDTH,
                height: settings.height || DEFAULT_HEIGHT,
                frameRate: settings.frameRate || 30
            };
        },

        /**
         * Get raw MediaStream
         * @returns {MediaStream|null}
         */
        getStream() {
            return mediaStream;
        }
    };

    // ========================================
    // Core Functions
    // ========================================

    /**
     * Emit event to subscribers
     */
    function emit(event, data) {
        if (subscribers[event]) {
            subscribers[event].forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`[ASCIIVision] Error in ${event} handler:`, err);
                }
            });
        }
    }

    /**
     * Update FPS stats
     */
    function updateStats(timestamp) {
        stats.frameCount++;
        if (stats.lastFrameTime > 0) {
            const delta = timestamp - stats.lastFrameTime;
            const instantFps = 1000 / delta;
            stats.fpsHistory.push(instantFps);
            if (stats.fpsHistory.length > 30) {
                stats.fpsHistory.shift();
            }
            stats.fps = stats.fpsHistory.reduce((a, b) => a + b, 0) / stats.fpsHistory.length;
        }
        stats.lastFrameTime = timestamp;
    }

    /**
     * Main detection loop
     */
    function detectionLoop(timestamp) {
        if (!running) return;

        updateStats(timestamp);

        // Get current backend and run detection
        const backend = backends[currentBackend];
        if (backend) {
            const result = backend.detect(timestamp);
            if (result) {
                currentLandmarks = result.landmarks;
                emit('landmarks', {
                    landmarks: result.landmarks,
                    handedness: result.handedness,
                    worldLandmarks: result.worldLandmarks,
                    timestamp,
                    stats: { fps: stats.fps, latency: stats.latency, confidence: stats.confidence }
                });
            } else {
                currentLandmarks = null;
            }
        }

        // Emit frame event
        emit('frame', {
            timestamp,
            hasLandmarks: currentLandmarks !== null
        });

        // Emit stats periodically
        if (stats.frameCount % 30 === 0) {
            emit('stats', {
                fps: stats.fps,
                latency: stats.latency,
                confidence: stats.confidence,
                frameCount: stats.frameCount
            });
        }

        animationFrameId = requestAnimationFrame(detectionLoop);
    }

    // ========================================
    // Public API
    // ========================================

    const ASCIIVision = {
        /**
         * Initialize the API
         * @param {Object} options
         * @param {string} options.backend - 'js' or 'wasm' (default: 'js')
         * @param {string} options.cameraId - Optional camera device ID
         * @param {number} options.width - Video width (default: 1280)
         * @param {number} options.height - Video height (default: 720)
         */
        async init(options = {}) {
            if (initialized) {
                console.warn('[ASCIIVision] Already initialized');
                return;
            }

            const {
                backend = 'js',
                cameraId = null,
                width = DEFAULT_WIDTH,
                height = DEFAULT_HEIGHT
            } = options;

            // Create hidden video element
            videoElement = document.createElement('video');
            videoElement.setAttribute('playsinline', '');
            videoElement.setAttribute('autoplay', '');
            videoElement.muted = true;
            videoElement.style.display = 'none';
            document.body.appendChild(videoElement);

            // Create offscreen canvas for frame access
            canvasElement = document.createElement('canvas');
            canvasElement.width = width;
            canvasElement.height = height;
            canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });

            // Initialize backend
            currentBackend = backend;
            const backendImpl = backends[backend];
            if (!backendImpl) {
                throw new Error(`Unknown backend: ${backend}`);
            }

            try {
                await backendImpl.init();
            } catch (err) {
                emit('error', { type: 'backend', message: err.message });
                throw err;
            }

            // Start camera
            await camera.select(cameraId);

            initialized = true;
            running = true;

            // Start detection loop
            animationFrameId = requestAnimationFrame(detectionLoop);

            console.log(`[ASCIIVision] Initialized with ${backend} backend`);
        },

        /**
         * Destroy and clean up
         */
        destroy() {
            running = false;

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            // Destroy backend
            const backend = backends[currentBackend];
            if (backend) {
                backend.destroy();
            }

            // Stop camera
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
                mediaStream = null;
            }

            // Remove elements
            if (videoElement) {
                videoElement.remove();
                videoElement = null;
            }

            // Clear state
            initialized = false;
            currentBackend = null;
            currentLandmarks = null;
            currentPose = null;

            // Clear subscribers
            Object.keys(subscribers).forEach(k => subscribers[k] = []);

            console.log('[ASCIIVision] Destroyed');
        },

        /**
         * Switch backend
         * @param {'js' | 'wasm'} backend
         */
        async setBackend(backend) {
            if (!backends[backend]) {
                throw new Error(`Unknown backend: ${backend}`);
            }
            if (backend === currentBackend) return;

            // Destroy old backend
            const oldBackend = backends[currentBackend];
            if (oldBackend) {
                oldBackend.destroy();
            }

            // Initialize new backend
            currentBackend = backend;
            await backends[backend].init();

            console.log(`[ASCIIVision] Switched to ${backend} backend`);
        },

        /**
         * Get current backend
         * @returns {'js' | 'wasm'}
         */
        getBackend() {
            return currentBackend;
        },

        /**
         * Camera management
         */
        camera,

        /**
         * Get current frame as ImageData
         * @returns {ImageData|null}
         */
        getFrame() {
            if (!videoElement || !canvasCtx) return null;
            canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            return canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
        },

        /**
         * Get current frame as Uint8Array buffer (for WASM)
         * @returns {Uint8Array|null}
         */
        getFrameBuffer() {
            const frame = this.getFrame();
            return frame ? new Uint8Array(frame.data.buffer) : null;
        },

        /**
         * Get current hand landmarks
         * @returns {Array|null} 21 landmarks or null if no hand detected
         */
        getLandmarks() {
            return currentLandmarks;
        },

        /**
         * Get pose (placeholder for future)
         * @returns {Object|null}
         */
        getPose() {
            return currentPose;
        },

        /**
         * Get current stats
         * @returns {{ fps: number, latency: number, confidence: number }}
         */
        getStats() {
            return {
                fps: stats.fps,
                latency: stats.latency,
                confidence: stats.confidence
            };
        },

        /**
         * Subscribe to events
         * @param {'frame' | 'landmarks' | 'pose' | 'error' | 'ready' | 'stats'} event
         * @param {Function} callback
         * @returns {Function} Unsubscribe function
         */
        on(event, callback) {
            if (!subscribers[event]) {
                console.warn(`[ASCIIVision] Unknown event: ${event}`);
                return () => {};
            }
            subscribers[event].push(callback);
            return () => {
                const idx = subscribers[event].indexOf(callback);
                if (idx > -1) subscribers[event].splice(idx, 1);
            };
        },

        /**
         * Pause detection loop
         */
        pause() {
            running = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        },

        /**
         * Resume detection loop
         */
        resume() {
            if (!initialized) return;
            running = true;
            animationFrameId = requestAnimationFrame(detectionLoop);
        },

        /**
         * Check if running
         */
        isRunning() {
            return running;
        },

        /**
         * Get video element (for direct rendering)
         */
        getVideoElement() {
            return videoElement;
        }
    };

    // Export to global
    window.ASCIIVision = ASCIIVision;

})();
