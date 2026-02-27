# The Scale Transform: Bridging Fourier and Laplace

*Continues from [010: The Characteristic Function as a Complete Invariant](010_the-cf-as-complete-invariant.md)*

## The Impasse

Articles 001--010 established a tension:

- The **Fourier transform** (CF) is unitary, universal, and preserves Parseval's theorem. But it sees only oscillatory structure -- distributional frequency ([004](004_the-dual-variable-what-t-means.md)). It is blind to exponential trends.

- The **Laplace transform** (MGF) sees exponential structure -- distributional decay rate ([005](005_distributional-decay-rate.md)). But it is non-unitary, doesn't always exist, and breaks norm preservation ([006](006_interlude-reality-symmetry-uncertainty.md)).

This feels like a false dichotomy. Nature contains both oscillation and decay -- a damped oscillation, a chirp with changing amplitude, a probability distribution whose tails decay at a rate that varies with scale. Is there a transform that captures **both** while remaining honest -- that is, while preserving energy and remaining invertible?

The **scale transform**, developed in the framework of Leon Cohen's time-frequency analysis, resolves this impasse. It operates on the axis that neither the Fourier nor the Laplace transform directly addresses: the axis of **scale**.

## Scale as a Third Axis

Recall the complex $s$-plane from [005](005_distributional-decay-rate.md):

```
  Im(s) = ω  (distributional frequency, FT)
       |
       |
  ─────┼───── Re(s) = σ  (distributional decay rate, LT)
       |
```

The FT operates on the imaginary axis ($\sigma = 0$). The LT operates on the real axis ($\omega = 0$). But there is a third natural operation: **dilation**. Instead of shifting the exponent ($e^{itx}$ or $e^{\sigma x}$), you can **stretch the argument**:

$$f(x) \mapsto f(ax)$$

This is neither a frequency shift nor an exponential tilt. It is a change of **scale** -- a zoom. The scale parameter $a > 0$ compresses ($a > 1$) or dilates ($a < 1$) the function without changing its functional form.

The scale transform asks: how does a signal look when you systematically vary the zoom level? What structure is visible at one scale but invisible at another?

## The Mellin Transform: Scale's Native Language

The natural integral transform for scale analysis is the **Mellin transform**:

$$\mathcal{M}\{f\}(s) = \int_0^{\infty} f(t)\,t^{s-1}\,dt$$

where $s = \sigma + i\omega$ is complex. This looks unfamiliar, but a change of variable reveals its identity. Set $t = e^u$ (so $u = \ln t$, $dt = e^u du$):

$$\mathcal{M}\{f\}(\sigma + i\omega) = \int_{-\infty}^{\infty} f(e^u)\,e^{u(\sigma + i\omega - 1)}\,e^u\,du = \int_{-\infty}^{\infty} f(e^u)\,e^{\sigma u}\,e^{i\omega u}\,du$$

This is the **Fourier transform of $f(e^u)\,e^{\sigma u}$** with respect to $u$. The Mellin transform is a Fourier transform performed after a logarithmic change of variable and an exponential weighting.

The decomposition is revealing:

- The substitution $t = e^u$ converts multiplicative structure (scaling $t \to at$) into additive structure (shifting $u \to u + \ln a$). Multiplication in scale-space becomes translation in log-space.
- The factor $e^{\sigma u}$ is the exponential probe from [005](005_distributional-decay-rate.md) -- it captures decay structure.
- The factor $e^{i\omega u}$ is the oscillatory probe from [004](004_the-dual-variable-what-t-means.md) -- it captures frequency structure.

The Mellin transform captures **both** simultaneously, because it applies both probes after first converting to the natural coordinate system for scale analysis (logarithmic).

## The Scale Transform (Cohen)

Leon Cohen formalized the **scale transform** as the expectation value of the scaling operator. For a signal $f(t)$ with energy $E = \int |f(t)|^2 dt$, define:

$$S_f(a) = \frac{1}{\sqrt{a}} \int_{-\infty}^{\infty} f^*(t)\,f(at)\,dt$$

This measures the **self-similarity** of $f$ at scale $a$: how much does $f$ resemble a scaled version of itself? When $a = 1$, $S_f(1) = E$ (perfect overlap). As $a$ departs from 1, $S_f(a)$ decays according to how quickly the signal's structure changes with scale.

