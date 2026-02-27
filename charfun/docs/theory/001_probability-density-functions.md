# Probability Density Functions: From Counting to Density

## The Problem: Describing Randomness

Suppose you observe a random quantity $X$ -- the height of a person, the return on a stock, the position of a particle. You repeat the experiment many times. How do you describe the pattern of outcomes?

For **discrete** outcomes (a die roll, a coin flip), this is straightforward: list the possible values and their probabilities. A fair die: $P(X = k) = 1/6$ for $k = 1, \ldots, 6$. This is the **probability mass function** (PMF). The "mass" metaphor is apt: probability sits in discrete lumps at isolated points.

For **continuous** outcomes (height, temperature, position), this breaks down. The probability that a person's height is exactly 1.80000... meters is zero. There are uncountably many possible values, and no single one carries any mass. Probability doesn't sit in lumps; it's smeared out continuously.

## The Density Idea

The solution is to describe probability per unit length rather than probability at a point. This is the **probability density function**:

$$f_X(x) \geq 0, \quad \int_{-\infty}^{\infty} f_X(x)\,dx = 1$$

The density $f_X(x)$ is **not** a probability. It's a probability **rate**: the amount of probability per infinitesimal interval around $x$. To get an actual probability, you integrate:

$$P(a \leq X \leq b) = \int_a^b f_X(x)\,dx$$

This is the area under the curve between $a$ and $b$. The total area under the entire curve equals 1 -- certainty.

The value $f_X(x)$ can exceed 1. A uniform distribution on $[0, 0.5]$ has $f(x) = 2$ on that interval. This is fine: density is not probability. What matters is that the integral over any interval gives a number between 0 and 1, and the integral over $\mathbb{R}$ gives exactly 1.

## The Four Canonical Densities

Throughout this series, we work with four distributions that span a range of behaviors:

### Gaussian (Normal)

$$f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)$$

The bell curve. Parameterized by mean $\mu$ (center) and standard deviation $\sigma$ (width). Tails decay as $e^{-x^2}$ -- faster than any polynomial, faster than any exponential. This extreme tail decay means all moments exist, the MGF exists everywhere, and the distribution is maximally "well-behaved." The Gaussian is the fixed point of the Central Limit Theorem: sum enough of anything (with finite variance), and you get this.

### Laplace (Double Exponential)

$$f(x) = \frac{1}{2b} \exp\!\left(-\frac{|x - \mu|}{b}\right)$$

A sharper peak and heavier tails than the Gaussian. Tails decay as $e^{-|x|}$ -- exponentially, but slower than $e^{-x^2}$. All moments exist. The MGF exists but only in a finite interval $|t| < 1/b$. The Laplace distribution arises naturally as the difference of two exponential random variables.

### Uniform

$$f(x) = \frac{1}{b - a}, \quad a \leq x \leq b$$

Flat within a bounded interval, zero outside. The simplest possible density: all outcomes in $[a, b]$ are equally likely. Because the support is compact (bounded), all moments exist and the MGF exists everywhere. The sharp edges at $a$ and $b$ produce distinctive oscillatory behavior in the frequency domain (sinc function), which we explore in [003](003_fourier-vs-laplace-transforms-of-pdfs.md).

### Cauchy

$$f(x) = \frac{1}{\pi\gamma}\left[1 + \left(\frac{x - x_0}{\gamma}\right)^2\right]^{-1}$$

The pathological distribution. Tails decay as $1/x^2$ -- so slowly that the mean does not exist ($\int x f(x)\,dx$ diverges). No moments of any order exist. The MGF is undefined for all $t \neq 0$. The sample mean of $n$ Cauchy observations has the same distribution as a single observation -- averaging doesn't help. Despite all this, the Cauchy has a perfectly well-defined characteristic function, as we will see in [003](003_fourier-vs-laplace-transforms-of-pdfs.md).

## The CDF: Accumulating Density

The **cumulative distribution function** (CDF) is the running integral of the density:

$$F_X(x) = P(X \leq x) = \int_{-\infty}^x f_X(u)\,du$$

It maps $\mathbb{R} \to [0, 1]$, is non-decreasing, and satisfies $F(-\infty) = 0$, $F(+\infty) = 1$. The CDF always exists (even for discrete distributions), while the PDF exists only when the CDF is differentiable: $f_X(x) = F_X'(x)$.

The CDF gives probabilities directly: $P(a \leq X \leq b) = F(b) - F(a)$.

## Expectation: The Weighted Average

Given a density $f_X(x)$, the **expected value** (mean) of any function $g(X)$ is:

$$E[g(X)] = \int_{-\infty}^{\infty} g(x) f_X(x)\,dx$$

This is a weighted average of $g(x)$, where the weights are given by the density. The integral uses $f_X$ as a measure of importance: regions where $f_X$ is large contribute more to the average.

Special cases:
- $g(x) = x$ gives the mean: $\mu = E[X]$
- $g(x) = (x - \mu)^2$ gives the variance: $\sigma^2 = E[(X - \mu)^2]$
- $g(x) = x^n$ gives the $n$-th moment: $E[X^n]$
- $g(x) = e^{itx}$ gives the characteristic function: $\varphi(t) = E[e^{itX}]$
- $g(x) = e^{tx}$ gives the moment-generating function: $M(t) = E[e^{tX}]$

The last two are the subject of [002](002_moments-and-the-mgf.md) and [003](003_fourier-vs-laplace-transforms-of-pdfs.md).

## Why Density Matters

The PDF is the central object in continuous probability. It determines everything: all probabilities, all moments, the CDF, the characteristic function, the MGF (when it exists). Two random variables with the same PDF are probabilistically identical -- they may be defined on different probability spaces, but they produce the same statistics.

The PDF also has a physical interpretation: $f_X(x)\,dx$ is the "amount of probability" in the infinitesimal interval $[x, x + dx]$. This makes $f_X$ directly analogous to mass density in physics ($\rho(x)\,dx$ is the mass in $[x, x + dx]$), charge density in electrostatics, or energy spectral density in signal processing. The integral transform machinery of Fourier and Laplace, developed for these physical quantities, carries over intact to probability densities.

---

*Next: [002: Moments and the Moment-Generating Function](002_moments-and-the-mgf.md)*
