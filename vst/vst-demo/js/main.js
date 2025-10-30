/**
 * MAIN.JS
 * Orchestrates all components of the Variable Math Markdown system
 */

// Application state
const AppState = {
    // Guitar note frequencies (E2, F2, E4, F4)
    f1: 82.41,   // E2 (lowest string, open)
    f2: 87.31,   // F2 (lowest string, 1st fret)
    f3: 329.63,  // E4 (highest string, open)
    f4: 349.23,  // F4 (highest string, 1st fret)

    // Signal parameters
    numHarmonics: 3,
    showHarmonics: [true, true, true], // [fundamental, 2nd, 3rd]
    tieF2toF1: true,  // Keep F2 a semitone above F1
    tieF4toF3: true,  // Keep F4 a semitone above F3
    decay: 2.5,
    duration: 2.0,

    // Transform parameters
    alpha: 0.75,
    qFactor: 15,
    binsPerOctave: 36,
    fftSize: 4096,

    // Current data
    currentSignal: null,
    currentAnalytic: null,
    currentComponents: null,
    currentFFT: null,
    currentVST: null,

    // Systems
    processor: null,
    graph: null
};

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('[App] Initializing Variable Math Markdown system...');

    // Initialize signal processor with 8000 Hz sample rate
    AppState.processor = new SignalProcessor(8000);
    window.signalProcessor = AppState.processor;

    // Initialize knowledge graph
    AppState.graph = initializeVSTKnowledgeGraph();
    window.vstKnowledgeGraph = AppState.graph;

    // Initialize UI systems
    window.MarginNotes.init();
    window.ContextFAB.init();

    // Setup navigation
    setupNavigation();

    // Setup gutter toggles
    setupGutterToggles();

    // Setup event listeners
    setupEventListeners();

    // Setup initial visualizations
    setupVisualizations();

    console.log('[App] Initialization complete');
}

/**
 * Setup navigation between sections
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const sectionId = link.dataset.section;

            // Update nav active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show section
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });

            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');

                // Smooth scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

/**
 * Setup gutter collapse/expand toggles
 */
function setupGutterToggles() {
    const toggleButtons = document.querySelectorAll('.gutter-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const gutterType = button.dataset.gutter;
            const gutter = document.getElementById(`${gutterType}-gutter`);

            if (gutter) {
                gutter.classList.toggle('collapsed');
            }
        });
    });
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
    // Parameter changes from FAB
    document.addEventListener('parameter-changed', (e) => {
        const { parameter, value } = e.detail;

        switch (parameter) {
            case 'f1':
                AppState.f1 = value;
                // Auto-update f2 to be a semitone above if tied
                if (AppState.tieF2toF1) {
                    AppState.f2 = AppState.f1 * Math.pow(2, 1/12);
                }
                updateGuitarSignal();
                break;
            case 'f2':
                AppState.f2 = value;
                updateGuitarSignal();
                break;
            case 'f3':
                AppState.f3 = value;
                // Auto-update f4 to be a semitone above if tied
                if (AppState.tieF4toF3) {
                    AppState.f4 = AppState.f3 * Math.pow(2, 1/12);
                }
                updateGuitarSignal();
                break;
            case 'f4':
                AppState.f4 = value;
                updateGuitarSignal();
                break;
            case 'showHarmonic1':
                AppState.showHarmonics[0] = value;
                updateGuitarSignal();
                break;
            case 'showHarmonic2':
                AppState.showHarmonics[1] = value;
                updateGuitarSignal();
                break;
            case 'showHarmonic3':
                AppState.showHarmonics[2] = value;
                updateGuitarSignal();
                break;
            case 'alpha':
                AppState.alpha = value;
                updateScalingVisualization();
                break;
            case 'q':
                AppState.qFactor = value;
                break;
            case 'bins':
                AppState.binsPerOctave = value;
                break;
            case 'fftSize':
                AppState.fftSize = value;
                break;
        }
    });

    // Signal generation
    document.addEventListener('generate-signal', () => {
        updateGuitarSignal();
    });

    // Transform computation
    document.addEventListener('compute-transforms', () => {
        computeAndCompareTransforms();
    });

    // Margin anchor clicks
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('.margin-anchor');
        if (anchor) {
            const noteId = anchor.dataset.note;
            if (noteId && window.vstKnowledgeGraph && window.MarginNotes) {
                const notes = window.vstKnowledgeGraph.getNotes(noteId);
                if (notes && notes.length > 0) {
                    window.MarginNotes.showNote(noteId, notes[0]);
                }
            }
        }
    });
}

