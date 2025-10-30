/**
 * KNOWLEDGE-GRAPH.JS
 * Manages concept relationships and Vega-Lite visualization integration
 */

class KnowledgeGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.notes = new Map();
        this.visualizations = new Map();
    }

    /**
     * Add a concept node to the graph
     * @param {string} id - Unique identifier (e.g., "lambda", "alpha")
     * @param {Object} data - Node data
     */
    addNode(id, data) {
        this.nodes.set(id, {
            id,
            name: data.name || id,
            type: data.type || 'variable', // variable, function, parameter, concept
            description: data.description || '',
            latex: data.latex || id,
            color: data.color || null,
            ...data
        });
    }

    /**
     * Add relationship between concepts
     * @param {string} fromId - Source node ID
     * @param {string} toId - Target node ID
     * @param {string} relationship - Relationship type
     */
    addEdge(fromId, toId, relationship = 'related') {
        const edgeId = `${fromId}->${toId}`;
        this.edges.set(edgeId, {
            from: fromId,
            to: toId,
            relationship // 'defines', 'uses', 'derives', 'related'
        });
    }

    /**
     * Add margin note for a concept
     * @param {string} nodeId - Node ID
     * @param {Object} noteData - Note content
     */
    addNote(nodeId, noteData) {
        if (!this.notes.has(nodeId)) {
            this.notes.set(nodeId, []);
        }

        this.notes.get(nodeId).push({
            title: noteData.title || '',
            content: noteData.content || '',
            math: noteData.math || null,
            viz: noteData.viz || null,
            links: noteData.links || []
        });
    }

    /**
     * Get all related nodes for a given node
     * @param {string} nodeId - Node ID
     * @returns {Array<string>} Related node IDs
     */
    getRelated(nodeId) {
        const related = new Set();

        this.edges.forEach(edge => {
            if (edge.from === nodeId) {
                related.add(edge.to);
            }
            if (edge.to === nodeId) {
                related.add(edge.from);
            }
        });

        return Array.from(related);
    }

    /**
     * Get notes for a concept
     * @param {string} nodeId - Node ID
     * @returns {Array<Object>} Notes
     */
    getNotes(nodeId) {
        return this.notes.get(nodeId) || [];
    }

    /**
     * Create Vega-Lite specification for a chart
     * @param {string} type - Chart type
     * @param {Object} data - Chart data
     * @param {Object} options - Chart options
     * @returns {Object} Vega-Lite spec
     */
    createVegaSpec(type, data, options = {}) {
        const baseSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: options.width || 300,
            height: options.height || 200,
            data: { values: data },
            config: {
                view: { stroke: null },
                axis: {
                    labelFont: 'Georgia, serif',
                    titleFont: 'Georgia, serif',
                    labelFontSize: 11,
                    titleFontSize: 12
                }
            }
        };

        switch (type) {
            case 'line':
                return {
                    ...baseSpec,
                    mark: {
                        type: 'line',
                        point: options.showPoints || false,
                        strokeWidth: 2
                    },
                    encoding: {
                        x: {
                            field: options.xField || 'x',
                            type: 'quantitative',
                            title: options.xTitle || 'X'
                        },
                        y: {
                            field: options.yField || 'y',
                            type: 'quantitative',
                            title: options.yTitle || 'Y'
                        },
                        color: {
                            ...(options.colorField && {
                                field: options.colorField,
                                type: 'nominal',
                                legend: options.showLegend !== false
                            })
                        }
                    }
                };

            case 'multi-line':
                return {
                    ...baseSpec,
                    mark: { type: 'line', strokeWidth: 2 },
                    encoding: {
                        x: {
                            field: options.xField || 'x',
                            type: 'quantitative',
                            title: options.xTitle || 'X',
                            ...(options.xScale && { scale: options.xScale })
                        },
                        y: {
                            field: options.yField || 'y',
                            type: 'quantitative',
                            title: options.yTitle || 'Y',
                            ...(options.yScale && { scale: options.yScale })
                        },
                        color: {
                            field: options.seriesField || 'series',
                            type: 'nominal',
                            legend: { title: options.legendTitle || null }
                        }
                    }
                };

            case 'area':
                return {
                    ...baseSpec,
                    mark: { type: 'area', opacity: 0.7 },
                    encoding: {
                        x: {
                            field: options.xField || 'x',
                            type: 'quantitative',
                            title: options.xTitle || 'X'
                        },
                        y: {
                            field: options.yField || 'y',
                            type: 'quantitative',
                            title: options.yTitle || 'Y'
                        },
                        color: { value: options.color || '#0066cc' }
                    }
                };

            case 'scatter':
                return {
                    ...baseSpec,
                    mark: { type: 'point', filled: true, size: 60 },
                    encoding: {
                        x: {
                            field: options.xField || 'x',
                            type: 'quantitative',
                            title: options.xTitle || 'X'
                        },
                        y: {
                            field: options.yField || 'y',
                            type: 'quantitative',
                            title: options.yTitle || 'Y'
                        },
                        color: { value: options.color || '#0066cc' }
                    }
                };

            default:
                return baseSpec;
        }
    }

    /**
     * Render Vega-Lite chart to DOM element
     * @param {string} elementId - Target element ID
     * @param {Object} spec - Vega-Lite specification
     * @returns {Promise} Vega embed promise
     */
    async renderChart(elementId, spec) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element ${elementId} not found`);
            return;
        }

        try {
            const result = await vegaEmbed(`#${elementId}`, spec, {
                actions: false,
                renderer: 'canvas'
            });
            this.visualizations.set(elementId, result.view);
            return result;
        } catch (error) {
            console.error('Error rendering chart:', error);
        }
    }

    /**
     * Update existing chart with new data
     * @param {string} elementId - Chart element ID
     * @param {Array} newData - New data array
     */
    updateChart(elementId, newData) {
        const view = this.visualizations.get(elementId);
        if (view) {
            view.data('source_0', newData).run();
        }
    }
}

