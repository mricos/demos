import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';



// Test console tracking immediately
window.testConsoleTracker = function() {
    console.log("Testing console tracker...");
    console.warn("This is a test warning");
    console.error("This is a test error");
    
    setTimeout(() => {
        if (window.consoleTracker) {
            console.log("Console tracker status:", {
                errors: window.consoleTracker.errors.length,
                warnings: window.consoleTracker.warnings.length,
                logs: window.consoleTracker.logs.length
            });
        } else {
            console.error("Console tracker not found!");
        }
    }, 100);
};

// Global console management functions
window.clearConsoleTracker = function() {
    if (window.consoleTracker) {
        window.consoleTracker.errors = [];
        window.consoleTracker.warnings = [];
        window.consoleTracker.logs = [];
        if (threejsDebugManager && threejsDebugManager.render) {
            threejsDebugManager.render();
        }
        console.log("Console tracker cleared");
    }
};

// Console error tracking - make it global
window.consoleTracker = {
    errors: [],
    warnings: [],
    logs: [],
    maxEntries: 50,
    
    init() {
        // Override console methods to capture messages
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalLog = console.log;
        
        console.error = (...args) => {
            this.addEntry('error', args);
            originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.addEntry('warning', args);
            originalWarn.apply(console, args);
        };
        
        console.log = (...args) => {
            if (window.debugLogger && window.debugLogger.enabled) {
                this.addEntry('log', args);
            }
            originalLog.apply(console, args);
        };
        
        // Capture unhandled errors
        window.addEventListener('error', (event) => {
            this.addEntry('error', [`${event.filename}:${event.lineno}`, event.message]);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.addEntry('error', ['Promise rejection:', event.reason]);
        });
    },
    
    addEntry(type, args) {
        const entry = {
            type,
            message: args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '),
            timestamp: new Date().toLocaleTimeString()
        };
        
        this[type === 'error' ? 'errors' : type === 'warning' ? 'warnings' : 'logs'].push(entry);
        
        // Keep only recent entries
        if (this.errors.length > this.maxEntries) this.errors.shift();
        if (this.warnings.length > this.maxEntries) this.warnings.shift();
        if (this.logs.length > this.maxEntries) this.logs.shift();
    },
    
    getRecentEntries() {
        const all = [
            ...this.errors.map(e => ({...e, type: 'error'})),
            ...this.warnings.map(e => ({...e, type: 'warning'})),
            ...this.logs.map(e => ({...e, type: 'log'}))
        ];
        
        return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20);
    }
};

// Create aliases for easier access throughout the code
const consoleTracker = window.consoleTracker;
const debugLogger = window.debugLogger;

let scene, camera, renderer, wireframe, clock;
let needsUpdate = { geometry: false, material: false };

