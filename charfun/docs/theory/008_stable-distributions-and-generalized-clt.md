# Stable Distributions and the Generalized Central Limit Theorem

*Continues from [007: Convolution, Independence, and the Multiplication Principle](007_convolution-independence-and-multiplication.md)*

## The Question the Classical CLT Leaves Open

In [003](003_fourier-vs-laplace-transforms-of-pdfs.md) we proved the Central Limit Theorem: if $X_1, X_2, \ldots$ are i.i.d. with finite mean $\mu$ and finite variance $\sigma^2$, then the standardized sum converges to a Gaussian. The proof used the CF expansion around $t = 0$ and required $\varphi''(0) = -E[X^2]$ to exist -- that is, **finite second moment**.

But what happens when $\sigma^2 = \infty$? The Cauchy distribution has no variance. The Pareto distribution with tail exponent $\alpha < 2$ has no variance. Heavy-tailed distributions arise naturally in finance (stock returns), network science (degree distributions), physics (anomalous diffusion), and linguistics (word frequencies). When you sum many i.i.d. copies of these variables, what do you get?

Not a Gaussian. But the sum still converges to *something*. The **generalized CLT** answers this question, and the answer is a **stable distribution**.

## What "Stable" Means

A distribution is **stable** if it is closed under convolution up to affine rescaling. Precisely: $X$ has a stable distribution if, for any $n$ i.i.d. copies $X_1, \ldots, X_n$, there exist constants $a_n > 0$ and $b_n \in \mathbb{R}$ such that:

$$X_1 + X_2 + \cdots + X_n \stackrel{d}{=} a_n X + b_n$$

The sum of $n$ copies looks like a rescaled and shifted single copy. The distribution reproduces itself under addition.

In [007](007_convolution-independence-and-multiplication.md) we saw this for specific cases:
- **Gaussian**: $N(\mu, \sigma^2) * N(\mu, \sigma^2) = N(2\mu, 2\sigma^2)$. The sum of $n$ copies is $N(n\mu, n\sigma^2) \stackrel{d}{=} \sqrt{n}\,X + (n-\sqrt{n})\mu$. Stable with $a_n = \sqrt{n}$.
- **Cauchy**: $\text{Cauchy}(0, \gamma) * \text{Cauchy}(0, \gamma) = \text{Cauchy}(0, 2\gamma)$. The sum of $n$ copies is $\text{Cauchy}(0, n\gamma) \stackrel{d}{=} n\,X$. Stable with $a_n = n$.

The scaling constants differ: $\sqrt{n}$ for the Gaussian, $n$ for the Cauchy. This difference -- the **rate at which sums grow** -- is the signature of the stability index $\alpha$.

## The Stability Index $\alpha$

For a stable distribution, the rescaling constant takes the form $a_n = n^{1/\alpha}$ for some $\alpha \in (0, 2]$. This $\alpha$ is the **stability index** (also called the **characteristic exponent**).

| $\alpha$ | $a_n$ | Sum growth | Tail behavior | Example |
|---|---|---|---|---|
| $2$ | $n^{1/2}$ | $\sqrt{n}$ | light (sub-exponential) | Gaussian |
| $1$ | $n^1$ | $n$ | $\sim 1/x^2$ | Cauchy |
| $1/2$ | $n^2$ | $n^2$ | $\sim 1/x^{3/2}$ | L&eacute;vy |
| $\alpha$ | $n^{1/\alpha}$ | $n^{1/\alpha}$ | $\sim 1/|x|^{1+\alpha}$ | $\alpha$-stable |

The stability index controls how fast sums grow. Gaussian sums grow as $\sqrt{n}$ (the familiar $\sigma\sqrt{n}$ from the CLT). Cauchy sums grow as $n$ -- linearly, not sub-linearly. Sums with $\alpha < 1$ grow faster than linearly. The smaller $\alpha$ is, the heavier the tails and the more dominant the largest terms in the sum.

## The Characteristic Function of Stable Distributions

The CF is where the theory becomes clean. A distribution is stable with index $\alpha$ if and only if its log-CF has the form:

$$\ln \varphi(t) = i\delta t - c|t|^\alpha \left[1 + i\beta\,\text{sgn}(t)\,\omega(t, \alpha)\right]$$

where:
- $\alpha \in (0, 2]$ is the stability index
- $\beta \in [-1, 1]$ is the **skewness parameter** ($\beta = 0$ for symmetric)
- $c > 0$ is the **scale parameter**
- $\delta \in \mathbb{R}$ is the **location parameter**
- $\omega(t, \alpha) = \tan(\pi\alpha/2)$ when $\alpha \neq 1$, and $\omega(t, 1) = \frac{2}{\pi}\ln|t|$

