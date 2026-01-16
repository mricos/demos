export class Renderer {
    constructor(outputElement, statusElement) {
        this.output = outputElement;
        this.status = statusElement;
        this.currentCols = 0;
        this.currentRows = 0;
    }

    render(asciiText) {
        this.output.textContent = asciiText;
    }

    updateStatus(statusText) {
        this.status.textContent = statusText;
    }

    // Resize font to fit columns x rows in available space
    fitToSize(cols, rows) {
        if (cols === this.currentCols && rows === this.currentRows) return;
        this.currentCols = cols;
        this.currentRows = rows;

        const wrapper = this.output.parentElement;
        const availWidth = wrapper.clientWidth;
        const availHeight = wrapper.clientHeight;

        // Monospace char aspect ratio ~0.6 (width/height)
        const charAspect = 0.6;

        // Calculate font size to fit width and height
        const fontByWidth = availWidth / (cols * charAspect);
        const fontByHeight = availHeight / rows;

        // Use the smaller to ensure it fits both dimensions
        const fontSize = Math.floor(Math.min(fontByWidth, fontByHeight));

        this.output.style.fontSize = `${fontSize}px`;
        this.output.style.lineHeight = '1.0';

        // Also update skeleton overlay if present
        const skeleton = document.getElementById('skeleton-overlay');
        if (skeleton) {
            skeleton.style.fontSize = `${fontSize}px`;
            skeleton.style.lineHeight = '1.0';
        }
    }
}