// Initialize global knowledge graph with VST concepts
function initializeVSTKnowledgeGraph() {
    const graph = new KnowledgeGraph();

    // Add core concepts
    graph.addNode('lambda', {
        name: 'λ(t)',
        type: 'function',
        latex: '\\lambda(t)',
        description: 'Scaling function that warps the time axis',
        color: '#6f42c1'
    });

    graph.addNode('alpha', {
        name: 'α',
        type: 'parameter',
        latex: '\\alpha',
        description: 'Scaling exponent controlling time warping rate',
        color: '#28a745'
    });

    graph.addNode('t', {
        name: 't',
        type: 'variable',
        latex: 't',
        description: 'Time variable',
        color: '#0066cc'
    });

    graph.addNode('f', {
        name: 'f',
        type: 'variable',
        latex: 'f',
        description: 'Frequency',
        color: '#dc3545'
    });

    // Guitar note frequencies
    graph.addNode('f1', {
        name: 'f₁',
        type: 'variable',
        latex: 'f_1',
        description: 'E₂ fundamental frequency (82.41 Hz) - Low E string, open',
        color: '#2A9D8F'
    });

    graph.addNode('f2', {
        name: 'f₂',
        type: 'variable',
        latex: 'f_2',
        description: 'F₂ fundamental frequency (87.31 Hz) - Low E string, 1st fret',
        color: '#264653'
    });

    graph.addNode('f3', {
        name: 'f₃',
        type: 'variable',
        latex: 'f_3',
        description: 'E₄ fundamental frequency (329.63 Hz) - High E string, open',
        color: '#E76F51'
    });

    graph.addNode('f4', {
        name: 'f₄',
        type: 'variable',
        latex: 'f_4',
        description: 'F₄ fundamental frequency (349.23 Hz) - High E string, 1st fret',
        color: '#E9C46A'
    });

    graph.addNode('h', {
        name: 'h',
        type: 'variable',
        latex: 'h',
        description: 'Harmonic number (1=fundamental, 2=octave, 3=octave+fifth)',
        color: '#8E44AD'
    });

    graph.addNode('a', {
        name: 'aₕ',
        type: 'variable',
        latex: 'a_h',
        description: 'Harmonic amplitude: [1.0, 0.5, 0.25] for guitar-like decay',
        color: '#16A085'
    });

    graph.addNode('omega', {
        name: 'ω',
        type: 'variable',
        latex: '\\omega',
        description: 'Angular frequency (ω = 2πf)',
        color: '#dc3545'
    });

    graph.addNode('q', {
        name: 'Q',
        type: 'parameter',
        latex: 'Q',
        description: 'Quality factor controlling frequency selectivity',
        color: '#28a745'
    });

    graph.addNode('delta-f', {
        name: 'Δf',
        type: 'concept',
        latex: '\\Delta f',
        description: 'Frequency resolution',
        color: '#6c757d'
    });

    // Add relationships
    graph.addEdge('lambda', 't', 'uses');
    graph.addEdge('lambda', 'alpha', 'parameterized-by');
    graph.addEdge('omega', 'f', 'derives');
    graph.addEdge('delta-f', 'alpha', 'depends-on');
    graph.addEdge('delta-f', 'f', 'varies-with');

    // Add margin notes
    graph.addNote('lambda', {
        title: 'Scaling Function',
        content: 'The scaling function λ(t) = t^α warps the time axis logarithmically. ' +
                'For α < 1, early times are stretched (fine frequency resolution) and ' +
                'late times are compressed (coarse resolution).',
        math: '\\lambda(t) = t^{\\alpha}, \\quad 0 < \\alpha \\leq 1',
        links: ['alpha', 't']
    });

    graph.addNote('alpha', {
        title: 'Scaling Exponent',
        content: 'Controls the degree of time warping. α = 1 gives standard Laplace transform. ' +
                'Smaller α provides more aggressive logarithmic resolution.',
        links: ['lambda']
    });

    graph.addNote('delta-f', {
        title: 'Frequency Resolution',
        content: 'For the VST, frequency resolution scales as Δf(f) ∝ f^(1-α). ' +
                'This gives logarithmic spacing similar to musical scales.',
        math: '\\Delta f(f) \\propto f^{1-\\alpha}',
        links: ['alpha', 'f']
    });

    graph.addNote('q', {
        title: 'Quality Factor',
        content: 'Higher Q gives narrower frequency selectivity but requires longer signals. ' +
                'Typical values: Q = 10-20 for musical analysis.',
        links: ['omega']
    });

    graph.addNote('f1', {
        title: 'E₂ Frequency',
        content: 'The fundamental frequency of the low E string played open (82.41 Hz). ' +
                'This is the lowest note on a standard-tuned guitar.',
        links: ['f2', 'f3', 'f4']
    });

    graph.addNote('f2', {
        title: 'F₂ Frequency',
        content: 'The fundamental frequency of F on the low E string, 1st fret (87.31 Hz). ' +
                'One semitone (ratio of 2^(1/12) ≈ 1.0595) above E₂.',
        links: ['f1']
    });

    graph.addNote('f3', {
        title: 'E₄ Frequency',
        content: 'The fundamental frequency of the high E string played open (329.63 Hz). ' +
                'Exactly 2 octaves (ratio of 4) above E₂.',
        links: ['f1', 'f4']
    });

    graph.addNote('f4', {
        title: 'F₄ Frequency',
        content: 'The fundamental frequency of F on the high E string, 1st fret (349.23 Hz). ' +
                'One semitone above E₄, and 2 octaves above F₂.',
        links: ['f2', 'f3']
    });

    graph.addNote('h', {
        title: 'Harmonic Number',
        content: 'Guitar strings vibrate at integer multiples of the fundamental. ' +
                'h=1 is the fundamental, h=2 is the octave, h=3 is the octave + perfect fifth.',
        links: ['a']
    });

    graph.addNote('a', {
        title: 'Harmonic Amplitudes',
        content: 'Plucked strings have decreasing harmonic amplitudes. ' +
                'We model this as [1.0, 0.5, 0.25] for a realistic guitar timbre.',
        links: ['h']
    });

    // Custom margin notes for conceptual insights
    graph.addNode('guitar-example', {
        name: 'Guitar Example',
        type: 'concept',
        description: 'Four chromatic notes spanning 2 octaves',
        color: '#2A9D8F'
    });

    graph.addNote('guitar-example', {
        title: 'The Guitar Example',
        content: 'We analyze four plucked guitar strings: E and F on both the lowest and highest strings. ' +
                'These chromatic pairs (semitones) are separated by the same frequency ratio (2^(1/12) ≈ 1.0595) ' +
                'at every octave, making them perfect test cases for logarithmic frequency resolution.',
        links: ['f1', 'f2', 'f3', 'f4']
    });

    graph.addNode('four-notes', {
        name: 'Four Notes',
        type: 'concept',
        description: '12 spectral components from 4 notes × 3 harmonics',
        color: '#E76F51'
    });

    graph.addNote('four-notes', {
        title: 'Four Notes with Harmonics',
        content: 'Each of the four guitar notes produces a fundamental plus 2 harmonics (3 partials total). ' +
                '4 notes × 3 harmonics = 12 spectral components that the transform must resolve. ' +
                'The frequency range spans from E₂ fundamental (82 Hz) to E₄ third harmonic (~990 Hz).',
        math: '4 \\text{ notes} \\times 3 \\text{ harmonics} = 12 \\text{ components}',
        links: ['h', 'a']
    });

    graph.addNode('physical-intuition', {
        name: 'Physical Intuition',
        type: 'concept',
        description: 'Time warping creates slow-motion and fast-forward effects',
        color: '#8E44AD'
    });

    graph.addNote('physical-intuition', {
        title: 'Physical Intuition: Time Warping',
        content: 'The scaling function λ(t) = t^α creates a non-uniform time axis. ' +
                'Early signal behavior (low frequencies) is examined in "slow motion" with fine temporal resolution. ' +
                'Later behavior (high frequencies) is "fast-forwarded" with coarser resolution. ' +
                'This matches how we perceive musical pitch: we need finer discrimination at low frequencies.',
        math: '\\text{early times} \\rightarrow \\text{large } d\\lambda \\rightarrow \\text{fine } \\Delta f\\\\ ' +
              '\\text{late times} \\rightarrow \\text{small } d\\lambda \\rightarrow \\text{coarse } \\Delta f',
        links: ['lambda', 'alpha']
    });

    graph.addNode('key-result', {
        name: 'Key Result',
        type: 'concept',
        description: 'Constant bins per semitone across all frequencies',
        color: '#E63946'
    });

    graph.addNote('key-result', {
        title: 'Key Result: Constant Bins Per Semitone',
        content: 'The VST achieves what the FFT cannot: constant resolution in musical terms. ' +
                'While the FFT provides constant Hz resolution (wasteful at high frequencies, insufficient at low), ' +
                'the VST provides constant bins per semitone. This means every semitone interval gets the same number of frequency bins, ' +
                'perfectly matching how humans perceive musical pitch on a logarithmic scale.',
        math: '\\text{VST: } 3 \\text{ bins/semitone (constant)}\\\\ ' +
              '\\text{FFT: } \\text{bins/semitone} \\propto f \\text{ (linear)}',
        links: ['delta-f', 'alpha']
    });

    return graph;
}

// Export
if (typeof window !== 'undefined') {
    window.KnowledgeGraph = KnowledgeGraph;
    window.initializeVSTKnowledgeGraph = initializeVSTKnowledgeGraph;
}