For the **symmetric** case ($\beta = 0$, $\delta = 0$), this simplifies to:

$$\varphi(t) = e^{-c|t|^\alpha}$$

This is a remarkably compact formula. The entire family of symmetric stable distributions is parameterized by just two numbers: $\alpha$ (shape) and $c$ (scale). Let's see the familiar cases:

- $\alpha = 2$: $\varphi(t) = e^{-ct^2}$. This is the Gaussian CF with $c = \sigma^2/2$. The only stable distribution with finite variance.

- $\alpha = 1$: $\varphi(t) = e^{-c|t|}$. This is the Cauchy CF with $c = \gamma$. No mean, no variance, tails $\sim 1/x^2$.

- $\alpha = 1/2$: the **L&eacute;vy distribution** (one-sided). Tails $\sim x^{-3/2}$. Arises as the distribution of first-passage times for Brownian motion.

## Why $\alpha > 2$ Is Impossible

The constraint $\alpha \leq 2$ is not arbitrary -- it's forced by the requirement that $\varphi(t)$ be a valid characteristic function.

A valid CF must satisfy $|\varphi(t)| \leq 1$ for all $t$ (since $|E[e^{itX}]| \leq E[|e^{itX}|] = 1$). For $\varphi(t) = e^{-c|t|^\alpha}$, we have $|\varphi(t)| = e^{-c|t|^\alpha} \leq 1$ for all $\alpha > 0$, so the modulus constraint is satisfied.