// Debug logging system - make it global
window.debugLogger = {
    enabled: false,
    log: function(...args) {
        if (this.enabled) {
            console.log(...args);
        }
    },
    warn: function(...args) {
        if (this.enabled) {
            console.warn(...args);
        }
    },
    error: function(...args) {
        // Always show errors
        console.error(...args);
    },
    toggle: function() {
        this.enabled = !this.enabled;
        console.log(`Debug logging ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
        return this.enabled;
    }
};

const dom = {
    container: document.getElementById('container'),
    panels: { 
        controls: document.getElementById('controls'), 
        info: document.getElementById('info-display'), 
        equation: document.getElementById('equation-panel'), 
        threejsDebug: document.getElementById('threejs-debug'),
        settings: document.getElementById('settings-modal-overlay'),
        config: document.getElementById('config-panel')
    },
    toggles: { 
        controls: document.getElementById('toggle-controls'), 
        info: document.getElementById('toggle-info'), 
        equation: document.getElementById('toggle-equation'), 
        config: document.getElementById('toggle-config'),
        threejsDebug: document.getElementById('toggle-threejs-debug'),
        settings: document.getElementById('toggle-settings') 
    },
    settings: { closeBtn: document.getElementById('close-settings'), content: document.getElementById('settings-content') },
    ghostSliders: { top: document.getElementById('ghost-slider-top'), bottom: document.getElementById('ghost-slider-bottom'), left: document.getElementById('ghost-slider-left'), right: document.getElementById('ghost-slider-right') }
};

const params = {
    'azimuth': { value: -45, min: -180, max: 180, step: 0.5, label: 'Azimuth', description: 'Horizontal camera rotation angle in degrees' },
    'elevation': { value: 30, min: -90, max: 90, step: 0.5, label: 'Elevation', description: 'Vertical camera rotation angle in degrees' },
    'distance': { value: 20, min: 5, max: 40, step: 0.1, label: 'Distance (Dolly)', description: 'Camera distance from the manifold center' },
    'objectZ': { value: 0, min: -5, max: 5, step: 0.1, label: 'Object Z', description: 'Move manifold closer/farther from camera' },
    'paramN': { value: 2, min: 1, max: 7, step: 1, label: 'Lobes (n)', description: 'Controls u-direction periodicity in the torus mapping' }, 
    'paramM': { value: 3, min: 1, max: 7, step: 1, label: 'Twist Freq (m)', description: 'Controls modulation frequency in the radial function' }, 
    'separation': { value: 0.5, min: 0, max: 1.5, step: 0.01, label: 'Separation', description: 'Amplitude of radial variation, affects surface "bulginess"' },
    'paramA': { value: 1, min: 0.5, max: 5, step: 0.1, label: 'Revolution (a)', description: 'Controls v-direction frequency, affects vertical wave patterns' }, 
    'paramB': { value: 1, min: 0.5, max: 3, step: 0.1, label: 'Twist Exp (b)', description: 'Radial power exponent, shapes the cross-sectional profile' }, 
    'paramC': { value: 1, min: 0.5, max: 3, step: 0.1, label: 'Height (c)', description: 'Z-axis scaling factor, controls vertical stretching' },
    'lineDensity': { value: 128, min: 32, max: 256, step: 1, label: 'Line Density', description: 'Wireframe mesh resolution (vertices per dimension)' },
    'lineThickness': { value: 1.0, min: 0.5, max: 5, step: 0.1, label: 'Line Thickness', description: 'Wireframe line width (uses GPU lines when >1)' },
    'twistFactor': { value: 1.0, min: 0.1, max: 3, step: 0.01, label: 'Twist Factor', description: 'Additional twist modulation applied to the manifold' },
    'lfo1Speed': { value: 0.2, min: 0.1, max: 5, step: 0.1, label: 'LFO 1 Speed', description: 'Animation speed for first low frequency oscillator' }, 
    'lfo1Amplitude': { value: 0.5, min: 0, max: 1, step: 0.01, label: 'LFO 1 Amplitude', description: 'Animation depth for first LFO (0=off, 1=full range)' },
    'lfo2Speed': { value: 0.3, min: 0.1, max: 5, step: 0.1, label: 'LFO 2 Speed', description: 'Animation speed for second low frequency oscillator' }, 
    'lfo2Amplitude': { value: 0.5, min: 0, max: 1, step: 0.01, label: 'LFO 2 Amplitude', description: 'Animation depth for second LFO (0=off, 1=full range)' }
};
const modelParamKeys = ['paramN', 'paramM', 'separation', 'paramA', 'paramB', 'paramC', 'twistFactor'];
const lfoParamKeys = ['lfo1Speed', 'lfo1Amplitude', 'lfo2Speed', 'lfo2Amplitude'];
const cameraKeys = ['azimuth', 'elevation', 'distance', 'objectZ'];
const appearanceKeys = ['lineDensity', 'lineThickness'];

const lfoManager = { lfo1: { target: 'none', center: null }, lfo2: { target: 'none', center: null } };
let colorScheme = 'rainbow';
let presets = {};

// Enhanced parameter management with mapping modes and ghost assignments
const parameterManager = {
    mappingModes: {}, // stores 'lin', 'exp', or 'log' for each param
    ghostAssignments: { top: 'none', bottom: 'none', left: 'none', right: 'none' },
    
    init() {
        // Initialize mapping modes to 'lin' for all params
        Object.keys(params).forEach(key => {
            this.mappingModes[key] = 'lin';
        });
    },
    
    applyMapping(key, normalizedValue) {
        const mode = this.mappingModes[key] || 'lin';
        const p = params[key];
        const range = p.max - p.min;
        
        let mappedValue;
        switch(mode) {
            case 'exp':
                // Exponential curve: y = x^2
                mappedValue = p.min + (Math.pow(normalizedValue, 2) * range);
                break;
            case 'log':
                // Logarithmic curve: y = sqrt(x)
                mappedValue = p.min + (Math.sqrt(normalizedValue) * range);
                break;
            case 'lin':
            default:
                // Linear: y = x
                mappedValue = p.min + (normalizedValue * range);
                break;
        }
        
        return Math.max(p.min, Math.min(p.max, mappedValue));
    },
    
    reverseMapping(key, actualValue) {
        const mode = this.mappingModes[key] || 'lin';
        const p = params[key];
        const range = p.max - p.min;
        const normalized = (actualValue - p.min) / range;
        
        switch(mode) {
            case 'exp':
                return Math.sqrt(normalized);
            case 'log':
                return normalized * normalized;
            case 'lin':
            default:
                return normalized;
        }
    },
    
    setGhostAssignment(position, paramKey) {
        this.ghostAssignments[position] = paramKey;
        this.updateGhostSlider(position);
        this.updateAllButtonStates();
    },
    
    updateGhostSlider(position) {
        const slider = dom.ghostSliders[position];
        const paramKey = this.ghostAssignments[position];
        
        if (paramKey && paramKey !== 'none') {
            const p = params[paramKey];
            const normalizedValue = this.reverseMapping(paramKey, p.value);
            slider.value = normalizedValue;
            slider.parentElement.style.opacity = '1';
        } else {
            slider.parentElement.style.opacity = '0';
        }
    },
    
    updateAllButtonStates() {
        // Update all ghost assignment button states
        document.querySelectorAll('.mini-button[data-ghost]').forEach(btn => {
            const paramKey = btn.getAttribute('data-param');
            const ghostPos = btn.getAttribute('data-ghost');
            btn.classList.toggle('ghost-assigned', this.ghostAssignments[ghostPos] === paramKey);
        });
    }
};

// Update the existing settingsManager to use parameterManager
const settingsManager = {
    key: 'cy_settings_v7', // Updated version for mouse controls
    load() {
        try {
            const stored = localStorage.getItem(this.key);
            if (!stored) return;
            const data = JSON.parse(stored);
            if (data.presets) presets = data.presets;
            if (data.parameterManager) {
                parameterManager.mappingModes = data.parameterManager.mappingModes || {};
                parameterManager.ghostAssignments = data.parameterManager.ghostAssignments || parameterManager.ghostAssignments;
            }
            if (data.mouseSettings) {
                Object.assign(mouseSettings, data.mouseSettings);
            }
            if (data.lastState) this.applyState(data.lastState);
        } catch (e) { console.error("Failed to load settings:", e); }
    },
    save() {
        const currentState = this.getCurrentState();
        const dataToStore = { 
            lastState: currentState, 
            presets,
            parameterManager: {
                mappingModes: parameterManager.mappingModes,
                ghostAssignments: parameterManager.ghostAssignments
            },
            mouseSettings: mouseSettings
        };
        localStorage.setItem(this.key, JSON.stringify(dataToStore));
    },
    getCurrentState() {
        const paramValues = {};
        Object.keys(params).forEach(k => paramValues[k] = params[k].value);
        return { paramValues, lfo1Target: lfoManager.lfo1.target, lfo2Target: lfoManager.lfo2.target, colorScheme };
    },
    applyState(state) {
        Object.keys(state.paramValues).forEach(k => { if (params[k]) { updateParamValue(k, state.paramValues[k], true); } });
        lfoManager.lfo1.target = state.lfo1Target || 'none';
        lfoManager.lfo2.target = state.lfo2Target || 'none';
        colorScheme = state.colorScheme || 'rainbow';
        
        configManager.render();
        buildUI();
        needsUpdate.geometry = true;
        needsUpdate.material = true;
    }
};

const configManager = {
    settings: {
        useThickLines: true,
        debugLogging: false
    },
    render() {
        const { useThickLines, debugLogging } = this.settings;
        let html = `<h2 class="text-lg font-bold mb-2">Configuration</h2>`;
        html += `<div class="setting-row">
            <label for="useThickLines">Use Thick Lines</label>
            <input type="checkbox" id="config-useThickLines" ${useThickLines ? 'checked' : ''}>
        </div>`;
        html += `<div class="setting-row">
            <label for="debugLogging">Enable Debug Logs</label>
            <input type="checkbox" id="config-debugLogging" ${debugLogging ? 'checked' : ''}>
        </div>`;
        html += `<button id="force-redraw" class="nav-button mt-4">Force Redraw</button>`;
        dom.panels.config.innerHTML = html;
        this.addEventListeners();
    },
    addEventListeners() {
        document.getElementById('config-useThickLines').addEventListener('change', e => {
            this.settings.useThickLines = e.target.checked;
            needsUpdate.geometry = true;
        });
        document.getElementById('config-debugLogging').addEventListener('change', e => {
            this.settings.debugLogging = e.target.checked;
            window.debugLogger.enabled = this.settings.debugLogging;
        });
        document.getElementById('force-redraw').addEventListener('click', () => {
            needsUpdate.geometry = true;
            updateManifold();
        });
    }
};

function calabiYauFunction(u, v, target) {
    const p = {}; Object.keys(params).forEach(k => p[k] = params[k].value);
    u *= Math.PI * 2; 
    v *= Math.PI * 2;
    
    // Apply twist factor to the v parameter
    const twistedV = v + p.twistFactor * Math.sin(p.paramM * u);
    
    const cos_mu = Math.cos(p.paramM * u);
    const base = Math.abs(cos_mu);
    const r = 1 + p.separation * Math.pow(base, p.paramB);
    
    const x = r * Math.cos(p.paramN * u) * Math.cos(p.paramA * twistedV);
    const y = r * Math.sin(p.paramN * u) * Math.cos(p.paramA * twistedV);
    const z = p.paramC * p.separation * Math.sin(p.paramA * twistedV) * (1 + cos_mu);
    
    target.set(x * 3, y * 3, z * 3);
}

// Global wireframe creation function for consistency
function createWireframeFromGeometry(geometry, useThickLines = false) {
    window.debugLogger.log("Creating wireframe from geometry with", geometry.attributes.position.count, "vertices");
    
    // Create wireframe geometry
    const wireframeGeom = new THREE.WireframeGeometry(geometry);
    window.debugLogger.log("WireframeGeometry created with", wireframeGeom.attributes.position.count, "vertices");
    
    // Apply colors to wireframe
    const wireframeColors = [];
    const wireframePositions = wireframeGeom.attributes.position;
    window.debugLogger.log("Applying colors with scheme:", colorScheme);
    
    for (let i = 0; i < wireframePositions.count; i++) {
        const x = wireframePositions.getX(i);
        const y = wireframePositions.getY(i);
        const hue = (Math.atan2(y, x) / (2 * Math.PI)) + 0.5;
        const finalColor = getColor(hue, colorScheme);
        wireframeColors.push(finalColor.r, finalColor.g, finalColor.b);
    }
    
    wireframeGeom.setAttribute('color', new THREE.Float32BufferAttribute(wireframeColors, 3));
    window.debugLogger.log("Colors applied to wireframe, color count:", wireframeColors.length / 3);
    
    let material, wireframeMesh;
    
    if (useThickLines && params.lineThickness.value > 1) {
        try {
            // Only try expensive thick lines when requested and thickness > 1
            const lineSegmentsGeom = new LineSegmentsGeometry();
            lineSegmentsGeom.setPositions(wireframeGeom.attributes.position.array);
            
            if (wireframeColors.length > 0) {
                lineSegmentsGeom.setColors(wireframeColors);
            }
            
            material = new LineMaterial({
                linewidth: params.lineThickness.value,
                vertexColors: true,
                resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
            });
            
            wireframeMesh = new LineSegments2(lineSegmentsGeom, material);
            wireframeMesh.computeLineDistances();
            
            window.debugLogger.log("Created LineSegments2 with LineMaterial - thick lines enabled");
            wireframeGeom.dispose(); // Clean up temporary geometry
            
        } catch (error) {
            window.debugLogger.warn("LineSegments2 failed, falling back to LineSegments:", error);
            
            // Fallback to basic line segments
            material = new THREE.LineBasicMaterial({
                vertexColors: true
            });
            
            wireframeMesh = new THREE.LineSegments(wireframeGeom, material);
            window.debugLogger.log("Created LineSegments with LineBasicMaterial - basic lines");
        }
    } else {
        // Use fast basic line segments by default
        material = new THREE.LineBasicMaterial({
            vertexColors: true
        });
        
        wireframeMesh = new THREE.LineSegments(wireframeGeom, material);
        window.debugLogger.log("Created LineSegments with LineBasicMaterial - fast rendering");
    }
    
    return wireframeMesh;
}

function updateManifold() {
     if (needsUpdate.geometry) {
        if (wireframe) {
            scene.remove(wireframe);
            wireframe.geometry.dispose();
            wireframe.material.dispose();
        }
        
        window.debugLogger.log("Creating ParametricGeometry...");
        const resolution = params.lineDensity.value;
        const geometry = new ParametricGeometry(calabiYauFunction, resolution, resolution);
        window.debugLogger.log("ParametricGeometry created with", geometry.attributes.position.count, "vertices", `(${resolution}x${resolution})`);
        
        // Use the new wireframe creation function
        wireframe = createWireframeFromGeometry(geometry, configManager.settings?.useThickLines || true);
        scene.add(wireframe);
        window.debugLogger.log("Wireframe added to scene");
        
        geometry.dispose();
        needsUpdate.geometry = false;
        needsUpdate.material = true;
    }

    if (needsUpdate.material) {
        if (wireframe && wireframe.material) {
            // Only handle resolution updates for LineMaterial
            if (wireframe.material.resolution) {
                wireframe.material.resolution.set(window.innerWidth, window.innerHeight);
                wireframe.material.needsUpdate = true;
                window.debugLogger.log("Updated material resolution");
            }
        }
        needsUpdate.material = false;
    }
    if (wireframe) {
        wireframe.position.z = params.objectZ.value;
    }
    camera.lookAt(scene.position);
}

function getColor(hue, scheme) {
    const color = new THREE.Color();
    switch(scheme) {
        case 'fire': return color.setHSL(hue * 0.15, 1.0, 0.5);
        case 'ice': return color.setHSL(hue * 0.2 + 0.55, 1.0, 0.7);
        case 'forest': return color.setHSL(hue * 0.2 + 0.2, 0.8, 0.4);
        default: return color.setHSL(hue, 1.0, 0.5);
    }
}

function init() {
    // Initialize console tracker first to catch any early errors
    if (window.consoleTracker && window.consoleTracker.init) {
        window.consoleTracker.init();
    }
    
    // Initialize parameter manager
    parameterManager.init();
    
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Don't set camera position here - updateCameraPosition will handle it
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000);
    dom.container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    
    configManager.render();
    settingsManager.load();
    buildUI();
    setupEventListeners();
    
    // Initialize info manager
    infoManager.init();
    
    // Set initial camera position
    updateCameraPosition();
    
    needsUpdate.geometry = true;
    updateManifold();
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    
    let hasLFOUpdates = false;
    [1, 2].forEach(n => {
        const lfo = lfoManager[`lfo${n}`];
        if (lfo.target !== 'none') {
            const targetParam = params[lfo.target];
            if (lfo.center === null) lfo.center = targetParam.value;
            const halfRange = (targetParam.max - targetParam.min) / 2;
            const offset = Math.sin(elapsedTime * params[`lfo${n}Speed`].value) * halfRange * params[`lfo${n}Amplitude`].value;
            updateParamValue(lfo.target, lfo.center + offset, false);
            hasLFOUpdates = true;
        }
    });
    
    // Update equations every 10 frames during LFO animations (throttled)
    if (hasLFOUpdates && Math.floor(elapsedTime * 60) % 10 === 0) {
        equationManager.render();
    }
    
    if (needsUpdate.geometry || needsUpdate.material) {
        updateManifold();
    }
    
    // Update camera position using the new system
    updateCameraPosition();
    
    renderer.render(scene, camera);
}

function buildUI() {
    let controlsHTML = `<h2 class="text-lg font-bold mb-2">Camera</h2>`;
    cameraKeys.forEach(key => { controlsHTML += createSliderHTML(key); });
    controlsHTML += `<h3 class="text-md font-semibold mt-4 mb-2 text-gray-300">Model Parameters</h3><div class="param-grid">`;
    modelParamKeys.forEach(key => { controlsHTML += createSliderHTML(key); });
    controlsHTML += `</div>`;
    dom.panels.controls.innerHTML = controlsHTML;

    infoManager.render();
    equationManager.render();
    configManager.render();
    // Don't auto-render debug panel - only when manually opened

    let settingsHTML = '';
    const allAssignableParams = Object.keys(params); // ALL parameters now
    
    settingsHTML += `<details><summary>Presets</summary><div class="grid grid-cols-2 gap-2 mt-2">
        <input type="text" id="preset-name" placeholder="Preset Name..." tabindex="102">
        <button id="save-preset" class="nav-button" tabindex="103">Save</button>
        <select id="preset-select" class="col-span-2" tabindex="104"><option value="">Load Preset...</option></select>
        <button id="delete-preset" class="nav-button bg-red-700 hover:bg-red-600 col-span-2" tabindex="105">Delete Selected Preset</button>
    </div></details>`;
    
    settingsHTML += `<details open><summary>Appearance</summary>
        <div class="setting-row"><label for="color-scheme">Color Scheme</label><select id="color-scheme" tabindex="106">${['rainbow', 'fire', 'ice', 'forest'].map(s => `<option value="${s}" ${colorScheme === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
        ${createSliderHTML('lineThickness', true)}
    </details>`;

    // ALL parameters in ranges now - organized by category
    settingsHTML += `<details><summary>Parameter Ranges & Controls</summary><div id="param-range-settings">`;
    
    // Camera parameters
    settingsHTML += `<h4 class="text-sm font-semibold mt-3 mb-2 text-gray-400">Camera</h4>`;
    cameraKeys.forEach(key => { 
        settingsHTML += createSliderHTML(key, true);
    });
    
    // Model parameters  
    settingsHTML += `<h4 class="text-sm font-semibold mt-3 mb-2 text-gray-400">Model</h4>`;
    modelParamKeys.forEach(key => { 
        settingsHTML += createSliderHTML(key, true);
    });
    
    // Appearance parameters
    settingsHTML += `<h4 class="text-sm font-semibold mt-3 mb-2 text-gray-400">Appearance</h4>`;
    appearanceKeys.forEach(key => { 
        settingsHTML += createSliderHTML(key, true);
    });
    
    // LFO parameters
    settingsHTML += `<h4 class="text-sm font-semibold mt-3 mb-2 text-gray-400">LFO</h4>`;
    lfoParamKeys.forEach(key => { 
        settingsHTML += createSliderHTML(key, true);
    });
    
    settingsHTML += `</div></details>`;
    
    function createLFO_UI(n) {
        return `<details><summary>LFO ${n} Animation</summary>
        <div class="setting-row"><label for="lfo${n}-target">Target</label><select id="lfo${n}-target" tabindex="${110 + n}""><option value="none">None</option>${allAssignableParams.map(k => `<option value="${k}" ${lfoManager[`lfo${n}`].target === k ? 'selected' : ''}>${params[k].label}</option>`).join('')}</select></div>
        ${createSliderHTML(`lfo${n}Speed`, true)}
        ${createSliderHTML(`lfo${n}Amplitude`, true)}
        </details>`;
    }
    settingsHTML += createLFO_UI(1);
    settingsHTML += createLFO_UI(2);
    
    // Mouse controls section
    settingsHTML += `<details><summary>Mouse Controls</summary>
        <div class="setting-row">
            <div class="setting-label">Scroll Wheel Dolly</div>
            <div class="setting-control-line">
                <input type="checkbox" id="mouse-scroll-dolly" ${mouseSettings.scrollDolly ? 'checked' : ''} tabindex="120">
                <label for="mouse-scroll-dolly" style="margin-left: 8px;">Enable scroll wheel camera distance</label>
            </div>
            <div class="setting-value-line">
                <span style="font-size: 11px; color: #9ca3af;">Mouse wheel moves camera closer/farther</span>
                <input type="range" id="scroll-sensitivity" min="0.01" max="0.5" step="0.01" value="${mouseSettings.sensitivity.scroll}" style="width: 80px;">
            </div>
        </div>
        <div class="setting-row">
            <div class="setting-label">Ctrl + Zoom</div>
            <div class="setting-control-line">
                <input type="checkbox" id="mouse-ctrl-zoom" ${mouseSettings.ctrlZoom ? 'checked' : ''} tabindex="121">
                <label for="mouse-ctrl-zoom" style="margin-left: 8px;">Enable Ctrl+scroll object distance</label>
            </div>
            <div class="setting-value-line">
                <span style="font-size: 11px; color: #9ca3af;">Ctrl+wheel moves object closer/farther</span>
                <input type="range" id="zoom-sensitivity" min="0.01" max="0.2" step="0.01" value="${mouseSettings.sensitivity.zoom}" style="width: 80px;">
            </div>
        </div>
        <div class="setting-row">
            <div class="setting-label">Click & Drag</div>
            <div class="setting-control-line">
                <input type="checkbox" id="mouse-click-drag" ${mouseSettings.clickDrag ? 'checked' : ''} tabindex="122">
                <label for="mouse-click-drag" style="margin-left: 8px;">Enable click-drag camera orbit</label>
            </div>
            <div class="setting-value-line">
                <span style="font-size: 11px; color: #9ca3af;">Left-click drag to orbit around object</span>
                <input type="range" id="drag-sensitivity" min="0.005" max="0.05" step="0.005" value="${mouseSettings.sensitivity.drag}" style="width: 80px;">
            </div>
        </div>
    </details>`;
    
    dom.settings.content.innerHTML = settingsHTML;
    
    updatePresetList();
    parameterManager.updateAllButtonStates();
    Object.values(dom.ghostSliders).forEach((slider, index) => {
        const positions = ['top', 'bottom', 'left', 'right'];
        parameterManager.updateGhostSlider(positions[index]);
    });
}

function createSliderHTML(key, inSettings = false){
    const p = params[key];
    const isFloat = p.step < 1;
    const containerClass = inSettings ? 'setting-row with-buttons' : 'control-item';
    const id = inSettings ? `settings-${key}` : key;

    let buttonGroups = '';
    if (inSettings) {
        // Ghost assignment buttons
        buttonGroups += `<div class="button-group">`;
        ['T', 'R', 'B', 'L'].forEach(pos => {
            const position = pos === 'T' ? 'top' : pos === 'R' ? 'right' : pos === 'B' ? 'bottom' : 'left';
            const isAssigned = parameterManager.ghostAssignments[position] === key;
            buttonGroups += `<button class="mini-button ${isAssigned ? 'ghost-assigned' : ''}" 
                data-param="${key}" data-ghost="${position}" title="Assign to ${position} ghost slider">${pos}</button>`;
        });
        buttonGroups += `</div>`;
        
        // Mapping mode buttons  
        buttonGroups += `<div class="button-group">`;
        ['lin', 'exp', 'log'].forEach(mode => {
            const isActive = parameterManager.mappingModes[key] === mode;
            buttonGroups += `<button class="mini-button ${isActive ? 'active' : ''}" 
                data-param="${key}" data-mapping="${mode}" title="${mode} mapping curve">${mode}</button>`;
        });
        buttonGroups += `</div>`;
    }

    if (inSettings) {
        return `<div class="${containerClass}" id="container-${id}">
            <div class="setting-label">${p.label}</div>
            <div class="setting-control-line">
                <input type="range" id="${id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" style="flex: 1;">
                <span class="value-display" id="value-${id}">${p.value.toFixed(isFloat ? 2 : 0)}</span>
            </div>
            <div class="setting-value-line">
                <span style="font-size: 11px; color: #9ca3af;">${p.description}</span>
                <div style="display: flex; gap: 8px;">
                    ${buttonGroups}
                </div>
            </div>
        </div>`;
    } else {
        return `<div class="${containerClass}" id="container-${id}">
            <span class="control-label">${p.label}</span>
            <span class="control-description">${p.description}</span>
            <div class="flex items-center">
                <input type="range" id="${id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" 
                    data-long-click="true" style="flex: 1; margin-right: 8px;">
                <span class="value-display" id="value-${id}">${p.value.toFixed(isFloat ? 2 : 0)}</span>
            </div>
        </div>`;
    }
}

function updateParamValue(key, value, fromLoad = false) {
    const p = params[key];
    if (!p) return;
    const isFloat = p.step < 1;
    value = parseFloat(value);
    if (isNaN(value)) return;

    p.value = Math.max(p.min, Math.min(p.max, value));

    const slider = document.getElementById(key) || document.getElementById(`settings-${key}`);
    const valueDisplay = document.getElementById(`value-${key}`) || document.getElementById(`value-settings-${key}`);
    
    if (slider) slider.value = p.value;
    if (valueDisplay) valueDisplay.textContent = p.value.toFixed(isFloat ? 2 : 0);

    const settingsSlider = document.getElementById(`settings-${key}`);
    if (settingsSlider && settingsSlider !== slider) {
        settingsSlider.value = p.value;
        const settingsValueDisplay = document.getElementById(`value-settings-${key}`);
        if (settingsValueDisplay) settingsValueDisplay.textContent = p.value.toFixed(isFloat ? 2 : 0);
    }
    
    Object.keys(dom.ghostSliders).forEach(pos => {
        if (parameterManager.ghostAssignments[pos] === key) {
            parameterManager.updateGhostSlider(pos);
        }
    });

    if (!fromLoad) {
        if (modelParamKeys.includes(key)) {
            needsUpdate.geometry = true;
            // Update equations in real time when model parameters change
            equationManager.render();
        }
        if (appearanceKeys.includes(key)) needsUpdate.material = true;

        const container = document.getElementById(`container-${key}`) || document.getElementById(`container-settings-${key}`);
        if (container) {
            container.classList.add('is-highlighted');
            setTimeout(() => container.classList.remove('is-highlighted'), 500);
        }
    }
}

function setupEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        needsUpdate.material = true;
    }, false);

    Object.keys(dom.toggles).forEach(key => {
        dom.toggles[key].addEventListener('click', () => {
            const panel = dom.panels[key];
            if (panel) {
                panel.classList.toggle('is-hidden');
                dom.toggles[key].classList.toggle('active');
            }
        });
    });

    // Prevent settings modal from closing when clicking inside it
    dom.settings.closeBtn.addEventListener('click', () => dom.panels.settings.classList.add('is-hidden'));
    
    // Prevent modal from closing when clicking inside the modal content
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Close modal when clicking the overlay
    document.getElementById('settings-modal-overlay').addEventListener('click', () => {
        dom.panels.settings.classList.add('is-hidden');
    });

    dom.panels.controls.addEventListener('input', e => {
        if (e.target.type === 'range') updateParamValue(e.target.id, e.target.value);
    });
    
    // Enhanced settings content event handling
    dom.settings.content.addEventListener('click', e => {
        e.stopPropagation(); // Prevent modal from closing
        
        if (e.target.classList.contains('mini-button')) {
            const paramKey = e.target.getAttribute('data-param');
            
            if (e.target.hasAttribute('data-ghost')) {
                // Ghost assignment button
                const ghostPos = e.target.getAttribute('data-ghost');
                const currentAssignment = parameterManager.ghostAssignments[ghostPos];
                
                if (currentAssignment === paramKey) {
                    // Unassign if already assigned
                    parameterManager.setGhostAssignment(ghostPos, 'none');
                } else {
                    // Assign to this position
                    parameterManager.setGhostAssignment(ghostPos, paramKey);
                }
                settingsManager.save();
            } else if (e.target.hasAttribute('data-mapping')) {
                // Mapping mode button
                const mode = e.target.getAttribute('data-mapping');
                parameterManager.mappingModes[paramKey] = mode;
                
                // Update button states
                const paramButtons = document.querySelectorAll(`[data-param="${paramKey}"][data-mapping]`);
                paramButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update ghost sliders that use this parameter
                Object.keys(parameterManager.ghostAssignments).forEach(pos => {
                    if (parameterManager.ghostAssignments[pos] === paramKey) {
                        parameterManager.updateGhostSlider(pos);
                    }
                });
                
                settingsManager.save();
            }
        }
    });
    
    dom.settings.content.addEventListener('input', e => {
        const targetId = e.target.id;
        if (e.target.type === 'range') {
            updateParamValue(targetId.replace('settings-', ''), e.target.value);
        } else if (e.target.tagName === 'SELECT') {
            if (targetId.startsWith('lfo')) {
                const [_, n, field] = targetId.match(/lfo(\d+)-(\w+)/);
                lfoManager[`lfo${n}`][field] = e.target.value;
                if (field === 'target' && e.target.value === 'none') lfoManager[`lfo${n}`].center = null;
            } else if (targetId === 'color-scheme') {
                colorScheme = e.target.value;
                needsUpdate.geometry = true; // Full redraw needed
            } else if (targetId === 'mouse-scroll-dolly') {
                mouseSettings.scrollDolly = e.target.checked;
                settingsManager.save();
            } else if (targetId === 'mouse-ctrl-zoom') {
                mouseSettings.ctrlZoom = e.target.checked;
                settingsManager.save();
            } else if (targetId === 'mouse-click-drag') {
                mouseSettings.clickDrag = e.target.checked;
                settingsManager.save();
            } else if (targetId === 'scroll-sensitivity') {
                mouseSettings.sensitivity.scroll = parseFloat(e.target.value);
                settingsManager.save();
            } else if (targetId === 'zoom-sensitivity') {
                mouseSettings.sensitivity.zoom = parseFloat(e.target.value);
                settingsManager.save();
            } else if (targetId === 'drag-sensitivity') {
                mouseSettings.sensitivity.drag = parseFloat(e.target.value);
                settingsManager.save();
            }
        } else if (e.target.type === 'number' && targetId.includes('-')) {
            const [type, key] = targetId.split('-');
            params[key][type] = parseFloat(e.target.value);
            buildUI();
        }
    });

    document.getElementById('save-preset').addEventListener('click', () => {
        const name = document.getElementById('preset-name').value;
        if (!name) { 
            showNotification('Please enter a name for the preset.', 'warning');
            return; 
        }
        presets[name] = settingsManager.getCurrentState();
        settingsManager.save();
        updatePresetList();
        showNotification(`Preset "${name}" saved successfully!`, 'success');
    });

    document.getElementById('delete-preset').addEventListener('click', () => {
        const name = document.getElementById('preset-select').value;
        if (!name || !presets[name]) return;
        if (confirm(`Are you sure you want to delete the preset "${name}"?`)) {
            delete presets[name];
            settingsManager.save();
            updatePresetList();
            showNotification(`Preset "${name}" deleted.`, 'info');
        }
    });

    document.getElementById('preset-select').addEventListener('change', e => {
        const name = e.target.value;
        if (name && presets[name]) {
            settingsManager.applyState(presets[name]);
            showNotification(`Preset "${name}" loaded.`, 'success');
        }
    });

    // Enhanced ghost slider handling with mapping
    Object.keys(dom.ghostSliders).forEach(pos => {
        dom.ghostSliders[pos].addEventListener('input', e => {
            const assignedParam = parameterManager.ghostAssignments[pos];
            if (assignedParam && assignedParam !== 'none') {
                const normalizedValue = parseFloat(e.target.value);
                const mappedValue = parameterManager.applyMapping(assignedParam, normalizedValue);
                updateParamValue(assignedParam, mappedValue);
            }
        });
    });
    
    // Long-click functionality for parameter popup
    setupLongClickHandlers();
    
    // Panel drag/resize logic
    makeResizable(dom.panels.info);
    makeResizable(dom.panels.config);

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
        if (e.ctrlKey) {
            const keyMap = { 'c': 'controls', 'i': 'info', 'e': 'equation', 'g': 'config', 't': 'threejsDebug', 's': 'settings' };
            if (keyMap[e.key]) {
                e.preventDefault();
                dom.toggles[keyMap[e.key]].click();
            }
        }
    });
    
    // Mouse controls
    setupMouseControls();
}

