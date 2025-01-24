// heatmap.js
function drawHeatmap(layerData) {
    console.log("Received layer data:", layerData);
    
    const heatmapDiv = document.getElementById("heatmap");
    if (!heatmapDiv) {
        console.error("Error: Heatmap container 'heatmap' not found!");
        return;
    }

    // Clear previous content
    heatmapDiv.innerHTML = "";

    // Grid layout settings with space for legend
    const width = 500;  // Increased to accommodate legend
    const height = 350; // Increased for labels
    const margin = { 
        top: 40, 
        right: 100,  // Increased for legend
        bottom: 50,  // Increased for x-axis label
        left: 80     // Increased for y-axis label
    };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    // Dynamic dimensions based on actual data
    const numLayers = layerData.length;
    const numModels = layerData[0]?.length || 0;

    if (numLayers === 0 || numModels === 0) {
        console.warn("No data to display in heatmap");
        return;
    }

    // Create grid data structure
    const data = [];
    
    // Fill grid with values from actual data
    for (let layer = 0; layer < numLayers; layer++) {
        const layerModels = layerData[layer] || [];
        
        for (let model = 0; model < numModels; model++) {
            const modelData = layerModels[model];
            data.push({
                layer: layer + 1,
                model: model + 1,
                active: modelData?.active || false,
                valMSE: typeof modelData?.valMSE === 'number' ? modelData.valMSE : null
            });
        }
    }

    // Create scales based on actual dimensions
    const xScale = d3.scaleBand()
        .domain(d3.range(1, numModels + 1))
        .range([0, contentWidth])
        .padding(0.05);

    const yScale = d3.scaleBand()
        .domain(d3.range(1, numLayers + 1))
        .range([0, contentHeight])
        .padding(0.05);

    // Create color scale based on validation MSE
    const validMSEs = data
        .filter(d => d.active && typeof d.valMSE === 'number')
        .map(d => d.valMSE);
    
    const mseExtent = d3.extent(validMSEs);
    const colorScale = d3.scaleSequential()
        .domain([mseExtent[1], mseExtent[0]])  // Reverse domain for darker = better
        .interpolator(d3.interpolateViridis);  // Better colormap for MSE values

    // Helper function to determine text color based on background
    function getTextColor(d) {
        if (!d.active || typeof d.valMSE !== 'number') return "#666";
        
        // Get the background color for this value
        const bgColor = d3.rgb(colorScale(d.valMSE));
        
        // Calculate relative luminance
        const luminance = (0.299 * bgColor.r + 0.587 * bgColor.g + 0.114 * bgColor.b) / 255;
        
        // Use white text for dark backgrounds, black text for light backgrounds
        return luminance > 0.5 ? "#000000" : "#ffffff";
    }

    // Create SVG
    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create main group for content
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Draw grid cells with transitions (only color transitions, no resizing)
    const cells = g.selectAll("rect")
        .data(data);
        
    cells.enter()
        .append("rect")
        .attr("x", d => xScale(d.model))
        .attr("y", d => yScale(d.layer))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .merge(cells)
        .transition()
        .duration(500)
        .attr("fill", d => d.active && d.valMSE !== null ? colorScale(d.valMSE) : "#eee");

    // Add MSE values with proper formatting (no transitions)
    const texts = g.selectAll("text.mse")
        .data(data);
        
    texts.enter()
        .append("text")
        .attr("class", "mse")
        .attr("x", d => xScale(d.model) + xScale.bandwidth()/2)
        .attr("y", d => yScale(d.layer) + yScale.bandwidth()/2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "10px")
        .merge(texts)
        .style("fill", d => d.active ? getTextColor(d) : "#999")
        .text(d => d.active && typeof d.valMSE === 'number' 
            ? d.valMSE.toExponential(2)  // Scientific notation for better readability
            : "");

    // Add axes with improved labels
    // Y-axis
    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale)
            .tickFormat(d => `Layer ${d}`));

    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left / 2)
        .attr("x", -(height / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("");

    // X-axis
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${contentHeight})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => `Model ${d}`));

    // X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom / 3)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("");

    // Add title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", margin.top/2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Model Performance by Layer");

    // Add legend
    const legendWidth = 20;
    const legendHeight = contentHeight;
    const legendScale = d3.scaleLinear()
        .domain([mseExtent[1], mseExtent[0]])
        .range([legendHeight, 0]);

    const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

    // Legend gradient
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "mse-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    // Add gradient stops
    const numStops = 10;
    for (let i = 0; i < numStops; i++) {
        const offset = i / (numStops - 1);
        linearGradient.append("stop")
            .attr("offset", `${offset * 100}%`)
            .attr("stop-color", colorScale(d3.interpolate(mseExtent[1], mseExtent[0])(offset)));
    }

    // Draw legend rectangle
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#mse-gradient)");

    // Add legend axis
    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format(".2e"));  // Scientific notation for MSE values

    legend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis);

    // Legend title
    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("MSE");

    // Add tooltip div if not exists
    const tooltip = d3.select("body").selectAll(".gmdh-tooltip").data([0])
        .enter()
        .append("div")
        .attr("class", "gmdh-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "8px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px");

    // Add hover interactions
    g.selectAll("rect")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style("opacity", 0.8);
            
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`
                Layer: ${d.layer}<br/>
                Model: ${d.model}<br/>
                MSE: ${d.active ? d.valMSE.toExponential(3) : 'N/A'}<br/>
                Status: ${d.active ? 'Active' : 'Inactive'}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(500)
                .style("opacity", 1);
            
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

// Export for use in other files
window.drawHeatmap = drawHeatmap;

// Test function
window.testHeatmap = function() {
    // Test with array of numbers
    const simpleData = [0.85, 0.90, 0.88, 0.80];
    console.log("Testing heatmap with simple data:", simpleData);
    drawHeatmap(simpleData);

    // Test with structured data
    const structuredData = [
        { layer: 1, model: 1, error: 0.85 },
        { layer: 1, model: 2, error: 0.90 },
        { layer: 1, model: 3, error: 0.88 }
    ];
    console.log("Testing heatmap with structured data:", structuredData);
    drawHeatmap(structuredData);
};
