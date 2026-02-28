# Reversibility, Garbage Signals, and Landauer's Principle

*Continues from [014: Entropy, Information, and the Cost of Transformation](014_entropy-information-and-the-cost-of-transformation.md)*

If each layer of a neural network loses information, can we get it back? The answer involves auxiliary outputs called "garbage signals," and the physics of information destruction turns out to be neither abstract nor optional -- it has a minimum energy cost set by thermodynamics.

## Landauer's Principle

In 1961, Rolf Landauer established a result that connects computation to physics at the most fundamental level: **erasing one bit of information dissipates at least $kT \ln 2$ of energy as heat**, where $k$ is Boltzmann's constant and $T$ is the temperature of the environment.

$$E_{\text{erase}} \geq kT \ln 2$$

At room temperature ($T \approx 300\,\text{K}$), this evaluates to approximately $2.87 \times 10^{-21}$ joules per bit. This is not a theoretical curiosity. It was experimentally verified in 2012 by Berut et al. using a colloidal particle in a double-well potential, and again in subsequent experiments with nanoscale electronic devices. The bound is tight: nature enforces it.

The principle has a precise information-theoretic statement. If a computation reduces the Shannon entropy of a system by $\Delta H$ bits, then the minimum energy dissipated to the environment is:

$$E_{\text{dissipated}} \geq kT \ln 2 \cdot \Delta H$$

This is the **signature equation** of this article. Every irreversible computation -- every operation that maps multiple distinct inputs to the same output -- destroys information and must pay this thermodynamic cost. The energy doesn't vanish; it becomes heat in the environment, increasing the environment's entropy by at least the amount the computation's entropy decreased.

The converse is equally important: **a reversible computation -- one that destroys no information -- need not dissipate any energy at all.** A one-to-one mapping from inputs to outputs preserves entropy and can, in principle, be performed for free. This is why reversibility matters: it is not just a mathematical nicety, but an energy budget.

## Reversible Computation

Charles Bennett (1973) showed that any computation can be made reversible by retaining enough auxiliary information to reconstruct the input from the output. The key insight: irreversibility is not inherent to the computation itself, but to the **discarding of intermediate results**.

Consider logic gates. The **NOT** gate maps $0 \mapsto 1$ and $1 \mapsto 0$. This is a bijection -- one input, one output, perfectly invertible. No information is lost, no entropy is destroyed, no energy need be dissipated.

The **AND** gate maps $(0,0) \mapsto 0$, $(0,1) \mapsto 0$, $(1,0) \mapsto 0$, $(1,1) \mapsto 1$. Three distinct inputs all produce $0$. Given only the output bit, you cannot determine which of the three inputs caused it. One bit of information has been irreversibly destroyed (two input bits, one output bit, one bit lost).

The **Toffoli gate** (Fredkin and Toffoli, 1982) fixes this by adding auxiliary outputs. It is a three-bit gate: $(a, b, c) \mapsto (a, b, c \oplus (a \wedge b))$. The first two bits pass through unchanged; the third bit is XORed with the AND of the first two. Three bits in, three bits out -- a bijection, hence reversible. The AND operation is embedded in a larger reversible context by keeping the "garbage" (the unchanged input bits that let you undo the computation).

Neural network activations face the same dichotomy. **ReLU** is not invertible: $\text{ReLU}(3) = 3$ and $\text{ReLU}(-3) = 0$. Given the output $3$, you know the input was $3$ (since $\text{ReLU}(x) = x$ for $x > 0$). But given the output $0$, the input could have been $0$, $-1$, $-100$, or any negative number. Many inputs collapse to a single output. Information is destroyed.

**tanh** is invertible: it is a strictly monotonic function from $\mathbb{R}$ to $(-1, 1)$, and its inverse $\text{arctanh}$ recovers the input exactly (modulo numerical precision). No information is lost. No garbage is needed.

| Operation | Input bits | Output bits | Reversible? | Garbage needed |
|-----------|-----------|-------------|-------------|----------------|
| NOT | 1 | 1 | Yes | 0 |
| AND | 2 | 1 | No | 1 |
| XOR | 2 | 1 | No (but Toffoli fixes) | 1 |
| ReLU | n | n | No | n (binary mask) |
| tanh | n | n | Yes | 0 |
| Linear $\mathbf{W}$ (square, full rank) | n | n | Yes | 0 |
| Linear $\mathbf{W}$ (rank-deficient) | n | m < n | No | n-m |