function setupMouseControls() {
    const canvas = renderer.domElement;
    
    // Scroll wheel handling
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (e.ctrlKey && mouseSettings.ctrlZoom) {
            // Ctrl+Scroll: Z-axis zoom (object distance)
            const delta = e.deltaY * mouseSettings.sensitivity.zoom;
            params.objectZ.value = Math.max(params.objectZ.min, 
                Math.min(params.objectZ.max, params.objectZ.value + delta));
            updateParamValue('objectZ', params.objectZ.value);
        } else if (mouseSettings.scrollDolly) {
            // Regular scroll: Dolly in/out (camera distance)
            const delta = e.deltaY * mouseSettings.sensitivity.scroll;
            params.distance.value = Math.max(params.distance.min, 
                Math.min(params.distance.max, params.distance.value + delta));
            updateParamValue('distance', params.distance.value);
        }
    });
    
    // Mouse drag handling
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 && mouseSettings.clickDrag) { // Left mouse button
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && mouseSettings.clickDrag) {
            const deltaX = (e.clientX - lastMouseX) * mouseSettings.sensitivity.drag * 50; // Scale for degrees
            const deltaY = (e.clientY - lastMouseY) * mouseSettings.sensitivity.drag * 50;
            
            // Update azimuth and elevation
            params.azimuth.value = Math.max(params.azimuth.min, 
                Math.min(params.azimuth.max, params.azimuth.value + deltaX));
            params.elevation.value = Math.max(params.elevation.min, 
                Math.min(params.elevation.max, params.elevation.value - deltaY)); // Invert Y for natural movement
                
            updateParamValue('azimuth', params.azimuth.value);
            updateParamValue('elevation', params.elevation.value);
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });
    
    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            isDragging = false;
            canvas.style.cursor = 'grab';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'default';
    });
    
    // Set initial cursor
    canvas.style.cursor = 'grab';
}

