# From Transforms to Learned Representations

*Continues from [012: The Variable Scale Transform](012_the-variable-scale-transform.md)*

## The Arc of the Series

We have traveled from the probability density function ([001](001_probability-density-functions.md)) through a family of integral transforms -- Fourier ([003](003_fourier-vs-laplace-transforms-of-pdfs.md)), Laplace ([005](005_distributional-decay-rate.md)), Mellin/scale ([011](011_the-scale-transform.md)), variable scale ([012](012_the-variable-scale-transform.md)) -- and established a complete framework for analyzing distributions and signals. Each transform projects a signal onto a fixed set of basis functions (complex exponentials, real exponentials, power functions) and reads off coefficients.

The trajectory has a clear direction: each successive transform is **more adaptive** than the last. The FT uses a fixed oscillatory basis. The windowed FT localizes it in time. The scale transform adapts to exponential structure. The variable scale transform lets the adaptation itself vary. At each step, we gained vision at the cost of algebraic simplicity.

This trajectory points somewhere: toward transforms where the basis is not designed at all, but **learned from data**. That is what a neural network does. This article closes the theoretical series by showing that neural networks are the natural endpoint of the progression from fixed to adaptive transforms, and that the mathematics of characteristic functions illuminates what these networks learn and why.

## A Neural Network Is a Learned Transform

A feedforward neural network computes:

$$\hat{y} = \phi_L(\mathbf{W}_L \cdots \phi_2(\mathbf{W}_2\,\phi_1(\mathbf{W}_1\,\mathbf{x} + \mathbf{b}_1) + \mathbf{b}_2) \cdots + \mathbf{b}_L)$$

Each layer applies a linear map $\mathbf{W}_k$ (a matrix multiplication -- which is a change of basis) followed by a nonlinear activation $\phi_k$ (which is a pointwise transform). The full network is a composition of linear basis changes and nonlinear warps.

Compare this to the transforms in the series:

| Transform | Basis | Nonlinearity | Learned? |
|---|---|---|---|
| Fourier | $e^{i\omega x}$ | none (linear) | no |
| Laplace | $e^{\sigma x}$ | none | no |
| Scale | $x^{s-1}$ | log change of variable | no |
| Variable Scale | $\exp(\int\sigma(t)\,dt)$ | adaptive envelope | partially ($\sigma(t)$ estimated) |
| Neural Network | $\mathbf{W}_k$ | $\phi_k$ (ReLU, tanh, etc.) | **yes** (everything learned) |

The neural network is a **fully learned, nonlinear, multi-resolution transform**. The weight matrices $\mathbf{W}_k$ are the learned basis. The activations $\phi_k$ are the nonlinear element that fixed transforms lack. Training (backpropagation + gradient descent) is the process of discovering the basis that best represents the data for a given task.

## What Fixed Transforms Teach Us About Neural Networks

The theory of Fourier, Laplace, and scale transforms provides a vocabulary for understanding what neural networks learn:

### Frequency Selectivity = Feature Detection

A Fourier transform coefficient $\varphi(\omega) = \int e^{i\omega x}f(x)\,dx$ measures how much the signal resonates at frequency $\omega$. A neuron in a convolutional layer computes $z = \phi(\mathbf{w}^T\mathbf{x} + b)$ -- an inner product of the input with a learned weight vector, followed by a nonlinearity. This is the same operation: project onto a basis function (the weight vector), then threshold.

Convolutional neural networks learn **spatial frequency filters** in their early layers. Visualizations of trained CNNs consistently show that the first-layer filters are Gabor-like: oriented sinusoidal gratings modulated by Gaussian envelopes. These are precisely the minimum-uncertainty basis functions from [006](006_interlude-reality-symmetry-uncertainty.md) -- the signals that saturate the Fourier uncertainty bound $\sigma_x \cdot \sigma_\omega = 1/2$.

The network didn't know about Gabor functions or the uncertainty principle. It discovered them because they are the most efficient way to encode local frequency content -- a fact that the transform theory predicts.

### Normalization = Compensation

In [011](011_the-scale-transform.md) and [012](012_the-variable-scale-transform.md), the compensation factor $e^{-\sigma t}$ keeps the scale analysis energy-balanced. In neural networks, **normalization layers** (batch norm, layer norm, group norm) serve the same function: they rescale activations to prevent exponential growth or decay through the layers.

