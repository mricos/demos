# Analog Computation and the Continuum Limit

*Continues from [015: Reversibility, Garbage Signals, and Landauer's Principle](015_reversibility-garbage-signals-and-landauers-principle.md)*

Digital neural networks discretize everything -- continuous functions become floating-point arrays, continuous derivatives become finite differences, continuous time becomes discrete layers -- and they pay Landauer's tax at every step: each irreversible bit operation dissipates at least $kT\ln 2$ joules. But the integral transforms that run through this series are continuous operations. The characteristic function $\varphi(t) = \int e^{itx} f(x)\,dx$ is defined on a continuum, evaluated over a continuum, and returns a continuum. What happens when computation itself is analog -- when the physics does the integral directly?

$$\frac{d\mathbf{h}}{dt} = f(\mathbf{h}, t, \theta)$$

## The Integral Transform as Analog Computer

The characteristic function is a continuous inner product:

$$\varphi(t) = \int_{-\infty}^{\infty} e^{itx}\,f(x)\,dx = \langle e^{it\,\cdot}, f \rangle$$

It projects the density $f$ onto the oscillatory basis function $e^{itx}$ and integrates. In a digital computer, this integral becomes a sum over $N$ samples, requiring $O(N)$ multiply-accumulate operations per frequency, or $O(N\log N)$ for all frequencies via the FFT. Each operation discretizes, rounds, and erases intermediate results.

But a **lens** computes an optical Fourier transform in constant time with zero discretization error.

When a coherent light wave with amplitude profile $f(x)$ passes through a thin lens of focal length $F$, the field at the focal plane is:

$$U(u) = \frac{1}{i\lambda F}\int_{-\infty}^{\infty} f(x)\,\exp\!\left(-i\frac{2\pi}{\lambda F}ux\right)dx$$

This is exactly the Fourier transform of $f$, evaluated at spatial frequency $t = 2\pi u/(\lambda F)$. The computation is performed by the physics of wave propagation -- Huygens' principle, superposition, and interference. There is no clock, no gate, no bit erased. The transform completes in the time it takes light to cross the focal length: nanoseconds for a centimeter-scale lens.

The key properties of this analog computation:

- **Parallelism**: every spatial frequency is computed simultaneously, not sequentially.
- **No discretization**: the field is continuous; there are no pixels until you choose to detect.
- **No erasure**: wave propagation is governed by a unitary operator (the wave equation is time-reversible), so no information is destroyed and no Landauer cost is incurred.
- **Constant time**: the computation time is $F/c$, independent of the "resolution" $N$.

This is the unitarity of the Fourier transform from [006](006_interlude-reality-symmetry-uncertainty.md), physically instantiated. The lens does not approximate the FT -- it **is** the FT, computed by the same mathematics that defines it.

## Neural ODEs: Discrete Layers Become Continuous Depth

A feedforward neural network with $L$ layers computes a discrete sequence of transformations:

$$\mathbf{h}_{k+1} = \mathbf{h}_k + f(\mathbf{h}_k, \theta_k), \quad k = 0, 1, \ldots, L-1$$

where each layer applies a residual update $f(\mathbf{h}_k, \theta_k)$. As the number of layers grows and the step size shrinks, the layer index $k$ becomes a continuous depth parameter $t$, and the difference equation becomes an ordinary differential equation:

$$\frac{d\mathbf{h}}{dt} = f(\mathbf{h}, t, \theta)$$

This is the **Neural ODE** formulation (Chen et al., 2018). The hidden state $\mathbf{h}(t)$ flows continuously through a learned vector field $f$, from input $\mathbf{h}(0) = \mathbf{x}$ to output $\mathbf{h}(T)$.

The connection to the variable scale transform of [012](012_the-variable-scale-transform.md) is direct. The variable scale transform defines a signal's evolution through:

$$\sigma(t) = \frac{d}{dt}\ln|f(t)| = \frac{f'(t)}{f(t)}$$

with the accumulated envelope $\exp(\int_{t_0}^{\tau}\sigma(u)\,du)$. The Neural ODE has the same structure: $\mathbf{h}(t)$ evolves under a vector field that is the continuous analog of the variable scale trajectory $\sigma(t)$. The depth parameter $t$ plays the role of the analysis position, and the learned vector field $f(\mathbf{h}, t, \theta)$ plays the role of the instantaneous scale rate -- it determines how the representation changes at each point in the continuous depth.

The advantage for reversibility is profound. **Backpropagation through a Neural ODE uses the adjoint method**: to compute gradients, you solve the ODE **backwards in time**:

$$\frac{d\mathbf{a}}{dt} = -\mathbf{a}^T\frac{\partial f}{\partial \mathbf{h}}, \quad \mathbf{a}(T) = \frac{\partial L}{\partial \mathbf{h}(T)}$$

where $\mathbf{a}(t) = \partial L / \partial \mathbf{h}(t)$ is the adjoint state. This is a reverse-time ODE -- the same dynamics run backward. The forward computation and the backward gradient computation are **time-reverses of each other**.

This is reversibility for free, connecting directly to [015](015_reversibility-garbage-signals-and-landauers-principle.md). A discrete network with $L$ layers must store $L$ intermediate activations for backpropagation -- each one a "garbage signal" that costs memory and, at the physical level, Landauer's tax when erased. The Neural ODE stores only the initial and final states; everything in between is reconstructed by solving the reverse ODE. No intermediate states are cached, so no garbage signals accumulate.

The continuum limit eliminates the garbage because the dynamics are continuous and invertible. A discrete layer applies an arbitrary function that may be non-invertible (ReLU sets negative values to zero -- information is lost). A continuous ODE flow is always invertible: the existence and uniqueness theorem for ODEs guarantees that trajectories never cross, so every final state maps to exactly one initial state. The flow is a diffeomorphism -- a smooth, invertible map with smooth inverse.

| Property | Discrete Network | Neural ODE |
|---|---|---|
| Depth parameter | integer $k = 0, \ldots, L$ | continuous $t \in [0, T]$ |
| Update rule | $\mathbf{h}_{k+1} = \mathbf{h}_k + f_k(\mathbf{h}_k)$ | $d\mathbf{h}/dt = f(\mathbf{h}, t, \theta)$ |
| Invertibility | not guaranteed (ReLU, pooling) | guaranteed (ODE flow is diffeomorphism) |
| Backpropagation | store $L$ activations | adjoint method, $O(1)$ memory |
| Garbage signals | $L$ intermediate states | none |
| Landauer cost | $\geq L \cdot n \cdot kT\ln 2$ | zero (in principle) |

## Analog Substrates

Three physical systems compute transforms directly, each exploiting a different physical principle:

### Optical Correlators: Fourier at the Speed of Light

An optical correlator uses two lenses in a 4f configuration. The input image $f(x, y)$ is placed at the front focal plane of the first lens. The Fourier transform $\hat{f}(u, v)$ appears at the shared focal plane (the "Fourier plane"), where a filter mask $H(u, v)$ can be applied. The second lens computes the inverse FT, producing the filtered output $f * h$ at its rear focal plane.

The entire convolution -- forward FT, multiplication by transfer function, inverse FT -- happens at the speed of light. For the four canonical distributions:

| Distribution | Spatial profile $f(x)$ | Fourier plane $\hat{f}(u)$ |
|---|---|---|
| Gaussian | $e^{-x^2/2\sigma^2}$ | Gaussian: $e^{-\sigma^2 u^2/2}$ |
| Laplace | $e^{-|x|/b}$ | Lorentzian: $1/(1 + b^2u^2)$ |
| Uniform | $\text{rect}(x/a)$ | Sinc: $\sin(au)/(au)$ |
| Cauchy | $1/(\pi(1+x^2))$ | Exponential: $e^{-|u|}$ |

A lens transforms each spatial profile into its frequency-domain counterpart simultaneously and continuously. The Cauchy-to-exponential transform is especially notable: the heaviest-tailed spatial distribution produces the fastest-decaying frequency profile, a physical manifestation of the distributional decay rate from [005](005_distributional-decay-rate.md).

### Memristive Crossbar Arrays: Ohm's Law as Matrix Multiplication

A memristive crossbar array is a grid of resistive elements at each crossing of row and column wires. Each memristor's conductance $G_{ij}$ is programmable and persistent -- it remembers its state without power. When a vector of voltages $\mathbf{V} = (V_1, \ldots, V_n)$ is applied to the rows, Ohm's law and Kirchhoff's current law produce column currents:

$$I_j = \sum_i G_{ij} V_i$$

or in matrix form: $\mathbf{I} = \mathbf{G}^T \mathbf{V}$. This is a matrix-vector multiplication computed in a single step by the physics of electrical conduction. The conductance matrix $\mathbf{G}$ encodes the weight matrix of a neural network layer, and the analog computation completes in the RC time constant of the circuit -- nanoseconds, independent of matrix dimension.

The energy cost is $P = \sum_{ij} G_{ij} V_i^2$ -- Joule heating from current flow. This is dissipative (non-unitary), which is correct: a general matrix multiplication is not unitary, and the physical substrate faithfully reflects this. The Laplace transform's non-unitarity from [006](006_interlude-reality-symmetry-uncertainty.md) has a physical incarnation: resistive computation dissipates energy because non-unitary transforms are thermodynamically irreversible.

### Photonic Meshes: Unitary Transforms in Light

A photonic mesh is a network of Mach-Zehnder interferometers (MZIs) connected in a triangular or rectangular topology. Each MZI splits a beam, applies a programmable phase shift $\theta$, and recombines. A mesh of $n(n-1)/2$ MZIs can implement any $n \times n$ unitary matrix -- this is the Reck decomposition.

The physical transformation is:

$$\mathbf{U} = \prod_{j} \text{MZI}(\theta_j, \phi_j)$$

where each MZI contributes a $2 \times 2$ rotation. The product of all rotations is an arbitrary element of $U(n)$ -- the unitary group.

This physically implements the unitarity from [006](006_interlude-reality-symmetry-uncertainty.md). The Fourier transform is a specific unitary matrix (the DFT matrix $F_{jk} = e^{2\pi ijk/n}/\sqrt{n}$), and a photonic mesh can be programmed to compute it. But it can also compute any other unitary transform -- including learned unitary layers for neural networks. The photons carry information without Ohmic loss; the only energy cost is the phase shifters (thermo-optic or electro-optic), which dissipate far less than transistor-based computation.

The three substrates span the unitarity spectrum:

| Substrate | Operation | Unitary? | Energy scaling |
|---|---|---|---|
| Optical (lens) | Fourier transform | yes | $\sim 0$ (passive) |
| Memristive crossbar | arbitrary matrix-vector | no | $\propto \|\mathbf{G}\| \cdot \|\mathbf{V}\|^2$ |
| Photonic mesh | arbitrary unitary | yes | $\propto$ phase shifter power |

## The Noise-Precision Tradeoff

Analog computation has a fundamental limit that digital computation does not: **thermal noise**. Every analog signal rides on a floor of thermal fluctuations with power spectral density proportional to $kT$. The signal-to-noise ratio is:

$$\text{SNR} = \frac{E_{\text{signal}}}{kT} \propto \frac{P \cdot \Delta t}{kT}$$

where $P$ is signal power and $\Delta t$ is integration time. The number of distinguishable levels (effective bits of precision) is:

$$b_{\text{eff}} = \frac{1}{2}\log_2(1 + \text{SNR}) \approx \frac{1}{2}\log_2\!\left(\frac{E}{kT}\right)$$

This is a **physical uncertainty principle** -- dual to the Fourier uncertainty from [004](004_the-dual-variable-what-t-means.md) and [006](006_interlude-reality-symmetry-uncertainty.md), but arising from thermodynamics rather than wave mechanics. In the Fourier case, $\sigma_x \cdot \sigma_\omega \geq 1/2$ says you cannot simultaneously localize in position and frequency. Here, the constraint is between **precision** and **energy**: more precise analog values require more energy to distinguish from noise.

The parallel is structural:

| Uncertainty principle | Conjugate pair | Bound | Origin |
|---|---|---|---|
| Fourier | position $x$ / frequency $\omega$ | $\sigma_x \cdot \sigma_\omega \geq 1/2$ | wave mechanics |
| Thermodynamic | precision $b$ / energy $E$ | $b \leq \frac{1}{2}\log_2(E/kT)$ | statistical mechanics |
| Quantum | position $\hat{x}$ / momentum $\hat{p}$ | $\Delta x \cdot \Delta p \geq \hbar/2$ | quantum mechanics |

All three share the same mathematical structure: a pair of conjugate quantities whose product (or logarithmic ratio) is bounded below. The Fourier uncertainty is a theorem about integral transforms. The thermodynamic uncertainty is a theorem about distinguishable states. The quantum uncertainty inherits both -- it is a Fourier uncertainty bound on physical observables embedded in a thermal environment.

The practical consequence is a stark tradeoff between digital and analog computation:

| | Digital | Analog |
|---|---|---|
| Precision | arbitrary (add more bits) | limited by $E/kT$ |
| Energy per operation | $\geq kT\ln 2$ per bit erased (Landauer) | $\sim kT$ per distinguishable level |
| Precision scaling | linear: $2\times$ bits = $2\times$ energy | logarithmic: $2\times$ precision = $4\times$ energy |
| Error accumulation | none (exact logic) | accumulates per stage |
| Advantage | deep pipelines, exact arithmetic | massive parallelism, low-precision operations |

The logarithmic scaling is the critical insight. Digital precision grows linearly with energy expenditure: 32-bit arithmetic costs $32\times$ the energy of 1-bit arithmetic (roughly). Analog precision grows logarithmically: going from 4-bit to 8-bit equivalent precision requires squaring the energy. For low-precision tasks (the 4-8 bit range that suffices for neural network inference), analog wins decisively. For high-precision tasks (64-bit scientific computing), digital is unbeatable.

Neural network inference lives squarely in the low-precision regime. Quantized networks routinely achieve full accuracy at 8-bit or even 4-bit precision. This is why analog accelerators -- memristive crossbars, photonic meshes -- are compelling for AI: they compute at the precision that neural networks actually need, with energy efficiency that digital hardware cannot match.

## Stochastic Resonance

The noise that limits analog precision can also **help** analog computation. This counterintuitive phenomenon is called **stochastic resonance**.

Consider a signal $s(t)$ that is too weak to cross a detection threshold $\theta$: $|s(t)| < \theta$ for all $t$. In a noiseless system, this signal is invisible. But add noise $\eta(t)$ with sufficient amplitude, and the combined signal $s(t) + \eta(t)$ occasionally crosses $\theta$. The crossings are not random -- they are more likely when $s(t)$ is near its peaks, because less noise is needed to push the total past the threshold. The noise acts as a **dithering mechanism**, converting a sub-threshold analog signal into a stream of suprathreshold events whose statistics encode the original signal.

The optimal noise level is neither zero (signal invisible) nor infinite (signal swamped). There is a resonance -- a noise amplitude that maximizes the mutual information between input $s(t)$ and detected output.

The connection to heavy-tailed distributions from [008](008_stable-distributions-and-generalized-clt.md) is direct. Consider two noise distributions with the same scale parameter:

- **Gaussian noise** ($\alpha = 2$): $f(\eta) \propto e^{-\eta^2/2\sigma^2}$. Tails decay rapidly. Large excursions are exponentially rare.
- **Cauchy noise** ($\alpha = 1$): $f(\eta) = \frac{1}{\pi}\frac{\gamma}{\gamma^2 + \eta^2}$. Tails decay as $1/\eta^2$. Large excursions are algebraically common.

For a weak signal far below threshold, Gaussian noise rarely produces crossings -- the probability $P(|\eta| > \theta - s) \sim e^{-(\theta-s)^2/2\sigma^2}$ is exponentially small. Cauchy noise produces crossings far more often: $P(|\eta| > \theta - s) \sim \gamma/(\pi(\theta - s))$, decaying only algebraically.

The Cauchy distribution's undefined mean, which from the perspective of the classical CLT is a pathology, is here a **feature**. The undefined mean reflects the fact that the distribution's probability mass is not concentrated near any central value -- it is spread broadly enough that large excursions are routine. This is exactly what stochastic resonance requires: frequent large excursions that carry a sub-threshold signal past the detector.

The characteristic functions make this precise. The Cauchy CF is $\varphi(t) = e^{-\gamma|t|}$, which decays linearly in $|t|$ -- it retains significant amplitude at high distributional frequencies, meaning it preserves fine-scale structure. The Gaussian CF $\varphi(t) = e^{-\sigma^2 t^2/2}$ decays quadratically -- it is a low-pass filter that smooths away fine detail. For stochastic resonance, you want a noise distribution that has power at high frequencies (large $|t|$), because the threshold-crossing events are sharp, high-frequency features. Heavy-tailed noise provides this; light-tailed noise does not.

The $\alpha$-stable family from [008](008_stable-distributions-and-generalized-clt.md) thus parameterizes a continuum of stochastic resonance behaviors:

$$\varphi_\alpha(t) = e^{-c|t|^\alpha}, \quad \alpha \in (0, 2]$$

Small $\alpha$ (heavy tails, more frequent large excursions) favors detection of very weak signals at the cost of more false positives. Large $\alpha$ (light tails, rare large excursions) favors precise detection of moderate signals. The stability exponent $\alpha$ is a tuning knob for the tradeoff between **sensitivity** (ability to detect weak signals) and **specificity** (ability to reject noise-only events).

## The Boltzmann Machine

The deepest connection between this series and physical computation appears in the **Boltzmann machine**, where the mathematics of probability transforms becomes literal physics.

A Boltzmann machine defines a probability distribution over states $\mathbf{x}$ via the Boltzmann-Gibbs distribution:

$$P(\mathbf{x}) = \frac{1}{Z}\,e^{-E(\mathbf{x})/kT}$$

where $E(\mathbf{x})$ is the energy function, $T$ is temperature, $k$ is Boltzmann's constant, and $Z$ is the **partition function**:

$$Z = \int e^{-E(\mathbf{x})/kT}\,d\mathbf{x}$$

Now compare this to the moment-generating function from [002](002_moments-and-the-mgf.md):

$$M_X(t) = E[e^{tX}] = \int e^{tx}\,f(x)\,dx$$

Set $t = -1/kT$ and identify the random variable $X$ with the energy $E(\mathbf{x})$. Then:

$$Z = \int e^{-E/kT}\,d\mathbf{x} = M_E(-1/kT) \cdot (\text{normalization})$$

The partition function **is** the MGF of the energy distribution, evaluated at $t = -1/kT$. This is not an analogy. It is an identity. The same mathematical object -- the exponential average of a random variable -- appears as the MGF in probability theory and as the partition function in statistical physics. The series began in [002](002_moments-and-the-mgf.md) with $E[e^{tX}]$; here, $t = -1/kT$, and the exponential average becomes a thermal average.

Temperature is the physical instantiation of the distributional decay rate from [005](005_distributional-decay-rate.md). In that article, the Laplace dual variable $\sigma$ controlled the exponential tilt $e^{\sigma x}$ applied to the density. High $\sigma$ amplified the tails; low $\sigma$ concentrated near the origin. The inverse temperature $\beta = 1/kT$ plays exactly the same role:

| Concept | Transform theory | Statistical physics |
|---|---|---|
| Random variable | $X$ | energy $E(\mathbf{x})$ |
| Exponential tilt | $e^{\sigma x}$ | $e^{-\beta E}$ |
| Tilt parameter | $\sigma$ (decay rate) | $-\beta = -1/kT$ (inverse temperature) |
| Normalization | $M_X(\sigma) = \int e^{\sigma x} f(x)\,dx$ | $Z = \int e^{-\beta E}\,d\mathbf{x}$ |
| Moments | $M_X'(\sigma)/M_X(\sigma) = E_\sigma[X]$ | $-\partial \ln Z/\partial \beta = \langle E \rangle$ |
| Cumulants | $\kappa_n = \partial^n \ln M / \partial \sigma^n$ | $\langle E^n \rangle_c = (-1)^n \partial^n \ln Z / \partial \beta^n$ |

The correspondence extends to every level. The cumulant-generating function $\ln M_X(t)$ from [002](002_moments-and-the-mgf.md) is the **Helmholtz free energy** $F = -kT\ln Z$. The first cumulant (mean) is the average energy. The second cumulant (variance) is the heat capacity $C = \partial\langle E\rangle/\partial T$. The entire machinery of moments, cumulants, and generating functions -- developed purely as probability theory in articles [001](001_probability-density-functions.md)--[005](005_distributional-decay-rate.md) -- is simultaneously the machinery of thermodynamics.

High temperature ($kT \gg \Delta E$, small $\beta$) makes $e^{-\beta E}$ nearly flat -- all states are equally likely, and the system explores freely. This is the small-$|\sigma|$ regime of the MGF: weak tilt, minimal distortion of the original density. Low temperature ($kT \ll \Delta E$, large $\beta$) makes $e^{-\beta E}$ sharply peaked at the energy minimum -- the system freezes into its ground state. This is the large-$|\sigma|$ regime: strong tilt, extreme concentration.

The Boltzmann machine learns by adjusting its energy function $E(\mathbf{x})$ so that the resulting Boltzmann distribution matches the data distribution. Training maximizes the log-likelihood, which requires computing $\partial \ln Z / \partial \theta$ -- the gradient of the partition function with respect to the model parameters. This is precisely the operation of differentiating the MGF to extract moments, applied to the energy landscape. The machine learns by adjusting its energy surface until the thermal statistics (sampled via MCMC or physical annealing) match the empirical statistics of the data.

## Closing Synthesis

The full circle is now visible.

The characteristic function $\varphi(t) = \int e^{itx} f(x)\,dx$ is not a mathematical abstraction that physicists borrow as a metaphor. It is a description of what physical systems do natively.

**A lens** computes the Fourier transform. Coherent light passing through a transparency with profile $f(x)$ produces the complex amplitude $\varphi(u) = \int e^{-i2\pi ux/\lambda F} f(x)\,dx$ at the focal plane. The CF of a spatial distribution is computed by wave propagation -- the physics of superposition and interference is the integral transform made material.

**A thermal bath** computes the Laplace transform. A system in thermal equilibrium at temperature $T$ with energy function $E(\mathbf{x})$ has partition function $Z = \int e^{-E/kT}\,d\mathbf{x}$ -- the MGF from [002](002_moments-and-the-mgf.md), evaluated at the inverse temperature. Every physical system in thermal equilibrium is continuously computing its own partition function, which is its own moment-generating function. Thermodynamic measurements (heat capacity, susceptibility, equation of state) read off the derivatives of this transform -- they extract cumulants from the generating function, exactly as in [002](002_moments-and-the-mgf.md).

**Quantum interference** computes complex exponentials. The propagator $\langle x_f | e^{-iHt/\hbar} | x_i \rangle$ is a sum over paths, each weighted by $e^{iS/\hbar}$ where $S$ is the action. This is a characteristic function -- an integral of $e^{i(\text{phase})}$ over a space of configurations. Every quantum measurement is an evaluation of a characteristic function of the action. The unitarity requirement from [006](006_interlude-reality-symmetry-uncertainty.md) is not imposed by convention; it is the physical law that probabilities are conserved.

The characteristic function is not a metaphor for computation. Computation -- digital, analog, optical, thermal, quantum -- is a physical instantiation of the characteristic function. The integral $\int e^{itx} f(x)\,dx$ is what the universe does when waves superpose, when thermal systems equilibrate, when quantum amplitudes interfere. The sixteen articles of this series have traced the mathematics of this integral from the axiom $\int f(x)\,dx = 1$ through its algebraic properties, its domains of convergence, its uncertainty principles, its compositional structure, its adaptive generalizations, its discrete approximations, and its thermodynamic costs. The endpoint is a recognition: the mathematics was never abstract. It was always a description of what physical substrates compute, at the speed of light, at thermal equilibrium, at the quantum level, for free.

## fftnn Exercise

The fftnn project at [../../fftnn/index.html](../../fftnn/index.html) provides a concrete comparison of computational costs.

**FFT cost.** The radix-2 FFT computes an $N$-point DFT in $\frac{5}{2}N\log_2 N$ real floating-point operations (each complex multiply costs 4 real multiplies and 2 real adds, amortized across the butterfly structure). For $N = 64$:

$$\text{FFT ops} = \frac{5}{2}\cdot 64 \cdot \log_2 64 = \frac{5}{2}\cdot 64 \cdot 6 = 960$$

Accounting for the full complex butterfly (which requires both multiply and add), the standard estimate is $5N\log_2 N$:

$$\text{FFT ops} = 5 \cdot 64 \cdot 6 = 1920$$

**NN cost.** A feedforward network performing equivalent spectral analysis with architecture 64 $\to$ 32 $\to$ 17 (real + imaginary outputs for 17 frequency bins, discarding redundant conjugate half) costs $2 \cdot \text{fan\_in} \cdot \text{fan\_out}$ operations per layer (one multiply and one add per weight):

$$\text{NN ops} = 2(64 \times 32) + 2(32 \times 17) = 4096 + 1088 = 5184$$

With bias additions and activation function evaluations, the total reaches approximately 8320 operations.

**The ratio:**

$$\frac{\text{NN ops}}{\text{FFT ops}} = \frac{8320}{1920} \approx 4.3\times$$

The network pays roughly $4\times$ the computational cost to **learn** what the FFT **knows by construction**. The FFT exploits the algebraic structure of the DFT -- the factorization of the Fourier matrix into sparse butterfly matrices -- which the network must discover from data. The network's advantage is flexibility: it can learn non-Fourier transforms adapted to specific data. Its disadvantage is cost: it uses brute-force matrix multiplication where the FFT uses structured factorization.

An analog optical system pays **neither** cost. The lens computes the Fourier transform in the propagation time $F/c$ -- roughly 0.03 nanoseconds for a 1 cm focal length -- using zero multiply-accumulate operations. The computation is performed by the constructive and destructive interference of wavefronts. The physics knows the butterfly factorization because the butterfly factorization is a description of how waves propagate.

| Method | Operations ($N = 64$) | Exploits structure? | Learns? |
|---|---|---|---|
| FFT | 1,920 | yes (butterfly factorization) | no |
| NN (64-32-17) | ~8,320 | no (dense matrices) | yes |
| Analog optics | 0 (physics computes) | yes (wave propagation) | no |

---

*This concludes the series. The sixteen articles form a path from the axioms of probability density through the mathematics of integral transforms, the information theory of representations, the thermodynamics of computation, and the physics of analog substrates:*

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
| 013 | [From Transforms to Learned Representations](013_from-transforms-to-learned-representations.md) | Neural networks as learned transforms |
| 014 | [Entropy, Information, and the Cost of Transformation](014_entropy-information-and-the-cost-of-transformation.md) | Data processing inequality; information only flows downhill |
| 015 | [Reversibility, Garbage Signals, and Landauer's Principle](015_reversibility-garbage-signals-and-landauers-principle.md) | Thermodynamic cost of irreversible computation |
| 016 | [Analog Computation and the Continuum Limit](016_analog-computation-and-the-continuum-limit.md) | Physics computes the transform; the continuum costs nothing |

The series traveled from $\int f(x)\,dx = 1$ to $d\mathbf{h}/dt = f(\mathbf{h}, t, \theta)$ -- from the axiom that probabilities sum to one, to the physical substrate that computes them.
