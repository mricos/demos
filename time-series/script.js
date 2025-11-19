document.addEventListener('DOMContentLoaded', () => {
    const explanationBox = document.getElementById('explanation-box');
    const figureCaption = document.getElementById('figure-caption');
    const controlsArea = document.getElementById('controls-area');
    const deltaSlider = document.getElementById('delta-slider');
    const deltaValueDisplay = document.getElementById('delta-value');
    const ctx = document.getElementById('myChart').getContext('2d');
    
    let currentChart = null;

    // --- 1. DATA SIMULATION HELPERS ---
    function generatePaperSimulation(type, deltaParam = 0.95) {
        const labels = Array.from({length: 100}, (_, i) => i + 1);
        
        if (type === 'abstract') {
            // Simple plot of the raw data concept
            const data = labels.map(i => Math.sin(i/5) + (Math.random() - 0.5));
            return {
                labels,
                datasets: [{
                    label: 'Weekly Interest Rate Changes',
                    data: data,
                    borderColor: '#334155',
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.3
                }]
            };
        }
        else if (type === 'static') {
            // Residuals with specific outliers
            const data = labels.map(i => (Math.random() - 0.5) * 0.2);
            // Add shocks
            [20, 45, 80].forEach(idx => data[idx] = (Math.random() > 0.5 ? 0.8 : -0.8));
            return {
                labels,
                datasets: [{
                    label: 'Model Residuals (Errors)',
                    data: data,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 1,
                    pointRadius: 2,
                    fill: true
                }]
            };
        } 
        else if (type === 'dynamic') {
            // Phi stabilizing
            const phi = labels.map(i => 0.227 + (Math.random() - 0.5) * (1 / (i + 1)));
            return {
                labels,
                datasets: [{
                    label: 'Parameter Evolution (φ)',
                    data: phi,
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }]
            };
        } 
        else if (type === 'outlier') {
            const clean = labels.map(i => Math.sin(i/10) * 0.5);
            const outliers = labels.map(i => 0);
            [20, 45, 80].forEach(idx => outliers[idx] = (Math.random() > 0.5 ? 0.8 : -0.8));
            return {
                labels,
                datasets: [
                    { label: 'Clean Signal', data: clean, borderColor: '#10b981', borderWidth: 2, pointRadius: 0 },
                    { label: 'Detected Outliers', data: outliers, borderColor: '#ef4444', borderWidth: 0, pointRadius: 5, pointStyle: 'crossRot' }
                ]
            };
        }
        else if (type === 'interact') {
            // SIMULATION LAB LOGIC
            // Scenario: A true parameter jumps at t=50.
            // We simulate how the model "tracks" this based on Delta.
            
            const trueParam = labels.map(i => i < 50 ? 0.2 : 0.8); // Structural Break
            
            // Simple adaptive filter logic to mimic DLM behavior
            // Low delta = high gain (learns fast). High delta = low gain (learns slow).
            const estimated = [];
            let currentEst = 0.2;
            
            labels.forEach((t, i) => {
                // 1. Create noisy observation of truth
                const observation = trueParam[i] + (Math.random() - 0.5) * 0.5;
                
                // 2. Learning rate (simplified relation to discount factor)
                // If delta is 1, gain is 0 (never learn). If delta is 0.8, gain is high.
                const gain = (1 - deltaParam); 
                
                // 3. Update estimate
                currentEst = currentEst + gain * (observation - currentEst);
                estimated.push(currentEst);
            });

            return {
                labels,
                datasets: [
                    { 
                        label: 'True Parameter (Hidden Truth)', 
                        data: trueParam, 
                        borderColor: '#334155', 
                        borderDash: [5, 5], 
                        borderWidth: 2, 
                        pointRadius: 0 
                    },
                    { 
                        label: `Estimated Parameter (δ = ${deltaParam})`, 
                        data: estimated, 
                        borderColor: '#7c3aed', // Purple
                        borderWidth: 2, 
                        pointRadius: 0,
                        tension: 0.3
                    }
                ]
            };
        }
    }

    // --- 2. CONTENT DEFINITIONS ---
    const modelContent = {
        abstract: {
            text: `
                <h3>Abstract & Gist</h3>
                <p><strong>The Goal:</strong> Model weekly changes in U.S. interest rates (1988-1999).</p>
                <p><strong>The Problem:</strong> Traditional static models (AR3) assume the economy never changes structure. They fail when sudden "shocks" (outliers) occur.</p>
                <p><strong>The Solution:</strong> The paper proposes a <strong>Bayesian Time-Varying Autoregressive (TVAR)</strong> model. By allowing parameters to evolve over time and specifically accounting for outliers, the dynamic model provides a much better fit and more accurate forecasts.</p>
            `,
            caption: 'Raw Data: The volatile weekly changes in interest rates that we are trying to model.'
        },
        static: {
            text: `
                <h3>1. Static AR(3) Model</h3>
                <p>The "Classic" approach. Parameters ($\phi$) are constant.</p>
                <p><strong>Equation:</strong> $$y_t = \phi_1y_{t-1} + \dots + \epsilon_t$$</p>
                <p><strong>The Failure:</strong> Look at the residuals (red graph below). The massive spikes indicate that the model cannot handle outliers. It assumes these real economic shocks are just random noise, leading to poor risk assessment.</p>
            `,
            caption: 'Residual Analysis: Large spikes (red) prove the static model is inadequate.'
        },
        dynamic: {
            text: `
                <h3>2. Dynamic TVAR Model</h3>
                <p>We use a <strong>Discount Factor ($\delta$)</strong> to let the model "forget" old data and learn new patterns.</p>
                <p><strong>System:</strong> $$\phi_t = \phi_{t-1} + \eta_t, \quad Var(\eta_t) \propto \delta$$</p>
                <p><strong>Finding:</strong> For this specific dataset, the coefficient $\phi$ doesn't change much, but the <strong>volatility</strong> ($v_t$) does. The dynamic model correctly identifies periods of high market instability.</p>
            `,
            caption: 'Parameter Estimation: The model adapts, stabilizing around the mean over time.'
        },
        outlier: {
            text: `
                <h3>3. TVAR with Outlier Detection</h3>
                <p>The "Best" Model. It mathematically separates the signal from the noise using Data Augmentation.</p>
                <p><strong>Concept:</strong> $$y_t = \text{Signal} + \underbrace{\gamma_t \alpha_t}_{\text{Outlier}}$$</p>
                <p><strong>Result:</strong> By isolating the outliers (red crosses below), the remaining signal (green line) is cleaner and provides a "complete characterization" of the underlying economy.</p>
            `,
            caption: 'Decomposition: Green is the true economic trend; Red crosses are isolated shocks.'
        },
        interact: {
            text: `
                <h3>4. Simulation Lab: The Discount Factor ($\delta$)</h3>
                <p>The paper relies heavily on $\delta$. This control determines how "reactive" the model is.</p>
                <p><strong>Experiment:</strong> Use the slider below. We have simulated a structural break (dashed line) where the true parameter jumps.</p>
                <ul>
                    <li><strong>High $\delta$ (0.99):</strong> The model is stable but slow to react to the jump.</li>
                    <li><strong>Low $\delta$ (0.80):</strong> The model reacts instantly but is very noisy/jittery.</li>
                </ul>
            `,
            caption: 'Interactive Plot: Adjust the slider to see how the model learns a structural break.'
        }
    };

    // --- 3. MAIN UPDATE FUNCTION ---
    function updateUI(key) {
        const content = modelContent[key];
        
        // Toggle Controls Visibility
        if (key === 'interact') {
            controlsArea.classList.remove('hidden');
        } else {
            controlsArea.classList.add('hidden');
        }

        // Update Text
        explanationBox.innerHTML = content.text;
        figureCaption.textContent = content.caption;
        
        // Render Math
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            MathJax.typesetPromise([explanationBox]).catch(err => console.log(err));
        }

        // Update Buttons
        document.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        document.getElementById(`${key}-btn` 
            ? `${key}-btn` // for abstract/interact which use different ID naming convention in HTML
            : `${key}-model-btn`
        ).classList.add('active');

        // Draw Chart
        drawChart(key);
    }

    function drawChart(key) {
        if (currentChart) currentChart.destroy();
        
        // Get slider value if in simulation mode
        const delta = parseFloat(deltaSlider.value);
        const simData = generatePaperSimulation(key, delta);

        currentChart = new Chart(ctx, {
            type: 'line',
            data: simData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: key === 'interact' ? 0 : 800 }, // No animation for slider dragging
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    x: { display: true, grid: {display: false} },
                    y: { display: true }
                }
            }
        });
    }

    // --- 4. EVENT LISTENERS ---
    document.getElementById('abstract-btn').onclick = () => updateUI('abstract');
    document.getElementById('static-model-btn').onclick = () => updateUI('static');
    document.getElementById('dynamic-model-btn').onclick = () => updateUI('dynamic');
    document.getElementById('outlier-model-btn').onclick = () => updateUI('outlier');
    document.getElementById('interact-btn').onclick = () => updateUI('interact');

    // Slider Listener
    deltaSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        deltaValueDisplay.textContent = val;
        // Redraw only the chart logic for 'interact'
        if (!controlsArea.classList.contains('hidden')) {
            drawChart('interact');
        }
    });
    
    // Initial Load
    updateUI('abstract');
});