Without normalization, deep networks suffer from **exploding or vanishing gradients** -- the activations grow or shrink exponentially with depth, exactly the non-unitary behavior we identified with the Laplace transform in [006](006_interlude-reality-symmetry-uncertainty.md). Normalization is the network's compensation mechanism: it removes the exponential trend from the activation trajectory, leaving a residual that the subsequent layers can process stably.

The parallel is precise:

| Scale Transform | Neural Network |
|---|---|
| Signal $f(t)$ | Activation $\mathbf{h}_k$ |
| Exponential tilt $e^{\sigma t}$ | Weight multiplication $\mathbf{W}_k\mathbf{h}_{k-1}$ (can amplify/decay) |
| Compensation $e^{-\sigma t}$ | Normalization: $\hat{\mathbf{h}}_k = (\mathbf{h}_k - \mu)/\sigma$ |
| Parseval balance | Stable gradient flow |

### Multi-Scale Architecture = Wavelet/Scale Analysis

Networks like U-Net, Feature Pyramid Networks, and multi-resolution architectures process the input at multiple spatial scales simultaneously -- downsampling to capture coarse structure, upsampling to recover fine detail. This is the neural analog of multi-resolution analysis ([011](011_the-scale-transform.md)):

- Downsampling (pooling) = moving to coarser scale (larger $a$ in the wavelet/scale transform)
- Upsampling (transposed convolution) = moving to finer scale
- Skip connections = preserving fine-scale information while processing at coarse scale

The scale uncertainty principle ($\sigma_{\ln t} \cdot \sigma_c \geq 1/2$) explains why these architectures work: no single scale captures all the relevant structure. Coarse scales see global patterns; fine scales see local detail. The multi-scale architecture accesses both, just as the wavelet/scale transform does.

### Attention = Adaptive Kernel Transform

The attention mechanism in transformers computes:

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^T}{\sqrt{d_k}}\right)\mathbf{V}$$

This is an adaptive integral transform. The queries $\mathbf{Q}$ and keys $\mathbf{K}$ define a **data-dependent kernel** $K(i, j) = \text{softmax}(\mathbf{q}_i^T\mathbf{k}_j / \sqrt{d_k})$. The output is the input values $\mathbf{V}$ integrated against this kernel:

$$\text{output}_i = \sum_j K(i, j)\,\mathbf{v}_j$$

Compare to the characteristic function:

$$\varphi(t) = \int e^{itx}\,f(x)\,dx = \sum_x \text{kernel}(t, x)\,\text{signal}(x)$$

Both are weighted sums (integrals) of input values with a kernel. The CF uses a fixed kernel ($e^{itx}$). Attention uses a learned, input-dependent kernel ($\text{softmax}(\mathbf{q}^T\mathbf{k}/\sqrt{d})$). The softmax normalizes the kernel to sum to 1 -- making it a probability distribution over positions, just as the exponential kernel $e^{itx}$ has unit modulus.

The softmax contains an exponential -- $\text{softmax}(z_j) = e^{z_j}/\sum e^{z_k}$ -- which is the Laplace kernel $e^{\sigma x}$ normalized to integrate to 1. Attention is, in a precise sense, a **normalized, adaptive, data-dependent Laplace transform** -- it exponentially upweights relevant positions and downweights irrelevant ones, with the normalization serving as the compensation factor from [011](011_the-scale-transform.md).

## Positional Encoding: Fourier Basis in Transformers

The original transformer architecture encodes position using sinusoidal functions:

$$\text{PE}(pos, 2i) = \sin(pos / 10000^{2i/d})$$
$$\text{PE}(pos, 2i+1) = \cos(pos / 10000^{2i/d})$$

These are exactly the Fourier basis functions $\cos(\omega_i \cdot pos)$ and $\sin(\omega_i \cdot pos)$ at geometrically spaced frequencies $\omega_i = 1/10000^{2i/d}$. The frequencies span multiple scales, from high frequency (fine position resolution, large $i$) to low frequency (coarse position, small $i$).

This is a multi-scale Fourier representation of position -- the network encodes "where" using the same oscillatory basis functions that the characteristic function uses to encode distributional structure. The geometric spacing of frequencies mirrors the logarithmic scale structure of the Mellin transform ([011](011_the-scale-transform.md)).