The pattern is clear: an operation is reversible if and only if it is a bijection between its input and output spaces. When it isn't, the deficit -- the information destroyed -- must be stored somewhere if you want the ability to undo the computation. That stored information is the **garbage signal**.

## The Garbage Signal of a ReLU Layer

A single ReLU layer computes $\mathbf{h} = \text{ReLU}(\mathbf{W}\mathbf{x} + \mathbf{b})$, which applies the elementwise operation $h_i = \max(0, z_i)$ where $z_i = (\mathbf{W}\mathbf{x} + \mathbf{b})_i$ is the pre-activation.

The information destroyed by ReLU is precisely which pre-activations were negative. Define the **binary mask**:

$$\mathbf{m} = \mathbb{1}[\mathbf{W}\mathbf{x} + \mathbf{b} > 0]$$

where $m_i = 1$ if $z_i > 0$ and $m_i = 0$ if $z_i \leq 0$. This is the garbage signal of the ReLU layer. If you store $\mathbf{m}$ alongside the output $\mathbf{h}$, the layer becomes invertible:

- For units where $m_i = 1$: $z_i = h_i$ (the ReLU was the identity).
- For units where $m_i = 0$: $z_i \leq 0$, but $h_i = 0$ tells you only that $z_i$ was non-positive, not its actual value.

Even with the mask, you only recover $z_i$ for the active units. The exact values of the suppressed pre-activations are gone -- $\text{ReLU}$ doesn't just hide them, it annihilates them. The mask tells you **which** information was destroyed, but not **what** the destroyed information was. To achieve full invertibility, you would need to store the actual negative pre-activation values, not just the sign.

The entropy destroyed per layer is at most $n$ bits (one bit per unit for the sign), but the actual destroyed information depends on the distribution of pre-activations. If only 50% of units are active on average (a common empirical observation in trained ReLU networks), the mask carries about $n$ bits of entropy (each bit roughly equally likely to be 0 or 1), and the layer destroys roughly that much information.

**Skip connections carry forward the garbage implicitly.** In a ResNet, the computation is $\mathbf{y} = \mathbf{x} + F(\mathbf{x})$ where $F$ contains the ReLU layers. The original input $\mathbf{x}$ is preserved alongside the post-activation output $F(\mathbf{x})$. The skip connection acts as a side channel that keeps the pre-activation information alive -- it is a form of neural garbage retention, preventing the irreversible ReLU from permanently destroying the input signal.

## Reversible Neural Networks

If irreversibility costs energy and loses information, why not design networks that are reversible by construction? Several architectures do exactly this.

### RevNets

Gomez et al. (2017) introduced **RevNets** (Reversible Residual Networks), which use **invertible coupling layers**. The input is split into two halves $(\mathbf{x}_1, \mathbf{x}_2)$, and the forward pass computes:

$$\mathbf{y}_1 = \mathbf{x}_1 + F(\mathbf{x}_2)$$
$$\mathbf{y}_2 = \mathbf{x}_2 + G(\mathbf{y}_1)$$

where $F$ and $G$ are arbitrary (possibly non-invertible) functions -- typically residual blocks with ReLU activations. The coupling structure makes the overall transformation invertible regardless of $F$ and $G$:

$$\mathbf{x}_2 = \mathbf{y}_2 - G(\mathbf{y}_1)$$
$$\mathbf{x}_1 = \mathbf{y}_1 - F(\mathbf{x}_2)$$

The inversion is exact. No garbage signal is needed. The non-invertible components ($F$ and $G$, which may contain ReLU) are embedded in a reversible scaffolding that preserves all information. This is Bennett's trick applied to neural networks: make the computation reversible by construction, so that the irreversible pieces are always accompanied by enough context to undo them.

### Neural ODEs

Chen et al. (2018) proposed **Neural ODEs**, which define the network as a continuous dynamical system:

$$\frac{d\mathbf{h}}{dt} = f_\theta(\mathbf{h}(t), t)$$

The output is $\mathbf{h}(T)$ obtained by integrating the ODE from $t = 0$ to $t = T$ starting from $\mathbf{h}(0) = \mathbf{x}$. If $f_\theta$ is Lipschitz continuous (which is ensured by architectural constraints), the ODE has a unique solution, and the flow map $\mathbf{x} \mapsto \mathbf{h}(T)$ is a diffeomorphism -- a smooth, invertible transformation. The inverse is obtained by integrating the ODE backward in time.

A Neural ODE produces **zero garbage** by design. It is a continuous, invertible transformation that can be as expressive as needed (by increasing $T$ or the complexity of $f_\theta$). The connection to the theory of this series is direct: a Neural ODE is a **learned unitary-like transform**, echoing the unitarity discussion from [006](006_interlude-reality-symmetry-uncertainty.md). The flow preserves the topology of the input space -- it can stretch and bend but never tear or fold.

## Normalizing Flows

**Normalizing flows** make invertibility not just possible but central. They are explicitly invertible neural networks designed to transform probability distributions -- connecting directly to the core subject of this series.

A normalizing flow defines a bijective mapping $g: \mathbb{R}^n \to \mathbb{R}^n$ between a simple base distribution (typically a standard Gaussian $\mathbf{z} \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$) and a complex target distribution $\mathbf{y} = g(\mathbf{z})$. The **change-of-variables formula** gives the density of the transformed variable:

$$f_Y(\mathbf{y}) = f_Z(g^{-1}(\mathbf{y})) \cdot |\det \mathbf{J}_{g^{-1}}(\mathbf{y})|$$

This is the same formula from [001](001_probability-density-functions.md) for transforming PDFs -- the Jacobian determinant tracks how the transform stretches or compresses probability mass at each point. What is new here is that the transform $g$ is **learned**: the parameters of the bijection are optimized to maximize the likelihood of observed data under the flow model.

For our four canonical distributions, a normalizing flow learns to warp the Gaussian base into the target:

| Target | What the flow must learn |
|--------|--------------------------|
| Gaussian | Identity (trivial -- base is already Gaussian) |
| Laplace | Sharpen the peak, fatten the tails |
| Uniform | Compress the center, spread the tails to create flat region |
| Cauchy | Radically fatten the tails (requires flexible architecture) |

The Jacobian determinant $|\det \mathbf{J}_{g^{-1}}|$ serves as a **local volume correction**. Where the flow compresses space (maps a large region of $\mathbf{z}$ to a small region of $\mathbf{y}$), the Jacobian is greater than 1, concentrating probability mass. Where it expands space, the Jacobian is less than 1, diluting mass. This is exactly how the transforms in [001](001_probability-density-functions.md) operate, but now applied to a learned, high-dimensional, nonlinear mapping.

The key architectural challenge is making $\det \mathbf{J}$ cheap to compute. Naive Jacobian computation costs $O(n^3)$. Practical normalizing flows (RealNVP, Glow, Neural Spline Flows) use coupling layers and other structured transformations that make the Jacobian triangular, reducing the determinant to a product of diagonal entries -- $O(n)$ computation.

## Thermodynamic Cost of Neural Network Inference

Landauer's principle sets a floor on the energy cost of irreversible computation. What does this floor look like for a neural network?

Consider a typical dense layer with $n$ ReLU activations. If roughly half the units are inactive (a common empirical observation), each ReLU destroys on average about 1 bit of information (the sign of the pre-activation). The Landauer bound for this layer is:

$$E_{\text{layer}} \geq n \cdot kT \ln 2 \approx n \times 2.87 \times 10^{-21}\,\text{J}$$

For a layer with $n = 1000$ units, this is about $2.87 \times 10^{-18}$ J -- roughly 3 attojoules. This is extraordinarily small.

Now compare to what actual hardware dissipates. A modern GPU performs floating-point operations at roughly $10^{-15}$ J per operation (1 femtojoule). A single layer with 1000 units requires on the order of $10^6$ multiply-add operations (for a $1000 \times 1000$ weight matrix), dissipating roughly $10^{-9}$ J -- about a nanojoule.

