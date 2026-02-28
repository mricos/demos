# Entropy, Information, and the Cost of Transformation

*Continues from [013: From Transforms to Learned Representations](013_from-transforms-to-learned-representations.md)*

Article 013 showed that neural networks are learned transforms -- the endpoint of a progression from fixed Fourier bases through adaptive scale probes to fully data-driven representations. But each learned layer applies a nonlinear function to its input. Nonlinear functions are not, in general, invertible. They can destroy information. The Fourier transform is perfectly reversible ([006](006_interlude-reality-symmetry-uncertainty.md), [010](010_the-cf-as-complete-invariant.md)); a ReLU activation is not. How much information does a layer lose? And what does "cost" mean for a transform?

This article develops the information-theoretic framework for answering these questions. The central result is the **data processing inequality**: information can only decrease under non-invertible transformations. Every nonlinear layer in a neural network either preserves information (if invertible) or irreversibly destroys it. The mathematics of entropy quantifies exactly how much.

## Shannon Entropy as a Functional on PDFs

In [001](001_probability-density-functions.md), we defined a probability density function by two axioms: $f(x) \geq 0$ and $\int f(x)\,dx = 1$. Every subsequent tool in this series -- the CF, the MGF, the Mellin transform -- is a functional that takes a PDF as input and produces a complex-valued function as output.

Shannon's **differential entropy** is another such functional, but it produces a single number:

$$H(X) = -\int_{-\infty}^{\infty} f(x) \ln f(x)\,dx$$

This measures the **average surprise** of the distribution -- how unpredictable a draw from $f$ is. High entropy means the distribution is spread out, and samples carry a lot of information. Low entropy means the distribution is concentrated, and samples are predictable.

The integrand $-f(x) \ln f(x)$ is non-negative (since $0 \leq f(x)$ implies $\ln f(x) \leq 0$ wherever $f(x) \leq 1$, and the regions where $f(x) > 1$ contribute negative integrand). Unlike the CF, which maps a PDF to a function of $t$, entropy collapses all the distributional structure into a single scalar. It answers one question: how much information does a sample carry?

### Entropy of the Four Canonical Distributions

Using the four distributions from [001](001_probability-density-functions.md), with standard parameterizations:

**Gaussian** $N(\mu, \sigma^2)$:

$$H_{\text{Gauss}} = \frac{1}{2}\ln(2\pi e\sigma^2)$$

This is computed directly:

$$H = -\int f(x)\ln f(x)\,dx = -\int f(x)\left[-\frac{1}{2}\ln(2\pi\sigma^2) - \frac{(x-\mu)^2}{2\sigma^2}\right]dx = \frac{1}{2}\ln(2\pi\sigma^2) + \frac{1}{2} = \frac{1}{2}\ln(2\pi e\sigma^2)$$

For $\sigma = 1$: $H \approx 1.419$ nats.

**Laplace** $\text{Lap}(\mu, b)$:

$$H_{\text{Lap}} = \ln(2be) = 1 + \ln(2b)$$

