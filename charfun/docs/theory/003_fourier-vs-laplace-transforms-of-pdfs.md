# The Fourier Transform vs. the Laplace Transform of a Probability Density Function

*Builds on [001: Probability Density Functions](001_probability-density-functions.md) and [002: Moments and the Moment-Generating Function](002_moments-and-the-mgf.md)*

## 1. Setup: What We're Transforming

Let $f_X(x)$ be a probability density function (PDF) of a continuous random variable $X$. It satisfies two axioms: $f_X(x) \geq 0$ for all $x$, and $\int_{-\infty}^{\infty} f_X(x)\,dx = 1$. The question is: what happens when we feed this object into two different integral transforms?

## 2. The Fourier Transform of a PDF: The Characteristic Function

The **characteristic function** of $X$ is defined as:

$$\varphi_X(t) = E[e^{itX}] = \int_{-\infty}^{\infty} e^{itx} f_X(x)\,dx$$

This is exactly the Fourier transform of $f_X$, evaluated at frequency $t$ (up to sign convention -- some fields write $e^{-itx}$, but probability theory uses $e^{+itx}$).

The kernel $e^{itx} = \cos(tx) + i\sin(tx)$ is a **unit-modulus phasor** on the complex unit circle. For any real $x$ and real $t$, $|e^{itx}| = 1$. This is the crucial fact. Because the kernel never grows or decays, and because $f_X$ integrates to 1, the integral **always converges**. Every random variable, no matter how heavy-tailed, has a characteristic function. The Cauchy distribution has no mean and no variance, but it has a perfectly well-defined characteristic function: $\varphi(t) = e^{-|t|}$.

**What $\varphi(t)$ encodes at each $t$:** The integral $\int e^{itx} f_X(x)\,dx$ asks: "weight each point $x$ in the distribution by a phasor spinning at frequency $t$, and sum." The result is a complex number. Its **magnitude** $|\varphi(t)|$ measures how much the distribution's mass concentrates at spacings commensurate with frequency $t$. Its **phase** $\arg \varphi(t)$ encodes the distribution's location (shift). For a symmetric distribution centered at the origin, $\varphi(t)$ is real-valued. Shifting the distribution by $\mu$ multiplies $\varphi$ by $e^{i\mu t}$, rotating the phase without changing the magnitude.

The characteristic function encodes **all** distributional information. The inversion theorem recovers $f_X$:

$$f_X(x) = \frac{1}{2\pi} \int_{-\infty}^{\infty} e^{-itx} \varphi_X(t)\,dt$$

## 3. The Laplace Transform of a PDF: The Moment-Generating Function

The **moment-generating function** (MGF) of $X$ is:

$$M_X(t) = E[e^{tX}] = \int_{-\infty}^{\infty} e^{tx} f_X(x)\,dx$$

This is the **two-sided Laplace transform** of $f_X$, evaluated at $-s$ where $s = -t$ (or equivalently, the Laplace transform evaluated on the real line).

The kernel here is $e^{tx}$, which is **real and unbounded**. For $t > 0$, this kernel grows exponentially as $x \to +\infty$. For $t < 0$, it grows as $x \to -\infty$. The integral converges only if the tails of $f_X$ decay fast enough to counteract this exponential growth. This means **the MGF does not always exist**.

The Cauchy distribution, with tails decaying as $1/x^2$, cannot suppress $e^{tx}$ for any $t \neq 0$. Its MGF is undefined. More generally, any distribution with tails heavier than exponential will fail. Even the lognormal distribution, despite having all finite moments, has no MGF in any neighborhood of zero.

When the MGF does exist in an open interval around $t = 0$, it encodes the moments directly:

$$M_X^{(n)}(0) = E[X^n]$$

The $n$-th derivative at the origin gives the $n$-th moment. This is where the name comes from: the Taylor expansion $M_X(t) = \sum_{n=0}^{\infty} \frac{E[X^n]}{n!} t^n$ literally **generates** the moments as coefficients.

## 4. The Core Difference: Bounded vs. Unbounded Kernels

The entire distinction reduces to one fact about the integration kernel:

| | Fourier (CF) | Laplace (MGF) |
|---|---|---|
| Kernel | $e^{itx}$, purely imaginary exponent | $e^{tx}$, real exponent |
| $\|kernel\|$ | $= 1$ always | $= e^{tx}$, unbounded |
| Convergence | Always, for every PDF | Only if tails decay fast enough |
| Output | Complex-valued function of real $t$ | Real-valued (when it exists) |
| Domain | All of $\mathbb{R}$ | A strip (possibly just $\{0\}$) |

