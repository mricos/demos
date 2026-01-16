/**
 * HandTracker - MediaPipe hand detection with controldeck broadcast
 * Outputs: x, y, theta (rotation), spread (convex hull area of thumb/index/middle tips)
 */

export class HandTracker {
    constructor() {
        this.handLandmarker = null;
        this.video = null;
        this.ready = false;
        this.lastDetectionTime = 0;

        // Detected values
        this.values = {
            x: 0,           // Hand center X (-1 to 1)
            y: 0,           // Hand center Y (-1 to 1)
            theta: 0,       // Rotation angle (radians)
            spread: 0,      // Convex hull area of thumb/index/middle tips
            detected: false
        };

        // Smoothed values
        this.smoothed = {
            x: 0,
            y: 0,
            theta: 0,
            spread: 0
        };

        // Smoothing config
        this.smoothingFactor = 0.3;
        this.deadzone = 0.02;

        // Raw landmarks for skeleton rendering
        this.landmarks = null;

        // BroadcastChannel for controldeck
        this.channel = null;
        this.broadcasting = false;

        // Flick detection (index finger only)
        this.flick = {
            prevIndexTip: null,      // Previous index finger position
            prevTimestamp: 0,        // Previous frame timestamp
            velocity: { x: 0, y: 0 },// Current velocity
            amount: 0,               // Flick magnitude (0-1)
            direction: 0,            // Flick direction (-1 to 1, normalized angle)
            threshold: 0.15,         // Velocity threshold to trigger flick
            decay: 0.85              // How fast flick amount decays
        };
    }

