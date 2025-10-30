/**
 * SIGNAL-PROCESSOR.JS
 * Variable Scale Transform computation and signal generation
 */

class SignalProcessor {
    constructor(sampleRate = 8000) {
        this.sampleRate = sampleRate;

        // Guitar string harmonic colors for visualization
        this.harmonicColors = {
            1: '#E63946', // Fundamental - Red
            2: '#F77F00', // 2nd harmonic - Orange
            3: '#FCBF49'  // 3rd harmonic - Yellow
        };

        // Note colors for the 4 fundamentals
        this.noteColors = {
            1: '#2A9D8F', // E2 - Teal
            2: '#264653', // F2 - Dark Blue
            3: '#E76F51', // E4 - Coral
            4: '#E9C46A'  // F4 - Gold
        };
    }

    /**
     * Generate two-tone signal with exponential decay
     * @param {number} f1 - First frequency (Hz)
     * @param {number} f2 - Second frequency (Hz)
     * @param {number} decay - Decay rate (1/s)
     * @param {number} duration - Signal duration (s)
     * @returns {Object} {signal, analytic, numSamples}
     */
    generateTwoTone(f1, f2, decay, duration) {
        const numSamples = Math.floor(duration * this.sampleRate);
        const signal = new Float32Array(numSamples);
        const analytic = new Float32Array(numSamples * 2); // Complex: [re, im, re, im, ...]

        for (let n = 0; n < numSamples; n++) {
            const t = n / this.sampleRate;
            const envelope = Math.exp(-decay * t);

            const real = envelope * (Math.cos(2 * Math.PI * f1 * t) +
                                    Math.cos(2 * Math.PI * f2 * t));
            const imag = envelope * (Math.sin(2 * Math.PI * f1 * t) +
                                    Math.sin(2 * Math.PI * f2 * t));

            signal[n] = real;
            analytic[n * 2] = real;
            analytic[n * 2 + 1] = imag;
        }

        return { signal, analytic, numSamples };
    }

    /**
     * Generate harmonic series signal
     * @param {number} f0 - Fundamental frequency (Hz)
     * @param {number} numHarmonics - Number of harmonics
     * @param {number} decay - Decay rate (1/s)
     * @param {number} duration - Signal duration (s)
     * @returns {Object} {signal, analytic, numSamples}
     */
    generateHarmonic(f0, numHarmonics, decay, duration) {
        const numSamples = Math.floor(duration * this.sampleRate);
        const signal = new Float32Array(numSamples);
        const analytic = new Float32Array(numSamples * 2);

        for (let n = 0; n < numSamples; n++) {
            const t = n / this.sampleRate;
            let real = 0, imag = 0;

            for (let k = 1; k <= numHarmonics; k++) {
                const fk = k * f0;
                const amp = 1.0 / k; // Harmonic amplitude decay
                const envelope = Math.exp(-decay * k * 0.3 * t);

                real += amp * envelope * Math.cos(2 * Math.PI * fk * t);
                imag += amp * envelope * Math.sin(2 * Math.PI * fk * t);
            }

            signal[n] = real;
            analytic[n * 2] = real;
            analytic[n * 2 + 1] = imag;
        }

        return { signal, analytic, numSamples };
    }