/**
 * Setup initial visualizations using Vega-Lite
 */
function setupVisualizations() {
    // Signal visualization
    setupSignalViz();

    // Scaling function family
    setupScalingFamilyViz();

    // Initial signal generation
    updateGuitarSignal();

    // Initial scaling visualization
    updateScalingVisualization();
}

/**
 * Setup signal visualization
 */
function setupSignalViz() {
    const vizId = 'signal-viz';
    const vizElement = document.getElementById(vizId);

    if (!vizElement) return;

    // Generate initial guitar signal
    const freqs = [AppState.f1, AppState.f2, AppState.f3, AppState.f4];
    const result = AppState.processor.generateGuitarFourNote(
        freqs,
        AppState.numHarmonics,
        AppState.decay,
        AppState.duration,
        { showHarmonics: AppState.showHarmonics }
    );

    // Store initial data
    AppState.currentSignal = result.signal;
    AppState.currentAnalytic = result.analytic;
    AppState.currentComponents = result.components;

    // Downsample for visualization
    const step = Math.floor(result.numSamples / 1000);
    const data = [];

    for (let i = 0; i < result.numSamples; i += step) {
        data.push({
            time: i / 8000,
            amplitude: result.signal[i]
        });
    }

    const spec = AppState.graph.createVegaSpec('line', data, {
        xField: 'time',
        yField: 'amplitude',
        xTitle: 'Time (s)',
        yTitle: 'Amplitude',
        width: 600,
        height: 200
    });

    AppState.graph.renderChart(vizId, spec);
}

/**
 * Setup scaling function family visualization
 */
function setupScalingFamilyViz() {
    const vizId = 'scaling-family-viz';
    const vizElement = document.getElementById(vizId);

    if (!vizElement) return;

    // Generate data for multiple alpha values
    const alphas = [0.5, 0.75, 1.0];
    const data = [];

    alphas.forEach(alpha => {
        const result = AppState.processor.generateScalingData(2.0, 100, alpha);

        result.t.forEach((t, i) => {
            data.push({
                time: t,
                lambda: result.lambda[i],
                alpha: `α=${alpha.toFixed(2)}`
            });
        });
    });

    const spec = AppState.graph.createVegaSpec('multi-line', data, {
        xField: 'time',
        yField: 'lambda',
        seriesField: 'alpha',
        xTitle: 'Time t (s)',
        yTitle: 'λ(t) = t^α',
        legendTitle: 'Scaling Exponent',
        width: 600,
        height: 250
    });

    AppState.graph.renderChart(vizId, spec);
}

/**
 * Update guitar four-note signal visualization
 */
function updateGuitarSignal() {
    const freqs = [AppState.f1, AppState.f2, AppState.f3, AppState.f4];

    const result = AppState.processor.generateGuitarFourNote(
        freqs,
        AppState.numHarmonics,
        AppState.decay,
        AppState.duration,
        { showHarmonics: AppState.showHarmonics }
    );

    AppState.currentSignal = result.signal;
    AppState.currentAnalytic = result.analytic;
    AppState.currentComponents = result.components;

    // Update signal viz
    const vizId = 'signal-viz';
    const step = Math.floor(result.numSamples / 1000);
    const data = [];

    for (let i = 0; i < result.numSamples; i += step) {
        data.push({
            time: i / 8000,
            amplitude: result.signal[i]
        });
    }

    if (AppState.graph.visualizations.has(vizId)) {
        AppState.graph.updateChart(vizId, data);
    }
}

/**
 * Update scaling function visualization
 */
function updateScalingVisualization() {
    const vizId = 'scaling-deriv-viz';
    const vizElement = document.getElementById(vizId);

    if (!vizElement) return;

    const result = AppState.processor.generateScalingData(2.0, 200, AppState.alpha);
    const data = [];

    result.t.forEach((t, i) => {
        data.push({
            time: t,
            derivative: result.lambdaPrime[i]
        });
    });

    const spec = AppState.graph.createVegaSpec('area', data, {
        xField: 'time',
        yField: 'derivative',
        xTitle: 'Time t (s)',
        yTitle: "λ'(t) = α·t^(α-1)",
        width: 280,
        height: 180,
        color: '#6f42c1'
    });

    AppState.graph.renderChart(vizId, spec);
}

/**
 * Compute and compare FFT vs VST
 */