Cohen showed that this is equivalent to the Mellin-domain representation. The scale transform has a **Parseval-like theorem**:

$$\int_0^{\infty} |S_f(a)|^2 \frac{da}{a} = \int_0^{\infty} |f(t)|^2 dt \cdot \int_0^{\infty} |f(t)|^2 dt$$

Energy in scale-space relates to energy in time-space. The transform is not unitary in the same sense as the FT, but it preserves a well-defined energy relationship. More importantly, it is **invertible**: knowing $S_f(a)$ for all $a$ determines $f$ (up to a global phase).

## The Key Insight: Windowed Scale Analysis

Here is where the user's idea becomes precise. The FT analyzes a signal by projecting onto oscillatory basis functions $e^{i\omega t}$. The LT projects onto exponential basis functions $e^{\sigma t}$. What if we do both, but **locally**?

### The Procedure

1. **Window** the signal into short segments of length $L$: $f_n(t) = f(t)\,w(t - nL)$ where $w$ is a window function.

2. On each segment, apply an **exponential envelope probe** at rate $\sigma$: form $g_n(t) = f_n(t)\,e^{\sigma t}$.

3. Take the **Fourier transform** of $g_n$: $\hat{g}_n(\omega) = \int g_n(t)\,e^{i\omega t}\,dt$.

4. Apply the **compensation factor** $e^{-\sigma t}$ to undo the exponential tilt when reconstructing.

Step 2 tilts the local signal exponentially -- this is the Laplace probe from [005](005_distributional-decay-rate.md), applied locally. Step 3 takes the Fourier transform of the tilted signal. Together, steps 2 and 3 compute $\Phi(\sigma + i\omega)$ -- a slice of the bilateral Laplace transform at real part $\sigma$ -- but only over the local window.

Step 4 is the crucial innovation: the compensation factor ensures that the overall analysis-synthesis system preserves energy. Without compensation, the exponential tilt amplifies some parts of the signal and suppresses others (this is why the raw LT is non-unitary). With compensation, you're not measuring absolute energy at scale $\sigma$ -- you're measuring **relative** energy compared to the exponential envelope $e^{\sigma t}$.

### What This Captures

At each window position $n$ and each tilt rate $\sigma$, the output $\hat{g}_n(\omega)$ tells you:

> "Within this local segment, after removing an exponential trend of rate $\sigma$, what oscillatory content remains at frequency $\omega$?"

If the signal has an exponential decay at rate $\sigma$ in this segment, then tilt rate $\sigma$ will flatten the decay, and the residual will be a stationary oscillation -- cleanly captured by the FT. If the decay rate is different from $\sigma$, the residual will still have exponential character, which manifests as spectral leakage.

Sweeping $\sigma$ across a range of decay rates, for each window, produces a **local decay-frequency decomposition**: a two-dimensional map of the signal's structure in $(\sigma, \omega)$ space at each time position. This is the scale transform applied locally.

## The Parseval Balance

The compensation factor $e^{-\sigma t}$ is not just a mathematical convenience -- it is what makes the system unitary. Here is how.

The forward step computes:

$$\hat{g}_n(\omega; \sigma) = \int f_n(t)\,e^{\sigma t}\,e^{i\omega t}\,dt = \int f_n(t)\,e^{(\sigma + i\omega)t}\,dt$$

This is the local bilateral Laplace transform of $f_n$ at $s = \sigma + i\omega$.

The inverse step reconstructs:

$$f_n(t) = \frac{1}{2\pi}\int_{-\infty}^{\infty} \hat{g}_n(\omega; \sigma)\,e^{-(\sigma + i\omega)t}\,d\omega$$

For this to work for any $\sigma$ in the convergence strip, we need:

$$\frac{1}{2\pi}\int_{-\infty}^{\infty} |\hat{g}_n(\omega; \sigma)|^2\,d\omega = \int |f_n(t)|^2\,e^{2\sigma t}\,dt$$

This is Parseval's theorem for the Fourier transform applied to $f_n(t) e^{\sigma t}$. The left side is the spectral energy of the tilted signal. The right side is the energy of the original signal **weighted by $e^{2\sigma t}$**.

