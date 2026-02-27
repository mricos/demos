# The Characteristic Function as a Complete Invariant

*Continues from [009: The Joint Characteristic Function and Dependence](009_joint-cf-and-dependence.md)*

## The Debt

Throughout this series we have made a claim without proving it: the characteristic function **uniquely determines** the distribution. In [003](003_fourier-vs-laplace-transforms-of-pdfs.md) we stated the inversion formula. In [009](009_joint-cf-and-dependence.md) we said the joint CF "encodes everything." But we never demonstrated that two different distributions cannot share the same CF, nor did we show how to actually recover the density from the CF.

This article pays that debt. We prove the inversion theorem, establish uniqueness, characterize exactly which functions can be CFs (Bochner's theorem), and connect the result to the L&eacute;vy continuity theorem that underwrites all the convergence arguments in [003](003_fourier-vs-laplace-transforms-of-pdfs.md) and [008](008_stable-distributions-and-generalized-clt.md).

## What "Complete Invariant" Means

A **complete invariant** for a class of objects is a mapping that assigns to each object a label such that two objects get the same label if and only if they are equivalent.

For probability distributions, equivalence means having the same CDF (or, for continuous distributions, the same PDF). The CF is a complete invariant if:

1. **Well-defined:** Every distribution has exactly one CF.
2. **Injective:** Different distributions have different CFs.

Property (1) is immediate from the definition $\varphi(t) = E[e^{itX}]$ -- this is a deterministic function of the distribution. Property (2) is the **uniqueness theorem**, and it requires proof.

The moments, by contrast, are **not** a complete invariant. As noted in [002](002_moments-and-the-mgf.md), the lognormal distribution is not determined by its moments -- other distributions share the same moment sequence. Moments are well-defined (when they exist) but not injective.

The MGF, when it exists in a neighborhood of zero, **is** a complete invariant for the distributions that possess it. But it doesn't exist for all distributions, so it fails property (1) on the full class.

The CF is the unique transform that is both universally defined and injective. It is the complete invariant of probability theory.

## The Inversion Theorem

**Theorem (Fourier Inversion):** If $\varphi$ is the characteristic function of a distribution with density $f$, and $\varphi \in L^1(\mathbb{R})$ (i.e., $\int |\varphi(t)|\,dt < \infty$), then:

$$f(x) = \frac{1}{2\pi}\int_{-\infty}^{\infty} e^{-itx}\,\varphi(t)\,dt$$

This is the standard Fourier inversion formula. The density is recovered by an inverse Fourier transform of the CF. The factor $e^{-itx}$ reverses the $e^{+itx}$ in the forward transform (the sign convention of probability theory).

**Proof sketch:** Define the regularized inverse:

$$f_\epsilon(x) = \frac{1}{2\pi}\int_{-\infty}^{\infty} e^{-itx}\,\varphi(t)\,e^{-\epsilon|t|}\,dt$$

The damping factor $e^{-\epsilon|t|}$ ensures absolute convergence. Substituting $\varphi(t) = \int e^{itu}f(u)\,du$:

$$f_\epsilon(x) = \frac{1}{2\pi}\int f(u) \left[\int e^{it(u-x)}\,e^{-\epsilon|t|}\,dt\right] du$$

The inner integral is:

$$\int_{-\infty}^{\infty} e^{it(u-x)} e^{-\epsilon|t|}\,dt = \frac{2\epsilon}{\epsilon^2 + (u-x)^2}$$

This is $2\pi$ times the Cauchy density with scale $\epsilon$, centered at $x$. So:

$$f_\epsilon(x) = \int f(u)\,\frac{1}{\pi}\frac{\epsilon}{\epsilon^2 + (u-x)^2}\,du$$

This is the **Poisson integral** of $f$ -- a convolution of $f$ with the Cauchy kernel. As $\epsilon \to 0$, the Cauchy kernel converges to a delta function, and $f_\epsilon(x) \to f(x)$ at every point where $f$ is continuous.

The proof reveals something beautiful: the Fourier inversion formula is, at heart, an **approximate identity** argument. The regularization parameter $\epsilon$ plays the role of a resolution scale, and the Cauchy kernel is the point-spread function. Taking $\epsilon \to 0$ sharpens the resolution to a point, recovering the density exactly.

## Uniqueness

**Corollary:** If two distributions have the same CF, they have the same distribution.

**Proof:** If $\varphi_X = \varphi_Y$, then the inversion formula gives $f_X(x) = f_Y(x)$ at every continuity point. Since densities are determined up to sets of measure zero, $X$ and $Y$ have the same distribution.

For distributions without densities (discrete, mixed), the uniqueness still holds via a more general version of inversion. The CF determines the CDF $F$ through the **L&eacute;vy inversion formula**:

$$F(b) - F(a) = \lim_{T \to \infty} \frac{1}{2\pi}\int_{-T}^{T} \frac{e^{-ita} - e^{-itb}}{it}\,\varphi(t)\,dt$$

for all continuity points $a < b$ of $F$. This formula works for any distribution -- continuous, discrete, or mixed -- and proves uniqueness in full generality.

## When Is $\varphi \in L^1$?

The simple inversion formula $f(x) = \frac{1}{2\pi}\int e^{-itx}\varphi(t)\,dt$ requires $\varphi \in L^1$ -- the CF must be absolutely integrable. Is this always the case?

No. The CF of a discrete distribution (e.g., the Bernoulli) does not decay to zero and is not in $L^1$. The CF of the uniform distribution is a sinc function, which is in $L^1$. The CF of the Cauchy distribution is $e^{-\gamma|t|}$, which decays exponentially and is in $L^1$.

The condition is:

| Distribution | CF | $\varphi \in L^1$? | Simple inversion works? |
|---|---|---|---|
| Gaussian | $e^{-\sigma^2 t^2/2}$ | yes | yes |
| Cauchy | $e^{-\gamma\|t\|}$ | yes | yes |
| Laplace | $\frac{1}{1+b^2t^2}$ | yes | yes |
| Uniform $[-a,a]$ | $\frac{\sin(at)}{at}$ | yes | yes |
| Bernoulli | $p e^{it} + (1-p)$ | no | no (use L&eacute;vy formula) |
| Lattice | periodic | no | no (use L&eacute;vy formula) |

For all absolutely continuous distributions with bounded density, the CF is in $L^1$ (by the Riemann-Lebesgue lemma applied in reverse). The simple formula covers all the continuous distributions in this series.

## Bochner's Theorem: Which Functions Are CFs?

Not every complex-valued function is a CF. Bochner's theorem characterizes exactly which functions qualify.

**Theorem (Bochner, 1932):** A continuous function $\varphi: \mathbb{R} \to \mathbb{C}$ is the characteristic function of some probability distribution if and only if:

1. $\varphi(0) = 1$ (normalization)
2. $\varphi$ is **positive definite**: for every $n$, every $t_1, \ldots, t_n \in \mathbb{R}$, and every $z_1, \ldots, z_n \in \mathbb{C}$:

$$\sum_{j=1}^{n}\sum_{k=1}^{n} z_j \overline{z_k}\,\varphi(t_j - t_k) \geq 0$$

Positive definiteness is a strong condition. It says that the matrix $[\varphi(t_j - t_k)]_{jk}$ is positive semi-definite for every finite set of points. This rules out many innocent-looking functions from being CFs.

**Example:** Is $\varphi(t) = e^{-|t|^3}$ a valid CF? In [008](008_stable-distributions-and-generalized-clt.md) we noted that $e^{-c|t|^\alpha}$ is positive definite if and only if $\alpha \leq 2$. So $\alpha = 3$ fails: this function, despite being continuous, bounded, equal to 1 at the origin, and decaying to zero, is not positive definite and does not correspond to any probability distribution.

**Example:** Is $\varphi(t) = \max(1 - |t|, 0)$ (a triangle function) a valid CF? Yes -- it equals the CF of the distribution with density $f(x) = \frac{1}{\pi}\frac{1 - \cos x}{x^2}$ (which can be verified by direct computation, or by noting that the triangle function is the convolution of two rectangle functions in the frequency domain, hence the CF of a sum of two independent uniforms, as in [007](007_convolution-independence-and-multiplication.md)).

Bochner's theorem is the CF analog of the question "when is a function a valid PDF?" For PDFs, the conditions are simple: non-negative and integrates to 1. For CFs, the conditions are more subtle: positive definite and normalized. The subtlety reflects the fact that the CF is a more complex object -- it lives in the frequency domain, where the constraints of probability are encoded as algebraic conditions on the Fourier transform rather than pointwise conditions on the function.

## The L&eacute;vy Continuity Theorem

The CLT proofs in [003](003_fourier-vs-laplace-transforms-of-pdfs.md) and [008](008_stable-distributions-and-generalized-clt.md) followed the same pattern: show that $\varphi_{S_n}(t)$ converges pointwise to a limit CF, then conclude that $S_n$ converges in distribution. This step -- from pointwise convergence of CFs to convergence of distributions -- is the **L&eacute;vy continuity theorem**.

**Theorem (L&eacute;vy):** Let $X_1, X_2, \ldots$ be random variables with CFs $\varphi_1, \varphi_2, \ldots$

(a) If $X_n \stackrel{d}{\to} X$, then $\varphi_n(t) \to \varphi_X(t)$ for every $t$.

(b) Conversely, if $\varphi_n(t) \to \psi(t)$ for every $t$, and $\psi$ is **continuous at $t = 0$**, then $\psi$ is a CF of some random variable $X$, and $X_n \stackrel{d}{\to} X$.

Part (a) is straightforward: convergence in distribution implies convergence of expectations of bounded continuous functions, and $e^{itx}$ is bounded and continuous.

Part (b) is the deep direction. It says that pointwise convergence of CFs to a function that is continuous at the origin is sufficient for convergence in distribution. The continuity-at-zero condition is essential -- without it, mass can "escape to infinity" (the sequence of distributions can become diffuse without converging to anything).

**Example of failure without continuity at zero:** Let $X_n \sim N(0, n)$. Then $\varphi_n(t) = e^{-nt^2/2} \to 0$ for every $t \neq 0$, but $\varphi_n(0) = 1$. The "limit" is $\psi(t) = \mathbf{1}_{\{t = 0\}}$, which is discontinuous at $t = 0$. No limit distribution exists -- the mass spreads out to infinity.

The L&eacute;vy continuity theorem is what makes the CF the right tool for limit theorems. It provides a simple, checkable criterion -- pointwise convergence plus continuity at zero -- that is equivalent to distributional convergence. The MGF has no comparable theorem (convergence of MGFs doesn't automatically imply convergence of distributions, even when the limit exists).

## The Hierarchy of Uniqueness

Let's assemble the full picture of which objects determine a distribution:

| Object | Exists for | Determines distribution? | Inversion |
|---|---|---|---|
| PDF $f(x)$ | absolutely continuous | yes, by definition | -- |
| CDF $F(x)$ | all distributions | yes, by definition | -- |
| Moments $\{E[X^n]\}$ | when moments are finite | **sometimes** (Carleman's condition) | Hamburger problem |
| MGF $M(t)$ | light-tailed distributions | **yes**, when it exists in a neighborhood of 0 | inverse Laplace |
| CF $\varphi(t)$ | **all** distributions | **yes**, always | Fourier inversion |

The CF is the only object in this table that is both universally defined and always determines the distribution. This is the precise sense in which it is a **complete invariant**.

## What Completeness Buys You

The practical consequence of completeness: any question about distributions can be translated into a question about CFs, answered there, and translated back. We've done this throughout the series:

- **Is this the same distribution?** Check if the CFs are equal. ([003](003_fourier-vs-laplace-transforms-of-pdfs.md))
- **What's the distribution of the sum?** Multiply the CFs. ([007](007_convolution-independence-and-multiplication.md))
- **Are these variables independent?** Check if the joint CF factors. ([009](009_joint-cf-and-dependence.md))
- **Does this sequence converge?** Check pointwise convergence of CFs. (L&eacute;vy continuity, above)
- **Is this a valid distribution?** Check if the function is positive definite and normalized. (Bochner, above)
- **What are the moments?** Differentiate at the origin. ([004](004_the-dual-variable-what-t-means.md))
- **What's the tail behavior?** Read the stability index from the CF's local shape at zero. ([008](008_stable-distributions-and-generalized-clt.md))

Every question has a CF-domain answer. No other representation supports this full range.

## The Multivariate Case

All the results above extend to $\mathbb{R}^d$.

**Multivariate inversion:** If $\varphi_{\mathbf{X}} \in L^1(\mathbb{R}^d)$:

$$f_{\mathbf{X}}(\mathbf{x}) = \frac{1}{(2\pi)^d}\int_{\mathbb{R}^d} e^{-i\mathbf{t}^T\mathbf{x}}\,\varphi_{\mathbf{X}}(\mathbf{t})\,d\mathbf{t}$$

**Multivariate uniqueness:** Two random vectors with the same joint CF have the same joint distribution.

**Multivariate Bochner:** A continuous function $\varphi: \mathbb{R}^d \to \mathbb{C}$ with $\varphi(\mathbf{0}) = 1$ is the CF of a distribution on $\mathbb{R}^d$ if and only if it is positive definite:

$$\sum_{j,k} z_j \overline{z_k}\,\varphi(\mathbf{t}_j - \mathbf{t}_k) \geq 0$$

for all finite sets $\{\mathbf{t}_j\} \subset \mathbb{R}^d$ and $\{z_j\} \subset \mathbb{C}$.

**Multivariate L&eacute;vy continuity:** Pointwise convergence of joint CFs to a function continuous at $\mathbf{0}$ implies convergence in distribution.

The Cram&eacute;r-Wold theorem from [009](009_joint-cf-and-dependence.md) connects the multivariate and univariate cases: the joint CF is determined by all one-dimensional projections. So multivariate uniqueness follows from univariate uniqueness applied to every projection direction.

## The Analogy to Other Complete Invariants

The CF is not the only complete invariant in mathematics. The concept appears across many fields, and the parallels are instructive:

| Field | Objects | Complete invariant | Incomplete invariant |
|---|---|---|---|
| Probability | distributions | CF | moments |
| Linear algebra | matrices (up to similarity) | Jordan normal form | eigenvalues (without multiplicities) |
| Topology | surfaces | genus + orientability | Euler characteristic alone |
| Group theory | finite abelian groups | list of cyclic factors | order of the group |
| Knot theory | knots | ? (open problem) | Jones polynomial |

In each case, the complete invariant captures all the information needed to distinguish objects, while the incomplete invariant loses something. The CF is probability theory's analog of the Jordan normal form: it encodes everything, at the cost of being a more complex object than the simpler invariants (moments, eigenvalues) that it subsumes.

## The Circle Closes

The series began in [001](001_probability-density-functions.md) with the PDF -- a function $f(x) \geq 0$ that integrates to 1. The PDF is the "native" representation of a distribution, but it has limitations: it doesn't always exist (discrete distributions), it doesn't reveal the distribution's spectral structure, and it makes convolution difficult.

The characteristic function is an alternate representation in the dual domain. It always exists, reveals spectral structure directly, and converts convolution to multiplication. The inversion theorem says these two representations are equivalent: you can go from $f$ to $\varphi$ and back without loss.

But the CF is more than equivalent -- in several respects, it is **superior**:

- It exists for all distributions, not just absolutely continuous ones.
- It makes independence, convolution, and convergence algebraically transparent.
- It supports a simple criterion for distributional convergence (L&eacute;vy continuity) that has no spatial-domain analog.
- It provides a clean characterization of valid distributions (Bochner) that is algebraically checkable.

The PDF tells you what the distribution looks like. The CF tells you what the distribution **is**.

---

*The foundational theory is complete. The remaining articles extend it to new transforms and applications.*

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

---

*Next: [011: The Scale Transform -- Bridging Fourier and Laplace](011_the-scale-transform.md)*
