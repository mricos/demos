// logger.js

document.addEventListener("DOMContentLoaded", () => {
    // Initialize PubSub if it doesn't exist
    if (!window.PubSub) {
        window.PubSub = PubSubJS;
    }

    let currentLogEntry = null;
    let currentState = AppState.IDLE;

    const formatNumericValue = (value, precision = 6) => {
        if (value === undefined || value === null || typeof value !== 'number' || !isFinite(value)) {
            return '-';
        }
        return value.toFixed(precision);
    };

    window.logEvent = function(message, data = null) {
        const logOutput = document.getElementById('logOutput');
        if (!logOutput) return;

        // Create new entry only for state changes, layer completion, or if no entry exists
        const stateChanged = currentState !== window.stateManager.currentState;
        currentState = window.stateManager.currentState;
        const isNewState = stateChanged || !currentLogEntry;
        const isLayerComplete = data?.stage === 'layer_complete';

        if (isNewState || isLayerComplete) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            const header = document.createElement('div');
            header.className = 'log-header';
            header.innerHTML = `
                <span class="log-timestamp">${new Date().toLocaleTimeString()}</span>
                <span class="log-state">[${currentState}]</span>
                <span class="log-message"></span>
            `;
            logEntry.appendChild(header);

            const dataElement = document.createElement('pre');
            dataElement.className = 'log-data';
            logEntry.appendChild(dataElement);

            if (logOutput.firstChild) {
                logOutput.insertBefore(logEntry, logOutput.firstChild);
            } else {
                logOutput.appendChild(logEntry);
            }
            
            currentLogEntry = logEntry;
        }

        // Update the current entry with data
        if (currentLogEntry && data) {
            const messageEl = currentLogEntry.querySelector('.log-message');
            const dataEl = currentLogEntry.querySelector('.log-data');
            
            if (messageEl && dataEl) {
                let status = '';
                if (data.stage === 'layer_complete') {
                    status = `Layer ${data.layer}/${data.maxLayers} complete`;
                } else {
                    status = `Layer ${data.layer}/${data.maxLayers}, Model ${data.modelIndex}/${data.modelsPerLayer}`;
                }
                
                messageEl.textContent = status;
                
                // Format detailed parameters with safe numeric formatting
                const params = [
                    `Layer: ${data.layer || '-'}/${data.maxLayers || '-'}`,
                    `Model: ${data.modelIndex || '-'}/${data.modelsPerLayer || '-'}`,
                    `Degree: ${data.degree || '-'}`,
                    `Alpha: ${formatNumericValue(data.alpha, 4)}`,
                    `Train Loss: ${formatNumericValue(data.trainLoss)}`,
                    `Val Loss: ${formatNumericValue(data.valLoss)}`,
                    `Best Train: ${formatNumericValue(data.bestTrainLoss)}`,
                    `Best Val: ${formatNumericValue(data.bestValLoss)}`
                ].join(' | ');
                
                dataEl.textContent = params;
            }
        }
    };

    // Subscribe to essential events
    window.PubSub.subscribe('trainingStep', (msg, data) => window.logEvent('Training', data));
    window.PubSub.subscribe('error', (msg, data) => {
        window.stateManager.setState(AppState.ERROR);
        currentLogEntry = null;  // Force new entry for error
        window.logEvent(`Error: ${data.message}`, data);
    });
    window.PubSub.subscribe('trainingCompleted', () => {
        window.stateManager.setState(AppState.IDLE);
        currentLogEntry = null;  // Force new entry for completion
        window.logEvent('Training completed', {
            stage: 'complete',
            layer: gmdh?.layers?.length || 0,
            maxLayers: gmdh?.maxLayers || 0,
            degree: gmdh?.degree || 0,
            modelsPerLayer: gmdh?.modelsPerLayer || 0,
            alpha: gmdh?.alpha || 0,
            trainLoss: Math.min(...(gmdh?.trainErrors || [Infinity])),
            valLoss: Math.min(...(gmdh?.validationErrors || [Infinity])),
            bestTrainLoss: Math.min(...(gmdh?.trainErrors || [Infinity])),
            bestValLoss: Math.min(...(gmdh?.validationErrors || [Infinity]))
        });
    });
});

// Add these functions at the global scope
window.logEpochData = function(epoch, params, loss, dataStats) {
    window.logEvent('Epoch data', {
        epoch,
        params,
        loss,
        dataStats
    });
};

window.updateParamsTable = function(epoch, params, loss, dataStats) {
    const tableBody = document.getElementById('paramsTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${epoch}</td>
        <td>${params.maxLayers}</td>
        <td>${params.degree}</td>
        <td>${params.modelsPerLayer}</td>
        <td>${params.alpha}</td>
        <td>${loss.toFixed(4)}</td>
        <td>${dataStats.rows}</td>
        <td>${dataStats.columns}</td>
        <td>${dataStats.testData}</td>
    `;
    tableBody.appendChild(row);
};
