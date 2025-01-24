// index.js

document.addEventListener("DOMContentLoaded", () => {
    // Initialize parameters
    window.params = {
        maxLayers: 5,
        degree: 4,
        modelsPerLayer: 7,
        alpha: 0.05
    };

    // Function to update all visualizations based on current parameters
    window.updateVisualizations = () => {
        // Update equation display
        const equationElement = document.getElementById('dynamicEquation');
        if (equationElement) {
            let equation = 'y = ';
            for (let i = 0; i <= window.params.degree; i++) {
                if (i === 0) {
                    equation += 'w_0';
                } else {
                    equation += ` + w_${i}x^${i}`;
                }
            }
            equationElement.innerHTML = `\\[ ${equation} \\]`;
            MathJax.typesetPromise([equationElement]);
        }

        // Update layer visualization
        if (typeof drawLayerVisualization === 'function') {
            drawLayerVisualization('layerVisualization', {
                currentLayer: 0,
                currentModel: 0,
                maxLayers: window.params.maxLayers,
                modelsPerLayer: window.params.modelsPerLayer,
                layers: []
            });
        }
    };

    // Parameter adjustment function
    window.adjustParam = (param, delta) => {
        const input = document.getElementById(param);
        if (!input) return;

        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || Infinity;
        const step = parseFloat(input.step) || 1;
        
        let newValue = parseFloat(input.value) + delta;
        newValue = Math.max(min, Math.min(max, newValue));
        newValue = Math.round(newValue / step) * step;
        
        input.value = newValue;
        window.params[param] = newValue;
        
        // Update visualizations on parameter change
        window.updateVisualizations();
    };

    // Add input event listeners
    ['maxLayers', 'degree', 'modelsPerLayer', 'alpha'].forEach(param => {
        const input = document.getElementById(param);
        if (input) {
            input.addEventListener('input', (e) => {
                window.params[param] = parseFloat(e.target.value);
                window.updateVisualizations();
            });
        }
    });

    // Train model button click handler
    document.getElementById("trainModel").addEventListener("click", () => {
        if (typeof window.logEvent !== 'function') {
            console.error("logEvent is not properly initialized");
            return;
        }
        window.logEvent('Train Model button clicked');
        window.PubSub.publish('startTraining');
    });

    // Subscribe to parameter changes
    window.PubSub.subscribe('parameterChange', (msg, data) => {
        if (data.alpha !== undefined) {
            console.log(`Received alpha change: ${data.alpha}`);
            if (window.stateManager.currentState === AppState.RUNNING && gmdh) {
                gmdh.setAlpha(data.alpha);
                window.logEvent('Alpha parameter updated live', { alpha: data.alpha });
            }
        }
    });

    // Initial visualization update
    window.updateVisualizations();
});

function updateEquationDisplay(coefficients) {
    const equationElement = document.getElementById('dynamicEquation');
    if (!equationElement) return;

    let equation = 'y = ';
    coefficients.forEach((coef, index) => {
        if (index === 0) {
            equation += `${coef.toFixed(3)}`;
        } else {
            equation += ` + ${coef.toFixed(3)}x^${index}`;
        }
    });

    equationElement.innerHTML = `\\[ ${equation} \\]`;
    MathJax.typesetPromise([equationElement]);
}

// Example usage: updateEquationDisplay([1.23, -0.45, 0.67, -0.89]);

// Integrate this function call into your training loop
function onModelUpdate(newCoefficients) {
    updateEquationDisplay(newCoefficients);
}