The ratio is striking:

$$\frac{E_{\text{actual}}}{E_{\text{Landauer}}} \approx \frac{10^{-9}}{3 \times 10^{-18}} \approx 3 \times 10^{8}$$

Modern neural network hardware operates at roughly **$10^8$ to $10^9$ times the Landauer limit**. We are thermodynamically profligate by nine orders of magnitude. Almost all the energy dissipated during inference is not paying the fundamental cost of information destruction -- it is lost to resistive heating, charge shuttling, clock distribution, and other engineering overheads.

This is both humbling and hopeful. The physics allows computation to be vastly cheaper than current technology achieves. The Landauer bound for running a billion-parameter transformer inference (destroying perhaps $10^9$ bits of information across all layers) is roughly $3 \times 10^{-12}$ J -- about 3 picojoules. Actual inference costs millijoules to joules. The gap between thermodynamic necessity and engineering reality is the space in which future hardware improvement lives.

For reversible architectures (RevNets, Neural ODEs), the Landauer bound on the network layers themselves is zero -- they destroy no information. The only irreversible steps are the final readout (which collapses the representation to a prediction) and any non-invertible loss computation. Reversible architectures don't just save memory (by recomputing activations instead of storing them); they are, in principle, thermodynamically cheaper.

## The Compensation Trick as Reversibility

The compensation mechanism from [011](011_the-scale-transform.md) and [012](012_the-variable-scale-transform.md) is, at its core, a **reversibility mechanism**. The variable scale transform applies an exponential tilt $\exp(\int \sigma(u)\,du)$ and then compensates with the inverse $\exp(-\int \sigma(u)\,du)$. The composition of tilt and compensation is the identity -- the operation is reversible, and no information is destroyed.

Skip connections in neural networks serve the same function. The ResNet computation $\mathbf{y} = \mathbf{x} + F(\mathbf{x})$ is an additive perturbation of the identity. For small $F$ (which is empirically the case in well-trained deep ResNets -- the residual blocks learn small corrections), this is approximately invertible:

$$\mathbf{x} = \mathbf{y} - F(\mathbf{x}) \approx \mathbf{y} - F(\mathbf{y})$$

The approximation improves as $\|F\| \to 0$. In the limit of infinitely many infinitesimal residual blocks -- which is exactly the Neural ODE limit -- the inversion becomes exact. Each infinitesimal step $\mathbf{h}(t + dt) = \mathbf{h}(t) + f(\mathbf{h}(t))\,dt$ is invertible because $dt$ is infinitesimal and $f$ is bounded.

The parallel between the series' concepts and neural architecture is precise:

| Transform framework | Neural network |
|---------------------|----------------|
| Exponential tilt $e^{\sigma t}$ | Weight multiplication $\mathbf{W}\mathbf{h}$ |
| Compensation $e^{-\sigma t}$ | Skip connection (identity shortcut) |
| Variable tilt $\exp(\int \sigma(u)\,du)$ | Depth-varying residual blocks |
| Tilt + compensation = identity | $\mathbf{y} = \mathbf{x} + F(\mathbf{x})$ invertible for small $F$ |
| Parseval energy balance | Stable gradient flow through skip connections |

Skip connections are **neural compensation signals**. They keep the forward pass approximately reversible, which keeps the backward pass (gradient computation) stable. The exploding/vanishing gradient problem is, from this perspective, a **failure of reversibility** -- the forward map contracts or expands so aggressively that the inverse (which the backward pass implicitly computes) becomes numerically unstable. Compensation -- whether in the form of skip connections, normalization, or careful initialization -- restores the approximate unitarity that stable training requires.

## fftnn Exercise

The `fftnn` project (at [../../fftnn/index.html](../../fftnn/index.html)) provides a concrete testbed for these ideas.

**Exercise:** Open the fftnn interface and perform the following experiment:

1. Train the network with **tanh** activation (the default). After convergence, examine the Gram matrix $\mathbf{W}^T\mathbf{W}$ of each layer's weight matrix. Compute the orthogonality score: $\|\mathbf{W}^T\mathbf{W} - \mathbf{I}\|_F / n$, where $\|\cdot\|_F$ is the Frobenius norm and $n$ is the layer width. A score of 0 means perfectly orthogonal (unitary) weights.

