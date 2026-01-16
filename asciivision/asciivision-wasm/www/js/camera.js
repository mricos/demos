export class Camera {
    constructor(width = 1280, height = 720) {
        this.width = width;
        this.height = height;
        this.video = document.createElement('video');
        this.canvas = document.createElement('canvas');
        this.ctx = null;
        this.stream = null;
    }

    async start() {
        // Check for secure context (HTTPS or localhost)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera requires HTTPS. Use localhost or enable HTTPS.');
        }

        this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: this.width },
                height: { ideal: this.height },
                facingMode: 'user'
            },
            audio: false
        });

        this.video.srcObject = this.stream;
        this.video.play();

        // Wait for video to be ready
        await new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.ctx = this.canvas.getContext('2d', {
                    willReadFrequently: true
                });
                resolve();
            };
        });
    }

    getFrame() {
        if (!this.ctx || this.video.readyState < 2) return null;

        this.ctx.drawImage(this.video, 0, 0);
        return this.ctx.getImageData(
            0, 0,
            this.canvas.width,
            this.canvas.height
        );
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}
