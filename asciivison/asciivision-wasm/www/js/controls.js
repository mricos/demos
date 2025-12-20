export function setupControls(app) {
    document.addEventListener('keydown', (e) => {
        const processor = app.processor;
        if (!processor) return;

        switch (e.key) {
            case 'b':
                processor.set_brightness(processor.get_brightness() - 0.1);
                break;
            case 'B':
                processor.set_brightness(processor.get_brightness() + 0.1);
                break;
            case 'c':
                processor.set_contrast(processor.get_contrast() - 0.1);
                break;
            case 'C':
                processor.set_contrast(processor.get_contrast() + 0.1);
                break;
            case 'r':
            case 'R':
                processor.toggle_ramp();
                break;
            case 'i':
            case 'I':
                processor.toggle_invert();
                break;
            case '+':
            case '=':
                app.outputWidth = Math.min(200, Math.floor(app.outputWidth * 1.2));
                app.outputHeight = Math.min(100, Math.floor(app.outputHeight * 1.2));
                break;
            case '-':
            case '_':
                app.outputWidth = Math.max(40, Math.floor(app.outputWidth * 0.8));
                app.outputHeight = Math.max(20, Math.floor(app.outputHeight * 0.8));
                break;
            case '0':
                processor.reset();
                app.outputWidth = 120;
                app.outputHeight = 40;
                break;
            case 'h':
            case 'H':
                // Toggle hand tracking
                if (app.toggleHandTracking) {
                    const enabled = app.toggleHandTracking();
                    console.log('Hand tracking:', enabled ? 'ON' : 'OFF');
                }
                break;
            case 't':
            case 'T':
                // Toggle broadcast to controldeck
                if (app.toggleBroadcast) {
                    const enabled = app.toggleBroadcast();
                    console.log('Broadcast:', enabled ? 'ON' : 'OFF');
                }
                break;
            case 'q':
            case 'Escape':
                app.stop();
                break;
        }
    });
}
