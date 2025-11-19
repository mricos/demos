Here is a compressed summary of “what else ML engineers do to visually see what a network is doing,” without omitting any of the techniques that were listed.

---

### 1. Per-sample attribution / saliency

Goal: which input dimensions matter for a specific decision.

* **Saliency maps**:
  Plot |∂ log p(y) / ∂xᵢ| per input dimension. For Iris: 4-bar chart per sample.
* **Occlusion / perturbation sensitivity**:
  Systematically perturb one feature (or sweep it over a range) and track p(y). Visualized as probability vs feature value for current weights.
* **Integrated gradients / input×gradient**:
  More stable attribution; again visualized as per-feature bars or radar plots.

---

### 2. Activation and representation views

Goal: understand internal geometry and neuron usage.

* **Activation distributions per neuron**:
  Histograms of hⱼ over the dataset to see dead/saturated units; can be drawn as small sparklines/hist strips.
* **Activation scatter / embedding**:
  Take hidden activations h(x) over the dataset, project to 2D (PCA/t-SNE/UMAP), color by true/predicted class.
* **Class-conditional means**:
  Compute μ_c = mean hidden activation for each class; visualize pairwise distances (matrix, dendrogram) to see separability at that layer.

---

### 3. Weight- and gradient-centric views

Goal: inspect where and how the network stores information and learns.

* **Weight heatmaps**:
  Visualize W₁ (e.g. 6×4) and W₂ (3×6) as signed magnitude heatmaps to see specialization.
* **Weight norms per neuron**:
  Plot ‖wⱼ‖ for each hidden neuron vs training step; identify over/under-regularized units.
* **Gradient norms**:
  Per layer / per neuron gradient magnitudes, as time series or heatmaps, to diagnose vanishing/exploding and “who is learning.”

---

### 4. Optimization / performance diagnostics

Goal: track training behavior and over/underfitting.

* **Train vs validation loss/accuracy curves**:
  Standard line plots over training steps.
* **Per-class accuracy vs time**:
  Separate line per class to see if certain classes lag.
* **Confusion matrix evolution**:
  Store confusion matrices periodically and visualize as a timeline (e.g. small multiples or slider) showing misclassification patterns shrinking/changing.

---

### 5. Data and decision-boundary views

Goal: connect model behavior to data geometry.

* **Decision surfaces**:
  For low-dimensional inputs (Iris): pick 2 features, fix others, render predicted class or class probability over a grid; overlay training samples.
* **Margins / confidence histograms**:
  Histogram of max_k p_k(x) over the dataset to see confidence structure (e.g. over-confident vs under-confident shapes).

---

### 6. SNN-specific visualizations

For true spiking (not just rate models).

* **Raster plots**:
  Time on x-axis, neuron index on y-axis, dots = spikes. Layers or subpopulations stacked.
* **Peristimulus time histograms (PSTHs)**:
  Spike counts vs time averaged over repeated stimuli.
* **Tuning curves**:
  Firing rate vs one input dimension for a neuron (selectivity).
* **Spike-train statistics**:
  Inter-spike-interval (ISI) histograms, Fano factor, etc., showing irregularity/variability.

For your rate model SPA, a simplified variant: derive Bernoulli spikes from rates and show mini rasters + PSTHs per neuron.

---

### 7. Perturbation and ablation experiments

Goal: probe functional roles and robustness.

* **Neuron ablation**:
  Zero out a hidden neuron (or group), recompute sample predictions and overall accuracy; visualize sensitivity per neuron.
* **Weight noise injection**:
  Add small noise to weights and measure stability of predictions; visualize robustness.

---

### 8. Minimal extensions suggested for your Iris/SNN SPA

Ordered list of “first add” items:

1. **Connection view mode toggle**: switch between showing **weights** and a smoothed **gradient EMA** on edges to see where learning is happening.
2. **2D decision boundary plot**: over two Iris features, updated as training proceeds.
3. **Per-sample saliency bars**: |∂ log p / ∂xᵢ| per feature in the spot-check panel.
4. **Spike-like raster strips**: for each neuron, generate Bernoulli spikes from its rate and render a short time raster under the rate bar to visually anchor the SNN interpretation.
