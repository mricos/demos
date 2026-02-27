# Moments and the Moment-Generating Function

*Continues from [001: Probability Density Functions](001_probability-density-functions.md)*

## Moments: Compressing a Distribution into Numbers

A PDF contains complete information about a random variable, but it's a function -- an infinite-dimensional object. Moments are an attempt to summarize it with a sequence of numbers.

The **$n$-th moment** of $X$ is:

$$\mu_n = E[X^n] = \int_{-\infty}^{\infty} x^n f_X(x)\,dx$$

Each moment captures one aspect of the distribution's shape:

| Moment | Formula | What it measures |
|---|---|---|
| $E[X]$ | 1st moment | Location (center of mass) |
| $E[X^2]$ | 2nd moment | Scale (spread from origin) |
| $E[X^3]$ | 3rd moment | Asymmetry (skewness direction) |
| $E[X^4]$ | 4th moment | Tail weight (kurtosis) |

More commonly, we use **central moments** (centered at the mean $\mu = E[X]$):

$$\mu_n' = E[(X - \mu)^n]$$

The second central moment is the **variance** $\sigma^2 = E[(X - \mu)^2]$, whose square root $\sigma$ is the standard deviation.

## The Moment Problem: Do Moments Determine the Distribution?

A natural question: if you know all the moments $\mu_1, \mu_2, \mu_3, \ldots$, can you reconstruct $f_X$?

Sometimes yes, sometimes no. This is the **Hamburger moment problem**, and the answer depends on how fast the moments grow:

- **Carleman's condition:** If $\sum_{n=1}^{\infty} \mu_{2n}^{-1/(2n)} = \infty$, then the moments uniquely determine the distribution. All distributions with tails decaying faster than $e^{-c|x|^{1/2}}$ satisfy this.

- **Counterexample:** The lognormal distribution is **not** determined by its moments. There exist other distributions with the exact same moment sequence. This is a genuine failure -- no finite or even countably infinite collection of moments can distinguish them.

The Gaussian, Laplace, and uniform distributions are all moment-determinate. The Cauchy has no moments at all ($E[|X|] = \infty$). The characteristic function, by contrast, **always** determines the distribution uniquely -- this is one reason it's the more fundamental object (see [003](003_fourier-vs-laplace-transforms-of-pdfs.md)).

## Computing Moments: The Hard Way

To find the $n$-th moment of a Gaussian, you compute:

$$E[X^n] = \frac{1}{\sigma\sqrt{2\pi}} \int_{-\infty}^{\infty} x^n e^{-(x-\mu)^2/2\sigma^2}\,dx$$

This is doable but tedious, especially for large $n$. Each moment requires a separate integration, and the integrals become progressively harder. There should be a machine that produces all moments at once.

## The Moment-Generating Function

The **moment-generating function** (MGF) is that machine:

$$M_X(t) = E[e^{tX}] = \int_{-\infty}^{\infty} e^{tx} f_X(x)\,dx$$

The key insight is the Taylor expansion of $e^{tx}$:

$$e^{tx} = 1 + tx + \frac{(tx)^2}{2!} + \frac{(tx)^3}{3!} + \cdots$$

Substituting into the expectation and exchanging sum and integral (when convergence permits):

$$M_X(t) = E\!\left[\sum_{n=0}^{\infty} \frac{(tX)^n}{n!}\right] = \sum_{n=0}^{\infty} \frac{E[X^n]}{n!} t^n$$

The MGF is a **power series in $t$ whose coefficients are the moments** (divided by $n!$). Differentiating $n$ times and evaluating at $t = 0$ extracts the $n$-th moment:

$$M_X^{(n)}(0) = E[X^n]$$

This is the "generating" property: the MGF stores all moments as Taylor coefficients, and differentiation retrieves them.

## Examples

### Gaussian $(\mu, \sigma^2)$

$$M(t) = \exp\!\left(\mu t + \frac{\sigma^2 t^2}{2}\right)$$

Exists for all $t \in \mathbb{R}$. Differentiating: $M'(0) = \mu$, $M''(0) = \mu^2 + \sigma^2$, giving $E[X] = \mu$, $\text{Var}(X) = \sigma^2$.

### Laplace $(\mu, b)$

$$M(t) = \frac{e^{\mu t}}{1 - b^2 t^2}, \quad |t| < 1/b$$

Exists only for $|t| < 1/b$. The poles at $t = \pm 1/b$ reflect the exponential tail rate: the kernel $e^{tx}$ overwhelms the tail $e^{-|x|/b}$ exactly when $|t| \geq 1/b$.

### Uniform $[a, b]$

$$M(t) = \frac{e^{tb} - e^{ta}}{t(b - a)}$$

Exists for all $t$ (compact support guarantees convergence).

### Cauchy

$$M(t) = \text{undefined for } t \neq 0$$

The integral $\int e^{tx} \frac{1}{\pi(1 + x^2)}\,dx$ diverges for every $t \neq 0$. The tails $1/x^2$ cannot counteract the exponential growth of $e^{tx}$. The Cauchy distribution has no MGF, no moments, and cannot be summarized by any finite collection of numbers.

## The MGF as a Laplace Transform

The MGF $M(t) = \int e^{tx} f(x)\,dx$ is the **two-sided Laplace transform** of the PDF, evaluated along the real axis. This connection is not a coincidence -- it's the reason the MGF inherits the Laplace transform's convergence constraints. The Laplace transform converges in a vertical strip of the complex $s$-plane, and the MGF is the restriction to the real line within that strip. If the strip has zero width (as for the Cauchy), the MGF exists only at $t = 0$.

This Laplace perspective sets up the comparison in [003](003_fourier-vs-laplace-transforms-of-pdfs.md): what happens if, instead of the real exponential $e^{tx}$, we use the complex exponential $e^{itx}$? That substitution $t \to it$ rotates from the Laplace transform to the Fourier transform, and the resulting object -- the characteristic function -- exists universally.

## What the MGF Misses

The MGF is elegant when it exists, but its failures are fundamental, not merely technical:

1. **Heavy-tailed distributions** (Cauchy, Pareto with small $\alpha$, stable distributions with $\alpha < 2$) have no MGF. These distributions arise naturally in finance, physics, and network science. A framework that excludes them is incomplete.

2. **The lognormal** has all moments but no MGF. The moments grow too fast ($E[X^n] = e^{n\mu + n^2\sigma^2/2}$) for the Taylor series $\sum E[X^n] t^n / n!$ to converge for any $t \neq 0$. Knowing all the moments is not enough; you need them to grow slowly enough.

3. **Moment indeterminacy** means even when all moments exist, they might not pin down the distribution. The MGF (when it exists in a neighborhood of zero) does determine the distribution uniquely, but this requires the convergence condition that excludes the problematic cases.

The characteristic function resolves all three issues. It exists for every distribution, always determines it uniquely, and provides a complete representation even when no moments exist at all.

---

*Next: [003: Fourier vs. Laplace Transforms of PDFs](003_fourier-vs-laplace-transforms-of-pdfs.md)*