Recent work on **Fourier features** (Tancik et al., 2020) showed that mapping inputs through random Fourier features $\gamma(\mathbf{x}) = [\cos(\mathbf{B}\mathbf{x}), \sin(\mathbf{B}\mathbf{x})]$ before feeding them to a network dramatically improves the network's ability to learn high-frequency functions. The explanation is the spectral bias of neural networks: without Fourier features, networks learn low-frequency functions first (they are biased toward smoothness). The Fourier mapping explicitly provides the high-frequency basis functions that the network would otherwise struggle to discover.

This is the uncertainty principle ([006](006_interlude-reality-symmetry-uncertainty.md)) manifested in learning: a smooth network (narrow in frequency) needs many samples to resolve fine spatial detail (broad in space). Fourier features bypass this by injecting high-frequency basis functions directly.

## Distribution Matching: CFs in Generative Models

The characteristic function appears directly in modern machine learning through **distribution matching**. Many generative models (GANs, VAEs, diffusion models) need to measure the distance between a learned distribution $Q$ and a target distribution $P$.

The **Maximum Mean Discrepancy** (MMD) uses kernel embeddings:

$$\text{MMD}^2(P, Q) = E_{P,P}[k(x, x')] - 2E_{P,Q}[k(x, y)] + E_{Q,Q}[k(y, y')]$$

When the kernel $k$ is the **characteristic kernel** $k(x, y) = E_t[e^{it(x-y)}]$ (averaged over a distribution of frequencies), the MMD reduces to:

$$\text{MMD}^2(P, Q) = \int |\varphi_P(t) - \varphi_Q(t)|^2\,\mu(dt)$$

This is the $L^2$ distance between the characteristic functions, weighted by the frequency measure $\mu$. The uniqueness theorem ([010](010_the-cf-as-complete-invariant.md)) guarantees that $\text{MMD} = 0$ if and only if $P = Q$: the CF distance is a proper metric on distributions.

Training a generative model to minimize MMD is literally training it to match characteristic functions. The generator learns to produce samples whose CF matches the target's CF at every distributional frequency.

## The Spectral Theory of Generalization

Why do neural networks generalize -- why do they perform well on unseen data after training on finite samples? The transform theory offers a perspective.

A network trained on $n$ samples has effectively measured the target function's "CF" at $n$ distributional frequencies. The question is: does this determine the function? From [010](010_the-cf-as-complete-invariant.md), the CF at **all** frequencies determines the distribution uniquely. But $n$ samples give you $n$ frequencies.

The **spectral bias** of neural networks -- their tendency to learn low-frequency components first -- is a form of implicit regularization that mirrors the resolution ladder from [004](004_the-dual-variable-what-t-means.md):

$$t \approx 0: \text{coarse structure (mean, variance) -- learned first}$$
$$t \sim 1/\sigma: \text{core shape -- learned next}$$
$$t \gg 1/\sigma: \text{fine detail -- learned last, if at all}$$

The network builds its representation from low distributional frequency to high, just as the CF encodes information from coarse to fine. With limited training data, the high-frequency components (fine details) are under-determined -- the network smooths them out, which is generalization. With too much training, it starts fitting the high-frequency noise -- which is overfitting.

The uncertainty principle constrains this: resolving finer detail (higher $t$) requires more data points (broader sampling in $x$). A network with $n$ training points can reliably resolve frequencies up to $t \sim n/\sigma_x$ -- beyond that, it must regularize (smooth out) or overfit (hallucinate detail).

## What Neural Networks Cannot Do (That Transforms Can)

The transform framework has properties that learned representations lack:

**Algebraic closure.** The CF multiplication principle ([007](007_convolution-independence-and-multiplication.md)) says $\varphi_{X+Y} = \varphi_X \cdot \varphi_Y$. There is no corresponding rule for neural network representations: if network $A$ encodes distribution $P$ and network $B$ encodes distribution $Q$, there is no simple operation on the networks that encodes $P * Q$. The compositional algebra of transforms doesn't transfer to learned representations.

**Guaranteed completeness.** The CF is a complete invariant ([010](010_the-cf-as-complete-invariant.md)) -- it captures everything. A neural network's representation is a lossy compression: it captures what's relevant for the training objective, but deliberately discards the rest. This is a feature (generalization requires discarding noise), but it means the representation is not invertible in general.

