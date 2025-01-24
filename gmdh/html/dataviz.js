// dataviz.js
import Chart from 'chart.js/auto';
import PubSub from './pubsub.js';

let dataChart;

export function initializeDataChart(ctx, trainingData, validationData, trueFunction) {
    if (dataChart) {
        dataChart.destroy();
    }

    dataChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Training Data',
                    data: trainingData,
                    backgroundColor: 'blue',
                    showLine: false,
                },
                {
                    label: 'Validation Data',
                    data: validationData,
                    backgroundColor: 'green',
                    showLine: false,
                },
                {
                    label: 'True Function',
                    data: trueFunction,
                    borderColor: 'red',
                    showLine: true,
                },
                {
                    label: 'GMDH Model Prediction',
                    data: [],
                    borderColor: 'yellow',
                    showLine: true,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom'
                }
            },
            animation: {
                duration: 500,
                easing: 'easeInOutQuad'
            }
        }
    });

    PubSub.publish('chartInitialized', { status: 'success' });
}

export function updateModelPrediction(predictionData) {
    if (!dataChart) {
        console.error('Data chart not initialized.');
        return;
    }
    
    dataChart.data.datasets[3].data = predictionData;
    dataChart.update();
    PubSub.publish('modelPredictionUpdated', { predictionData });
}

// Subscribe to training events to update the chart dynamically
PubSub.subscribe('trainingStep', ({ predictions }) => {
    updateModelPrediction(predictions);
});