The deeper constraint comes from **positive definiteness**. A function is a valid CF if and only if it is positive definite (Bochner's theorem). The function $e^{-c|t|^\alpha}$ is positive definite if and only if $\alpha \leq 2$. For $\alpha > 2$, the function fails positive definiteness -- it does not correspond to any probability distribution.

There is also a moment argument. If a distribution had $\varphi(t) = e^{-c|t|^\alpha}$ with $\alpha > 2$, then $\varphi''(0)$ would exist and equal zero (since $|t|^\alpha$ is super-quadratic, its second derivative at zero vanishes), implying $E[X^2] = 0$, which means $X = 0$ almost surely -- a contradiction with having a non-degenerate distribution.

So $\alpha = 2$ is the ceiling. The Gaussian sits at the top of the stable family, with the lightest tails and the slowest sum growth. Every other stable distribution has heavier tails, faster sum growth, and fewer finite moments.

## The Moment Structure

The stability index $\alpha$ determines exactly which moments exist:

$$E[|X|^p] < \infty \quad \text{if and only if} \quad p < \alpha$$

| $\alpha$ | Finite moments | Infinite moments |
|---|---|---|
| $2$ (Gaussian) | all moments | none |
| $1.5$ | $E[|X|^p]$ for $p < 1.5$ | variance, all higher |
| $1$ (Cauchy) | $E[|X|^p]$ for $p < 1$ | mean, variance, all higher |
| $0.5$ (L&eacute;vy) | $E[|X|^p]$ for $p < 0.5$ | mean, variance, all higher |

For $\alpha < 2$, the variance is infinite. For $\alpha \leq 1$, the mean is infinite. The classical CLT requires $\alpha = 2$ (finite variance). The generalized CLT handles all $\alpha \in (0, 2]$.

This is precisely the regime where the MGF fails. As established in [002](002_moments-and-the-mgf.md) and [005](005_distributional-decay-rate.md), the MGF requires exponentially decaying tails. Stable distributions with $\alpha < 2$ have polynomial tails ($\sim |x|^{-1-\alpha}$), so their MGF is undefined for all $t \neq 0$. The CF is the only tool.

## The Generalized Central Limit Theorem

**Theorem** (Gnedenko, Kolmogorov): Let $X_1, X_2, \ldots$ be i.i.d. If there exist sequences $a_n > 0$ and $b_n \in \mathbb{R}$ such that:

$$\frac{X_1 + X_2 + \cdots + X_n - b_n}{a_n} \stackrel{d}{\to} Z$$

where $Z$ is a non-degenerate limit, then $Z$ is a stable distribution.

Conversely, every stable distribution arises as such a limit.

The classical CLT is the special case $\alpha = 2$: if $\text{Var}(X) < \infty$, the limit is Gaussian with $a_n = \sqrt{n}$, $b_n = n\mu$. The generalized version says: even when $\text{Var}(X) = \infty$, there may still be a limit -- it's just not Gaussian. It's an $\alpha$-stable distribution with $\alpha < 2$.

## Domains of Attraction

Which distributions converge to which stable law? This is the theory of **domains of attraction**.

A distribution $F$ belongs to the **domain of attraction** of the stable law $S_\alpha$ if properly normalized partial sums converge to $S_\alpha$. The criterion is the tail behavior:

$$P(X > x) \sim x^{-\alpha} L(x) \quad \text{as } x \to \infty$$

where $L(x)$ is a **slowly varying function** (one that satisfies $L(tx)/L(x) \to 1$ as $x \to \infty$ for every fixed $t > 0$; examples include constants, $\ln x$, $\ln\ln x$).

In words: a distribution is attracted to $S_\alpha$ if its tail decays as a power law with exponent $\alpha$ (up to slowly varying corrections). The exponent determines the limit; the slowly varying part affects the normalizing constants but not the limit distribution.

| Tail behavior | $\alpha$ | Attracted to | Normalization $a_n$ |
|---|---|---|---|
| $P(\|X\| > x) \sim x^{-2} L(x)$ | $2$ | Gaussian | $\sqrt{n L(n)}$ |
| $P(\|X\| > x) \sim x^{-\alpha}$, $\alpha \in (0,2)$ | $\alpha$ | $S_\alpha$ | $n^{1/\alpha}$ |
| $E[X^2] < \infty$ | $2$ | Gaussian | $\sigma\sqrt{n}$ |
| Exponential or lighter tails | $2$ | Gaussian | $\sigma\sqrt{n}$ |

The $\alpha = 2$ basin is enormous: every distribution with finite variance is attracted to the Gaussian, regardless of its specific shape. This is why the classical CLT is so useful -- it applies to Gaussians, Laplace, uniform, Bernoulli, Poisson, and everything else with finite variance. The Gaussian is the **universal attractor** for light-tailed distributions.

But the heavy-tailed world has its own attractors: one for each $\alpha < 2$. The Cauchy ($\alpha = 1$) attracts all distributions with tails $\sim 1/x^2$. The L&eacute;vy ($\alpha = 1/2$) attracts all distributions with tails $\sim 1/x^{3/2}$.

## The CF Proof of the Generalized CLT

The proof follows the same template as the classical CLT in [003](003_fourier-vs-laplace-transforms-of-pdfs.md), but the expansion of $\varphi(t)$ near $t = 0$ changes.

For the classical CLT, we used:

$$\varphi(t) = 1 - \frac{\sigma^2 t^2}{2} + o(t^2)$$

For a distribution in the domain of attraction of $S_\alpha$ with $\alpha < 2$, the CF behaves near zero as:

$$\varphi(t) = 1 - c|t|^\alpha(1 + o(1)) \quad \text{as } t \to 0$$

The second derivative at zero does not exist (the CF has a cusp at the origin when $\alpha < 2$). But $\varphi(t)$ still has the form $1 - c|t|^\alpha + \cdots$, and the same exponentiation argument works:

$$\left[\varphi\!\left(\frac{t}{n^{1/\alpha}}\right)\right]^n = \left[1 - \frac{c|t|^\alpha}{n} + o(1/n)\right]^n \to e^{-c|t|^\alpha}$$

The limit is the CF of the symmetric $\alpha$-stable distribution. The proof requires no moments -- only the behavior of the CF near the origin, which is determined by the tail exponent.

This is why the CF is the essential tool: it captures the tail exponent $\alpha$ in the local behavior of $\varphi$ near $t = 0$, even when the moments that would normally encode this information don't exist.

## The Anomalous Scaling

The normalizing constant $a_n = n^{1/\alpha}$ reveals how the sum $S_n = X_1 + \cdots + X_n$ grows:

- $\alpha = 2$: $S_n \sim n^{1/2}$. The sum grows as $\sqrt{n}$. Individual terms average out. The law of large numbers works normally.

- $\alpha = 1$: $S_n \sim n$. The sum grows linearly with $n$. There is no law of large numbers -- the sample mean $S_n/n$ doesn't converge. For the Cauchy, the sample mean has the same distribution as a single observation, regardless of sample size. Averaging doesn't help.

- $\alpha < 1$: $S_n \sim n^{1/\alpha}$, super-linear growth. The sum is dominated by its largest few terms. A single extreme observation can outweigh all others combined. This is the regime of "black swans."

The physical picture: in a Gaussian sum, all terms contribute roughly equally, and the sum is a cooperative effect. In a heavy-tailed sum, the largest term dominates, and the sum is an extremal effect. The stability index $\alpha$ interpolates between these regimes.

## The Landscape of Stable Distributions

No closed-form density exists for general $\alpha$. The only stable distributions with known elementary densities are:

| $\alpha$ | $\beta$ | Distribution | Density |
|---|---|---|---|
| $2$ | $0$ | Gaussian | $\frac{1}{\sqrt{2\pi}\sigma}e^{-x^2/2\sigma^2}$ |
| $1$ | $0$ | Cauchy | $\frac{1}{\pi\gamma(1 + x^2/\gamma^2)}$ |
| $1/2$ | $1$ | L&eacute;vy | $\sqrt{\frac{c}{2\pi}}\frac{e^{-c/2x}}{x^{3/2}}$, $x > 0$ |

For all other $(\alpha, \beta)$ pairs, the density must be computed numerically (via inverse Fourier transform of the known CF). This is a situation where the CF representation is not just convenient but **essential** -- it's the only tractable description.

The skewness parameter $\beta$ controls asymmetry:
- $\beta = 0$: symmetric density
- $\beta = 1$: maximally right-skewed (for $\alpha < 1$, support is $[0, \infty)$)
- $\beta = -1$: maximally left-skewed

## Why This Matters: Beyond the Gaussian

The classical CLT tells a comforting story: average enough observations and you get a Gaussian, regardless of the underlying distribution. But this story has a premise -- finite variance -- that fails in many real-world contexts:

**Finance:** Stock returns have heavy tails. Mandelbrot observed in the 1960s that cotton price changes follow a stable law with $\alpha \approx 1.7$. Gaussian models (Black-Scholes) underestimate the probability of extreme moves. The 2008 financial crisis was a "25-sigma event" under Gaussian assumptions -- essentially impossible -- but unremarkable under a stable model with $\alpha < 2$.

**Network science:** Degree distributions of the internet, social networks, and citation networks follow power laws with various exponents. Sums of heavy-tailed quantities (total traffic, cumulative citations) don't normalize to Gaussians.

**Physics:** Anomalous diffusion -- particles that occasionally take very long jumps -- is modeled by L&eacute;vy flights, whose step-length distribution is stable with $\alpha < 2$. The mean-squared displacement grows as $t^{2/\alpha}$ rather than linearly, violating the assumptions of ordinary Brownian motion.

**Natural language:** Word frequencies follow Zipf's law ($\sim 1/k^\alpha$). Sums of word counts have heavy-tailed behavior that Gaussian models cannot capture.

In all these domains, the generalized CLT explains why stable distributions appear: they are the inevitable limits of sums of heavy-tailed variables, just as the Gaussian is the inevitable limit of sums of light-tailed variables. The stability index $\alpha$ is not a free parameter to be tuned -- it is determined by the tail exponent of the underlying data.

## Connection to the Full Series

The stable distributions bring together every thread from the previous articles:

- **001**: The PDF of a stable distribution ($\alpha \neq 2, 1, 1/2$) cannot be written in closed form. The density exists but has no elementary expression. The object is defined by its CF, not its PDF.

- **002**: Stable distributions with $\alpha < 2$ have infinite variance. The MGF doesn't exist. The moment-based approach to characterizing distributions fails entirely for this family.

- **003**: The CF is the only tool that works universally. The generalized CLT proof requires CF techniques, not moment techniques.

- **004**: The distributional frequency $t$ probes the CF near zero, where $\varphi(t) \approx 1 - c|t|^\alpha$. The exponent $\alpha$ is visible as the local shape of the CF at the origin -- not a curvature (that would be the variance) but a fractional-order singularity.

- **005**: The distributional decay rate is irrelevant for stable distributions with $\alpha < 2$. The MGF's convergence strip collapses to $\{0\}$. The Laplace dual variable sees nothing useful.

- **006**: Stable distributions are infinitely divisible (obviously -- they are defined by closure under summation). Their unitarity properties follow from the CF framework. But they violate the "nice" behavior that Gaussian distributions enjoy: no finite energy spectrum, no rapid spectral decay.

- **007**: The multiplication principle $\varphi_{X+Y} = \varphi_X \cdot \varphi_Y$ is what makes stability a tractable concept. Stability means the $n$-th power of the CF has the same functional form as the CF itself (up to rescaling of the argument).

The Gaussian is not special because it's the most common distribution. It's special because it sits at $\alpha = 2$ -- the boundary of the stable family, the lightest-tailed stable law, the only one with finite variance, and the universal attractor for the largest domain of attraction. Every other stable distribution is, in a precise sense, a generalization of the Gaussian to heavier tails.

---

*Next: [009: The Joint Characteristic Function and Dependence](009_joint-cf-and-dependence.md)*
