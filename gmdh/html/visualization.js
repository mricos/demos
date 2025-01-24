// visualization.js

let gmdh;  // Global reference to GMDH instance
let X, y;  // Data for visualization
let currentLayer = 0;
let trainingInProgress = false;

/**
 * Plots training data, validation data, and true function.
 */
function plotData() {
    const canvas = document.getElementById("dataChart");
    if (!canvas) {
        console.error("Error: Canvas element 'dataChart' not found!");
        return;
    }

    const ctx = canvas.getContext("2d");

    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "Training Data",
                    data: X.X_train.map((xi, i) => ({ x: xi, y: X.y_train[i] })),
                    backgroundColor: "blue",
                },
                {
                    label: "Validation Data",
                    data: X.X_val.map((xi, i) => ({ x: xi, y: X.y_val[i] })),
                    backgroundColor: "green",
                },
                {
                    label: "True Function",
                    data: Array.from({ length: 100 }, (_, i) => {
                        const x = i / 99;
                        return { x, y: Math.sin(2 * Math.PI * x) };
                    }),
                    borderColor: "red",
                    fill: false,
                    showLine: true,
                },
            ],
        },
        options: {
            responsive: false,
            height: 400,
            width: 600,
            scales: {
                x: { title: { display: true, text: "X" } },
                y: { title: { display: true, text: "Y" } },
            },
        },
    });
}

/**
 * Plots the training and validation loss curves.
 */
function plotLossChart(trainErrors, validationErrors) {
    const canvas = document.getElementById('lossChart');
    if (!canvas) {
        console.error("Error: Canvas element 'lossChart' not found!");
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Clear existing chart if it exists
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    // Calculate total epochs (models evaluated)
    const totalEpochs = gmdh.maxLayers * gmdh.modelsPerLayer;
    const currentEpoch = (gmdh.currentLayer * gmdh.modelsPerLayer) + gmdh.currentModel;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: currentEpoch + 1 }, (_, i) => `Epoch ${i + 1}`),
            datasets: [
                {
                    label: 'Training Loss',
                    data: gmdh.epochTrainErrors || [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Validation Loss',
                    data: gmdh.epochValErrors || [],
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Mean Squared Error'
                    },
                    type: 'logarithmic'
                },
                x: {
                    title: {
                        display: true,
                        text: 'Training Epoch'
                    }
                }
            },
            animation: {
                duration: 0
            }
        }
    });
}

/**
 * Plots the current model's predictions against the data.
 */
function plotPredictions() {
    const canvas = document.getElementById("predictionChart");
    if (!canvas) {
        console.error("Error: Canvas element 'predictionChart' not found!");
        return;
    }

    const ctx = canvas.getContext("2d");
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    // Generate predictions if we have layers
    let predictions = [];
    if (gmdh && gmdh.layers.length > 0) {
        // Get x values for smooth curve
        const xPred = Array.from({ length: 100 }, (_, i) => i / 99);
        const polyX = gmdh.polynomialFeatures(xPred, gmdh.degree);
        
        // Use the best model from the last layer
        const bestModel = gmdh.layers[gmdh.layers.length - 1][0];
        
        // Select features used by the best model
        const selectedPolyX = polyX.map(row => bestModel.features.map(i => row[i]));
        predictions = gmdh.predict(selectedPolyX, bestModel.model);
    }

    new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "Training Data",
                    data: X.X_train.map((xi, i) => ({ x: xi, y: X.y_train[i] })),
                    backgroundColor: "blue",
                    pointRadius: 3
                },
                {
                    label: "Validation Data",
                    data: X.X_val.map((xi, i) => ({ x: xi, y: X.y_val[i] })),
                    backgroundColor: "green",
                    pointRadius: 3
                },
                {
                    label: "True Function",
                    data: Array.from({ length: 100 }, (_, i) => {
                        const x = i / 99;
                        return { x, y: Math.sin(2 * Math.PI * x) };
                    }),
                    borderColor: "red",
                    borderWidth: 1,
                    fill: false,
                    showLine: true,
                    pointRadius: 0
                },
                {
                    label: "Model Prediction",
                    data: Array.from({ length: 100 }, (_, i) => ({
                        x: i / 99,
                        y: predictions[i] || null
                    })),
                    borderColor: "purple",
                    borderWidth: 2,
                    fill: false,
                    showLine: true,
                    pointRadius: 0
                }
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: { 
                    title: { display: true, text: "X" },
                    min: 0,
                    max: 1
                },
                y: { 
                    title: { display: true, text: "Y" },
                    min: -1.5,
                    max: 1.5
                },
            },
            animation: {
                duration: 0  // Disable animations for smoother updates
            }
        },
    });
}

