// Spiking Neural Network for 4-bit Addition
console.log('[App.js] File loading...');

import { LIFNeuronFigure } from './figures/LIFNeuronFigure.js?v=8';

class SpikingNeuron {
    constructor(threshold = 1.0, tau = 20) {
        this.membrane = 0;
        this.threshold = threshold;
        this.tau = tau; // Time constant in ms
        this.lastSpike = -Infinity;
        this.refractoryPeriod = 5; // ms
    }

    update(input, dt = 1) {
        // Leaky integrate-and-fire model
        const decay = Math.exp(-dt / this.tau);
        this.membrane = this.membrane * decay + input;

        // Check for spike
        const timeSinceSpike = Date.now() - this.lastSpike;
        if (this.membrane >= this.threshold && timeSinceSpike > this.refractoryPeriod) {
            this.membrane = 0;
            this.lastSpike = Date.now();
            return 1; // Spike!
        }
        return 0;
    }

    reset() {
        this.membrane = 0;
        this.lastSpike = -Infinity;
    }
}

class SpikingNeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize, learningRate = 0.01) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.outputSize = outputSize;
        this.learningRate = learningRate;

        // Initialize neurons
        this.hiddenNeurons = Array(hiddenSize).fill(0).map(() => new SpikingNeuron());
        this.outputNeurons = Array(outputSize).fill(0).map(() => new SpikingNeuron());

        // Initialize weights randomly
        this.weightsIH = this.initWeights(inputSize, hiddenSize);
        this.weightsHO = this.initWeights(hiddenSize, outputSize);

        // Spike tracking
        this.inputSpikes = Array(inputSize).fill(0);
        this.hiddenSpikes = Array(hiddenSize).fill(0);
        this.outputSpikes = Array(outputSize).fill(0);

        this.totalSpikes = 0;
    }

    initWeights(rows, cols) {
        return Array(rows).fill(0).map(() =>
            Array(cols).fill(0).map(() => (Math.random() - 0.5) * 0.5)
        );
    }

    setThreshold(threshold) {
        this.hiddenNeurons.forEach(n => n.threshold = threshold);
        this.outputNeurons.forEach(n => n.threshold = threshold);
    }

    setTau(tau) {
        this.hiddenNeurons.forEach(n => n.tau = tau);
        this.outputNeurons.forEach(n => n.tau = tau);
    }

    // Convert binary input to spike trains
    encodeTemporal(value, duration = 50) {
        const spikes = [];
        for (let t = 0; t < duration; t++) {
            const spike = value > 0 && Math.random() < value ? 1 : 0;
            spikes.push(spike);
        }
        return spikes;
    }

    // Forward pass with temporal coding
    forward(inputPattern, timeSteps = 50) {
        // Reset neurons
        this.hiddenNeurons.forEach(n => n.reset());
        this.outputNeurons.forEach(n => n.reset());

        const hiddenSpikeCount = Array(this.hiddenSize).fill(0);
        const outputSpikeCount = Array(this.outputSize).fill(0);

        // Encode inputs as spike trains
        const spikeTrains = inputPattern.map(val => this.encodeTemporal(val, timeSteps));

        // Simulate over time
        for (let t = 0; t < timeSteps; t++) {
            // Get current input spikes
            const currentInput = spikeTrains.map(train => train[t]);
            this.inputSpikes = currentInput;

            // Update hidden layer
            for (let h = 0; h < this.hiddenSize; h++) {
                let input = 0;
                for (let i = 0; i < this.inputSize; i++) {
                    input += currentInput[i] * this.weightsIH[i][h];
                }
                const spike = this.hiddenNeurons[h].update(input);
                this.hiddenSpikes[h] = spike;
                hiddenSpikeCount[h] += spike;
                this.totalSpikes += spike;
            }

            // Update output layer
            for (let o = 0; o < this.outputSize; o++) {
                let input = 0;
                for (let h = 0; h < this.hiddenSize; h++) {
                    input += this.hiddenSpikes[h] * this.weightsHO[h][o];
                }
                const spike = this.outputNeurons[o].update(input);
                this.outputSpikes[o] = spike;
                outputSpikeCount[o] += spike;
                this.totalSpikes += spike;
            }
        }

        // Decode output: neuron with most spikes wins
        return outputSpikeCount.map(count => count / timeSteps);
    }

    // STDP-inspired learning rule
    train(inputPattern, target, timeSteps = 50) {
        const output = this.forward(inputPattern, timeSteps);

        // Calculate error
        const error = target.map((t, i) => t - output[i]);
        const loss = error.reduce((sum, e) => sum + e * e, 0) / error.length;

        // Update weights using gradient descent approximation
        // Hidden to Output
        for (let h = 0; h < this.hiddenSize; h++) {
            for (let o = 0; o < this.outputSize; o++) {
                const delta = this.learningRate * error[o] * (this.hiddenNeurons[h].membrane / this.hiddenSize);
                this.weightsHO[h][o] += delta;
            }
        }

        // Input to Hidden
        for (let i = 0; i < this.inputSize; i++) {
            for (let h = 0; h < this.hiddenSize; h++) {
                let outputError = 0;
                for (let o = 0; o < this.outputSize; o++) {
                    outputError += error[o] * this.weightsHO[h][o];
                }
                const delta = this.learningRate * outputError * inputPattern[i];
                this.weightsIH[i][h] += delta;
            }
        }

        return { output, loss };
    }

    reset() {
        this.weightsIH = this.initWeights(this.inputSize, this.hiddenSize);
        this.weightsHO = this.initWeights(this.hiddenSize, this.outputSize);
        this.totalSpikes = 0;
    }
}