For $b = 1/\sqrt{2}$ (matching the Gaussian's variance $\sigma^2 = 2b^2 = 1$): $H \approx 1.346$ nats. The Laplace distribution has **less** entropy than a Gaussian with the same variance -- it concentrates more mass near the center and in the tails, with less in the intermediate region.

**Uniform** $U(a, b)$:

$$H_{\text{Unif}} = \ln(b - a)$$

For an interval of length $\sqrt{12}\sigma$ (matching variance $\sigma^2 = 1$, so $b - a = 2\sqrt{3}$): $H = \ln(2\sqrt{3}) \approx 1.244$ nats. The uniform distribution, despite being "flat," has lower entropy than the Gaussian at the same variance because its support is bounded.

**Cauchy** $\text{Cauchy}(x_0, \gamma)$:

$$H_{\text{Cauchy}} = \ln(4\pi\gamma)$$

The Cauchy distribution's variance is undefined (infinite), so a direct variance-matched comparison is not meaningful. For $\gamma = 1$: $H = \ln(4\pi) \approx 2.531$ nats. The Cauchy has the highest entropy of the four -- its heavy tails spread probability broadly, and its lack of finite moments reflects this maximal spread.

| Distribution | Entropy $H(X)$ | Value ($\sigma^2 = 1$) |
|---|---|---|
| Gaussian | $\frac{1}{2}\ln(2\pi e\sigma^2)$ | 1.419 nats |
| Laplace | $1 + \ln(2b)$ | 1.346 nats |
| Uniform | $\ln(b - a)$ | 1.244 nats |
| Cauchy | $\ln(4\pi\gamma)$ | 2.531 nats ($\gamma = 1$) |

The Gaussian has the highest entropy among all distributions with fixed variance. This is not a coincidence -- it is the maximum entropy principle, which we return to below.

## Entropy Under Transforms

Not all transforms treat entropy equally. The fundamental divide is between **unitary** and **non-unitary** transforms, a distinction established in [006](006_interlude-reality-symmetry-uncertainty.md).

### Fourier Transform: Entropy Preserved

The Fourier transform is unitary. Parseval's theorem says:

$$\int |f(x)|^2\,dx = \frac{1}{2\pi}\int |\varphi(t)|^2\,dt$$

More generally, unitarity means the transform preserves the full structure of the function space -- inner products, norms, and all $L^p$ relationships. For differential entropy, a linear invertible transformation $Y = AX$ with Jacobian $|A|$ gives:

$$H(Y) = H(X) + \ln|A|$$

The Fourier transform, being unitary ($|A| = 1$ in the appropriate sense), preserves entropy exactly. The information content of a distribution is identical whether described in the domain space ($x$) or the frequency space ($t$). Transforming a signal to its spectrum and back loses nothing.

This is why the Fourier/CF representation is a **complete invariant** ([010](010_the-cf-as-complete-invariant.md)): no information is gained or lost. The distribution and its characteristic function are two views of the same object, carrying exactly the same entropy.

### Laplace Transform: Entropy Not Preserved

The Laplace transform uses the kernel $e^{sx}$ with real part $e^{\sigma x}$, which grows without bound. As discussed in [005](005_distributional-decay-rate.md) and [006](006_interlude-reality-symmetry-uncertainty.md), this is non-unitary: it amplifies some components and suppresses others.

The exponential tilt $f(x) \mapsto f(x)e^{\sigma x}$ changes the entropy:

$$H(f \cdot e^{\sigma x}) = H(f) - \sigma\,E[X] + \ln Z(\sigma)$$

where $Z(\sigma) = \int f(x)e^{\sigma x}\,dx$ is the normalizing constant. The entropy change depends on the distribution's mean and the tilt rate. This is the thermodynamic content of the Laplace transform: the exponential tilt is the Boltzmann weight $e^{-\beta E}$, the normalizing constant is the partition function, and the entropy change is the free energy.

The compensation principle from [011](011_the-scale-transform.md) and [012](012_the-variable-scale-transform.md) can now be understood information-theoretically: the compensation factor $e^{-\sigma t}$ restores the entropy that the exponential tilt removed, keeping the analysis energy-balanced.

### Transform Entropy Behavior

| Transform | Kernel | Unitary? | Entropy effect |
|---|---|---|---|
| Fourier (CF) | $e^{itx}$ | Yes | Preserved exactly |
| Laplace (MGF) | $e^{tx}$ | No | Shifted by exponential tilt |
| Mellin (Scale) | $t^{s-1}$ | Yes (on $L^2(dt/t)$) | Preserved (in log domain) |
| Variable Scale | $\exp(\int\sigma(t)\,dt)$ | Locally, with compensation | Preserved if compensated |
| Neural Network Layer | $\phi(\mathbf{W}\mathbf{x} + \mathbf{b})$ | No (in general) | **Decreased** (if $\phi$ non-invertible) |

The last row is the key point. A neural network layer is, generically, a non-unitary, non-invertible transform. It does not merely shift entropy -- it destroys it.

## KL Divergence as Transform Cost

If entropy measures how much information a distribution contains, **KL divergence** measures the penalty for describing one distribution using the language of another:

$$D_{KL}(P \| Q) = \int p(x) \ln\frac{p(x)}{q(x)}\,dx$$

This is always non-negative ($D_{KL} \geq 0$, with equality iff $P = Q$) and is not symmetric: $D_{KL}(P \| Q) \neq D_{KL}(Q \| P)$ in general.

### The Wrong-Basis Interpretation

In the context of this series, KL divergence has a clean interpretation: it is the **cost of using the wrong transform basis** to analyze your data.

Suppose your data comes from distribution $P$, but you analyze it assuming distribution $Q$. For example, you use a Gaussian model (matched to the Fourier basis, with its super-exponential tail decay) to describe data that is actually Laplace-distributed (exponential tails) or Cauchy-distributed (polynomial tails). The KL divergence $D_{KL}(P \| Q)$ measures the expected number of extra nats per sample required by this mismatch.

For the canonical distributions with matched variance ($\sigma^2 = 1$):

$$D_{KL}(\text{Lap} \| \text{Gauss}) = \frac{1}{2}\ln(2\pi e\sigma^2) - 1 - \ln(2b) + \sqrt{2}\sigma/b - 1$$

which for $\sigma^2 = 2b^2 = 1$ evaluates to approximately $0.073$ nats. The Gaussian model is a decent approximation of the Laplace -- the tails differ but the central mass is similar.

For Cauchy vs. Gaussian, the KL divergence is **infinite**: $D_{KL}(\text{Cauchy} \| \text{Gauss}) = \infty$. The Gaussian model assigns exponentially vanishing probability to the regions where the Cauchy places polynomial mass. No finite number of extra bits can compensate for this mismatch. This reflects the fundamental incompatibility between polynomial-tail and exponential-tail distributions -- the same incompatibility that causes the Cauchy's MGF to not exist ([002](002_moments-and-the-mgf.md), [005](005_distributional-decay-rate.md)).

The lesson for neural networks: if a network's internal representation implicitly assumes Gaussian structure (as batch normalization encourages), it will pay a large divergence penalty when processing heavy-tailed data. The choice of architecture encodes assumptions about the data's distributional family.

## The Data Processing Inequality

The central theorem of this article:

$$H(Y) \leq H(X), \quad Y = g(X)$$

If $Y = g(X)$ for a deterministic function $g$, then the entropy of $Y$ cannot exceed the entropy of $X$. If $g$ is invertible (bijective), equality holds. If $g$ is not invertible -- if it maps distinct inputs to the same output -- then entropy strictly decreases.

This is the **data processing inequality** in its simplest form. It says that deterministic processing cannot create information. Information only flows one way: downhill.

The proof is intuitive. If $g$ maps two distinct values $x_1 \neq x_2$ to the same $y = g(x_1) = g(x_2)$, then observing $Y = y$ tells you less about the original value than observing $X$ directly. The mapping has merged probability mass that was distinguishable in $X$ into a single lump in $Y$. The merged mass carries less information than the separated masses. This merging is irreversible: knowing $Y = y$ cannot tell you which of $x_1$ or $x_2$ produced it.

For a Markov chain $X \to Y \to Z$ (each variable determined by the previous one), the inequality extends:

$$H(Z) \leq H(Y) \leq H(X)$$

Each step can only lose information, never gain it. A neural network with $L$ layers forms exactly such a chain:

$$\mathbf{x} \to \mathbf{h}_1 \to \mathbf{h}_2 \to \cdots \to \mathbf{h}_L \to \hat{y}$$

Every layer's output has entropy at most equal to its input's entropy. The representation at the final layer carries at most as much information as the raw input -- and typically far less, because the non-invertible activations and dimensionality reductions along the way have systematically destroyed information about the input that is (ideally) irrelevant to the task.

## ReLU as Half-Wave Rectifier

The most common activation function in modern neural networks is the **rectified linear unit**:

$$\text{ReLU}(x) = \max(0, x) = \begin{cases} x & x > 0 \\ 0 & x \leq 0 \end{cases}$$

In signal processing, this is a **half-wave rectifier**: it passes the positive half of the signal unchanged and clips the negative half to zero. It is non-invertible -- every negative input maps to the same output (zero).

### Entropy Cost for Gaussian Input

Consider Gaussian input $X \sim N(0, \sigma^2)$ passing through ReLU. The output $Y = \text{ReLU}(X)$ is a **mixed distribution**: a point mass at zero (with probability $1/2$, from all $x \leq 0$) plus a continuous half-Gaussian on $(0, \infty)$ (with probability $1/2$).

The input entropy is:

$$H(X) = \frac{1}{2}\ln(2\pi e\sigma^2)$$

The output entropy has two components. The discrete part contributes:

$$H_{\text{discrete}} = -\frac{1}{2}\ln\frac{1}{2} - \frac{1}{2}\ln\frac{1}{2} = \ln 2$$

The continuous part, conditioned on $Y > 0$, is the entropy of a half-Gaussian:

$$H_{\text{cont}} = \frac{1}{2}\left[\frac{1}{2}\ln(2\pi e\sigma^2) - \ln 2\right]$$

More precisely, the total entropy of the output (using the convention for mixed distributions) can be bounded. The entropy loss is:

$$\Delta H = H(X) - H(Y) \approx \frac{1}{2}\ln(2\pi e\sigma^2) - \frac{1}{2}\ln(2\pi e\sigma^2) + \frac{1}{2}\ln 2 = \frac{1}{2}\ln 2 \approx 0.347 \text{ nats}$$

The precise accounting depends on how one handles the mixed discrete-continuous nature of the output, but the essential picture is clear: **ReLU destroys roughly half the information in a symmetric input**. Half the distribution collapses to a single point, and the information that distinguished those negative values from each other is lost forever.

For the four canonical distributions, the story varies:

| Distribution | Symmetry | Mass mapped to 0 | Information loss |
|---|---|---|---|
| Gaussian $N(0, \sigma^2)$ | Symmetric | 50% | Substantial |
| Laplace $\text{Lap}(0, b)$ | Symmetric | 50% | Substantial |
| Uniform $U(-a, a)$ | Symmetric | 50% | Substantial |
| Cauchy $\text{Cauchy}(0, \gamma)$ | Symmetric | 50% | Substantial, but $\infty$ input entropy |

For any symmetric distribution, ReLU kills exactly half the mass. The key insight is that this destruction is **systematic, not random**: it is always the left half of the distribution that dies. This structured destruction is what gives ReLU its power as a feature selector -- it creates sparse representations where only the "positively activated" features survive. But the data processing inequality guarantees that this power comes at an irreducible information cost.

### Why Leaky ReLU Costs Less

The **leaky ReLU** $\phi(x) = \max(\alpha x, x)$ with small $\alpha > 0$ is invertible: distinct negative inputs map to distinct negative outputs (scaled by $\alpha$). An invertible activation preserves entropy exactly. In practice, $\alpha = 0.01$ means the negative-side information is attenuated (hard to use in practice) but not destroyed in principle. This is why leaky ReLU and its variants (PReLU, ELU) sometimes improve network performance: they reduce the information cost of each layer.

## Normalization as Entropy Regulation

Neural network activations, left to their own devices, tend to drift toward low-entropy states during training:

- **Saturation**: If activations grow large, sigmoid/tanh activations saturate near $\pm 1$, collapsing the distribution to two point masses. Entropy approaches $\ln 2$ -- the entropy of a coin flip -- regardless of input dimensionality.

- **Collapse**: If activations shrink toward zero, all neurons produce near-identical outputs. The activation distribution concentrates near a point, and entropy drops toward $-\infty$ (in the differential sense).

Both failure modes represent a collapse of the information-carrying capacity of the layer. The network's representation degenerates -- it can no longer distinguish between different inputs.

**Batch normalization** and **layer normalization** prevent this by enforcing:

$$\hat{h}_i = \frac{h_i - \mu}{\sigma}$$

This standardization forces the activations to have zero mean and unit variance at every layer. What does this do to entropy?

For any distribution with fixed variance $\sigma^2 = 1$, the Gaussian maximizes entropy (see below). By standardizing to unit variance, normalization places the activations in a regime where they can carry **maximum information per unit of variance**. It doesn't force the activations to be Gaussian, but it creates the conditions under which they tend toward the maximum-entropy distribution.

The connection to the compensation principle from [011](011_the-scale-transform.md) and [012](012_the-variable-scale-transform.md) is now information-theoretic: the compensation factor restores entropy that the exponential tilt removed. Normalization restores entropy that the weight multiplication and non-invertible activation removed. Both are **entropy regulation mechanisms** -- they keep the signal in a high-information regime where downstream processing has the most to work with.

| Mechanism | Domain | What it prevents | Entropy effect |
|---|---|---|---|
| Compensation $e^{-\sigma t}$ | Scale transform | Exponential energy drift | Restores energy balance |
| Batch normalization | Neural network | Activation drift/collapse | Maintains high-entropy regime |
| Layer normalization | Neural network | Per-example scale drift | Maintains high-entropy regime |
| Parseval's theorem | Fourier transform | Energy creation/destruction | Guarantees exact preservation |

## The Information Bottleneck

The data processing inequality says that each layer in a network loses information about the input $X$. But the network's goal is not to preserve information about $X$ -- it is to extract information about the target $Y$. These are different objectives, and the tension between them is formalized by **Tishby's information bottleneck**.

Given input $X$ and target $Y$, find a representation $T = g(X)$ that minimizes:

$$\mathcal{L}_{\text{IB}} = I(X; T) - \beta\,I(T; Y)$$

where $I(\cdot;\cdot)$ denotes mutual information and $\beta > 0$ is a trade-off parameter.

The first term $I(X; T)$ measures how much information $T$ retains about $X$. Minimizing it means **compressing** -- throwing away as much of $X$ as possible. The second term $I(T; Y)$ measures how much information $T$ retains about the target $Y$. Maximizing it (the negative sign) means **preserving task-relevant structure**.

The optimal representation is the one that compresses $X$ maximally while retaining everything relevant to $Y$. This is a principled version of the informal goal stated in [013](013_from-transforms-to-learned-representations.md): neural networks aim for task-relevant, compressed, discriminative representations.

### The Analogy to Scale Analysis

The information bottleneck has a precise analog in the windowed scale analysis from [012](012_the-variable-scale-transform.md). There, we faced a trade-off:

| Information Bottleneck | Windowed Scale Analysis |
|---|---|
| Representation $T$ | Windowed transform coefficients |
| Compression $I(X; T)$ | Window width (narrow = fewer coefficients) |
| Relevance $I(T; Y)$ | Frequency resolution (narrow window = poor resolution) |
| Trade-off $\beta$ | Window parameter |
| Optimal $T$ | Uncertainty-limited window |

In both cases, you trade **resolution for stability**. A wide window (large $I(X; T)$) gives fine frequency resolution but is sensitive to local noise. A narrow window (small $I(X; T)$) gives coarse resolution but is robust. The information bottleneck says: choose the narrowest window (maximum compression) that still resolves the task-relevant structure.

The uncertainty principle from [006](006_interlude-reality-symmetry-uncertainty.md) sets the fundamental limit on this trade-off: $\sigma_x \cdot \sigma_\omega \geq 1/2$. You cannot simultaneously have a narrow representation (compressed in the $X$-direction) and fine resolution (sharp in the $Y$-direction). The information bottleneck optimizes within this bound.

## Gaussian Maximum Entropy

The most important result in maximum entropy theory:

**Among all distributions with fixed mean $\mu$ and variance $\sigma^2$, the Gaussian $N(\mu, \sigma^2)$ has the maximum differential entropy:**

$$H_{\text{max}} = \frac{1}{2}\ln(2\pi e\sigma^2)$$

Any other distribution with the same first two moments has strictly less entropy. The proof uses the calculus of variations (or, equivalently, Lagrange multipliers on the entropy functional with moment constraints) and the non-negativity of KL divergence:

$$D_{KL}(f \| g) = \int f \ln\frac{f}{g}\,dx \geq 0$$

where $g$ is the Gaussian with the same mean and variance. Expanding:

$$0 \leq D_{KL}(f \| g) = -H(f) - \int f(x)\ln g(x)\,dx = -H(f) + \frac{1}{2}\ln(2\pi e\sigma^2)$$

Therefore $H(f) \leq \frac{1}{2}\ln(2\pi e\sigma^2) = H(g)$.

### Why This Matters: The CLT Connection

The Gaussian is the **fixed point** of the Central Limit Theorem ([008](008_stable-distributions-and-generalized-clt.md)). Summing independent random variables (with finite variance) pushes the distribution toward Gaussian. The maximum entropy property explains **why**: summing increases entropy (the entropy of a sum exceeds the entropy of its parts, for independent summands), and the Gaussian is the unique distribution that maximizes entropy at fixed variance. The CLT drives distributions uphill on the entropy landscape until they reach the Gaussian summit.

This connects three threads:

1. **Stability** ([008](008_stable-distributions-and-generalized-clt.md)): The Gaussian is stable under convolution.
2. **Completeness** ([010](010_the-cf-as-complete-invariant.md)): Its CF $e^{-\sigma^2 t^2/2}$ is the unique CF that is both Gaussian in $t$ and corresponds to a Gaussian in $x$.
3. **Maximum entropy**: Among all distributions with fixed variance, it carries the most information.

These are three faces of the same fact.

### Why This Matters: Neural Networks

Batch normalization standardizes activations to zero mean and unit variance. The maximum entropy theorem says that, subject to these constraints, the Gaussian distribution carries the most information. In practice, the combination of many additive contributions (from many input neurons, through the weight matrix) and the CLT effect means that pre-activation values tend Gaussian even without normalization, by the same mechanism as the CLT.

Normalization amplifies this tendency. By removing the mean and standardizing the variance, it eliminates the two "knobs" that could pull the distribution away from Gaussian. The result is that intermediate representations in deep networks are approximately Gaussian -- not by design, but because the maximum entropy principle and the CLT push them there, and normalization removes the forces that would resist.

This is information-theoretically optimal: at each layer, the representation carries the maximum possible information given its variance budget. The network then uses the subsequent nonlinear activation to selectively destroy the information that is irrelevant to the task -- the "carving" of information described by the information bottleneck.

## fftnn Exercise

Open the fftnn project at `../../fftnn/index.html`.

**Exercise: Observing Information Destruction**

1. Open the **Network** tab to see the architecture diagram and activation heatmap.

2. Configure a bottleneck architecture: **64 input -> 32 hidden -> 17 output**. Train for several hundred epochs. Watch the activation heatmap in the hidden layer.

3. **Count dead neurons.** After training, some hidden-layer neurons will show zero activation across all inputs -- they are "dead," killed by ReLU. These are zero-information units: they contribute nothing to the output. Each dead neuron represents a dimension of the representation that the data processing inequality has emptied. The 32-unit hidden layer might effectively be a 20-unit layer, with 12 units carrying no information.

4. **Widen the bottleneck.** Change to **64 -> 64 -> 17**. Retrain. Fewer neurons die (more capacity means less pressure to kill units), but many become **redundant** -- their activation patterns are highly correlated, meaning they carry overlapping information. The total information is bounded by $I(T; Y)$, regardless of how many neurons you use to encode it.

5. **Compare the heatmaps.** In the 32-unit bottleneck, the surviving neurons have diverse, distinct activation patterns -- they have been forced to be information-efficient. In the 64-unit wide layer, the patterns are more homogeneous -- there is slack. This is the information bottleneck in action: a narrow layer forces maximum compression, while a wide layer allows redundancy.

The activation heatmap is a direct visualization of information flow. Dark columns (dead neurons) are entropy sinks. Brightly varied columns (active, diverse neurons) are high-information channels. The architecture's width determines how much information can flow; the training dynamics determine how much actually does.

---

The signature equation of this article:

$$H(Y) \leq H(X), \quad Y = g(X)$$

The data processing inequality says information only flows downhill. Every non-invertible layer in a network, every ReLU that clips a negative, every pooling operation that averages adjacent values, every dropout mask that zeros a neuron -- all of these destroy information irreversibly. The art of neural network design is ensuring that what is destroyed is noise, and what is preserved is signal.

Can we avoid the loss entirely? Reversible computing says yes -- if we are willing to keep the "garbage," the auxiliary information that makes every step invertible. But keeping garbage has its own cost, measured not in bits but in energy.

*Next: [015: Reversibility, Garbage Signals, and Landauer's Principle](015_reversibility-garbage-signals-and-landauers-principle.md)*

---

## Series Navigation

| | Article | Core idea |
|---|---|---|
| 001 | [Probability Density Functions](001_probability-density-functions.md) | Density as probability rate |
| 002 | [Moments and the MGF](002_moments-and-the-mgf.md) | Moments as summary; MGF as Laplace transform |
| 003 | [Fourier vs. Laplace](003_fourier-vs-laplace-transforms-of-pdfs.md) | Bounded kernel implies universal existence |
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
| **014** | **[Entropy, Information, and the Cost of Transformation](014_entropy-information-and-the-cost-of-transformation.md)** | **Data processing inequality; information only flows downhill** |
| 015 | [Reversibility, Garbage Signals, and Landauer's Principle](015_reversibility-garbage-signals-and-landauers-principle.md) | Reversible computation and the thermodynamic cost of erasure |
| 016 | [Analog Computation and the Continuum Limit](016_analog-computation-and-the-continuum-limit.md) | Physics computes the transform; the continuum costs nothing |