    async init(videoElement) {
        this.video = videoElement;

        try {
            // Load MediaPipe Vision Tasks
            const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/+esm');
            const { HandLandmarker, FilesetResolver } = vision;

            const filesetResolver = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
            );

            this.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 1,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.ready = true;
            console.log('HandTracker: MediaPipe initialized');
            return true;

        } catch (error) {
            console.error('HandTracker: MediaPipe init failed:', error);
            return false;
        }
    }

    /**
     * Start broadcasting to controldeck
     * @param {string} channelName - Channel name (default: 'default' to match controldeck)
     */
    startBroadcast(channelName = 'default') {
        if (typeof BroadcastChannel !== 'undefined') {
            this.channel = new BroadcastChannel(`controldeck-${channelName}`);
            this.broadcasting = true;
            console.log(`HandTracker: Broadcasting on controldeck-${channelName}`);
        }
    }

    stopBroadcast() {
        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
        this.broadcasting = false;
    }

    /**
     * Detect hand in current video frame
     */
    detect(timestamp) {
        if (!this.ready || !this.handLandmarker || !this.video) return;
        if (this.video.readyState < 2) return;

        // Ensure unique timestamp
        if (timestamp <= this.lastDetectionTime) {
            timestamp = this.lastDetectionTime + 1;
        }
        this.lastDetectionTime = timestamp;

        try {
            const results = this.handLandmarker.detectForVideo(this.video, timestamp);
            this._processResults(results);
        } catch (error) {
            // Silently handle detection errors
        }
    }

    _processResults(results) {
        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            this.landmarks = landmarks;  // Store for skeleton rendering
            this.values.detected = true;

            // Key landmarks:
            // 0: Wrist, 4: Thumb tip, 5: Index MCP, 8: Index tip
            // 9: Middle MCP, 12: Middle tip, 17: Pinky MCP

            const wrist = landmarks[0];
            const thumbTip = landmarks[4];
            const indexMCP = landmarks[5];
            const indexTip = landmarks[8];
            const middleMCP = landmarks[9];
            const middleTip = landmarks[12];
            const pinkyMCP = landmarks[17];

            // Calculate hand center (average of knuckles)
            const centerX = (indexMCP.x + middleMCP.x + pinkyMCP.x) / 3;
            const centerY = (indexMCP.y + middleMCP.y + pinkyMCP.y) / 3;

            // Normalize to -1 to 1
            this.values.x = (centerX - 0.5) * 2;
            this.values.y = (centerY - 0.5) * 2;

            // Calculate theta (rotation) from knuckle line
            const knuckleVector = {
                x: pinkyMCP.x - indexMCP.x,
                y: pinkyMCP.y - indexMCP.y
            };
            this.values.theta = Math.atan2(knuckleVector.y, knuckleVector.x);

            // Calculate spread: convex hull area of thumb, index, middle fingertips
            // For 3 points, this is just the triangle area using shoelace formula
            this.values.spread = this._triangleArea(
                thumbTip.x, thumbTip.y,
                indexTip.x, indexTip.y,
                middleTip.x, middleTip.y
            );

            // Apply smoothing
            this._applySmoothing();

            // Detect flick from index finger
            this._detectFlick(indexTip, performance.now());

            // Note: Broadcasting is now handled by main.js with modifiers
            // this._broadcast();

        } else {
            this.values.detected = false;
            this.landmarks = null;
        }
    }

    /**
     * Calculate triangle area using shoelace formula
     * Returns normalized area (0 to ~0.5 for full frame triangle)
     */
    _triangleArea(x1, y1, x2, y2, x3, y3) {
        return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2);
    }

    _applySmoothing() {
        ['x', 'y', 'theta', 'spread'].forEach(key => {
            const diff = this.values[key] - this.smoothed[key];
            if (Math.abs(diff) > this.deadzone) {
                this.smoothed[key] += diff * this.smoothingFactor;
            }
        });
    }

    /**
     * Detect flick gesture from index finger velocity
     * @param {Object} indexTip - Current index finger tip position {x, y}
     * @param {number} timestamp - Current frame timestamp
     */
    _detectFlick(indexTip, timestamp) {
        // Decay existing flick
        this.flick.amount *= this.flick.decay;

        if (!this.flick.prevIndexTip || !this.flick.prevTimestamp) {
            this.flick.prevIndexTip = { x: indexTip.x, y: indexTip.y };
            this.flick.prevTimestamp = timestamp;
            return;
        }

        // Calculate time delta in seconds
        const dt = (timestamp - this.flick.prevTimestamp) / 1000;
        if (dt <= 0 || dt > 0.1) {  // Skip if too long between frames
            this.flick.prevIndexTip = { x: indexTip.x, y: indexTip.y };
            this.flick.prevTimestamp = timestamp;
            return;
        }

        // Calculate velocity
        const dx = indexTip.x - this.flick.prevIndexTip.x;
        const dy = indexTip.y - this.flick.prevIndexTip.y;
        this.flick.velocity.x = dx / dt;
        this.flick.velocity.y = dy / dt;

        // Calculate velocity magnitude
        const speed = Math.sqrt(this.flick.velocity.x ** 2 + this.flick.velocity.y ** 2);

        // Detect flick if velocity exceeds threshold
        if (speed > this.flick.threshold) {
            // Normalize speed to 0-1 range (cap at 1.0 velocity)
            this.flick.amount = Math.min(1, speed / 1.0);
            // Direction as normalized angle (-1 to 1, where 0 = right, 0.5 = up, -0.5 = down)
            this.flick.direction = Math.atan2(-this.flick.velocity.y, this.flick.velocity.x) / Math.PI;
        }

        // Store for next frame
        this.flick.prevIndexTip = { x: indexTip.x, y: indexTip.y };
        this.flick.prevTimestamp = timestamp;
    }

    _broadcast() {
        if (!this.broadcasting || !this.channel) return;

        // Send as controldeck protocol events
        const now = performance.now();

        // Send combined hand tracking data
        this.channel.postMessage({
            _src: 'controldeck',
            _v: 1,
            _t: now,
            source: 'vision',
            device: 'ASCIIVision-Hand',
            type: 'continuous',
            control: 'hand',
            value: this.smoothed.x,  // Primary value is X
            raw: {
                x: this.smoothed.x,
                y: this.smoothed.y,
                theta: this.smoothed.theta,
                spread: this.smoothed.spread,
                detected: this.values.detected,
                flickAmount: this.flick.amount,
                flickDirection: this.flick.direction
            }
        });

        // Also send individual axis events for compatibility
        this._sendAxis('hand-x', this.smoothed.x, now);
        this._sendAxis('hand-y', this.smoothed.y, now);
        this._sendAxis('hand-theta', this.smoothed.theta / Math.PI, now); // Normalize to -1 to 1
        this._sendAxis('hand-spread', Math.min(1, this.smoothed.spread * 20), now); // Scale spread

        // Send flick data
        this._sendAxis('flick-amount', this.flick.amount * 2 - 1, now); // Convert 0-1 to -1 to 1
        this._sendAxis('flick-direction', this.flick.direction, now);   // Already -1 to 1
    }

    _sendAxis(control, value, timestamp) {
        this.channel.postMessage({
            _src: 'controldeck',
            _v: 1,
            _t: timestamp,
            source: 'vision',
            device: 'ASCIIVision-Hand',
            type: 'continuous',
            control: control,
            value: (value + 1) / 2  // Normalize to 0-1 for controldeck
        });
    }

    /**
     * Get current values
     */
    getValues() {
        return {
            ...this.smoothed,
            detected: this.values.detected,
            flickAmount: this.flick.amount,
            flickDirection: this.flick.direction
        };
    }

    /**
     * Get MIDI-compatible values (0-127)
     */
    getMIDIValues() {
        return {
            x: Math.round(Math.max(0, Math.min(127, (this.smoothed.x + 1) * 63.5))),
            y: Math.round(Math.max(0, Math.min(127, (this.smoothed.y + 1) * 63.5))),
            theta: Math.round(Math.max(0, Math.min(127, (this.smoothed.theta / Math.PI + 1) * 63.5))),
            spread: Math.round(Math.max(0, Math.min(127, this.smoothed.spread * 2540))) // Scale for visibility
        };
    }

    destroy() {
        this.stopBroadcast();
        if (this.handLandmarker) {
            this.handLandmarker.close();
        }
    }
}