// Application State
const app = {
    network: null,
    training: false,
    epoch: 0,
    accuracy: 0,
    avgLoss: 0,
    canvas: null,
    ctx: null,
    animationId: null,
    visualizeMode: false,
    trainingSpeed: 10,
    spikeCount: 0,
    lastSpikeTime: Date.now(),

    init() {
        this.canvas = document.getElementById('networkCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;

        // Create network: 8 inputs (4 bits + 4 bits), 16 hidden, 5 outputs (5-bit result)
        this.network = new SpikingNeuralNetwork(8, 16, 5, 0.01);

        this.setupEventListeners();
        this.drawNetwork();
        this.updateStats();
    },

    setupEventListeners() {
        const fab = document.getElementById('fab');
        const panel = document.getElementById('controlPanel');
        const closeBtn = document.getElementById('closePanel');

        fab.addEventListener('click', () => {
            panel.classList.toggle('active');
            fab.classList.toggle('active');
        });

        closeBtn.addEventListener('click', () => {
            panel.classList.remove('active');
            fab.classList.remove('active');
        });

        document.getElementById('trainBtn').addEventListener('click', () => this.startTraining());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseTraining());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetNetwork());
        document.getElementById('testBtn').addEventListener('click', () => this.testRandom());

        document.getElementById('learningRate').addEventListener('input', (e) => {
            this.network.learningRate = parseFloat(e.target.value);
            document.getElementById('lrValue').textContent = e.target.value;
        });

        document.getElementById('speed').addEventListener('input', (e) => {
            this.trainingSpeed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = e.target.value;
        });

        document.getElementById('threshold').addEventListener('input', (e) => {
            this.network.setThreshold(parseFloat(e.target.value));
            document.getElementById('thresholdValue').textContent = e.target.value;
        });

        document.getElementById('tau').addEventListener('input', (e) => {
            this.network.setTau(parseFloat(e.target.value));
            document.getElementById('tauValue').textContent = e.target.value + ' ms';
        });

        document.getElementById('visualizeMode').addEventListener('change', (e) => {
            this.visualizeMode = e.target.checked;
        });
    },

    numberToBits(num, bits = 4) {
        return Array(bits).fill(0).map((_, i) => (num >> (bits - 1 - i)) & 1);
    },

    bitsToNumber(bits) {
        return bits.reduce((num, bit, i) => num + bit * Math.pow(2, bits.length - 1 - i), 0);
    },

    async startTraining() {
        if (this.training) return;
        this.training = true;
        document.getElementById('trainBtn').disabled = true;

        while (this.training) {
            for (let i = 0; i < this.trainingSpeed; i++) {
                if (!this.training) break;

                // Generate random training example
                const a = Math.floor(Math.random() * 16);
                const b = Math.floor(Math.random() * 16);
                const sum = a + b;

                const inputBits = [...this.numberToBits(a, 4), ...this.numberToBits(b, 4)];
                const targetBits = this.numberToBits(sum, 5);

                const { output, loss } = this.network.train(inputBits, targetBits);

                this.avgLoss = this.avgLoss * 0.99 + loss * 0.01;
                this.epoch++;

                if (this.visualizeMode) {
                    this.displayExample(a, b, sum, output);
                    await this.sleep(100);
                }
            }

            if (!this.visualizeMode) {
                this.testAccuracy();
            }

            this.updateStats();
            this.drawNetwork();
            await this.sleep(this.visualizeMode ? 0 : 16);
        }

        document.getElementById('trainBtn').disabled = false;
    },

    pauseTraining() {
        this.training = false;
    },

    resetNetwork() {
        this.pauseTraining();
        this.network.reset();
        this.epoch = 0;
        this.accuracy = 0;
        this.avgLoss = 0;
        this.spikeCount = 0;
        this.updateStats();
        this.drawNetwork();
    },

    testAccuracy() {
        let correct = 0;
        const tests = 100;

        for (let i = 0; i < tests; i++) {
            const a = Math.floor(Math.random() * 16);
            const b = Math.floor(Math.random() * 16);
            const sum = a + b;

            const inputBits = [...this.numberToBits(a, 4), ...this.numberToBits(b, 4)];
            const output = this.network.forward(inputBits);

            const predictedBits = output.map(o => o > 0.3 ? 1 : 0);
            const predicted = this.bitsToNumber(predictedBits);

            if (predicted === sum) correct++;
        }

        this.accuracy = (correct / tests) * 100;
    },

    async testRandom() {
        const a = Math.floor(Math.random() * 16);
        const b = Math.floor(Math.random() * 16);
        const sum = a + b;

        const inputBits = [...this.numberToBits(a, 4), ...this.numberToBits(b, 4)];
        const output = this.network.forward(inputBits);

        this.displayExample(a, b, sum, output);
        this.drawNetwork();
    },

    displayExample(a, b, expected, output) {
        const predictedBits = output.map(o => o > 0.3 ? 1 : 0);
        const predicted = this.bitsToNumber(predictedBits);

        this.updateBits('inputA', this.numberToBits(a, 4));
        this.updateBits('inputB', this.numberToBits(b, 4));
        this.updateBits('output', predictedBits);

        document.getElementById('decimalA').textContent = a;
        document.getElementById('decimalB').textContent = b;
        document.getElementById('decimalOut').textContent = predicted;
        document.getElementById('expected').textContent = expected;
    },

    updateBits(elementId, bits) {
        const container = document.getElementById(elementId);
        const bitElements = container.querySelectorAll('.bit');
        bits.forEach((bit, i) => {
            bitElements[i].textContent = bit;
            if (bit === 1) {
                bitElements[i].classList.add('active');
            } else {
                bitElements[i].classList.remove('active');
            }
        });
    },

    updateStats() {
        // Update main stats area
        document.getElementById('epoch').textContent = this.epoch;
        document.getElementById('accuracy').textContent = this.accuracy.toFixed(1) + '%';
        document.getElementById('loss').textContent = this.avgLoss.toFixed(3);

        const now = Date.now();
        const timeDiff = (now - this.lastSpikeTime) / 1000;
        const spikeRate = this.network.totalSpikes / Math.max(timeDiff, 1);
        document.getElementById('spikeRate').textContent = Math.floor(spikeRate);

        // Update header pills
        const epochHeader = document.getElementById('epoch-header');
        const accuracyHeader = document.getElementById('accuracy-header');
        const lossHeader = document.getElementById('loss-header');
        if (epochHeader) epochHeader.textContent = this.epoch;
        if (accuracyHeader) accuracyHeader.textContent = this.accuracy.toFixed(1) + '%';
        if (lossHeader) lossHeader.textContent = this.avgLoss.toFixed(3);

        this.lastSpikeTime = now;
        this.network.totalSpikes = 0;
    },

    drawNetwork() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.clearRect(0, 0, width, height);

        const layers = [
            { neurons: this.network.inputSize, x: 50 },
            { neurons: this.network.hiddenSize, x: width / 2 },
            { neurons: this.network.outputSize, x: width - 50 }
        ];

        // Draw connections
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        // Input to Hidden
        for (let i = 0; i < this.network.inputSize; i++) {
            const y1 = (height / (this.network.inputSize + 1)) * (i + 1);
            for (let h = 0; h < this.network.hiddenSize; h++) {
                const y2 = (height / (this.network.hiddenSize + 1)) * (h + 1);
                const weight = this.network.weightsIH[i][h];
                ctx.strokeStyle = weight > 0 ? `rgba(76, 175, 80, ${Math.abs(weight)})` : `rgba(244, 67, 54, ${Math.abs(weight)})`;
                ctx.beginPath();
                ctx.moveTo(layers[0].x, y1);
                ctx.lineTo(layers[1].x, y2);
                ctx.stroke();
            }
        }

        // Hidden to Output
        for (let h = 0; h < this.network.hiddenSize; h++) {
            const y1 = (height / (this.network.hiddenSize + 1)) * (h + 1);
            for (let o = 0; o < this.network.outputSize; o++) {
                const y2 = (height / (this.network.outputSize + 1)) * (o + 1);
                const weight = this.network.weightsHO[h][o];
                ctx.strokeStyle = weight > 0 ? `rgba(76, 175, 80, ${Math.abs(weight) * 2})` : `rgba(244, 67, 54, ${Math.abs(weight) * 2})`;
                ctx.beginPath();
                ctx.moveTo(layers[1].x, y1);
                ctx.lineTo(layers[2].x, y2);
                ctx.stroke();
            }
        }

        // Draw neurons
        layers.forEach((layer, layerIdx) => {
            for (let i = 0; i < layer.neurons; i++) {
                const y = (height / (layer.neurons + 1)) * (i + 1);

                let membrane = 0;
                if (layerIdx === 1) {
                    membrane = this.network.hiddenNeurons[i].membrane;
                } else if (layerIdx === 2) {
                    membrane = this.network.outputNeurons[i].membrane;
                }

                const intensity = Math.min(1, membrane / 2);
                ctx.fillStyle = `rgba(33, 150, 243, ${0.3 + intensity * 0.7})`;
                ctx.beginPath();
                ctx.arc(layer.x, y, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#1976D2';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Input (8)', layers[0].x, height - 10);
        ctx.fillText('Hidden (16)', layers[1].x, height - 10);
        ctx.fillText('Output (5)', layers[2].x, height - 10);
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Documentation Modal functionality with fetch and event protocol
const docsModal = {
    isLoaded: false,

    async init() {
        try {
            console.log('[DocsModal] Initializing...');
            console.log('[DocsModal] Looking for elements...');

            const docsFab = document.getElementById('docsFab');
            const modal = document.getElementById('docsModal');
            const closeBtn = document.getElementById('closeDocsModal');

            console.log('[DocsModal] Found:', {
                docsFab: !!docsFab,
                modal: !!modal,
                closeBtn: !!closeBtn
            });

            if (!docsFab || !modal || !closeBtn) {
                console.error('[DocsModal] Required elements not found:', { docsFab, modal, closeBtn });
                return;
            }

            console.log('[DocsModal] All elements found, setting up listeners...');

            // Open modal and load docs
            docsFab.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('[DocsModal] Opening modal...');
                modal.classList.add('active');

                if (!this.isLoaded) {
                    await this.loadDocs();
                }
            });
            console.log('[DocsModal] ✓ FAB listener attached');

            // Close modal
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('[DocsModal] Close button clicked');
                modal.classList.remove('active');
            });
            console.log('[DocsModal] ✓ Close button listener attached');

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('[DocsModal] Backdrop clicked');
                    modal.classList.remove('active');
                }
            });
            console.log('[DocsModal] ✓ Backdrop listener attached');

            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    console.log('[DocsModal] Escape key pressed');
                    modal.classList.remove('active');
                }
            });
            console.log('[DocsModal] ✓ Escape key listener attached');

            console.log('[DocsModal] ✅ Initialization complete');
        } catch (error) {
            console.error('[DocsModal] ❌ Initialization failed:', error);
            console.error('[DocsModal] Stack:', error.stack);
        }
    },

    async loadDocs() {
        console.log('[DocsModal] Loading documentation...');
        const container = document.getElementById('docsContainer');

        try {
            const response = await fetch('snn-docs.html');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();
            container.innerHTML = html;
            this.isLoaded = true;

            console.log('[DocsModal] Documentation loaded successfully');

            // Setup tabs
            this.setupTabs();

            // Setup interactive elements
            this.setupInteractiveElements();

            // Render math
            setTimeout(() => this.renderMath(), 100);

            // Start animations - delay to ensure DOM is ready
            setTimeout(() => {
                console.log('[DocsModal] Starting animations...');
                this.startNeuronPulseAnimation();
                this.startSpikeTrainAnimation();
            }, 300);

        } catch (error) {
            console.error('[DocsModal] Failed to load docs:', error);
            container.innerHTML = '<p style="color: var(--accent-2); padding: 20px;">Failed to load documentation. Please refresh the page.</p>';
        }
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.docs-tab');
        console.log('[DocsModal] Setting up tabs:', tabs.length);

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                console.log('[DocsModal] Tab clicked:', targetTab);

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update active content
                document.querySelectorAll('.docs-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${targetTab}-tab`).classList.add('active');

                // Re-render math for new tab
                this.renderMath();
            });
        });
    },

    setupInteractiveElements() {
        const paramSpans = document.querySelectorAll('.param-set');
        console.log('[DocsModal] Setting up param-set elements:', paramSpans.length);

        paramSpans.forEach(span => {
            span.addEventListener('click', () => {
                const param = span.dataset.param;
                const value = span.dataset.value;

                console.log('[DocProtocol] Param clicked:', param, '=', value);
                this.setParam(param, value);

                // Visual feedback
                span.style.background = 'rgba(74,163,255,.35)';
                setTimeout(() => {
                    span.style.background = '';
                }, 200);
            });
        });

        // Setup Controls tab interactive elements
        this.setupControlsTab();
    },

    setupControlsTab() {
        // Wire up buttons to main app functions
        const docTrainBtn = document.getElementById('docTrainBtn');
        const docPauseBtn = document.getElementById('docPauseBtn');
        const docResetBtn = document.getElementById('docResetBtn');
        const docTestBtn = document.getElementById('docTestBtn');

        if (docTrainBtn) docTrainBtn.addEventListener('click', () => app.startTraining());
        if (docPauseBtn) docPauseBtn.addEventListener('click', () => app.pauseTraining());
        if (docResetBtn) docResetBtn.addEventListener('click', () => app.resetNetwork());
        if (docTestBtn) docTestBtn.addEventListener('click', () => app.testRandom());

        // Sync sliders with main controls
        const docLearningRate = document.getElementById('docLearningRate');
        const docSpeed = document.getElementById('docSpeed');
        const docThreshold = document.getElementById('docThreshold');
        const docTau = document.getElementById('docTau');
        const docVisualizeMode = document.getElementById('docVisualizeMode');

        if (docLearningRate) {
            docLearningRate.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                app.network.learningRate = val;
                document.getElementById('docLrValue').textContent = val.toFixed(3);
                document.getElementById('learningRate').value = val;
                document.getElementById('lrValue').textContent = val.toFixed(3);
            });
        }

        if (docSpeed) {
            docSpeed.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                app.trainingSpeed = val;
                document.getElementById('docSpeedValue').textContent = val;
                document.getElementById('speed').value = val;
                document.getElementById('speedValue').textContent = val;
            });
        }

        if (docThreshold) {
            docThreshold.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                app.network.setThreshold(val);
                document.getElementById('docThresholdValue').textContent = val.toFixed(1);
                document.getElementById('threshold').value = val;
                document.getElementById('thresholdValue').textContent = val.toFixed(1);
                this.updateThresholdVisualization(val);
            });
        }

        if (docTau) {
            docTau.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                app.network.setTau(val);
                document.getElementById('docTauValue').textContent = val + ' ms';
                document.getElementById('tau').value = val;
                document.getElementById('tauValue').textContent = val + ' ms';
            });
        }

        if (docVisualizeMode) {
            docVisualizeMode.addEventListener('change', (e) => {
                app.visualizeMode = e.target.checked;
                document.getElementById('visualizeMode').checked = e.target.checked;
            });
        }

        // Initialize threshold visualization
        this.initThresholdVisualization();
    },

    initThresholdVisualization() {
        const canvas = document.getElementById('thresholdVisualization');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = 200 * dpr;
        ctx.scale(dpr, dpr);

        this.thresholdCanvas = { canvas, ctx };
        this.updateThresholdVisualization(1.0);
    },

    updateThresholdVisualization(threshold) {
        if (!this.thresholdCanvas) return;

        const { ctx, canvas } = this.thresholdCanvas;
        const width = canvas.offsetWidth;
        const height = 200;

        ctx.fillStyle = '#0c1219';
        ctx.fillRect(0, 0, width, height);

        // Draw axes
        ctx.strokeStyle = '#9fb2c6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 20);
        ctx.lineTo(40, height - 30);
        ctx.lineTo(width - 20, height - 30);
        ctx.stroke();

        // Draw threshold line
        const thresholdY = height - 30 - (threshold / 2.0) * (height - 50);
        ctx.strokeStyle = '#f7b955';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(40, thresholdY);
        ctx.lineTo(width - 20, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f7b955';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Vth=${threshold.toFixed(1)}`, width - 25, thresholdY - 5);

        // Draw membrane potential curve
        ctx.strokeStyle = '#4aa3ff';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const timeSteps = 100;
        let membrane = 0;
        const input = 0.15;
        const tau = 20;

        for (let t = 0; t < timeSteps; t++) {
            const x = 40 + (t / timeSteps) * (width - 60);
            membrane = membrane * Math.exp(-1 / tau) + input;
            const y = height - 30 - (membrane / 2.0) * (height - 50);

            if (t === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Check if spike occurs
            if (membrane >= threshold && !this.spikeDrawn) {
                this.spikeDrawn = true;

                // Draw spike
                ctx.stroke();
                ctx.strokeStyle = '#ff6b6b';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, 20);
                ctx.stroke();

                // Draw spike marker
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.arc(x, 20, 4, 0, Math.PI * 2);
                ctx.fill();

                // Reset
                ctx.strokeStyle = '#4aa3ff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                membrane = 0;
            }
        }
        ctx.stroke();
        this.spikeDrawn = false;

        // Labels
        ctx.fillStyle = '#9fb2c6';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Time', width / 2, height - 5);

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Membrane Potential', 0, 0);
        ctx.restore();
    },

    // Protocol: Set parameter from documentation
    setParam(param, value) {
        const val = parseFloat(value);
        const el = document.getElementById(param);

        if (!el) {
            console.warn('[DocProtocol] Element not found:', param);
            return;
        }

        // Update slider
        el.value = val;

        // Update value display
        const valEl = document.getElementById(param + 'Value');
        if (valEl) {
            if (param === 'tau') {
                valEl.textContent = val + ' ms';
            } else {
                valEl.textContent = val;
            }
        }

        // Update network based on parameter
        if (param === 'learningRate') {
            app.network.learningRate = val;
        } else if (param === 'threshold') {
            app.network.inputNeurons.concat(app.network.hiddenNeurons, app.network.outputNeurons)
                .forEach(n => n.threshold = val);
        } else if (param === 'tau') {
            app.network.inputNeurons.concat(app.network.hiddenNeurons, app.network.outputNeurons)
                .forEach(n => n.tau = val);
        } else if (param === 'speed') {
            app.speed = val;
        }

        console.log('[DocProtocol] Parameter set:', param, '=', val);
    },

    renderMath() {
        if (window.renderMathInElement) {
            const content = document.querySelector('.docs-tab-content.active');
            if (content) {
                renderMathInElement(content, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '\\(', right: '\\)', display: false}
                    ],
                    throwOnError: false
                });
            }
        }
    },

    startNeuronPulseAnimation() {
        console.log('[DocsModal] Starting neuron pulse animation');

        // Create and start the animation using the new ActiveFigure API
        if (!this.neuronAnimation) {
            this.neuronAnimation = new LIFNeuronFigure({
                containerId: 'neuronPulseCanvas',
                width: 800,
                height: 500,  // Reduced to match new CSS
                speed: 0.1,  // SLOWED DOWN from 0.5 to 0.1
                fps: 30,
                views: {
                    biological: true,
                    diagram: false,  // Hide diagram for cleaner view
                    trace: false,
                    spikes: false,
                    combined: true,  // Show combined trace
                    ttfs: false
                },
                modelConfig: {
                    threshold: 1.0,
                    tau: 20,
                    input: 0.08
                },
                ttfs: {
                    enabled: false,
                    windowDuration: 100,
                    threshold: 50
                }
            });

            // Initialize and start
            this.neuronAnimation.init();

            // Listen for spike events
            this.neuronAnimation.on('spike', (data) => {
                console.log('[NeuronAnimation] Spike detected at t =', data.time.toFixed(2), 'ms');
            });

            // Listen for bit detection
            this.neuronAnimation.on('bitdetected', (data) => {
                console.log('[NeuronAnimation] Bit detected:', data.bit, 'at t =', data.time.toFixed(2), 'ms');
            });

            // Setup control buttons - DELAY to ensure DOM is ready
            setTimeout(() => {
                this.setupNeuronControls();
            }, 100);
        }

        // Start PAUSED so user can step through
        this.neuronAnimation.pause();
    },

    setupNeuronControls() {
        const playPauseBtn = document.getElementById('neuronPlayPause');
        const stepBackBtn = document.getElementById('neuronStepBack');
        const stepForwardBtn = document.getElementById('neuronStepForward');
        const resetBtn = document.getElementById('neuronReset');
        const timeDisplay = document.getElementById('neuronTimeDisplay');

        console.log('[NeuronControls] Setting up controls', { playPauseBtn, stepBackBtn, stepForwardBtn, resetBtn, timeDisplay });

        if (!playPauseBtn) {
            console.error('[NeuronControls] Play/Pause button not found!');
            return;
        }

        // Play/Pause
        playPauseBtn.addEventListener('click', () => {
            if (this.neuronAnimation.isPlaying) {
                this.neuronAnimation.pause();
                playPauseBtn.textContent = '▶ Play';
                playPauseBtn.classList.remove('active');
            } else {
                this.neuronAnimation.play();
                playPauseBtn.textContent = '⏸ Pause';
                playPauseBtn.classList.add('active');
            }
        });

        // Step Back
        if (stepBackBtn) {
            stepBackBtn.addEventListener('click', () => {
                const currentTime = this.neuronAnimation.time;
                const newTime = Math.max(0, currentTime - 10); // Step back 10ms
                this.neuronAnimation.seek(newTime);
            });
        }

        // Step Forward
        if (stepForwardBtn) {
            stepForwardBtn.addEventListener('click', () => {
                const currentTime = this.neuronAnimation.time;
                this.neuronAnimation.seek(currentTime + 10); // Step forward 10ms
            });
        }

        // Reset
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.neuronAnimation.reset();
                this.neuronAnimation.pause();
                playPauseBtn.textContent = '▶ Play';
                playPauseBtn.classList.remove('active');
            });
        }

        // Update time display and stage highlighting
        let stageInfoElementsChecked = false;
        const updateTimeDisplay = () => {
            if (timeDisplay && this.neuronAnimation) {
                timeDisplay.textContent = `t = ${this.neuronAnimation.time.toFixed(1)} ms`;

                // Check for stage-info elements (only log once)
                const stageInfoElements = document.querySelectorAll('.stage-info');
                if (!stageInfoElementsChecked) {
                    console.log('[NeuronControls] Found stage-info elements:', stageInfoElements.length);
                    stageInfoElementsChecked = true;
                }

                // Update stage highlighting
                const timeSinceSpike = this.neuronAnimation.time - (this.neuronAnimation.model?.lastSpike || 0);
                const stage = Math.floor(timeSinceSpike / 25);

                if (timeSinceSpike >= 0 && timeSinceSpike < 200 && stageInfoElements.length > 0) {
                    // Highlight active stage
                    stageInfoElements.forEach((el, idx) => {
                        if (idx === stage) {
                            el.classList.add('active');
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        } else {
                            el.classList.remove('active');
                        }
                    });
                } else if (stageInfoElements.length > 0) {
                    // No active stage
                    stageInfoElements.forEach(el => el.classList.remove('active'));
                }
            }
            requestAnimationFrame(updateTimeDisplay);
        };
        updateTimeDisplay();
    },

    startSpikeTrainAnimation() {
        const canvas = document.getElementById('spikeTrainCanvas');
        const toggleBtn = document.getElementById('spikeTrainToggle');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        let time = 0;
        let isPlaying = false;
        let animationId = null;

        const bits = [
            { value: 1, label: 'Bit = 1', spikes: [] },
            { value: 0, label: 'Bit = 0', spikes: [] }
        ];

        // Generate spike trains
        const generateSpikes = () => {
            bits[0].spikes = [];
            bits[1].spikes = [];
            for (let t = 0; t < 50; t++) {
                // Bit 1: high probability early on
                if (Math.random() < 0.8 && t < 30) bits[0].spikes.push(t);
                // Bit 0: low probability, late spikes
                if (Math.random() < 0.15 && t > 35) bits[1].spikes.push(t);
            }
        };

        generateSpikes();

        const draw = () => {
            ctx.fillStyle = '#0c1219';
            ctx.fillRect(0, 0, width, height);

            // Draw time axis
            ctx.strokeStyle = '#1a2636';
            ctx.lineWidth = 1;
            for (let t = 0; t <= 50; t += 10) {
                const x = 80 + (t / 50) * (width - 120);
                ctx.beginPath();
                ctx.moveTo(x, 30);
                ctx.lineTo(x, height - 20);
                ctx.stroke();

                ctx.fillStyle = '#9fb2c6';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(t + 'ms', x, height - 5);
            }

            // Draw spike trains
            bits.forEach((bit, idx) => {
                const y = 50 + idx * 80;

                // Label
                ctx.fillStyle = '#9fb2c6';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(bit.label, 70, y + 5);

                // Horizontal line
                ctx.strokeStyle = '#1a2636';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(80, y);
                ctx.lineTo(width - 40, y);
                ctx.stroke();

                // Draw spikes
                bit.spikes.forEach(spikeTime => {
                    if (spikeTime <= time) {
                        const x = 80 + (spikeTime / 50) * (width - 120);
                        const age = time - spikeTime;
                        const alpha = Math.max(0, 1 - age / 10);

                        ctx.strokeStyle = bit.value === 1 ? `rgba(74, 163, 255, ${alpha})` : `rgba(159, 178, 198, ${alpha})`;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(x, y - 15);
                        ctx.lineTo(x, y + 15);
                        ctx.stroke();

                        // Spike marker
                        ctx.fillStyle = bit.value === 1 ? `rgba(74, 163, 255, ${alpha})` : `rgba(159, 178, 198, ${alpha})`;
                        ctx.beginPath();
                        ctx.arc(x, y - 15, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });

                // Current time indicator
                const currentX = 80 + (time / 50) * (width - 120);
                ctx.strokeStyle = '#f7b955';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(currentX, 30);
                ctx.lineTo(currentX, height - 20);
                ctx.stroke();
                ctx.setLineDash([]);
            });

            if (isPlaying) {
                time += 0.5;
                if (time > 55) {
                    time = 0;
                    generateSpikes();
                }
            }
        };

        const animate = () => {
            draw();
            if (isPlaying) {
                animationId = requestAnimationFrame(animate);
            }
        };

        // Toggle button handler
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isPlaying = !isPlaying;
                if (isPlaying) {
                    toggleBtn.textContent = '⏸ Pause';
                    animate();
                } else {
                    toggleBtn.textContent = '▶ Play Animation';
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                    }
                }
            });
        }

        // Draw initial paused frame
        draw();
    }
};

// Initialize on load
window.addEventListener('load', async () => {
    console.log('[App] Page loaded, initializing...');
    app.init();
    await docsModal.init();
    console.log('[App] All systems ready');
});
