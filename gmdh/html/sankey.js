
// sankey.js
function drawSankeyGraph(features) {
    const sankeyDiv = document.getElementById("sankey");
    if (!sankeyDiv) {
        console.error("Error: Sankey container 'sankey' not found!");
        return;
    }

    const width = 500, height = 300;
    const svg = d3.select("#sankey").html("")
        .append("svg").attr("width", width).attr("height", height);

    const sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .size([width, height]);

    const sankeyData = {
        nodes: features.map((_, i) => ({ node: i, name: `Feature ${i + 1}` })),
        links: features.slice(1).map((_, i) => ({
            source: i, target: i + 1, value: Math.abs(features[i])
        }))
    };

    sankey(sankeyData);

    svg.append("g").selectAll("rect").data(sankeyData.nodes)
        .enter().append("rect")
        .attr("x", d => d.x0).attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .style("fill", "steelblue");

    svg.append("g").selectAll("path").data(sankeyData.links)
        .enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => d.value * 5)
        .style("fill", "none").style("stroke", "black");
}