/**
 * Runs the GMDH training process one layer at a time.
 */
function stepTraining() {
    if (window.stateManager.currentState !== AppState.RUNNING) {
        return;
    }

    if (currentLayer >= gmdh.maxLayers) {
        window.PubSub.publish('trainingCompleted');
        window.stateManager.setState(AppState.IDLE);
        return;
    }

    try {
        const result = gmdh.fitLayer(X.X_train, X.y_train, X.X_val, X.y_val, currentLayer);
        if (!result.success) {
            throw new Error(result.error);
        }

        // Update visualizations in order
        plotLossChart(gmdh.trainErrors, gmdh.validationErrors);
        if (gmdh.layers.length > 0) {
            plotPredictions();  // Show current model's predictions
            
            // Transform layer data into visualization format
            const layerData = [];
            
            // For each layer
            for (let layerIndex = 0; layerIndex < gmdh.maxLayers; layerIndex++) {
                const layerModels = [];
                
                // For each model in the layer
                for (let modelIndex = 0; modelIndex < gmdh.modelsPerLayer; modelIndex++) {
                    // Check if this layer exists and has models
                    const isActive = layerIndex < gmdh.layers.length;
                    
                    layerModels.push({
                        layer: layerIndex + 1,
                        model: modelIndex + 1,
                        active: isActive,
                        // Use validation error from gmdh.validationErrors if available
                        valMSE: isActive ? gmdh.validationErrors[layerIndex * gmdh.modelsPerLayer + modelIndex] : null
                    });
                }
                
                layerData.push(layerModels);
            }
            
            console.log("Transformed layer data:", layerData);
            drawHeatmap(layerData);
        }

        currentLayer++;
        
        if (window.stateManager.currentState === AppState.RUNNING) {
            setTimeout(stepTraining, 1000);
        }
    } catch (error) {
        console.error('Training error:', error);
        window.stateManager.setState(AppState.ERROR);
        window.PubSub.publish('error', {
            message: error.message,
            layer: currentLayer,
            state: window.stateManager.currentState
        });
    }
}

/**
 * Initializes and starts training.
 */
function startTraining() {
    // Reset training state
    currentLayer = 0;

    // Read parameters from controls
    const maxLayers = parseInt(document.getElementById("maxLayers").value);
    const degree = parseInt(document.getElementById("degree").value);
    const modelsPerLayer = parseInt(document.getElementById("modelsPerLayer").value);
    const alpha = parseFloat(document.getElementById("alpha").value);

    // Initialize new GMDH instance
    gmdh = new GMDH(maxLayers, degree, modelsPerLayer, alpha);
    X = gmdh.generateData(100);  // Now returns {X_train, y_train, X_val, y_val}

    // Initialize all visualizations
    plotData();  // Training/validation data scatter plot
    plotLossChart([], []);  // Empty loss chart
    plotPredictions();  // Empty predictions chart
    
    // Publish start event and begin training
    window.PubSub.publish('trainingStarted');
    window.stateManager.setState(AppState.RUNNING);
    stepTraining();
}

/**
 * Adjusts numeric parameters in the UI.
 */
window.adjustParam = function(param, delta) {
    const input = document.getElementById(param);
    if (!input) {
        console.error(`Element with id '${param}' not found.`);
        return;
    }

    let currentValue = parseFloat(input.value);
    if (isNaN(currentValue)) {
        console.error(`Invalid number in '${param}' input field.`);
        return;
    }

    input.value = (currentValue + delta).toFixed(2);
};

/**
 * Handles train button click.
 */
function handleTrainButtonClick() {
    if (window.stateManager.currentState === AppState.RUNNING) {
        window.PubSub.publish('pauseTraining');
    } else {
        // Only start training if we're not already running
        if (window.stateManager.currentState !== AppState.RUNNING) {
            startTraining();
        }
    }
}

/**
 * Runs once on page load.
 */
window.onload = function() {
    document.getElementById("trainModel").addEventListener("click", handleTrainButtonClick);
};

function updateTrainButton() {
    const button = document.getElementById('trainModel');
    if (window.stateManager.currentState === AppState.RUNNING) {
        button.textContent = 'Pause';
        button.classList.add('running');
    } else {
        button.textContent = 'Run';
        button.classList.remove('running');
    }
}

// Add this to the StateManager class in stateMachine.js
window.stateManager.addListener(updateTrainButton);