2. Switch the activation to **ReLU** and retrain from scratch with the same architecture and learning rate. Compute the same orthogonality scores.

3. Compare. You should observe that **tanh (invertible, smooth) achieves closer-to-orthogonal weights than ReLU (irreversible, produces garbage)**. The tanh network's weights are under pressure to be approximately unitary -- because the activation is invertible, the only way the network can lose information is through the weight matrices, and the training dynamics resist this. The ReLU network faces no such pressure: the activation already destroys information, so the weights are free to be rank-deficient without additional penalty.

4. Open the **IDFT reconstruction tab**. This tab shows the inverse discrete Fourier transform of the network's internal representation -- an attempt to reconstruct the input from the hidden activations. The reconstruction error is the **garbage signal's shadow**: the information that was destroyed by irreversible operations and cannot be recovered. Compare the reconstruction error between the tanh and ReLU networks. The ReLU network's reconstruction error will be larger, concentrated in the components that were zeroed out by the activation.

The IDFT reconstruction makes the abstract concept of information destruction concrete and visible. The lost information is not just a number ($\Delta H$ bits) -- it has structure, and that structure reveals which features of the input the network chose to discard.

---

$$E_{\text{dissipated}} \geq kT \ln 2 \cdot \Delta H$$

Landauer's principle ties information loss to energy. Every irreversible layer in a neural network pays a thermodynamic tax. Reversible architectures avoid this tax by construction, preserving all information through invertible transformations -- the same principle that makes the Fourier transform unitary and the compensation mechanism of the variable scale transform energy-neutral.

But what if the computation itself is continuous -- analog rather than digital? What happens to bits, entropy, and Landauer's bound when the state space is no longer discrete?

*Next: [016: Analog Computation and the Continuum Limit](016_analog-computation-and-the-continuum-limit.md)*

---

## Series

| | Article | Core idea |
|---|---|---|
| 001 | [Probability Density Functions](001_probability-density-functions.md) | Density as probability rate |
| 002 | [Moments and the MGF](002_moments-and-the-mgf.md) | Moments as summary; MGF as Laplace transform |
| 003 | [Fourier vs. Laplace](003_fourier-vs-laplace-transforms-of-pdfs.md) | Bounded kernel $\Rightarrow$ universal existence |
| 004 | [The Dual Variable](004_the-dual-variable-what-t-means.md) | $t$ = distributional frequency |
| 005 | [Distributional Decay Rate](005_distributional-decay-rate.md) | Laplace dual = exponential tilt rate |
| 006 | [Reality, Symmetry, Uncertainty](006_interlude-reality-symmetry-uncertainty.md) | Unitarity, Heisenberg, observability |
| 007 | [Convolution and Multiplication](007_convolution-independence-and-multiplication.md) | $e^{i(x+y)} = e^{ix}e^{iy}$ linearizes sums |
| 008 | [Stable Distributions](008_stable-distributions-and-generalized-clt.md) | Generalized CLT; $\alpha$-stable family |
| 009 | [Joint CF and Dependence](009_joint-cf-and-dependence.md) | Dependence lives off the axes |
| 010 | [Complete Invariant](010_the-cf-as-complete-invariant.md) | The CF determines everything |
| 011 | [The Scale Transform](011_the-scale-transform.md) | Mellin bridge; oscillation + decay + scale |
| 012 | [Variable Scale Transform](012_the-variable-scale-transform.md) | Adaptive probe with compensation |
| 013 | [From Transforms to Learned Representations](013_from-transforms-to-learned-representations.md) | Neural networks as endpoints of the transform progression |
| 014 | [Entropy, Information, and the Cost of Transformation](014_entropy-information-and-the-cost-of-transformation.md) | Shannon entropy meets transform theory |
| 015 | [Reversibility, Garbage Signals, and Landauer's Principle](015_reversibility-garbage-signals-and-landauers-principle.md) | Information destruction is physical; reversible architectures |
| 016 | [Analog Computation and the Continuum Limit](016_analog-computation-and-the-continuum-limit.md) | From discrete bits to continuous transforms |