    /**
     * Generate 4-note guitar signal with 3 harmonics each
     * @param {Array<number>} freqs - [f1, f2, f3, f4] fundamental frequencies (Hz)
     * @param {number} numHarmonics - Number of harmonics per note (default 3)
     * @param {number} decay - Decay rate (1/s)
     * @param {number} duration - Signal duration (s)
     * @param {Object} options - {showHarmonics: [true, true, true]}
     * @returns {Object} {signal, analytic, numSamples, components}
     */
    generateGuitarFourNote(freqs, numHarmonics = 3, decay = 2.5, duration = 2.0, options = {}) {
        const showHarmonics = options.showHarmonics || [true, true, true];
        const numSamples = Math.floor(duration * this.sampleRate);
        const signal = new Float32Array(numSamples);
        const analytic = new Float32Array(numSamples * 2);

        // Track individual components for visualization
        const components = [];

        // Guitar-like harmonic amplitude profile (fundamental strong, harmonics decay)
        const harmonicAmps = [1.0, 0.5, 0.25];

        // Process each of the 4 notes
        for (let noteIdx = 0; noteIdx < 4; noteIdx++) {
            const f0 = freqs[noteIdx];

            // Generate harmonics for this note
            for (let h = 1; h <= numHarmonics; h++) {
                if (!showHarmonics[h - 1]) continue;

                const fk = h * f0;
                const amp = harmonicAmps[h - 1];

                for (let n = 0; n < numSamples; n++) {
                    const t = n / this.sampleRate;
                    // Higher harmonics decay faster
                    const envelope = Math.exp(-decay * (1 + 0.3 * (h - 1)) * t);

                    const real = amp * envelope * Math.cos(2 * Math.PI * fk * t);
                    const imag = amp * envelope * Math.sin(2 * Math.PI * fk * t);

                    signal[n] += real;
                    analytic[n * 2] += real;
                    analytic[n * 2 + 1] += imag;
                }

                components.push({
                    noteIndex: noteIdx + 1,
                    harmonic: h,
                    frequency: fk,
                    amplitude: amp,
                    color: this.harmonicColors[h]
                });
            }
        }

        return { signal, analytic, numSamples, components };
    }

    /**
     * Compute Variable Scale Transform
     * @param {Float32Array} analytic - Analytic signal [re, im, re, im, ...]
     * @param {Array<number>} frequencies - Frequency grid
     * @param {number} alpha - Scaling exponent
     * @param {number} qFactor - Quality factor
     * @returns {Float32Array} Spectrum magnitude
     */
    computeVST(analytic, frequencies, alpha, qFactor) {
        const numSamples = analytic.length / 2;
        const spectrum = new Float32Array(frequencies.length);

        for (let m = 0; m < frequencies.length; m++) {
            const omega = 2 * Math.PI * frequencies[m];
            const sigma = omega / qFactor;

            let sumReal = 0, sumImag = 0;

            for (let n = 0; n < numSamples; n++) {
                const t = n / this.sampleRate;
                const lambda = Math.pow(t + 1e-10, alpha); // Scaling function
                const expFactor = Math.exp(-sigma * lambda);
                const phase = omega * lambda;

                const cosPhase = Math.cos(phase);
                const sinPhase = Math.sin(phase);

                const re = analytic[n * 2];
                const im = analytic[n * 2 + 1];

                // Complex multiplication and accumulation
                sumReal += expFactor * (re * cosPhase + im * sinPhase);
                sumImag += expFactor * (im * cosPhase - re * sinPhase);
            }

            spectrum[m] = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
        }

        return spectrum;
    }

    /**
     * Compute standard FFT (using DFT for simplicity)
     * @param {Float32Array} signal - Real-valued signal
     * @param {number} fftSize - FFT size
     * @returns {Float32Array} Spectrum magnitude
     */
    computeFFT(signal, fftSize) {
        const real = new Float32Array(fftSize);
        for (let i = 0; i < Math.min(signal.length, fftSize); i++) {
            real[i] = signal[i];
        }

        const spectrum = new Float32Array(fftSize / 2);

        // Discrete Fourier Transform
        for (let k = 0; k < fftSize / 2; k++) {
            let sumReal = 0, sumImag = 0;
            for (let n = 0; n < fftSize; n++) {
                const phase = -2 * Math.PI * k * n / fftSize;
                sumReal += real[n] * Math.cos(phase);
                sumImag += real[n] * Math.sin(phase);
            }
            spectrum[k] = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
        }

        return spectrum;
    }