The compensation factor $e^{-\sigma t}$ in reconstruction exactly cancels the $e^{\sigma t}$ in analysis. The round-trip analysis-synthesis preserves the original signal's energy:

$$\text{analyze: } f \to fe^{\sigma t} \to \text{FT} \to \hat{g}(\omega;\sigma)$$
$$\text{synthesize: } \hat{g}(\omega;\sigma) \to \text{IFT} \to fe^{\sigma t} \to \times e^{-\sigma t} \to f$$

Each arrow is invertible. The exponential tilt and its compensation are inverse operations. The FT and IFT are inverse operations. The composition is the identity. No energy is created or destroyed -- Parseval is honored.

## What the FT Cannot See

Consider a signal $f(t) = A\,e^{-\alpha t}\cos(\omega_0 t)$ for $t \geq 0$ -- a damped oscillation. The FT sees:

$$\hat{f}(\omega) = \frac{A}{2}\left[\frac{1}{\alpha + i(\omega - \omega_0)} + \frac{1}{\alpha + i(\omega + \omega_0)}\right]$$

The spectrum is a broad bump centered at $\pm\omega_0$ with width $\sim \alpha$. The decay rate $\alpha$ manifests only as spectral broadening -- it smears out the frequency peak. You can estimate $\alpha$ from the peak width, but this is indirect and imprecise.

The windowed scale analysis at tilt $\sigma = \alpha$ sees:

$$f(t)\,e^{\alpha t} = A\cos(\omega_0 t)$$

The decay is **exactly canceled**. The result is a pure oscillation -- a delta function in frequency. The decay rate $\alpha$ is now the tilt parameter that produces maximum spectral concentration. By scanning $\sigma$, you directly measure $\alpha$ as the value that minimizes spectral width.

This is information the FT alone cannot extract cleanly. The FT conflates decay rate and spectral width. The scale transform separates them.

## Connection to Wavelets

The wavelet transform is a close relative. The continuous wavelet transform of $f$ with mother wavelet $\psi$ is:

$$W_f(a, b) = \frac{1}{\sqrt{a}}\int f(t)\,\psi^*\!\left(\frac{t - b}{a}\right)\,dt$$

This analyzes $f$ at scale $a$ and position $b$. The $1/\sqrt{a}$ factor ensures energy preservation -- the wavelet Parseval theorem:

$$\int_0^{\infty}\int_{-\infty}^{\infty} |W_f(a, b)|^2\,\frac{db\,da}{a^2} = C_\psi \int |f(t)|^2\,dt$$

where $C_\psi$ depends only on the wavelet, not the signal. This is the same Parseval balance: the transform preserves energy, with the measure $da/a^2$ reflecting the natural (logarithmic) measure on scale space.

The wavelet transform and the windowed scale analysis are complementary approaches to the same problem:

| | Windowed Scale Analysis | Wavelet Transform |
|---|---|---|
| Basis | $e^{(\sigma + i\omega)t}$ on local windows | dilated/shifted $\psi((t-b)/a)$ |
| Parameters | $(\sigma, \omega, n)$: tilt, frequency, position | $(a, b)$: scale, position |
| Captures frequency? | yes (via $\omega$) | yes (via $1/a$) |
| Captures decay? | yes (via $\sigma$) | indirectly (via wavelet shape) |
| Parseval? | yes (with compensation) | yes (with $C_\psi$ admissibility) |
| Relation to LT | explicit -- probes the $s$-plane | implicit -- scale $\approx 1/\text{frequency}$ |

The windowed scale analysis makes the connection to the Laplace transform explicit: each $(\sigma, \omega)$ pair is a point in the $s$-plane, and the analysis computes the local Laplace transform along vertical lines $\text{Re}(s) = \sigma$. Wavelets access the same information but parameterize it differently (scale and position rather than tilt rate and frequency).

## Application to Probability: The Scale-Characteristic Function

Returning to the probability context of this series: can we define a "scale-characteristic function" that captures both oscillatory and decay structure of a distribution?

For a positive random variable $X > 0$ (e.g., a lifetime, a stock price, a magnitude), define:

$$\Phi_X(s) = E[X^{s-1}] = \int_0^{\infty} x^{s-1}\,f_X(x)\,dx, \quad s = \sigma + i\omega$$

This is the **Mellin transform** of the PDF. Setting $x = e^u$:

$$\Phi_X(\sigma + i\omega) = \int_{-\infty}^{\infty} f_X(e^u)\,e^{\sigma u}\,e^{i\omega u}\,du = \varphi_{\ln X}^{(\sigma)}(\omega)$$

where $\varphi_{\ln X}^{(\sigma)}$ is the characteristic function of $\ln X$ computed after exponential tilting by $\sigma$.

This object lives naturally in scale-space. It captures:

- **At $\sigma = 1$, $\omega = 0$**: $\Phi(1) = \int f(x)\,dx = 1$ (normalization)
- **At $\sigma = 2$, $\omega = 0$**: $\Phi(2) = E[X]$ (mean)
- **At $\sigma = n+1$, $\omega = 0$**: $\Phi(n+1) = E[X^n]$ (moments, along the real axis)
- **At $\sigma = 1$, varying $\omega$**: $\Phi(1 + i\omega) = E[X^{i\omega}] = E[e^{i\omega\ln X}] = \varphi_{\ln X}(\omega)$ -- the CF of $\ln X$

The vertical line $\sigma = 1$ gives the oscillatory decomposition of $\ln X$ -- pure distributional frequency. The real axis gives the moments -- pure distributional decay structure. Other vertical lines $\sigma \neq 1$ give tilted oscillatory decompositions, probing the interaction between scale and frequency.

The Mellin-Parseval theorem ensures:

$$\frac{1}{2\pi}\int_{-\infty}^{\infty} |\Phi(\sigma + i\omega)|^2\,d\omega = \int_0^{\infty} |f(x)|^2\,x^{2\sigma - 1}\,dx$$

Energy is preserved along each vertical line, with the weight $x^{2\sigma - 1}$ reflecting the scale at which you're probing.

## The Multiplication Property for Scale

Just as the CF converts additive convolution to multiplication ([007](007_convolution-independence-and-multiplication.md)), the Mellin transform converts **multiplicative convolution** to multiplication.

If $X$ and $Y$ are independent positive random variables and $Z = XY$ (their product, not sum), then:

$$\Phi_Z(s) = \Phi_X(s) \cdot \Phi_Y(s)$$

The Mellin transform does for products what the Fourier transform does for sums. This is natural: if $U = \ln X$ and $V = \ln Y$, then $\ln Z = U + V$, and the Mellin transform of the product becomes the Fourier transform of the sum in log-space.

This is exactly the right tool for distributions that combine multiplicatively -- lognormal models, cascade processes, multiplicative noise in signal processing, compound growth rates in finance.

## The Synthesis: Three Transforms, Three Operations

| Transform | Domain | Kernel | Captures | Linearizes |
|---|---|---|---|---|
| Fourier (CF) | $\mathbb{R}$ | $e^{i\omega x}$ | oscillatory structure | additive convolution ($X + Y$) |
| Laplace (MGF) | $\mathbb{R}$ | $e^{\sigma x}$ | decay structure | additive convolution (when it exists) |
| Mellin (Scale) | $\mathbb{R}^+$ | $x^{s-1} = e^{(\sigma + i\omega)\ln x}$ | scale structure | multiplicative convolution ($X \cdot Y$) |

The Mellin/scale transform is not a replacement for Fourier or Laplace -- it is the third vertex of a triangle. Fourier handles oscillation. Laplace handles decay. Mellin handles scale. And the windowed scale analysis, by applying exponential probes locally and compensating, lets you access Laplace-like decay information while maintaining Fourier-like energy preservation.

The compensation trick -- tilt by $e^{\sigma t}$, analyze, then untilt by $e^{-\sigma t}$ -- is the mechanism that makes the Laplace transform's non-unitary power available within a unitary framework. You borrow the exponential probe's ability to see decay, but you pay it back immediately, keeping the energy books balanced. It is, in essence, a way to look through the Laplace window while standing on Fourier ground.

---

*Next: [012: The Variable Scale Transform](012_the-variable-scale-transform.md)*