function computeAndCompareTransforms() {
    if (!AppState.currentSignal || !AppState.currentAnalytic) {
        console.warn('[App] No signal to transform');
        return;
    }

    // Compute FFT
    const fftSpectrum = AppState.processor.computeFFT(
        AppState.currentSignal,
        AppState.fftSize
    );

    const fftFreqs = AppState.processor.generateLinearFrequencies(
        0,
        8000 / 2,
        AppState.fftSize / 2
    );

    // Compute VST (cover E2 fundamental to E4 3rd harmonic range)
    const vstFreqs = AppState.processor.generateLogFrequencies(
        60,
        1200,
        AppState.binsPerOctave
    );

    const vstSpectrum = AppState.processor.computeVST(
        AppState.currentAnalytic,
        vstFreqs,
        AppState.alpha,
        AppState.qFactor
    );

    AppState.currentFFT = { spectrum: fftSpectrum, frequencies: fftFreqs };
    AppState.currentVST = { spectrum: vstSpectrum, frequencies: vstFreqs };

    // Update visualizations
    updateComparisonViz();

    // Update metrics
    updateComparisonMetrics();
}

/**
 * Update comparison visualizations
 */
function updateComparisonViz() {
    // FFT Spectrum
    const fftVizId = 'fft-spectrum-viz';
    if (document.getElementById(fftVizId) && AppState.currentFFT) {
        const data = [];
        const freqs = AppState.currentFFT.frequencies;
        const spec = AppState.currentFFT.spectrum;

        // Only show up to 1200 Hz (covers all harmonics)
        for (let i = 0; i < freqs.length && freqs[i] <= 1200; i++) {
            data.push({
                frequency: freqs[i],
                magnitude: spec[i]
            });
        }

        const vegaSpec = AppState.graph.createVegaSpec('area', data, {
            xField: 'frequency',
            yField: 'magnitude',
            xTitle: 'Frequency (Hz)',
            yTitle: 'Magnitude',
            width: 320,
            height: 200,
            color: '#dc3545'
        });

        AppState.graph.renderChart(fftVizId, vegaSpec);
    }

    // VST Spectrum
    const vstVizId = 'vst-spectrum-viz';
    if (document.getElementById(vstVizId) && AppState.currentVST) {
        const data = [];

        AppState.currentVST.frequencies.forEach((freq, i) => {
            data.push({
                frequency: freq,
                magnitude: AppState.currentVST.spectrum[i]
            });
        });

        const vegaSpec = AppState.graph.createVegaSpec('area', data, {
            xField: 'frequency',
            yField: 'magnitude',
            xTitle: 'Frequency (Hz)',
            yTitle: 'Magnitude',
            xScale: { type: 'log' },
            width: 320,
            height: 200,
            color: '#0066cc'
        });

        AppState.graph.renderChart(vstVizId, vegaSpec);
    }
}

/**
 * Update comparison metrics
 */
function updateComparisonMetrics() {
    if (!AppState.currentFFT || !AppState.currentVST) return;

    // FFT resolution
    const fftRes = AppState.processor.fftResolution(AppState.fftSize);
    const fftResElement = document.getElementById('fft-resolution');
    if (fftResElement) {
        fftResElement.textContent = `${fftRes.toFixed(2)} Hz`;
    }

    // VST resolution at f1
    const vstRes = AppState.processor.vstResolution(
        AppState.f1,
        AppState.alpha,
        AppState.binsPerOctave
    );
    const vstResElement = document.getElementById('vst-resolution');
    if (vstResElement) {
        vstResElement.textContent = `${vstRes.toFixed(2)} Hz`;
    }

    // Bins between tones
    const sep = Math.abs(AppState.f2 - AppState.f1);
    const fftBins = sep / fftRes;
    const vstBins = AppState.currentVST.frequencies.filter(f =>
        f >= Math.min(AppState.f1, AppState.f2) &&
        f <= Math.max(AppState.f1, AppState.f2)
    ).length;

    const fftBinsElement = document.getElementById('fft-bins');
    const vstBinsElement = document.getElementById('vst-bins');

    if (fftBinsElement) fftBinsElement.textContent = fftBins.toFixed(1);
    if (vstBinsElement) vstBinsElement.textContent = vstBins.toString();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for KaTeX to finish rendering
    if (document.readyState === 'complete') {
        setTimeout(initializeApp, 100);
    } else {
        window.addEventListener('load', () => {
            setTimeout(initializeApp, 100);
        });
    }
});
