/**
 * Neuron Pulse Animation - Leaky Integrate-and-Fire Model Visualization
 *
 * This module provides an animated visualization of a biological neuron showing:
 * - Dendrites with neurotransmitter input
 * - Soma (cell body) with membrane potential integration
 * - Axon with voltage-gated ion channels
 * - Spike train temporal output
 */

export class NeuronPulseAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`[NeuronPulseAnimation] Canvas not found: ${canvasId}`);
            return;
        }

        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Animation state
        this.time = 0;
        this.membrane = 0;
        this.lastSpike = -1000;
        this.isRunning = false;
        this.isPaused = true; // Start paused
        this.animationId = null;
        this.lastFrameTime = 0;
        this.speed = 0; // 0 = paused, 1 = max speed

        // LIF Model parameters
        this.threshold = 1.0;
        this.tau = 20; // ms
        this.input = 0.08; // Input current

        // Visual parameters
        this.frameRate = 30; // FPS
        this.frameDelay = 1000 / this.frameRate;

        // Spike history for spike train
        this.spikeHistory = [];

        // TTFS encoding window parameters
        this.encodingWindowDuration = 100; // ms
        this.ttfsThreshold = 50; // ms - early spike threshold
        this.encodingWindowStart = 0;
        this.detectedBit = null; // null, 0, or 1

        // Temporal visualization parameters
        // NOW is at the LEFT edge where spikes emerge, time flows left→right
        this.integrationWindowDuration = 40; // ms - neural integration window at left edge
        this.timeWindowDisplay = 300; // ms - total time visible on spike train

        // Color scheme - consistent variable coloring throughout
        this.colors = {
            background: '#0c1219',
            neurotransmitter: '#29d398',
            calcium: '#4aa3ff',
            soma: '#4aa3ff',
            somaText: '#dbe7f3',
            sodium: '#ff6b6b',           // Red for Na⁺ and spikes
            potassium: '#4aa3ff',
            threshold: '#f7b955',        // Yellow/gold for Vth
            membrane: '#4aa3ff',         // Blue for V (voltage/membrane potential)
            tau: '#9fb2c6',              // Gray-blue for τ
            axon: '#1a2636',
            dendrite: '#1a2636',
            label: '#9fb2c6',
            infoBox: 'rgba(15, 21, 31, 0.85)',
            infoBoxBorder: 'rgba(74, 163, 255, 0.4)',

            // Bit detector colors (tertiary blends)
            bit0: '#9fb2c6',             // Gray (no spike)
            bit1: '#29d398',             // Green (early spike)
            bit0Uncertain: '#7a8fa3',    // Darker gray-blue (leaning toward 0)
            bit1Uncertain: '#52c9a0',    // Yellow-green (leaning toward 1)
            bitDetectorText: 'rgba(219, 231, 243, 0.9)'  // Text opacity token
        };

        this.setupCanvas();
        this.createSpeedControl();
        this.createBitEncodingButtons();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.min(rect.width || this.canvas.offsetWidth || 800, 800);
        const height = 900; // MASSIVE SPACE! From 400 → 900 (+125%!)

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);

        this.width = width;
        this.height = height;

        console.log('[NeuronPulseAnimation] Canvas initialized:', width, 'x', height);
    }

    createSpeedControl() {
        // Create slider control above canvas
        const container = this.canvas.parentElement;
        const controlDiv = document.createElement('div');
        controlDiv.className = 'neuron-speed-control';
        controlDiv.style.cssText = `
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            background: rgba(15, 21, 31, 0.6);
            border-radius: 4px;
        `;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = '0';
        slider.style.cssText = `
            flex: 1;
            -webkit-appearance: none;
            appearance: none;
            height: 4px;
            background: linear-gradient(to right, #1a2636 0%, #4aa3ff 100%);
            outline: none;
            border-radius: 2px;
        `;

        // Style the slider thumb
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .neuron-speed-control input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                background: #4aa3ff;
                cursor: pointer;
                border-radius: 50%;
                border: 2px solid #0c1219;
            }
            .neuron-speed-control input[type="range"]::-moz-range-thumb {
                width: 14px;
                height: 14px;
                background: #4aa3ff;
                cursor: pointer;
                border-radius: 50%;
                border: 2px solid #0c1219;
            }
        `;
        document.head.appendChild(styleSheet);

        slider.addEventListener('input', (e) => {
            this.speed = parseFloat(e.target.value) / 100;
            this.isPaused = this.speed === 0;
        });

        controlDiv.appendChild(slider);
        container.insertBefore(controlDiv, this.canvas);
    }

    createBitEncodingButtons() {
        // Create buttons BELOW canvas (after neuron section) to demonstrate binary encoding
        const container = this.canvas.parentElement;
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'neuron-bit-encoding';
        buttonDiv.style.cssText = `
            margin-top: 12px;
            margin-bottom: 12px;
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 10px 14px;
            background: rgba(15, 21, 31, 0.6);
            border-radius: 4px;
            justify-content: flex-start;
            max-width: 48%;
        `;

        // Label
        const label = document.createElement('span');
        label.textContent = 'Input Encoding:';
        label.style.cssText = `
            color: #9fb2c6;
            font-size: 11px;
            font-weight: 600;
        `;
        buttonDiv.appendChild(label);

        // Three preset buttons for different input patterns
        const presets = [
            { name: 'Bit 0', input: 0.0, speed: 0.0, desc: 'No input (pause simulation)' },
            { name: 'Bit 0.5', input: 0.05, speed: 0.3, desc: 'Medium input (slow spike)' },
            { name: 'Bit 1', input: 0.15, speed: 0.6, desc: 'Strong input (fast spike)' }
        ];

        presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.textContent = preset.name;
            btn.title = preset.desc;
            btn.style.cssText = `
                padding: 7px 16px;
                background: rgba(74, 163, 255, 0.15);
                border: 1px solid rgba(74, 163, 255, 0.3);
                color: #4aa3ff;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.2s;
            `;

            btn.addEventListener('mouseover', () => {
                btn.style.background = 'rgba(74, 163, 255, 0.25)';
                btn.style.borderColor = 'rgba(74, 163, 255, 0.5)';
            });

            btn.addEventListener('mouseout', () => {
                btn.style.background = 'rgba(74, 163, 255, 0.15)';
                btn.style.borderColor = 'rgba(74, 163, 255, 0.3)';
            });

            btn.addEventListener('click', () => {
                this.input = preset.input;
                this.speed = preset.speed;
                this.isPaused = this.speed === 0;

                // Reset for new encoding window
                this.encodingWindowStart = this.time;
                this.detectedBit = null;

                // Update speed slider to match
                const slider = document.querySelector('.neuron-speed-control input');
                if (slider) {
                    slider.value = preset.speed * 100;
                }

                // Visual feedback
                btn.style.background = 'rgba(74, 163, 255, 0.4)';
                setTimeout(() => {
                    btn.style.background = 'rgba(74, 163, 255, 0.15)';
                }, 200);
            });

            buttonDiv.appendChild(btn);
        });

        container.appendChild(buttonDiv);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[NeuronPulseAnimation] Starting animation');
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        console.log('[NeuronPulseAnimation] Stopped');
    }

    animate(currentTime = 0) {
        // Throttle to desired frame rate
        if (currentTime - this.lastFrameTime < this.frameDelay) {
            this.animationId = requestAnimationFrame((t) => this.animate(t));
            return;
        }
        this.lastFrameTime = currentTime;

        this.draw();
        this.updateState();

        if (this.isRunning) {
            this.animationId = requestAnimationFrame((t) => this.animate(t));
        }
    }

    updateState() {
        if (this.isPaused) return;

        const timeStep = 0.5 * this.speed;

        // Update membrane potential using LIF model with faster rise
        // Increase input effect by 1.3x to make accumulation 30% faster
        this.membrane = this.membrane * Math.exp(-1 / this.tau) + (this.input * 1.3);

        // Check for spike
        if (this.membrane >= this.threshold) {
            this.membrane = 0;
            this.lastSpike = this.time;
            this.spikeHistory.push(this.time);
        }

        // Cleanup old spikes (keep last 300ms worth)
        this.spikeHistory = this.spikeHistory.filter(t => this.time - t < 300);

        this.time += timeStep;
    }

    draw() {
        const { ctx, width, height } = this;

        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, width, height);

        // THREE ROW LAYOUT - each section gets full width
        const padding = 40;
        const rowGap = 60;

        // ROW 1: Neuron animation (full width)
        const row1Y = padding;
        const row1Height = 280;
        this.drawNeuron(row1Y, width, row1Height);

        // ROW 2: LIF diagram + Live membrane trace (two columns)
        const row2Y = row1Y + row1Height + rowGap;
        const row2Height = 180;
        const columnGap = 40;
        const columnWidth = (width - padding * 2 - columnGap) / 2;
        this.drawStaticLIFDiagram(padding, row2Y, columnWidth, row2Height);
        this.drawLiveMembraneTrace(padding + columnWidth + columnGap, row2Y, columnWidth, row2Height);

        // ROW 3: Spike train + binary detector (full width)
        const row3Y = row2Y + row2Height + rowGap;
        const row3Height = 260;
        this.drawSpikeTrainWithDetector(padding, row3Y, width - padding * 2, row3Height);
    }

    drawNeuron(startY, width, height) {
        const { ctx } = this;

        // Title
        ctx.fillStyle = this.colors.soma;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Biological Neuron', width / 2, startY - 10);

        // Center the neuron horizontally in the full width
        const neuronX = width / 2;
        const neuronY = startY + height / 2;
        const somaRadius = 45;
        const axonLength = 180;

        this.drawDendrites(neuronX, neuronY, somaRadius);
        this.drawSoma(neuronX, neuronY, somaRadius);
        this.drawAxon(neuronX + somaRadius, neuronY, axonLength);
    }

    drawStaticLIFDiagram(startX, startY, width, height) {
        const { ctx } = this;
        const padding = 20;
        const plotX = startX + padding;
        const plotY = startY + padding;
        const plotW = width - padding * 2;
        const plotH = height - padding * 2;

        // Title (no background box/border)
        ctx.fillStyle = this.colors.soma;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Leaky Integrate-and-Fire Model Dynamics', plotX, startY + 8);

        // Equation with color-coded variables
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        let xPos = plotX;

        // V in blue, τ in gray-blue
        ctx.fillStyle = this.colors.membrane;
        ctx.fillText('V', xPos, startY + 26);
        xPos += ctx.measureText('V').width;
        ctx.fillStyle = this.colors.somaText;
        ctx.fillText('(t+Δt) = ', xPos, startY + 26);
        xPos += ctx.measureText('(t+Δt) = ').width;
        ctx.fillStyle = this.colors.membrane;
        ctx.fillText('V', xPos, startY + 26);
        xPos += ctx.measureText('V').width;
        ctx.fillStyle = this.colors.somaText;
        ctx.fillText('(t) · e^(-Δt/', xPos, startY + 26);
        xPos += ctx.measureText('(t) · e^(-Δt/').width;
        ctx.fillStyle = this.colors.tau;
        ctx.fillText('τ', xPos, startY + 26);
        xPos += ctx.measureText('τ').width;
        ctx.fillStyle = this.colors.somaText;
        ctx.fillText(') + I(t)', xPos, startY + 26);

        // Parameters with color-coded values
        ctx.font = '9px sans-serif';
        xPos = plotX;
        ctx.fillStyle = this.colors.tau;
        ctx.fillText('τ', xPos, startY + 40);
        xPos += ctx.measureText('τ').width;
        ctx.fillStyle = this.colors.label;
        ctx.fillText(` = ${this.tau} ms   `, xPos, startY + 40);
        xPos += ctx.measureText(` = ${this.tau} ms   `).width;
        ctx.fillStyle = this.colors.threshold;
        ctx.fillText('Vth', xPos, startY + 40);
        xPos += ctx.measureText('Vth').width;
        ctx.fillStyle = this.colors.label;
        ctx.fillText(` = ${this.threshold.toFixed(1)}   `, xPos, startY + 40);
        xPos += ctx.measureText(` = ${this.threshold.toFixed(1)}   `).width;
        ctx.fillStyle = this.colors.membrane;
        ctx.fillText('V', xPos, startY + 40);
        xPos += ctx.measureText('V').width;
        ctx.fillStyle = this.colors.label;
        ctx.fillText(` = ${this.membrane.toFixed(3)}`, xPos, startY + 40);

        // Add spacing before diagram
        const diagramY = startY + 65;
        const diagramH = height - 75;
        const baselineY = diagramY + diagramH;

        // Draw axes
        ctx.strokeStyle = this.colors.label;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plotX, diagramY);
        ctx.lineTo(plotX, baselineY);
        ctx.lineTo(plotX + plotW, baselineY);
        ctx.stroke();

        // Threshold line
        const thresholdY = diagramY + diagramH * 0.2;
        ctx.strokeStyle = this.colors.threshold;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(plotX, thresholdY);
        ctx.lineTo(plotX + plotW, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = this.colors.threshold;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Vth', plotX + plotW + 5, thresholdY + 4);

        // Draw idealized membrane potential curve (integrate → spike → reset)
        ctx.strokeStyle = this.colors.membrane;
        ctx.lineWidth = 3;
        ctx.beginPath();

        // First integration phase
        const path1 = [
            [50, 200], [80, 190], [110, 175], [140, 155],
            [170, 130], [200, 100], [230, 75], [250, 60]
        ];
        path1.forEach(([x, y], i) => {
            const nx = plotX + (x / 600) * plotW;
            const ny = diagramY + (y / 250) * diagramH;
            if (i === 0) ctx.moveTo(nx, ny);
            else ctx.lineTo(nx, ny);
        });
        ctx.stroke();

        // Spike
        const spikeX = plotX + (250 / 600) * plotW;
        const spikeTop = diagramY + (20 / 250) * diagramH;
        ctx.strokeStyle = this.colors.sodium;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(spikeX, diagramY + (60 / 250) * diagramH);
        ctx.lineTo(spikeX, spikeTop);
        ctx.stroke();

        // Spike marker
        ctx.fillStyle = this.colors.sodium;
        ctx.beginPath();
        ctx.arc(spikeX, spikeTop, 4, 0, Math.PI * 2);
        ctx.fill();

        // Spike label
        ctx.fillStyle = this.colors.sodium;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Spike!', spikeX, spikeTop - 8);

        // Reset line
        ctx.strokeStyle = this.colors.sodium;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(spikeX, spikeTop);
        ctx.lineTo(plotX + (260 / 600) * plotW, baselineY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Second integration phase
        ctx.strokeStyle = this.colors.membrane;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const path2 = [
            [260, 200], [290, 190], [320, 180], [350, 170],
            [380, 158], [410, 145], [440, 130], [470, 112], [500, 92], [530, 75]
        ];
        path2.forEach(([x, y], i) => {
            const nx = plotX + (x / 600) * plotW;
            const ny = diagramY + (y / 250) * diagramH;
            if (i === 0) ctx.moveTo(nx, ny);
            else ctx.lineTo(nx, ny);
        });
        ctx.stroke();

        // Time axis label
        ctx.fillStyle = this.colors.label;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Time (ms)', plotX + plotW / 2, baselineY + 18);
    }

    drawDendrites(centerX, centerY, somaRadius) {
        const { ctx } = this;
        const dendriteCount = 3;

        for (let i = 0; i < dendriteCount; i++) {
            const angle = -Math.PI / 2 + (i - 1) * Math.PI / 5;
            const length = 80;
            const endX = centerX + Math.cos(angle) * length;
            const endY = centerY + Math.sin(angle) * length;

            // Draw dendrite
            ctx.strokeStyle = this.colors.dendrite;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(centerX, centerY);
            ctx.stroke();

            // Draw synapse receptor
            ctx.fillStyle = '#2a4566';
            ctx.beginPath();
            ctx.arc(endX, endY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.colors.calcium;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Animate neurotransmitter and ion flow
            this.drawSynapticActivity(endX, endY, centerX, centerY, angle, i);
        }
    }

    drawSynapticActivity(endX, endY, centerX, centerY, angle, index) {
        const { ctx } = this;
        const phase = (this.time * 0.008 + index * 0.4) % 1;

        if (phase < 0.15) {
            // Neurotransmitter approaching synapse
            const progress = 1 - phase / 0.15;
            const ntX = endX - Math.cos(angle) * 25 * progress;
            const ntY = endY - Math.sin(angle) * 25 * progress;

            ctx.fillStyle = this.colors.neurotransmitter;
            ctx.beginPath();
            ctx.arc(ntX, ntY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Label on first dendrite
            if (index === 0 && phase < 0.1) {
                ctx.fillStyle = this.colors.neurotransmitter;
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('Neurotransmitter', ntX + 8, ntY);
            }
        } else if (phase < 0.8) {
            // Ion current flowing into dendrite
            const ionPhase = (phase - 0.15) / 0.65;
            const ionX = endX + (centerX - endX) * ionPhase;
            const ionY = endY + (centerY - endY) * ionPhase;

            ctx.fillStyle = this.colors.calcium;
            ctx.beginPath();
            ctx.arc(ionX, ionY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Label
            if (index === 1 && ionPhase > 0.3 && ionPhase < 0.5) {
                ctx.fillStyle = this.colors.calcium;
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('Ca²⁺ influx', ionX - 8, ionY);
            }
        }
    }

    drawSoma(centerX, centerY, radius) {
        const { ctx } = this;

        // Soma with intensity based on membrane potential
        const intensity = Math.min(1, this.membrane / this.threshold);
        ctx.fillStyle = `rgba(74, 163, 255, ${0.2 + intensity * 0.6})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.colors.soma;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Membrane potential value
        ctx.fillStyle = this.colors.somaText;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`V=${this.membrane.toFixed(2)}`, centerX, centerY + 6);

        // Label
        ctx.fillStyle = this.colors.label;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('Soma', centerX, centerY + radius + 18);
        ctx.font = '11px sans-serif';
        ctx.fillText('(integration)', centerX, centerY + radius + 32);
    }

    drawAxon(startX, centerY, length) {
        const { ctx } = this;
        const endX = startX + length;

        // Draw axon hillock (the junction where action potential is initiated)
        const hillockWidth = 15;
        ctx.fillStyle = '#2a4566';
        ctx.beginPath();
        ctx.moveTo(startX, centerY - 6);
        ctx.lineTo(startX + hillockWidth, centerY - 8);
        ctx.lineTo(startX + hillockWidth, centerY + 8);
        ctx.lineTo(startX, centerY + 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.colors.soma;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Axon hillock label
        ctx.fillStyle = this.colors.label;
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Hillock', startX + hillockWidth / 2, centerY - 12);

        // Draw axon
        ctx.strokeStyle = this.colors.axon;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX + hillockWidth, centerY);
        ctx.lineTo(endX, centerY);
        ctx.stroke();

        // Draw voltage-gated channels
        this.drawChannels(startX + hillockWidth, centerY, length - hillockWidth, 3);

        // Animate action potential
        this.drawActionPotential(startX + hillockWidth, centerY, length - hillockWidth);

        // Label
        ctx.fillStyle = this.colors.label;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Axon', (startX + hillockWidth + endX) / 2, centerY + 60);
        ctx.font = '11px sans-serif';
        ctx.fillText('(voltage-gated Na⁺/K⁺ channels)', (startX + hillockWidth + endX) / 2, centerY + 74);
    }

    drawChannels(startX, centerY, length, count) {
        const { ctx } = this;

        for (let i = 0; i < count; i++) {
            const channelX = startX + (i + 1) * (length / (count + 1));

            ctx.fillStyle = '#2a4566';
            ctx.fillRect(channelX - 3, centerY - 8, 6, 16);
            ctx.strokeStyle = '#4a6a99';
            ctx.lineWidth = 1;
            ctx.strokeRect(channelX - 3, centerY - 8, 6, 16);
        }
    }

    drawActionPotential(startX, centerY, length) {
        const { ctx } = this;
        const timeSinceSpike = this.time - this.lastSpike;

        if (timeSinceSpike >= 0 && timeSinceSpike < 100) {
            const progress = timeSinceSpike / 100;
            const spikeX = startX + length * progress;

            // Na+ influx (red)
            ctx.fillStyle = 'rgba(255, 107, 107, 0.6)';
            ctx.beginPath();
            ctx.arc(spikeX, centerY - 18, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = this.colors.sodium;
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Na⁺', spikeX, centerY - 26);
            ctx.font = '10px sans-serif';
            ctx.fillText('(influx)', spikeX, centerY - 36);

            // K+ efflux (blue) - trails behind
            if (progress > 0.3) {
                const kX = startX + length * (progress - 0.3);
                ctx.fillStyle = 'rgba(74, 163, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(kX, centerY + 18, 6, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = this.colors.potassium;
                ctx.font = 'bold 13px sans-serif';
                ctx.fillText('K⁺', kX, centerY + 32);
                ctx.font = '10px sans-serif';
                ctx.fillText('(efflux)', kX, centerY + 42);
            }

            // Action potential wave
            ctx.strokeStyle = this.colors.sodium;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(spikeX, centerY, 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawLiveMembraneTrace(startX, startY, width, height) {
        const { ctx } = this;
        const padding = 20;
        const plotX = startX + padding;
        const plotW = width - padding * 2;

        // Title
        ctx.fillStyle = this.colors.label;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Live Membrane Potential', plotX, startY + 12);

        // Trace area with more breathing room
        const traceTop = startY + 35;
        const traceHeight = height - 60;
        const traceBottom = traceTop + traceHeight;

        // Axes
        ctx.strokeStyle = this.colors.label;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotX, traceTop);
        ctx.lineTo(plotX, traceBottom);
        ctx.lineTo(plotX + plotW, traceBottom);
        ctx.stroke();

        // Threshold line
        const thresholdY = traceBottom - (this.threshold / 2.0) * traceHeight;
        ctx.strokeStyle = this.colors.threshold;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(plotX, thresholdY);
        ctx.lineTo(plotX + plotW, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = this.colors.threshold;
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Vth', plotX - 3, thresholdY + 3);

        // NOW is at the LEFT edge where events emerge
        const nowX = plotX;

        // Draw integration window (shaded region) extending rightward from NOW
        const timeWindow = 200;
        const windowWidth = (this.integrationWindowDuration / timeWindow) * plotW;
        ctx.fillStyle = 'rgba(247, 185, 85, 0.15)'; // Semi-transparent gold
        ctx.fillRect(nowX, traceTop, windowWidth, traceHeight);

        // Draw membrane potential trace - history extends rightward from NOW
        ctx.strokeStyle = this.colors.membrane;
        ctx.lineWidth = 2;
        ctx.beginPath();

        let tempMembrane = this.membrane;
        let tempTime = this.time;

        for (let t = 0; t < timeWindow; t += 2) {
            // Map time to x position: age increases rightward from NOW
            const x = nowX + (t / timeWindow) * plotW;

            const v = Math.max(0, Math.min(2, tempMembrane));
            const y = traceBottom - (v / 2.0) * traceHeight;

            if (t === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            tempMembrane = tempMembrane * Math.exp(-2 / this.tau) - 0.1;
            const spikeTimes = this.spikeHistory.map(st => Math.round(st));
            if (spikeTimes.includes(Math.round(tempTime - t))) {
                tempMembrane = 0;
            }
        }
        ctx.stroke();

        // NOW label with τ relationship
        ctx.fillStyle = this.colors.threshold;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('NOW', nowX + 3, traceTop - 5);
        ctx.font = '7px sans-serif';
        ctx.fillStyle = this.colors.tau;
        ctx.fillText(`(2τ window)`, nowX + windowWidth / 2, traceTop - 14);

        // Y-axis label
        ctx.fillStyle = this.colors.label;
        ctx.font = '9px sans-serif';
        ctx.save();
        ctx.translate(plotX - 12, (traceTop + traceBottom) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('V', 0, 0);
        ctx.restore();
    }

    drawSpikeTrainWithDetector(startX, startY, width, height) {
        const { ctx } = this;
        const padding = 25;
        const plotX = startX + padding;
        const plotW = width - padding * 2;

        // Title with more breathing room
        ctx.fillStyle = this.colors.label;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Spike Train & TTFS Binary Detector', plotX, startY + 15);

        // Spike train area (upper portion) - more space
        const trainTop = startY + 40;
        const trainHeight = height * 0.55;
        const timelineY = trainTop + trainHeight / 2;

        // NOW is at the LEFT edge where spikes emerge
        const nowX = plotX;

        // Time window for display
        const timeWindow = this.timeWindowDisplay;

        // Draw integration window (shaded region) FIRST - extends rightward from NOW
        const windowWidth = (this.integrationWindowDuration / timeWindow) * plotW;
        ctx.fillStyle = 'rgba(247, 185, 85, 0.12)'; // Semi-transparent gold
        ctx.fillRect(nowX, trainTop, windowWidth, trainHeight);

        // Draw window boundary lines
        ctx.strokeStyle = 'rgba(247, 185, 85, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(nowX, trainTop);
        ctx.lineTo(nowX, trainTop + trainHeight);
        ctx.moveTo(nowX + windowWidth, trainTop);
        ctx.lineTo(nowX + windowWidth, trainTop + trainHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw timeline
        ctx.strokeStyle = this.colors.label;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotX, timelineY);
        ctx.lineTo(plotX + plotW, timelineY);
        ctx.stroke();

        // Draw spike events as vertical bars
        this.spikeHistory.forEach(spikeTime => {
            const age = this.time - spikeTime;
            if (age >= 0 && age < timeWindow) {
                // Map time to x position: spikes emerge at left (nowX) and move right as they age
                const x = nowX + (age / timeWindow) * plotW;
                const barHeight = 55;

                // Spike bar
                ctx.fillStyle = this.colors.sodium;
                ctx.fillRect(x - 2, timelineY - barHeight, 4, barHeight);

                // Spike marker circle
                ctx.fillStyle = this.colors.sodium;
                ctx.beginPath();
                ctx.arc(x, timelineY - barHeight, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw NOW marker at left edge (where spikes emerge)
        ctx.strokeStyle = this.colors.threshold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nowX, trainTop - 5);
        ctx.lineTo(nowX, trainTop + trainHeight + 5);
        ctx.stroke();

        // NOW label with integration window annotation
        ctx.fillStyle = this.colors.threshold;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('NOW', nowX + 3, trainTop - 10);
        ctx.font = '8px sans-serif';
        ctx.fillStyle = this.colors.tau;
        ctx.fillText(`(${this.integrationWindowDuration}ms = 2τ)`, nowX + windowWidth / 2, trainTop - 5);

        // Time axis labels
        ctx.fillStyle = this.colors.label;
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        for (let t = 0; t <= timeWindow; t += 100) {
            const x = nowX + (t / timeWindow) * plotW;
            if (x >= plotX && x <= plotX + plotW) {
                ctx.fillText(`${(this.time - t).toFixed(0)}`, x, timelineY + 25);
            }
        }

        ctx.fillText('Time (ms)', plotX + plotW / 2, timelineY + 42);

        // Labels for temporal regions
        ctx.fillStyle = 'rgba(159, 178, 198, 0.6)';
        ctx.font = 'italic 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Future', plotX + plotW * 0.05, trainTop + 10);
        ctx.textAlign = 'right';
        ctx.fillText('Past', plotX + plotW, trainTop + 10);

        // Probability indicator near NOW
        this.drawProbabilityIndicator(nowX, trainTop - 35, windowWidth);

        // Binary detector area (lower portion)
        this.drawBinaryDetector(startX, startY + trainHeight + 70, width, height - trainHeight - 70);
    }

    drawProbabilityIndicator(centerX, centerY, windowWidth) {
        const { ctx } = this;
        const windowAge = this.time - this.encodingWindowStart;

        // Calculate probability based on membrane potential and time in window
        let prob1 = 0; // Probability of detecting bit 1
        let prob0 = 0; // Probability of detecting bit 0

        if (this.detectedBit !== null) {
            // Already detected - locked in
            prob1 = this.detectedBit === 1 ? 1.0 : 0.0;
            prob0 = this.detectedBit === 0 ? 1.0 : 0.0;
        } else if (windowAge < this.encodingWindowDuration) {
            // Active window - calculate probabilities based on V and time
            const vProgress = this.membrane / this.threshold;
            const timeProgress = windowAge / this.ttfsThreshold;

            // Higher V and more time elapsed increases prob1
            prob1 = Math.min(0.95, vProgress * 0.7 + timeProgress * 0.3);
            prob0 = 1.0 - prob1;
        } else {
            // Window closed, no spike detected
            prob1 = 0.0;
            prob0 = 1.0;
        }

        // Color transition based on probability
        let indicatorColor;
        let labelText;

        if (this.detectedBit !== null) {
            // Locked color
            indicatorColor = this.detectedBit === 1 ? this.colors.bit1 : this.colors.bit0;
            labelText = this.detectedBit === 1 ? 'LOCKED: 1' : 'LOCKED: 0';
        } else if (prob1 > 0.7) {
            indicatorColor = this.colors.bit1Uncertain; // Leaning toward 1
            labelText = `→ 1 (${(prob1 * 100).toFixed(0)}%)`;
        } else if (prob0 > 0.7) {
            indicatorColor = this.colors.bit0Uncertain; // Leaning toward 0
            labelText = `→ 0 (${(prob0 * 100).toFixed(0)}%)`;
        } else {
            // Uncertain - blend colors
            const r = Math.round(159 * prob0 + 82 * prob1);
            const g = Math.round(178 * prob0 + 201 * prob1);
            const b = Math.round(198 * prob0 + 160 * prob1);
            indicatorColor = `rgb(${r}, ${g}, ${b})`;
            labelText = `? (1:${(prob1 * 100).toFixed(0)}% 0:${(prob0 * 100).toFixed(0)}%)`;
        }

        // Draw probability bar
        const barWidth = windowWidth * 0.8;
        const barHeight = 6;
        const barX = centerX - barWidth / 2;

        // Background
        ctx.fillStyle = 'rgba(26, 38, 54, 0.8)';
        ctx.fillRect(barX, centerY, barWidth, barHeight);

        // Probability fill
        ctx.fillStyle = indicatorColor;
        ctx.fillRect(barX, centerY, barWidth * prob1, barHeight);

        // Border
        ctx.strokeStyle = indicatorColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, centerY, barWidth, barHeight);

        // Label
        ctx.fillStyle = this.colors.bitDetectorText;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, centerX, centerY - 3);
    }

    drawBinaryDetector(startX, startY, width, height) {
        const { ctx } = this;
        const padding = 20;
        const plotX = startX + padding;
        const plotW = width - padding * 2;

        // Title
        ctx.fillStyle = this.colors.label;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('TTFS Binary Output', plotX, startY + 5);

        // Perform TTFS detection
        const windowAge = this.time - this.encodingWindowStart;

        if (this.detectedBit === null && windowAge < this.encodingWindowDuration) {
            // Check for first spike within window
            const firstSpikeInWindow = this.spikeHistory.find(
                st => st >= this.encodingWindowStart && st < this.encodingWindowStart + this.encodingWindowDuration
            );

            if (firstSpikeInWindow) {
                const latency = firstSpikeInWindow - this.encodingWindowStart;
                this.detectedBit = latency < this.ttfsThreshold ? 1 : 0;
            }
        } else if (this.detectedBit === null && windowAge >= this.encodingWindowDuration) {
            // Window closed, no spike = bit 0
            this.detectedBit = 0;
        }

        // Display detected bit
        const displayY = startY + 30;

        if (this.detectedBit !== null) {
            const bitColor = this.detectedBit === 1 ? '#29d398' : '#9fb2c6';
            const bitLabel = this.detectedBit === 1 ? 'BIT 1' : 'BIT 0';

            // Large bit display
            ctx.fillStyle = bitColor;
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.detectedBit.toString(), plotX + plotW / 2, displayY + 30);

            // Label
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(bitLabel, plotX + plotW / 2, displayY + 55);

            // Description
            ctx.fillStyle = this.colors.label;
            ctx.font = '10px sans-serif';
            const desc = this.detectedBit === 1 ? 'Early spike detected' : 'Late/no spike detected';
            ctx.fillText(desc, plotX + plotW / 2, displayY + 70);
        } else {
            // Waiting for detection
            ctx.fillStyle = this.colors.label;
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Waiting for spike...', plotX + plotW / 2, displayY + 30);

            // Show encoding window progress
            const progress = Math.min(1, windowAge / this.encodingWindowDuration);
            const barWidth = plotW * 0.6;
            const barX = plotX + (plotW - barWidth) / 2;
            const barY = displayY + 45;

            ctx.strokeStyle = this.colors.label;
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, 8);

            ctx.fillStyle = this.colors.threshold;
            ctx.fillRect(barX, barY, barWidth * progress, 8);
        }
    }
}
