export class Renderer {
    constructor(outputElement, statusElement) {
        this.output = outputElement;
        this.status = statusElement;
    }

    render(asciiText) {
        this.output.textContent = asciiText;
    }

    updateStatus(statusText) {
        this.status.textContent = statusText;
    }
}
