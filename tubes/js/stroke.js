// TUBES.stroke - 2D Drawing Input Capture
(function(TUBES) {
    'use strict';

    let ctx = null;
    let isDrawing = false;
    let points = [];

    TUBES.stroke = {
        get isDrawing() { return isDrawing; },
        get points() { return points; },

        init() {
            const canvas = TUBES.config.canvas.drawing;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx = canvas.getContext('2d');

            this.setupDrawing();

            console.log('TUBES.stroke: initialized');
        },

        setupDrawing() {
            const canvas = TUBES.config.canvas.drawing;

            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 0 && !TUBES.camera.controls.isRotating) {
                    this.startStroke(e);
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                if (isDrawing) {
                    this.addPoint(e);
                }
            });

            canvas.addEventListener('mouseup', () => {
                if (isDrawing) {
                    this.endStroke();
                }
            });

            canvas.addEventListener('mouseleave', () => {
                if (isDrawing) {
                    this.endStroke();
                }
            });
        },

        startStroke(e) {
            isDrawing = true;
            points = [];
            ctx.clearRect(0, 0, TUBES.config.canvas.drawing.width, TUBES.config.canvas.drawing.height);

            this.addPoint(e);
        },

        addPoint(e) {
            const rect = TUBES.config.canvas.drawing.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const pressure = e.pressure || 0.5;

            points.push({ x, y, pressure });
            this.draw();
        },

        draw() {
            if (points.length < 2) return;

            ctx.clearRect(0, 0, TUBES.config.canvas.drawing.width, TUBES.config.canvas.drawing.height);

            ctx.strokeStyle = '#e94560';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 1; i < points.length; i++) {
                const p1 = points[i - 1];
                const p2 = points[i];

                ctx.beginPath();
                ctx.lineWidth = TUBES.config.settings.singleWidthMode ? 3 : (p1.pressure * 6);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        },

        endStroke() {
            isDrawing = false;

            if (points.length > 2) {
                TUBES.cylinder.createFromStroke(points);
            }

            // Clear canvas after delay
            setTimeout(() => {
                ctx.clearRect(0, 0, TUBES.config.canvas.drawing.width, TUBES.config.canvas.drawing.height);
            }, 100);
        }
    };
})(window.TUBES);