**Exact invertibility.** The Fourier inversion theorem ([010](010_the-cf-as-complete-invariant.md)) recovers $f$ from $\varphi$ exactly. Neural network decoders approximate the inverse but are never exact. The variable scale transform's compensation ([012](012_the-variable-scale-transform.md)) guarantees perfect reconstruction; neural autoencoders don't.

These are not weaknesses of neural networks -- they reflect a different design goal. Transforms aim for **complete, lossless, invertible** representations. Neural networks aim for **task-relevant, compressed, discriminative** representations. The transform framework tells you what's possible in principle; the neural network discovers what's useful in practice.

## What Transforms Cannot Do (That Neural Networks Can)

Conversely, neural networks have capabilities that fixed transforms lack:

**Nonlinear features.** The CF is a linear functional of the density: $\varphi(t) = \int e^{itx} f(x)\,dx$. It cannot represent nonlinear features like "is the distribution bimodal?" or "does the density have a shoulder?" directly in a single coefficient. A neural network can learn arbitrary nonlinear features of the input.

**Task-adapted basis.** The Fourier basis is the same regardless of the task. A neural network learns a different representation for classification vs. regression vs. generation. The basis adapts to the question, not just the signal.

**Compositionality.** Deep networks compose simple features into complex ones hierarchically -- edges into textures into objects. Fixed transforms decompose into a flat set of basis functions with no hierarchy. The depth of a network is a form of multi-scale composition that the wavelet transform approximates but doesn't match.

## The Synthesis: Synthetic Intelligence as Learned Transforms

The term "synthetic intelligence" captures something that "artificial intelligence" obscures: these systems **synthesize** representations from data, building internal transforms that map raw input into structured, useful, task-relevant form.

The entire theory of this series -- from the PDF as raw data ([001](001_probability-density-functions.md)) through the CF as a complete representation ([010](010_the-cf-as-complete-invariant.md)) to the variable scale transform as adaptive analysis ([012](012_the-variable-scale-transform.md)) -- is the mathematical foundation for understanding what these learned transforms do:

1. **The input layer** receives the raw signal -- the "PDF" of the data, unanalyzed.

2. **Early layers** extract low-frequency, coarse features -- the equivalent of the CF at small $t$ (mean, variance, global shape).

3. **Middle layers** extract progressively finer features -- higher distributional frequencies, scale-adapted structure, local patterns.

4. **Normalization layers** compensate for exponential growth/decay in activations -- the same compensation principle that makes the variable scale transform energy-balanced.

5. **Attention layers** compute adaptive kernel transforms -- data-dependent weightings that generalize the fixed kernels of Fourier and Laplace.

6. **The output layer** produces the task-relevant summary -- a lossy, compressed, discriminative representation, as opposed to the complete invariant of the CF.

The mathematical framework of this series doesn't describe neural networks directly. But it describes the **space of possible transforms** within which neural networks search. The Fourier, Laplace, and scale transforms are landmarks in this space -- optimally designed for specific signal structures (oscillation, decay, scale). Neural networks navigate the same space, but they find transforms adapted to the specific data and task at hand, including nonlinear regions of the space that no classical transform reaches.

Understanding the landmarks helps you understand the navigation. A network that learns Gabor filters has rediscovered the Fourier uncertainty bound. A network that benefits from normalization is compensating for Laplace-like exponential drift. A network with multi-scale architecture is performing wavelet-like scale analysis. The theory doesn't replace the learning, but it explains why certain architectures work: they provide the network with structural priors that align with the mathematical properties of the transform space.

---

*The thirteen articles above form the theoretical core. The remaining articles extend
the framework into the physics of computation — what transforms cost, what they discard,
and what happens when computation becomes continuous and physical.*

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
| 014 | [Entropy, Information, and the Cost of Transformation](014_entropy-information-and-the-cost-of-transformation.md) | Data processing inequality; information flows downhill |
| 015 | [Reversibility, Garbage Signals, and Landauer's Principle](015_reversibility-garbage-signals-and-landauers-principle.md) | Information destruction costs energy |
| 016 | [Analog Computation and the Continuum Limit](016_analog-computation-and-the-continuum-limit.md) | Continuous transforms; physics computes the CF |

*Next: [014: Entropy, Information, and the Cost of Transformation](014_entropy-information-and-the-cost-of-transformation.md)*
