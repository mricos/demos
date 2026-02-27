# The Variable Scale Transform

*Continues from [011: The Scale Transform -- Bridging Fourier and Laplace](011_the-scale-transform.md)*

## The Limitation of Fixed Scale

In [011](011_the-scale-transform.md) we introduced the windowed scale analysis: window the signal, apply a fixed exponential tilt $e^{\sigma t}$, take the FT, and compensate. This works beautifully when the decay rate is constant -- a uniformly damped oscillation, an exponentially decaying distribution tail.

But real signals don't have constant decay rates. A violin note swells and fades. A financial return has volatility that clusters and disperses. A chemical reaction accelerates, plateaus, and exhausts. The decay rate $\sigma$ is itself a function of position: $\sigma(t)$.

A fixed tilt $e^{\sigma t}$ applied to a signal with variable decay produces a residual that is **not** stationary -- the mismatch between the probe's rate and the signal's local rate leaks through as a slowly varying amplitude modulation. The FT of this non-stationary residual smears across frequencies, losing the clean separation we sought.

The **variable scale transform** resolves this by letting the tilt rate track the signal's local exponential structure. Instead of a fixed exponential envelope, we use an envelope that adapts -- one whose instantaneous rate matches the signal's instantaneous decay at each point.

## Instantaneous Scale Rate

By analogy with the concept of **instantaneous frequency** in signal processing, define the **instantaneous scale rate**:

$$\sigma(t) = \frac{d}{dt}\ln|f(t)| = \frac{f'(t)}{f(t)}$$

This is the logarithmic derivative of the signal's envelope. For a pure exponential $f(t) = Ae^{-\alpha t}$, we get $\sigma(t) = -\alpha$ -- constant, as expected. For a Gaussian envelope $f(t) = Ae^{-t^2/2\tau^2}$, we get $\sigma(t) = -t/\tau^2$ -- a linearly varying rate. For a signal with complex, non-stationary decay, $\sigma(t)$ traces the evolving exponential character.

The instantaneous scale rate is to the Laplace transform what instantaneous frequency is to the Fourier transform:

| Concept | Fourier domain | Scale domain |
|---|---|---|
| Fixed parameter | frequency $\omega$ | decay rate $\sigma$ |
| Local parameter | instantaneous frequency $\omega(t) = \frac{d}{dt}\arg f_a(t)$ | instantaneous scale rate $\sigma(t) = \frac{d}{dt}\ln|f(t)|$ |
| Stationary signal | constant $\omega$ | constant $\sigma$ |
| Non-stationary signal | $\omega(t)$ varies | $\sigma(t)$ varies |

The analytic signal $f_a(t) = f(t) + iH[f](t)$ (where $H$ is the Hilbert transform) separates amplitude and phase, enabling the definition of instantaneous frequency. The analogous construction for instantaneous scale rate doesn't need the Hilbert transform -- it operates directly on the signal's amplitude envelope through the log-derivative.

## The Variable Scale Transform: Definition

Given a signal $f(t)$ and a **scale trajectory** $\sigma(\cdot)$, define the **variable scale transform**:

$$V_f(\omega, t_0;\, \sigma(\cdot)) = \int_{-\infty}^{\infty} f(\tau)\,\exp\!\left(\int_{t_0}^{\tau}\sigma(u)\,du\right)\,e^{i\omega(\tau - t_0)}\,w(\tau - t_0)\,d\tau$$

where $w$ is a window function centered at $t_0$.

The key difference from [011](011_the-scale-transform.md): the exponential tilt is no longer $e^{\sigma\tau}$ with constant $\sigma$. It is $\exp(\int_{t_0}^{\tau}\sigma(u)\,du)$ -- the accumulated effect of a continuously varying rate. This is the solution to the ODE $\dot{g}/g = \sigma(t)$, which gives $g(t) = \exp(\int \sigma(u)\,du)$ -- the natural envelope for a process with time-varying exponential character.

When $\sigma(t) = \sigma_0$ (constant), the integral collapses to $\sigma_0(\tau - t_0)$ and we recover the fixed windowed scale analysis from [011](011_the-scale-transform.md).

## The Compensation Principle, Generalized

In [011](011_the-scale-transform.md), the compensation factor was $e^{-\sigma t}$ -- the inverse of the fixed tilt. For the variable case, the compensation is the inverse of the variable envelope:

$$\text{compensation: } \exp\!\left(-\int_{t_0}^{\tau}\sigma(u)\,du\right)$$

The round-trip remains exact:

$$f(\tau) \xrightarrow{\times\, e^{\int\sigma}} \text{tilted signal} \xrightarrow{\text{FT}} V_f(\omega) \xrightarrow{\text{IFT}} \text{tilted signal} \xrightarrow{\times\, e^{-\int\sigma}} f(\tau)$$

Each step is invertible. The variable tilt and its compensation are pointwise inverses. Parseval's theorem applies to the FT/IFT step in the middle. The overall system preserves energy:

$$\frac{1}{2\pi}\int|V_f(\omega, t_0;\,\sigma(\cdot))|^2\,d\omega = \int |f(\tau)|^2\,\exp\!\left(2\int_{t_0}^{\tau}\sigma(u)\,du\right)\,|w(\tau - t_0)|^2\,d\tau$$

The energy balance is exact but **weighted** by the variable envelope. The compensation factor removes this weighting in reconstruction, restoring the original energy.

## The Optimal Scale Trajectory

The fixed scale analysis in [011](011_the-scale-transform.md) required scanning across $\sigma$ values to find the one that best flattened the local decay. The variable scale transform replaces this scan with a single optimal trajectory.

**Criterion:** The optimal $\sigma^*(t)$ is the trajectory that makes the tilted signal **maximally stationary** within each window. Formally, it minimizes the time variation of the local spectral content:

$$\sigma^*(t) = \arg\min_{\sigma(\cdot)} \int\left|\frac{\partial}{\partial t_0}|V_f(\omega, t_0;\,\sigma(\cdot))|^2\right|^2 d\omega\,dt_0$$

In practice, a good approximation is the instantaneous scale rate itself:

$$\sigma^*(t) \approx \frac{d}{dt}\ln|f(t)|$$

This choice exactly cancels the signal's local exponential trend, leaving a residual that is locally flat in amplitude. The FT of this flattened residual concentrates maximally in frequency -- all the exponential information has been absorbed into the scale trajectory, and what remains is pure oscillatory content.

## Decomposition: Trend + Oscillation

The variable scale transform decomposes a signal into two cleanly separated components:

$$f(t) = \underbrace{\exp\!\left(\int^t \sigma^*(u)\,du\right)}_{\text{exponential trend } E(t)} \cdot \underbrace{f(t)\,\exp\!\left(-\int^t \sigma^*(u)\,du\right)}_{\text{oscillatory residual } r(t)}$$

The trend $E(t)$ captures all the exponential structure -- growth, decay, and their variation over time. It is the signal's "envelope" in a precise sense: the function whose logarithmic derivative equals the instantaneous scale rate.

The residual $r(t) = f(t)/E(t)$ is what remains after the exponential trend is removed. If $\sigma^*$ is chosen well, $r(t)$ is approximately stationary -- its amplitude doesn't drift, and its spectral content is stable. The FT of $r(t)$ is concentrated and clean.

This decomposition is **multiplicative**, not additive:

| Decomposition | Operation | Domain | Natural transform |
|---|---|---|---|
| $f = f_1 + f_2$ | additive | $\mathbb{R}$ | Fourier |
| $f = E \cdot r$ | multiplicative | $\mathbb{R}^+$ | Scale / Mellin |

Additive decomposition (Fourier) separates a signal into frequency components that superpose. Multiplicative decomposition (scale) separates a signal into an envelope and a carrier that modulate. The variable scale transform makes the multiplicative decomposition adaptive.

## The Log-Domain Picture

The multiplicative structure becomes additive under the logarithm:

$$\ln|f(t)| = \int^t \sigma^*(u)\,du + \ln|r(t)|$$

The first term is the **integrated scale rate** -- a smooth, slowly varying trend. The second term is the log-residual -- fluctuations around the trend.

In log-domain, the variable scale transform is simply a **detrending operation**: subtract the best-fit integrated exponential trend, then Fourier-analyze the residual. This is analogous to how the ordinary FT works best on zero-mean signals (you subtract the DC component first), but extended to exponential trends.

The connection to [011](011_the-scale-transform.md)'s Mellin transform is now transparent. The Mellin transform operates in log-domain by construction (the substitution $t = e^u$ converts scale to shift). The variable scale transform extends this to **non-uniform** log-scaling -- the logarithmic coordinate is warped by the variable rate $\sigma(t)$.

## Application to Probability: Non-Stationary Distributions

A **non-stationary process** has a distribution that evolves over time: $f(x; t)$. At each time $t$, there is a PDF, a CF, moments, etc. But these parameters drift.

Consider a process whose density at time $t$ is:

$$f(x; t) = \frac{1}{\sigma(t)\sqrt{2\pi}}\exp\!\left(-\frac{(x - \mu(t))^2}{2\sigma(t)^2}\right)$$

with time-varying mean $\mu(t)$ and variance $\sigma(t)^2$. The fixed CF at each time is:

$$\varphi(s; t) = \exp(i\mu(t)s - \sigma(t)^2 s^2/2)$$

This is a snapshot. But the evolution of $\mu(t)$ and $\sigma(t)$ is itself structured -- perhaps $\mu(t)$ has an exponential drift and $\sigma(t)$ scales with time. The variable scale transform applied to $\mu(t)$ decomposes the drift into a trend (the exponential component of the mean's evolution) and oscillatory residuals (cyclical fluctuations around the trend).

More generally, for any parameter trajectory $\theta(t)$ of a non-stationary distribution:

1. Compute the instantaneous scale rate: $\sigma_\theta(t) = \theta'(t)/\theta(t)$
2. Extract the exponential trend: $E_\theta(t) = \exp(\int \sigma_\theta(u)\,du)$
3. Form the residual: $r_\theta(t) = \theta(t)/E_\theta(t)$
4. Fourier-analyze $r_\theta(t)$ to find the oscillatory structure

This gives a decomposition of the parameter's evolution into exponential growth/decay (captured by $\sigma_\theta$) and oscillatory modulation (captured by the FT of $r_\theta$). The exponential part is what the classical CF framework from [003](003_fourier-vs-laplace-transforms-of-pdfs.md)--[010](010_the-cf-as-complete-invariant.md) cannot see.

## Connection to Lyapunov Exponents

In dynamical systems theory, the **Lyapunov exponent** is the time-averaged instantaneous scale rate of trajectory separation:

$$\lambda = \lim_{T\to\infty}\frac{1}{T}\int_0^T \sigma(t)\,dt = \lim_{T\to\infty}\frac{1}{T}\ln\frac{|\delta x(T)|}{|\delta x(0)|}$$

Positive $\lambda$: trajectories diverge exponentially (chaos). Negative $\lambda$: trajectories converge (stability). Zero $\lambda$: neutral.

The variable scale transform generalizes this by retaining the **time-resolved** scale rate $\sigma(t)$ rather than averaging it. The Lyapunov exponent is the DC component (zero-frequency term) of the scale rate's Fourier decomposition. The variable scale transform also captures the AC components -- the oscillatory fluctuations in the rate of exponential divergence.

This matters because many chaotic systems have **intermittent** behavior: periods of regular motion interrupted by bursts of chaos. The time-averaged Lyapunov exponent is positive, but the instantaneous $\sigma(t)$ oscillates between positive and negative values. The variable scale transform resolves this temporal structure.

## The Uncertainty Principle for Scale

In [006](006_interlude-reality-symmetry-uncertainty.md) we established the Fourier uncertainty principle: $\sigma_t \cdot \sigma_\omega \geq 1/2$. There is an analogous principle for scale.

The scale uncertainty principle (due to Cohen) states:

$$\sigma_{\ln t} \cdot \sigma_c \geq \frac{1}{2}$$

where $\sigma_{\ln t}$ is the spread in log-time and $\sigma_c$ is the spread in **scale frequency** (the Mellin dual variable $\omega$ in the decomposition $s = \sigma + i\omega$).

This means: a signal that is concentrated at one scale (narrow in log-time) must be spread in scale-frequency, and vice versa. A self-similar signal (like a fractal) that repeats at every scale has a concentrated scale spectrum -- it looks the same at all scales, so its scale-frequency content is a few discrete lines. A signal that exists at only one scale (a pure tone at a fixed frequency) is maximally spread in scale-frequency.

For the variable scale transform, the uncertainty principle becomes local:

$$\sigma_{\ln t}(t_0) \cdot \sigma_c(t_0) \geq \frac{1}{2}$$

at each window position $t_0$. You cannot simultaneously resolve both the scale at which something happens and the rate at which scale changes. This is the scale-domain analog of the time-frequency tradeoff that the widget in [006](006_interlude-reality-symmetry-uncertainty.md) demonstrates for the Fourier case.

## Three Uncertainty Principles

We now have three complementary uncertainty principles, one for each transform axis:

| Principle | Conjugate pair | Bound | Equality |
|---|---|---|---|
| Fourier | time $t$ / frequency $\omega$ | $\sigma_t \cdot \sigma_\omega \geq 1/2$ | Gaussian |
| Scale | log-time $\ln t$ / scale-freq $c$ | $\sigma_{\ln t} \cdot \sigma_c \geq 1/2$ | log-Gaussian |
| Decay | position $x$ / decay rate $\sigma$ | $\sigma_x \cdot \sigma_\sigma \geq 1/2$ | Gaussian (in $x$) |

The minimum-uncertainty signal for Fourier is the Gaussian. For scale, it is the **log-Gaussian** -- a signal whose log-envelope is Gaussian, i.e., $f(t) \propto \exp(-(\ln t)^2/2\tau^2)$ for $t > 0$. This lognormal shape achieves maximum concentration in both log-time and scale-frequency simultaneously.

The lognormal distribution, which we noted in [002](002_moments-and-the-mgf.md) is not determined by its moments and has no MGF, is the minimum-uncertainty distribution for the scale transform. The Fourier framework finds it pathological; the scale framework finds it optimal. Each transform has its own preferred shapes.

## The Full Picture

The variable scale transform completes a progression through the series:

| Article | Transform | Parameter | Captures |
|---|---|---|---|
| [003](003_fourier-vs-laplace-transforms-of-pdfs.md) | FT (CF) | fixed $\omega$ | global oscillatory structure |
| [005](005_distributional-decay-rate.md) | LT (MGF) | fixed $\sigma$ | global decay structure |
| [011](011_the-scale-transform.md) | Scale / Mellin | fixed $(\sigma, \omega)$ | global scale structure |
| 012 | Variable Scale | $\sigma(t)$, adaptive | **local** decay + oscillation |

The variable scale transform is the most general: it adapts the exponential probe to the signal's local structure, extracts both trend and oscillation, and maintains Parseval's energy balance through the compensation principle. It sees what the FT cannot (exponential trends), what the LT cannot sustain (unitarity), and what the fixed scale transform cannot resolve (non-stationary variation).

The price of this generality is that $\sigma(t)$ must be estimated from the signal -- there is no fixed basis. The transform is **signal-adaptive**, which makes it more powerful for analysis but less convenient for the kind of algebraic manipulation (multiplication of CFs, cumulant addition) that made the fixed transforms so elegant in [007](007_convolution-independence-and-multiplication.md)--[010](010_the-cf-as-complete-invariant.md).

This is the fundamental tradeoff: fixed transforms have clean algebra but limited vision. Adaptive transforms have broad vision but messy algebra. The variable scale transform lives at the adaptive end of this spectrum, trading algebraic elegance for the ability to follow a signal wherever its exponential structure leads.

---

*Next: [013: From Transforms to Learned Representations](013_from-transforms-to-learned-representations.md)*
