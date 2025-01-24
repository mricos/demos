// alphaViz.js
let currentAlpha = 0.05;  // Track current alpha value
let visualizationId = null;

function drawAlphaVisualization(containerId, alpha = currentAlpha) {
    visualizationId = containerId;
    currentAlpha = alpha;
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id ${containerId} not found.`);
        return;
    }

    console.log(`Drawing alpha visualization in container: ${containerId} with alpha: ${alpha}`);

    // Clear previous content
    container.innerHTML = '';

    // Create equation container with flexbox
    const equationContainer = document.createElement('div');
    equationContainer.style.display = 'flex';
    equationContainer.style.flexDirection = 'column';
    equationContainer.style.alignItems = 'center';
    equationContainer.style.gap = '10px';
    equationContainer.style.marginBottom = '20px';

    // Add equations
    const modelEq = document.createElement('div');
    modelEq.innerHTML = `\\[ y = w_0 + w_1 x + w_2 x^2 + \\ldots + w_d x^d \\]`;
    equationContainer.appendChild(modelEq);

    const minEq = document.createElement('div');
    minEq.innerHTML = `\\[ \\min_{w} \\left\\{ \\underbrace{\\sum_{i=1}^n (y_i - X_i w)^2}_{\\text{Loss}} + \\underbrace{${alpha.toFixed(3)} \\sum_{j=1}^p w_j^2}_{\\text{Penalty}} \\right\\} \\]`;
    equationContainer.appendChild(minEq);

    container.appendChild(equationContainer);

    // Create a centered container for the SVG
    const svgContainer = document.createElement('div');
    svgContainer.style.display = 'flex';
    svgContainer.style.justifyContent = 'center';
    svgContainer.style.width = '100%';
    container.appendChild(svgContainer);

    // SVG setup
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const width = 300 - margin.left - margin.right;
    const height = 100 - margin.top - margin.bottom;

    const svg = d3.select(svgContainer)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create gradient for the regularization strength
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", `alphaGradient_${containerId}`)
        .attr("x1", "0%")
        .attr("x2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#ef476f");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#06d6a0");

    // Draw the regularization bar
    const barHeight = 20;
    const bar = svg.append("rect")
        .attr("x", 0)
        .attr("y", height/2 - barHeight/2)
        .attr("width", width)
        .attr("height", barHeight)
        .attr("fill", `url(#alphaGradient_${containerId})`)
        .attr("rx", 4)
        .attr("ry", 4);

    // Add labels with descriptions
    svg.append("text")
        .attr("x", 0)
        .attr("y", height/2 - barHeight/2 - 5)
        .attr("text-anchor", "start")
        .attr("font-size", "12px")
        .attr("fill", "#000")
        .text("Complex Model");

    svg.append("text")
        .attr("x", width)
        .attr("y", height/2 - barHeight/2 - 5)
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .attr("fill", "#000")
        .text("Simple Model");

    // Calculate alpha position (log scale for better visualization)
    const alphaScale = d3.scaleLog()
        .domain([0.01, 1])
        .range([0, width])
        .clamp(true);

    // Add alpha marker
    const markerGroup = svg.append("g")
        .attr("transform", `translate(${alphaScale(alpha)},${height/2})`);

    // Triangle marker
    markerGroup.append("path")
        .attr("d", d3.symbol().type(d3.symbolTriangle).size(100))
        .attr("transform", "rotate(180)")
        .attr("fill", "#333");

    // Alpha value label
    markerGroup.append("text")
        .attr("x", 0)
        .attr("y", barHeight)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text(`α = ${alpha.toFixed(3)}`);

    // Add click and drag interaction
    const updateAlpha = function(event) {
        const [x, y] = d3.pointer(event);
        const newAlpha = alphaScale.invert(Math.max(0, Math.min(width, x)));
        if (newAlpha !== currentAlpha) {
            window.params.alpha = newAlpha;  // Update global params
            window.PubSub.publish('parameterChange', { 
                alpha: newAlpha,
                source: 'alphaViz'
            });
        }
    };

    // Add click interaction
    svg.on("click", updateAlpha);

    // Add drag interaction
    const drag = d3.drag()
        .on("drag", updateAlpha);

    bar.call(drag);

    // Add hover effect
    bar.style("cursor", "pointer")
       .on("mouseover", function() {
           d3.select(this).attr("opacity", 0.8);
       })
       .on("mouseout", function() {
           d3.select(this).attr("opacity", 1);
       });

    // Trigger MathJax rendering
    if (window.MathJax) {
        MathJax.typesetPromise([container]);
    }
}

// Initialize the visualization when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initial draw
    drawAlphaVisualization('alphaVisualization', window.params?.alpha || 0.05);

    // Subscribe to all parameter changes
    window.PubSub.subscribe('parameterChange', (msg, data) => {
        if (data.alpha !== undefined && data.alpha !== currentAlpha) {
            console.log(`Parameter change received: ${data.alpha}`);
            window.params.alpha = data.alpha;  // Update global params
            drawAlphaVisualization(visualizationId, data.alpha);
        }
    });

    // Subscribe to training steps
    window.PubSub.subscribe('trainingStep', (msg, data) => {
        if (data.alpha !== undefined && data.alpha !== currentAlpha) {
            console.log(`Training step received: ${data.alpha}`);
            window.params.alpha = data.alpha;  // Update global params
            drawAlphaVisualization(visualizationId, data.alpha);
        }
    });
}); 