function updateCameraPosition() {
    // Calculate spherical coordinates based on azimuth, elevation and distance
    const phi = params.azimuth.value * (Math.PI / 180); // Horizontal rotation (radians)
    const theta = params.elevation.value * (Math.PI / 180); // Vertical rotation (radians)
    const distance = params.distance.value;
    
    camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
    camera.position.y = distance * Math.sin(theta);
    camera.position.z = distance * Math.cos(phi) * Math.cos(theta);
    
    camera.lookAt(0, 0, 0);
}

// Long-click handler setup
function setupLongClickHandlers() {
    let longClickTimer = null;
    let isLongClick = false;
    
    document.addEventListener('mousedown', (e) => {
        if (e.target.hasAttribute('data-long-click')) {
            isLongClick = false;
            const paramKey = e.target.id;
            
            longClickTimer = setTimeout(() => {
                isLongClick = true;
                showParameterPopup(paramKey, e.clientX, e.clientY);
            }, 500); // 500ms for long click
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (longClickTimer) {
            clearTimeout(longClickTimer);
            longClickTimer = null;
        }
    });
    
    document.addEventListener('mousemove', () => {
        if (longClickTimer) {
            clearTimeout(longClickTimer);
            longClickTimer = null;
        }
    });
}

// Parameter popup functionality
function showParameterPopup(paramKey, x, y) {
    // Remove existing popup
    const existingPopup = document.querySelector('.param-popup');
    if (existingPopup) existingPopup.remove();
    
    const p = params[paramKey];
    const currentMapping = parameterManager.mappingModes[paramKey] || 'lin';
    
    const popup = document.createElement('div');
    popup.className = 'param-popup';
    popup.style.left = Math.min(x, window.innerWidth - 350) + 'px';
    popup.style.top = Math.min(y, window.innerHeight - 200) + 'px';
    
    popup.innerHTML = `
        <button class="close-btn">&times;</button>
        <h3>${p.label}</h3>
        <div class="popup-row">
            <span class="popup-label">Min:</span>
            <input type="number" class="popup-input" id="popup-min-${paramKey}" value="${p.min}" step="${p.step}">
        </div>
        <div class="popup-row">
            <span class="popup-label">Max:</span>
            <input type="number" class="popup-input" id="popup-max-${paramKey}" value="${p.max}" step="${p.step}">
        </div>
        <div class="popup-row">
            <span class="popup-label">Value:</span>
            <input type="number" class="popup-input" id="popup-value-${paramKey}" value="${p.value}" step="${p.step}">
        </div>
        <div class="popup-row">
            <span class="popup-label">Mapping:</span>
            <div class="button-group">
                ${['lin', 'exp', 'log'].map(mode => 
                    `<button class="mini-button ${currentMapping === mode ? 'active' : ''}" data-popup-mapping="${mode}">${mode}</button>`
                ).join('')}
            </div>
        </div>
        <div class="popup-row">
            <span class="popup-label">Ghost:</span>
            <div class="button-group">
                ${['T', 'R', 'B', 'L'].map(pos => {
                    const position = pos === 'T' ? 'top' : pos === 'R' ? 'right' : pos === 'B' ? 'bottom' : 'left';
                    const isAssigned = parameterManager.ghostAssignments[position] === paramKey;
                    return `<button class="mini-button ${isAssigned ? 'ghost-assigned' : ''}" data-popup-ghost="${position}">${pos}</button>`;
                }).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Add event listeners for popup
    popup.querySelector('.close-btn').addEventListener('click', () => popup.remove());
    
    // Click outside to close
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 100);
    
    // Handle popup controls
    popup.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-popup-mapping')) {
            const mode = e.target.getAttribute('data-popup-mapping');
            parameterManager.mappingModes[paramKey] = mode;
            popup.querySelectorAll('[data-popup-mapping]').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            settingsManager.save();
        } else if (e.target.hasAttribute('data-popup-ghost')) {
            const position = e.target.getAttribute('data-popup-ghost');
            const currentAssignment = parameterManager.ghostAssignments[position];
            
            if (currentAssignment === paramKey) {
                parameterManager.setGhostAssignment(position, 'none');
                e.target.classList.remove('ghost-assigned');
            } else {
                parameterManager.setGhostAssignment(position, paramKey);
                popup.querySelectorAll('[data-popup-ghost]').forEach(btn => btn.classList.remove('ghost-assigned'));
                e.target.classList.add('ghost-assigned');
            }
            settingsManager.save();
        }
    });
    
    popup.addEventListener('input', (e) => {
        const targetId = e.target.id;
        if (targetId.startsWith('popup-min-')) {
            p.min = parseFloat(e.target.value);
            buildUI();
        } else if (targetId.startsWith('popup-max-')) {
            p.max = parseFloat(e.target.value);
            buildUI();
        } else if (targetId.startsWith('popup-value-')) {
            updateParamValue(paramKey, parseFloat(e.target.value));
        }
    });
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed; top: 80px; right: 20px; z-index: 300;
        padding: 12px 16px; border-radius: 6px; font-size: 14px;
        background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transform: translateX(400px); transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    
    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updatePresetList() {
    const select = document.getElementById('preset-select');
    select.innerHTML = `<option value="">Load Preset...</option>` + Object.keys(presets).map(name => `<option value="${name}">${name}</option>`).join('');
}

// Draggable Panel Logic
function makeResizable(panel) {
    if (!panel) return;
    const handle = panel.querySelector('.resize-handle');
    if (!handle) return;
    
    let isResizing = false;
    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        let startX = e.clientX;
        let startWidth = panel.offsetWidth;
        
        const doDrag = (moveEvent) => {
            if (!isResizing) return;
            let newWidth = startWidth - (moveEvent.clientX - startX);
            if (panel.style.right.endsWith('px')) { // if right-aligned
                newWidth = startWidth - (moveEvent.clientX - startX);
            } else { // if left-aligned
                newWidth = startWidth + (moveEvent.clientX - startX);
            }

            panel.style.width = `${Math.max(200, newWidth)}px`;
        };
        
        const stopDrag = () => {
            isResizing = false;
            window.removeEventListener('mousemove', doDrag);
            window.removeEventListener('mouseup', stopDrag);
        };
        
        window.addEventListener('mousemove', doDrag);
        window.addEventListener('mouseup', stopDrag);
    });
}

const equationManager = {
    render() {
        const p = {}; Object.keys(params).forEach(k => p[k] = params[k].value);
        
        // Check which parameters are being animated by LFOs
        const animatedParams = new Set();
        if (lfoManager.lfo1.target !== 'none') animatedParams.add(lfoManager.lfo1.target);
        if (lfoManager.lfo2.target !== 'none') animatedParams.add(lfoManager.lfo2.target);
        
        // Helper function to colorize parameter if animated
        const colorParam = (paramKey, value) => {
            if (animatedParams.has(paramKey)) {
                return `<span style="color: #f59e0b; font-weight: bold;">${value}</span>`;
            }
            return value;
        };
        
        // Dynamic equations with current values
        const eq = `
            $$v_{twisted} = v + ${colorParam('twistFactor', p.twistFactor.toFixed(2))} \\sin(${colorParam('paramM', p.paramM)}u)$$
            $$r(u) = 1 + ${colorParam('separation', p.separation.toFixed(2))} |\\cos(${colorParam('paramM', p.paramM)}u)|^{${colorParam('paramB', p.paramB.toFixed(2))}}$$
            $$x(u,v) = r(u) \\cos(${colorParam('paramN', p.paramN)}u) \\cos(${colorParam('paramA', p.paramA.toFixed(2))}v_{twisted})$$
            $$y(u,v) = r(u) \\sin(${colorParam('paramN', p.paramN)}u) \\cos(${colorParam('paramA', p.paramA.toFixed(2))}v_{twisted})$$
            $$z(u,v) = ${colorParam('paramC', p.paramC.toFixed(2))} \\cdot ${colorParam('separation', p.separation.toFixed(2))} \\sin(${colorParam('paramA', p.paramA.toFixed(2))}v_{twisted}) (1 + \\cos(${colorParam('paramM', p.paramM)}u))$$
        `;
        
        // Single column parameter info above equations
        let paramInfo = `<div class="mb-3" style="font-size: 11px; font-family: monospace; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">`;
        paramInfo += `<strong style="color: #60a5fa;">Current Parameter Values:</strong><br>`;
        
        // Display all model parameters in a single column
        modelParamKeys.forEach(key => {
            const param = params[key];
            const isAnimated = animatedParams.has(key);
            const color = isAnimated ? '#f59e0b' : '#e5e7eb';
            const symbol = key === 'paramN' ? 'n' : 
                          key === 'paramM' ? 'm' : 
                          key === 'paramA' ? 'a' : 
                          key === 'paramB' ? 'b' : 
                          key === 'paramC' ? 'c' : 
                          key === 'separation' ? 'sep' :
                          key === 'twistFactor' ? 'twist' : key;
            
            const value = param.step < 1 ? p[key].toFixed(2) : p[key].toString();
            paramInfo += `<span style="color: ${color};">${symbol}=${value}</span> - ${param.description}<br>`;
        });
        
        paramInfo += `<br><strong style="color: #60a5fa;">Rendering:</strong><br>`;
        paramInfo += `Resolution: ${params.lineDensity.value}² vertices, `;
        paramInfo += `Line Thickness: ${params.lineThickness.value}`;
        
        if (animatedParams.size > 0) {
            paramInfo += `<br><strong style="color: #f59e0b;">Animated:</strong> `;
            paramInfo += Array.from(animatedParams).map(key => {
                const param = params[key];
                return `${param.label} (LFO)`;
            }).join(', ');
        }
        
        paramInfo += `</div>`;
        
        dom.panels.equation.innerHTML = `<h2 class="text-lg font-bold mb-2">Defining Equations</h2>${paramInfo}${eq}`;
        if (window.MathJax && window.MathJax.startup) {
            window.MathJax.startup.promise.then(() => {
                window.MathJax.typesetPromise([dom.panels.equation]);
            });
        }
    }
};

const threejsDebugManager = {
    render() {
        if (!scene || !renderer) {
            dom.panels.threejsDebug.innerHTML = `<p>Not initialized.</p>`;
            return;
        }
        
        let html = `<h2 class="text-lg font-bold mb-2">Three.js Debug</h2>`;
        
        // Scene Information
        html += `<div class="mb-4">`;
        html += `<h3 class="text-md font-semibold mb-2 text-gray-300">Scene Stats</h3>`;
        html += `<strong>Objects:</strong> ${scene.children.length}<br>`;
        html += `<strong>Triangles:</strong> ${renderer.info.render.triangles.toLocaleString()}<br>`;
        html += `<strong>Draw Calls:</strong> ${renderer.info.render.calls}<br>`;
        html += `<strong>Geometries:</strong> ${renderer.info.memory.geometries}<br>`;
        html += `<strong>Textures:</strong> ${renderer.info.memory.textures}<br>`;
        html += `</div>`;
        
        // Current Parameters
        html += `<div class="mb-4">`;
        html += `<h3 class="text-md font-semibold mb-2 text-gray-300">Live Parameters</h3>`;
        html += `<div style="font-size: 11px; font-family: monospace;">`;
        Object.keys(params).forEach(key => {
            const p = params[key];
            html += `<div style="margin-bottom: 2px;"><span style="color: #60a5fa;">${key}:</span> ${p.value.toFixed(p.step < 1 ? 2 : 0)}</div>`;
        });
        html += `</div></div>`;
        
        // Wireframe Information
        if (wireframe) {
            html += `<div class="mb-4">`;
            html += `<h3 class="text-md font-semibold mb-2 text-gray-300">Wireframe</h3>`;
            html += `<strong>Type:</strong> ${wireframe.material.constructor.name}<br>`;
            html += `<strong>Vertices:</strong> ${wireframe.geometry.attributes.position.count.toLocaleString()}<br>`;
            if (wireframe.material.linewidth) {
                html += `<strong>Line Width:</strong> ${wireframe.material.linewidth}<br>`;
            }
            html += `<strong>Color Scheme:</strong> ${colorScheme}<br>`;
            html += `</div>`;
        }
        
        // Performance Metrics
        html += `<div class="mb-4">`;
        html += `<h3 class="text-md font-semibold mb-2 text-gray-300">Performance</h3>`;
        html += `<strong>Resolution:</strong> ${params.lineDensity.value}x${params.lineDensity.value}<br>`;
        html += `<strong>Pixel Ratio:</strong> ${renderer.getPixelRatio()}<br>`;
        html += `<strong>Canvas Size:</strong> ${renderer.domElement.width}x${renderer.domElement.height}<br>`;
        html += `</div>`;
        
        // Console Tracker
        html += `<h3 class="text-md font-semibold mt-4 mb-2 text-gray-300">Console</h3>`;
        html += `<div class="mb-2">`;
        html += `<button id="clear-console-btn" class="nav-button text-sm mr-2">Clear</button>`;
        html += `<button id="toggle-debug-btn" class="nav-button text-sm">${window.debugLogger.enabled ? 'Disable' : 'Enable'} Debug</button>`;
        html += `</div>`;
        
        const entries = window.consoleTracker ? window.consoleTracker.getRecentEntries() : [];
        if (entries.length > 0) {
            html += `<ul style="font-size: 11px; max-height: 200px; overflow-y: auto; font-family: monospace;">`;
            entries.forEach(entry => {
                const color = entry.type === 'error' ? '#ef4444' : entry.type === 'warning' ? '#eab308' : '#10b981';
                html += `<li style="color:${color}; border-bottom: 1px solid #374151; padding: 4px 0; margin-bottom: 2px;">
                    <span style="font-weight:bold; color: #9ca3af;">[${entry.timestamp}]</span> ${entry.message}
                </li>`;
            });
            html += `</ul>`;
        } else {
            html += `<p class="text-sm text-gray-400">No console messages.</p>`;
        }

        dom.panels.threejsDebug.innerHTML = html;

        // Add event listeners
        const clearBtn = document.getElementById('clear-console-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', window.clearConsoleTracker);
        }
        
        const toggleBtn = document.getElementById('toggle-debug-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                window.debugLogger.toggle();
                this.render(); // Re-render to update button text
            });
        }
    },
    init() {
        // Enable debug logging by default
        window.debugLogger.enabled = true;
        
        setInterval(() => {
            if (!dom.panels.threejsDebug.classList.contains('is-hidden')) {
                this.render();
            }
        }, 1000);
    }
};
threejsDebugManager.init();

const infoManager = {
    key: 'cy_info_panel_v1',
    infos: [],
    currentIndex: 0,
    fontSize: 'md',
    fetchData() {
        // Find the info.json file, and if it's there, we fetch from it. Otherwise, we fetch from a remote URL.
        const infoUrl = 'info.json';
        fetch(infoUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Local info.json not found, falling back to remote.');
                }
                return response.json();
            })
            .catch(() => {
                console.warn("Fetching local info.json failed, trying remote.");
                return fetch('https://gist.githubusercontent.com/mricos/c73d742617f693a10c732cabd92d46e3/raw/info.json').then(r => r.json());
            })
            .then(data => {
                this.infos = data;
                this.render();
            })
            .catch(error => console.error("Error fetching info data:", error));
    },
    loadState() {
        try {
            const stored = localStorage.getItem(this.key);
            if (stored) {
                const data = JSON.parse(stored);
                this.currentIndex = data.currentIndex || 0;
                this.fontSize = data.fontSize || 'md';
            }
        } catch (e) {
            console.error("Failed to load info panel state:", e);
        }
    },
    saveState() {
        const state = { currentIndex: this.currentIndex, fontSize: this.fontSize };
        localStorage.setItem(this.key, JSON.stringify(state));
    },
    init() {
        this.loadState();
        this.fetchData();
    },
    render() {
        const panel = dom.panels.info;
        if (!panel) return;
        
        panel.className = `panel info-display-${this.fontSize}`; // Reset classes
        if (this.infos.length === 0) {
            panel.innerHTML = '<p>Loading info...</p>';
            return;
        }

        const info = this.infos[this.currentIndex];
        const html = `
            <div class="resize-handle"></div>
            <div class="info-header">
                <h2 class="info-title">${info.title}</h2>
                <div class="info-controls">
                    <button id="info-prev" class="nav-button" ${this.currentIndex === 0 ? 'disabled' : ''}>&lt;</button>
                    <button id="info-next" class="nav-button" ${this.currentIndex === this.infos.length - 1 ? 'disabled' : ''}>&gt;</button>
                </div>
            </div>
            <div class="info-text">${info.text}</div>
            <div class="info-meta">
                <span>Entry ${this.currentIndex + 1} of ${this.infos.length}</span>
                <div class="info-size-controls">
                    <button class="size-btn ${this.fontSize === 'sm' ? 'active' : ''}" data-size="sm">S</button>
                    <button class="size-btn ${this.fontSize === 'md' ? 'active' : ''}" data-size="md">M</button>
                    <button class="size-btn ${this.fontSize === 'lg' ? 'active' : ''}" data-size="lg">L</button>
                </div>
            </div>
        `;
        panel.innerHTML = html;
        this.addEventListeners();
    },
    addEventListeners() {
        document.getElementById('info-prev')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('info-next')?.addEventListener('click', () => this.navigate(1));
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFontSize(e.target.dataset.size));
        });
    },
    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.infos.length) {
            this.currentIndex = newIndex;
            this.saveState();
            this.render();
        }
    },
    setFontSize(size) {
        this.fontSize = size;
        this.saveState();
        this.render();
    }
};

// Mouse control settings
const mouseSettings = {
    scrollDolly: true,
    ctrlZoom: true,
    clickDrag: true,
    sensitivity: {
        scroll: 0.1,
        zoom: 0.05,
        drag: 0.01
    }
};

// Mouse control state
const mouseControl = {
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
};

// Start the application
init(); 