    /**
     * Generate logarithmically-spaced frequency grid
     * @param {number} fMin - Minimum frequency (Hz)
     * @param {number} fMax - Maximum frequency (Hz)
     * @param {number} binsPerOctave - Bins per octave
     * @returns {Array<number>} Frequency grid
     */
    generateLogFrequencies(fMin, fMax, binsPerOctave) {
        const frequencies = [];
        let f = fMin;

        while (f <= fMax) {
            frequencies.push(f);
            f *= Math.pow(2, 1 / binsPerOctave);
        }

        return frequencies;
    }

    /**
     * Generate linearly-spaced frequency grid
     * @param {number} fMin - Minimum frequency (Hz)
     * @param {number} fMax - Maximum frequency (Hz)
     * @param {number} numBins - Number of bins
     * @returns {Array<number>} Frequency grid
     */
    generateLinearFrequencies(fMin, fMax, numBins) {
        const frequencies = [];
        const step = (fMax - fMin) / (numBins - 1);

        for (let i = 0; i < numBins; i++) {
            frequencies.push(fMin + i * step);
        }

        return frequencies;
    }

    /**
     * Compute scaling function λ(t) = t^α
     * @param {number} t - Time value
     * @param {number} alpha - Scaling exponent
     * @returns {number} Scaled time value
     */
    scalingFunction(t, alpha) {
        return Math.pow(t, alpha);
    }

    /**
     * Compute derivative of scaling function λ'(t) = α·t^(α-1)
     * @param {number} t - Time value
     * @param {number} alpha - Scaling exponent
     * @returns {number} Derivative value
     */
    scalingDerivative(t, alpha) {
        return alpha * Math.pow(t + 1e-10, alpha - 1);
    }

    /**
     * Generate data for scaling function visualization
     * @param {number} tMax - Maximum time value
     * @param {number} numPoints - Number of points
     * @param {number} alpha - Scaling exponent
     * @returns {Object} {t, lambda, lambdaPrime}
     */
    generateScalingData(tMax, numPoints, alpha) {
        const t = [];
        const lambda = [];
        const lambdaPrime = [];

        for (let i = 0; i < numPoints; i++) {
            const time = (i / (numPoints - 1)) * tMax;
            t.push(time);
            lambda.push(this.scalingFunction(time, alpha));
            lambdaPrime.push(this.scalingDerivative(time, alpha));
        }

        return { t, lambda, lambdaPrime };
    }

    /**
     * Estimate frequency resolution at given frequency for VST
     * @param {number} f - Frequency (Hz)
     * @param {number} alpha - Scaling exponent
     * @param {number} binsPerOctave - Bins per octave
     * @returns {number} Resolution (Hz)
     */
    vstResolution(f, alpha, binsPerOctave) {
        // Approximate resolution based on logarithmic spacing
        return (f * Math.log(2)) / binsPerOctave;
    }

    /**
     * FFT resolution (constant across frequency)
     * @param {number} fftSize - FFT size
     * @returns {number} Resolution (Hz)
     */
    fftResolution(fftSize) {
        return this.sampleRate / fftSize;
    }

    /**
     * Find peaks in spectrum
     * @param {Float32Array} spectrum - Spectrum data
     * @param {Array<number>} frequencies - Corresponding frequencies
     * @param {number} threshold - Relative threshold (0-1)
     * @returns {Array<Object>} Array of {freq, magnitude, index}
     */
    findPeaks(spectrum, frequencies, threshold = 0.1) {
        const peaks = [];
        const maxMag = Math.max(...spectrum);
        const thresholdAbs = maxMag * threshold;

        for (let i = 1; i < spectrum.length - 1; i++) {
            if (spectrum[i] > spectrum[i - 1] &&
                spectrum[i] > spectrum[i + 1] &&
                spectrum[i] > thresholdAbs) {
                peaks.push({
                    freq: frequencies[i],
                    magnitude: spectrum[i],
                    index: i
                });
            }
        }

        return peaks.sort((a, b) => b.magnitude - a.magnitude);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SignalProcessor = SignalProcessor;
}