The Fourier kernel **probes** the distribution by spinning -- it measures oscillatory structure (frequency content). The Laplace kernel **weighs** the distribution by exponential tilting -- it measures how heavy the tails are.

## 5. The Relationship: $\varphi(t) = M(it)$

When the MGF exists, the two transforms are connected by analytic continuation:

$$\varphi_X(t) = M_X(it)$$

You replace the real argument of the MGF with a purely imaginary one. The MGF lives on the real line; the CF lives on the imaginary axis of the same complex variable $s = t$ in the Laplace domain. They are slices of the same analytic function $E[e^{sX}]$ through different axes of the complex $s$-plane.

But this relationship only helps when $M_X$ exists and can be analytically continued. The CF is more fundamental: it always exists, and it goes the other direction -- you can sometimes extend from the imaginary axis inward to recover the MGF when it exists.

## 6. Why This Matters: The Central Limit Theorem

The characteristic function's universal existence is not just a theoretical nicety; it is **why the Central Limit Theorem works in full generality**.

If $X_1, X_2, \ldots, X_n$ are i.i.d. with mean $\mu$ and variance $\sigma^2$, the CF of the standardized sum $S_n = \frac{1}{\sqrt{n}} \sum (X_i - \mu)$ is:

$$\varphi_{S_n}(t) = \left[\varphi_X\!\left(\frac{t}{\sqrt{n}}\right) e^{-i\mu t/\sqrt{n}}\right]^n$$

Expanding $\varphi_X$ around $t = 0$ using the fact that $\varphi'(0) = i\mu$ and $\varphi''(0) = -E[X^2]$:

$$\varphi_X(t/\sqrt{n}) = 1 + \frac{i\mu t}{\sqrt{n}} - \frac{E[X^2] t^2}{2n} + o(1/n)$$

After centering and taking the $n$-th power, the higher-order terms vanish and:

$$\varphi_{S_n}(t) \to e^{-\sigma^2 t^2/2}$$

which is the characteristic function of $N(0, \sigma^2)$. This proof requires only finite second moments -- it works for distributions with no MGF, for anything with finite variance. An MGF-based proof would exclude all heavy-tailed distributions from the start.

## 7. Convolution and Multiplication

Both transforms convert convolution to multiplication:

- **CF:** If $X$ and $Y$ are independent, $\varphi_{X+Y}(t) = \varphi_X(t) \cdot \varphi_Y(t)$
- **MGF:** Similarly, $M_{X+Y}(t) = M_X(t) \cdot M_Y(t)$

This is the standard Fourier/Laplace convolution theorem applied to PDFs. The sum of independent random variables has a PDF that is the convolution of the individual PDFs. Both transforms linearize this operation into pointwise multiplication. But again, the CF version works universally.

## 8. What the Probe Looks Like

The charfun explorer visualizes the **kernel probe** $e^{itx}$ sweeping across the PDF. In the Fourier case, as $t$ increases, the probe oscillates faster -- it's a higher-frequency sinusoid being integrated against the density. Broad distributions have CFs that decay quickly (they can't "track" high-frequency probes), while narrow distributions have slowly-decaying CFs. This is the uncertainty principle: $\Delta x \cdot \Delta t \geq \frac{1}{2}$.

In the Laplace/MGF case, the probe is a monotone exponential curve. Increasing $t$ makes it grow steeper on the right, exponentially amplifying the right tail. The MGF at positive $t$ is essentially asking "how fat is the right tail?" -- if the answer is "too fat," the integral diverges.

## 9. Summary

The Fourier transform of a PDF (the characteristic function) and the Laplace transform of a PDF (the moment-generating function) are two windows into the same object. The Fourier window is always open: bounded kernels guarantee convergence, complex-valued output encodes both magnitude and phase, and the result is the definitive dual representation of any probability distribution. The Laplace window opens only for well-behaved distributions, but when it does, it offers the elegant machinery of moment generation through differentiation and often simpler closed-form expressions.

The characteristic function is the more fundamental object. It exists universally, uniquely determines the distribution, and provides the natural setting for the most general proofs in probability theory. The MGF is a computational convenience -- powerful when available, but not always available. The relationship $\varphi(t) = M(it)$ reveals them as orthogonal slices of the same analytic structure in the complex plane: one along the imaginary axis (stable, oscillatory, universal), the other along the real axis (informative but fragile, demanding exponential tail control).

---

*Next: [004: The Dual Variable -- What $t$ Actually Means](004_the-dual-variable-what-t-means.md)*
