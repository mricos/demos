/**
 * HandTrackingHub - Unified hand tracking with multiple interpretation views
 * Wraps HandTracker and provides different ways to interpret hand data
 */
export class HandTrackingHub {
    constructor(handTracker) {
        this.tracker = handTracker;
        this.views = new Map();

        // Register built-in views
        this.registerView('paddle', new PaddleView());
        this.registerView('pointer', new PointerView());
        this.registerView('gesture', new GestureView());
    }

    /**
     * Register a custom view
     */
    registerView(name, view) {
        this.views.set(name, view);
    }

    /**
     * Get hand data through a specific view
     * @param {string} viewName - Name of the view to use
     * @returns {Object|null} View-specific interpretation of hand data
     */
    getViewData(viewName) {
        const view = this.views.get(viewName);
        if (!view) return null;

        const landmarks = this.tracker?.landmarks;
        const values = this.tracker?.getValues() || {};

        if (!landmarks || !values.detected) return null;

        return view.interpret(landmarks, values, this.tracker?.flick);
    }

    /**
     * Get raw hand data
     */
    getRawData() {
        return {
            landmarks: this.tracker?.landmarks || null,
            values: this.tracker?.getValues() || {},
            flick: this.tracker?.flick || { amount: 0, direction: 0 },
            detected: this.tracker?.landmarks != null
        };
    }

    /**
     * Check if hand is detected
     */
    get detected() {
        return this.tracker?.landmarks != null;
    }

    /**
     * Get all available view names
     */
    getViewNames() {
        return Array.from(this.views.keys());
    }
}

/**
 * PaddleView - Interprets hand as a paddle controller
 * Maps hand position/rotation to normalized paddle controls
 * This is the "paddlevision" use case unified under asciivision
 */
class PaddleView {
    constructor() {
        this.deadzone = 0.1;
        this.sensitivity = 1.0;
    }

    interpret(landmarks, values, flick) {
        return {
            // Paddle position (-1 to 1)
            x: this._applyDeadzone(values.x || 0),
            y: this._applyDeadzone(values.y || 0),

            // Paddle angle (radians)
            angle: values.theta || 0,

            // Paddle "squeeze" (normalized 0-1)
            squeeze: Math.min(1, (values.spread || 0) * 20),

            // Paddle hit detection (from flick)
            hit: (flick?.amount || 0) > 0.3,
            hitStrength: flick?.amount || 0,
            hitDirection: flick?.direction || 0,

            // Raw landmarks for advanced use
            landmarks
        };
    }

    _applyDeadzone(value) {
        if (Math.abs(value) < this.deadzone) return 0;
        const sign = value > 0 ? 1 : -1;
        return sign * ((Math.abs(value) - this.deadzone) / (1 - this.deadzone)) * this.sensitivity;
    }

    setDeadzone(dz) {
        this.deadzone = Math.max(0, Math.min(0.5, dz));
    }

    setSensitivity(s) {
        this.sensitivity = Math.max(0.1, Math.min(3, s));
    }
}

/**
 * PointerView - Interprets hand as a pointer/cursor
 * Index finger tip becomes cursor position
 */
class PointerView {
    interpret(landmarks, values) {
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // Distance between thumb and index for pinch detection
        const pinchDist = Math.hypot(
            thumbTip.x - indexTip.x,
            thumbTip.y - indexTip.y
        );

        return {
            // Cursor position (0-1, mirrored for front camera)
            x: 1 - indexTip.x,
            y: indexTip.y,

            // Normalized to -1 to 1
            normalizedX: (1 - indexTip.x) * 2 - 1,
            normalizedY: indexTip.y * 2 - 1,

            // Click state (pinch gesture)
            clicking: pinchDist < 0.05,
            pinchDistance: pinchDist,

            // Z depth (approximated)
            z: indexTip.z || 0
        };
    }
}

/**
 * GestureView - Interprets hand gestures
 * Provides boolean flags for common gestures
 */
class GestureView {
    interpret(landmarks, values) {
        const thumbTip = landmarks[4];
        const thumbMCP = landmarks[2];
        const indexTip = landmarks[8];
        const indexMCP = landmarks[5];
        const middleTip = landmarks[12];
        const middleMCP = landmarks[9];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        // Pinch: thumb-index distance
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

        // Finger extension checks (tip above MCP)
        const indexExtended = indexTip.y < indexMCP.y - 0.02;
        const middleExtended = middleTip.y < middleMCP.y - 0.02;

        // Thumb up: thumb tip well above thumb MCP, fingers curled
        const thumbUp = thumbTip.y < thumbMCP.y - 0.1 && indexTip.y > thumbTip.y + 0.05;

        // Pointing: only index extended
        const pointing = indexExtended && !middleExtended;

        // Peace: index and middle extended
        const peace = indexExtended && middleExtended &&
                     ringTip.y > landmarks[13].y && pinkyTip.y > landmarks[17].y;

        // Open hand: all fingers extended (spread)
        const open = (values.spread || 0) > 0.03;

        // Fist: all fingers curled
        const fist = (values.spread || 0) < 0.005;

        return {
            // Gesture flags
            pinching: pinchDist < 0.05,
            pointing,
            thumbsUp: thumbUp,
            peace,
            open,
            fist,

            // Gesture strength/confidence (simplified)
            pinchAmount: Math.max(0, 1 - pinchDist * 10),
            spreadAmount: Math.min(1, (values.spread || 0) * 20),

            // Hand orientation
            palmFacing: wrist.z < indexMCP.z ? 'camera' : 'away'
        };
    }
}

// Export view classes for custom extension
export { PaddleView, PointerView, GestureView };
