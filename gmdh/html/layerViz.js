// layerViz.js
function drawLayerVisualization(containerId, trainingState = {
    currentLayer: 0,
    currentModel: 0,
    maxLayers: 3,
    modelsPerLayer: 5,
    layers: []  // Array of arrays, each containing model data with trainMSE and valMSE
}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    // SVG setup
    const margin = { top: 40, right: 40, bottom: 60, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate positions
    const layerSpacing = width / (trainingState.maxLayers + 1);
    const modelSpacing = height / (trainingState.modelsPerLayer + 1);

    // Draw connections between completed layers
    for (let layer = 0; layer < trainingState.layers.length - 1; layer++) {
        const currentLayerModels = trainingState.layers[layer];
        if (!currentLayerModels) continue;

        // Get indices of accepted models (top 50% by validation MSE)
        const modelIndices = currentLayerModels.map((model, idx) => ({ idx, valMSE: model.valMSE }))
            .sort((a, b) => a.valMSE - b.valMSE)
            .slice(0, Math.ceil(currentLayerModels.length / 2))
            .map(m => m.idx);
        
        modelIndices.forEach(modelIdx => {
            // Connect to all models in next layer
            for (let nextModel = 0; nextModel < trainingState.modelsPerLayer; nextModel++) {
                svg.append('path')
                    .attr('d', d3.line()([
                        [layerSpacing * (layer + 1), modelSpacing * (modelIdx + 1)],
                        [layerSpacing * (layer + 2), modelSpacing * (nextModel + 1)]
                    ]))
                    .attr('stroke', '#ccc')
                    .attr('stroke-width', 1)
                    .attr('fill', 'none')
                    .style('opacity', 0.3);
            }
        });
    }

    // Draw layers
    for (let layer = 0; layer < trainingState.maxLayers; layer++) {
        const layerGroup = svg.append('g')
            .attr('transform', `translate(${layerSpacing * (layer + 1)}, 0)`);

        // Add layer label
        layerGroup.append('text')
            .attr('x', 0)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(layer + 1);

        // Get completed models for this layer
        const completedModels = trainingState.layers[layer] || [];
        
        // Get indices of accepted models if layer is complete
        const acceptedIndices = completedModels.length === trainingState.modelsPerLayer ?
            completedModels.map((model, idx) => ({ idx, valMSE: model.valMSE }))
                .sort((a, b) => a.valMSE - b.valMSE)
                .slice(0, Math.ceil(completedModels.length / 2))
                .map(m => m.idx) : [];
        
        // Draw models in layer
        for (let model = 0; model < trainingState.modelsPerLayer; model++) {
            const isCurrentlyEvaluating = layer === trainingState.currentLayer && model === trainingState.currentModel;
            const modelData = completedModels[model];
            const isCompleted = !!modelData;
            const isAccepted = isCompleted && acceptedIndices.includes(model);
            
            // Determine fill color based on state
            let fillColor;
            if (isCurrentlyEvaluating) {
                fillColor = '#ffd166'; // Yellow for current evaluation
            } else if (!isCompleted) {
                fillColor = '#8d99ae'; // Gray for not yet evaluated
            } else if (isAccepted) {
                fillColor = '#06d6a0'; // Green for accepted
            } else {
                fillColor = '#ef476f'; // Red for rejected
            }
            
            // Model circle
            layerGroup.append('circle')
                .attr('cx', 0)
                .attr('cy', modelSpacing * (model + 1))
                .attr('r', 15)
                .attr('fill', fillColor)
                .attr('stroke', '#333')
                .attr('stroke-width', isCurrentlyEvaluating ? 3 : 1);

            // Model label
            layerGroup.append('text')
                .attr('x', 0)
                .attr('y', modelSpacing * (model + 1))
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .text(model + 1);

            // Add compact MSE value if available
            if (modelData) {
                layerGroup.append('text')
                    .attr('x', 0)
                    .attr('y', modelSpacing * (model + 1) + 22)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .text(modelData.valMSE.toFixed(3));
            }
        }
    }

    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width/2 - 80}, ${height + 20})`);

    // Legend items
    const legendItems = [
        { color: '#06d6a0', text: '✓' },
        { color: '#ef476f', text: '✗' },
        { color: '#ffd166', text: '⟳' },
        { color: '#8d99ae', text: '?' }
    ];

    legendItems.forEach((item, i) => {
        const itemGroup = legend.append('g')
            .attr('transform', `translate(${i * 40}, 0)`);

        itemGroup.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 10)
            .attr('fill', item.color)
            .attr('stroke', '#333')
            .attr('stroke-width', 1);

        itemGroup.append('text')
            .attr('x', 15)
            .attr('y', 0)
            .attr('dy', '0.35em')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(item.text);
    });
}

// Initialize the visualization when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initial state
    const trainingState = {
        currentLayer: 0,
        currentModel: 0,
        maxLayers: window.gmdh?.maxLayers || 3,
        modelsPerLayer: window.gmdh?.modelsPerLayer || 5,
        layers: []
    };

    // Draw initial visualization
    drawLayerVisualization('layerVisualization', trainingState);

    // Update visualization when training parameters change
    window.PubSub.subscribe('trainingStep', (msg, data) => {
        // Update current position
        trainingState.currentLayer = data.layer - 1;
        trainingState.currentModel = data.modelIndex - 1;
        trainingState.maxLayers = data.maxLayers;
        trainingState.modelsPerLayer = data.modelsPerLayer;

        // Ensure layer array exists
        if (!trainingState.layers[trainingState.currentLayer]) {
            trainingState.layers[trainingState.currentLayer] = [];
        }

        // Update model data
        if (data.trainLoss !== undefined && data.valLoss !== undefined) {
            trainingState.layers[trainingState.currentLayer][trainingState.currentModel] = {
                trainMSE: data.trainLoss,
                valMSE: data.valLoss
            };
        }

        // Redraw visualization
        drawLayerVisualization('layerVisualization', trainingState);
    });
}); 