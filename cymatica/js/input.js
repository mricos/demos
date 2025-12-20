// CYMATICA.input - Mouse, Touch, Keyboard Input
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const $ = (sel) => document.querySelector(sel);

    function init() {
        const viewport = $('#viewport');
        if (!viewport) return;

        // Prevent context menu on right-click
        viewport.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse drag rotation (left) / pan (right)
        viewport.addEventListener('mousedown', (e) => {
            state.lastMouse = { x: e.clientX, y: e.clientY };
            if (e.button === 0) {
                state.isDragging = true;
                viewport.style.cursor = 'grabbing';
            } else if (e.button === 2) {
                state.isPanning = true;
                viewport.style.cursor = 'move';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (state.isDragging) {
                const dx = (e.clientX - state.lastMouse.x) * state.sensitivity;
                const dy = (e.clientY - state.lastMouse.y) * state.sensitivity;
                state.targetRotation.y += dx;
                state.targetRotation.x += dy;
                state.lastMouse = { x: e.clientX, y: e.clientY };
            } else if (state.isPanning) {
                const dx = e.clientX - state.lastMouse.x;
                const dy = e.clientY - state.lastMouse.y;
                state.targetPanX += dx;
                state.targetPanY += dy;
                state.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mouseup', () => {
            state.isDragging = false;
            state.isPanning = false;
            $('#viewport').style.cursor = 'grab';
        });

        // Scroll wheel zoom
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -e.deltaY * state.zoomSpeed;
            state.targetZoom = Math.max(state.minZoom,
                Math.min(state.maxZoom, state.targetZoom + delta * state.targetZoom));
            CYMATICA.events.publish('zoom:changed', state.targetZoom);
        }, { passive: false });

        // Touch support
        let lastPinchCenter = { x: 0, y: 0 };

        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                state.isDragging = true;
                state.isPinching = false;
                state.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                state.isDragging = false;
                state.isPinching = true;
                state.lastPinchDist = getPinchDistance(e.touches);
                lastPinchCenter = getPinchCenter(e.touches);
            }
        });

        viewport.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (state.isPinching && e.touches.length === 2) {
                // Pinch zoom
                const dist = getPinchDistance(e.touches);
                const delta = (dist - state.lastPinchDist) * 0.01;
                state.targetZoom = Math.max(state.minZoom,
                    Math.min(state.maxZoom, state.targetZoom + delta));
                state.lastPinchDist = dist;

                // Two-finger pan
                const center = getPinchCenter(e.touches);
                state.targetPanX += center.x - lastPinchCenter.x;
                state.targetPanY += center.y - lastPinchCenter.y;
                lastPinchCenter = center;
            } else if (state.isDragging && e.touches.length === 1) {
                // Drag rotation
                const dx = (e.touches[0].clientX - state.lastMouse.x) * state.sensitivity;
                const dy = (e.touches[0].clientY - state.lastMouse.y) * state.sensitivity;
                state.targetRotation.y += dx;
                state.targetRotation.x += dy;
                state.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, { passive: false });

        viewport.addEventListener('touchend', () => {
            state.isDragging = false;
            state.isPinching = false;
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    state.animating = !state.animating;
                    $('#toggle-animation')?.classList.toggle('active', state.animating);
                    CYMATICA.events.publish('animation:toggled', state.animating);
                    break;
                case 'Escape':
                    $('#side-panel')?.classList.toggle('hidden');
                    break;
                case 'r':
                case 'R':
                    CYMATICA.state.reset();
                    break;
                case 'd':
                case 'D':
                    state.drawOn = !state.drawOn;
                    state.drawProgress = 0;
                    $('#toggle-drawon')?.classList.toggle('active', state.drawOn);
                    break;
                case '0':
                    CYMATICA.state.reset();
                    break;
            }
        });

        // Set default cursor
        viewport.style.cursor = 'grab';
    }

    function getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getPinchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    CYMATICA.input = { init };
})(window.CYMATICA);
