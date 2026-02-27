# The Joint Characteristic Function and Dependence

*Continues from [008: Stable Distributions and the Generalized Central Limit Theorem](008_stable-distributions-and-generalized-clt.md)*

## From One Variable to Two

Everything in articles 001 through 008 has been univariate: one random variable $X$, one PDF $f_X(x)$, one CF $\varphi_X(t)$. Independence appeared in [007](007_convolution-independence-and-multiplication.md) as a condition on pairs of variables, but we used it as a tool and moved on. We never asked: what does the CF of a pair look like? What structure does dependence have in the frequency domain?

This article develops the **joint characteristic function** -- the multivariate generalization -- and uses it to make the structure of dependence visible.

## The Joint Characteristic Function

For a random vector $(X, Y)$ with joint density $f_{X,Y}(x, y)$, the **joint characteristic function** is:

$$\varphi_{X,Y}(s, t) = E[e^{i(sX + tY)}] = \iint e^{i(sx + ty)} f_{X,Y}(x, y)\,dx\,dy$$

This is the two-dimensional Fourier transform of the joint density. The arguments $s$ and $t$ are the distributional frequencies ([004](004_the-dual-variable-what-t-means.md)) associated with $X$ and $Y$ respectively.

The joint CF is a complex-valued function on $\mathbb{R}^2$. It always exists (bounded kernel, same argument as the univariate case), and it uniquely determines the joint distribution.

For a general random vector $\mathbf{X} = (X_1, \ldots, X_d)$ in $\mathbb{R}^d$:

$$\varphi_{\mathbf{X}}(\mathbf{t}) = E[e^{i\,\mathbf{t}^T\mathbf{X}}] = \int_{\mathbb{R}^d} e^{i\,\mathbf{t}^T\mathbf{x}} f_{\mathbf{X}}(\mathbf{x})\,d\mathbf{x}$$

where $\mathbf{t} = (t_1, \ldots, t_d)$ is a vector of distributional frequencies, one per component.

## Marginals Are Slices

The marginal CF of $X$ is obtained by setting $t = 0$:

$$\varphi_X(s) = \varphi_{X,Y}(s, 0)$$

Similarly, $\varphi_Y(t) = \varphi_{X,Y}(0, t)$.

This is the frequency-domain analog of integrating out a variable: the marginal density $f_X(x) = \int f_{X,Y}(x, y)\,dy$ corresponds to evaluating the joint CF along the $s$-axis. The marginals are **axis-aligned slices** of the joint CF.

Proof: $\varphi_{X,Y}(s, 0) = E[e^{i(sX + 0 \cdot Y)}] = E[e^{isX}] = \varphi_X(s)$.

This relationship is immediate but important: the joint CF contains the marginals as special cases. Any information in the marginals is present in the joint CF, but the joint CF also contains something the marginals lack -- the dependence structure.

## Independence Revisited

In [007](007_convolution-independence-and-multiplication.md) we stated that $X$ and $Y$ are independent if and only if $\varphi_{X,Y}(s, t) = \varphi_X(s) \cdot \varphi_Y(t)$. Let's now see this geometrically.

If $X$ and $Y$ are independent, the joint CF is a **product surface**: its value at any point $(s, t)$ is determined entirely by its values along the two axes. The surface has no "twist" -- knowing the marginals determines the joint.

If $X$ and $Y$ are dependent, the joint CF is **not** a product surface. There exist points $(s, t)$ where $\varphi_{X,Y}(s, t) \neq \varphi_X(s) \cdot \varphi_Y(t)$. The deviation from a product surface is precisely the dependence structure, encoded in the frequency domain.

Define the **dependence residual**:

$$\Delta(s, t) = \varphi_{X,Y}(s, t) - \varphi_X(s) \cdot \varphi_Y(t)$$

This is zero everywhere if and only if $X$ and $Y$ are independent. Its magnitude at each $(s, t)$ measures how much the dependence between $X$ and $Y$ manifests at those particular distributional frequencies.

## Joint Moments and Cross-Derivatives

Just as univariate moments come from derivatives of $\varphi(t)$ at $t = 0$ ([004](004_the-dual-variable-what-t-means.md)), joint moments come from **mixed partial derivatives** of the joint CF at the origin:

$$E[X^j Y^k] = \frac{1}{i^{j+k}} \frac{\partial^{j+k}}{\partial s^j \, \partial t^k} \varphi_{X,Y}(s, t) \bigg|_{s=0,\,t=0}$$

The key cases:

| Derivative | Moment | What it measures |
|---|---|---|
| $\frac{\partial}{\partial s}\varphi\big|_{0,0}$ | $iE[X]$ | mean of $X$ |
| $\frac{\partial}{\partial t}\varphi\big|_{0,0}$ | $iE[Y]$ | mean of $Y$ |
| $\frac{\partial^2}{\partial s^2}\varphi\big|_{0,0}$ | $-E[X^2]$ | second moment of $X$ |
| $\frac{\partial^2}{\partial s\,\partial t}\varphi\big|_{0,0}$ | $-E[XY]$ | **cross-moment** |

The **covariance** is:

$$\text{Cov}(X, Y) = E[XY] - E[X]E[Y] = -\frac{\partial^2 \varphi}{\partial s\,\partial t}\bigg|_{0,0} - \left(\frac{1}{i}\frac{\partial \varphi}{\partial s}\bigg|_{0,0}\right)\left(\frac{1}{i}\frac{\partial \varphi}{\partial t}\bigg|_{0,0}\right)$$

The covariance is determined by the **mixed second derivative** of the joint CF at the origin. This is the second-order term in the dependence structure. It captures linear association, but nothing more.

## Covariance vs. Independence: The Gap

Covariance zero ($\text{Cov}(X, Y) = 0$) means the mixed second derivative of the joint CF at the origin matches the product of the marginal first derivatives. But independence requires the **entire surface** to be a product, not just the second-order behavior at the origin.

The gap is real. Construct $X \sim N(0, 1)$ and $Y = X^2$. Then:

$$\text{Cov}(X, Y) = E[X \cdot X^2] - E[X]E[X^2] = E[X^3] - 0 = 0$$

(since all odd moments of a symmetric distribution vanish). So $X$ and $Y$ are uncorrelated. But $Y$ is a deterministic function of $X$ -- they are maximally dependent.

In the joint CF, this shows up as: $\varphi_{X,Y}(s, t) = E[e^{i(sX + tX^2)}]$, which does not factor as $\varphi_X(s) \cdot \varphi_Y(t)$. The dependence is invisible at second order (the mixed derivative at the origin) but visible at higher orders and away from the origin.

The joint CF captures **all orders of dependence simultaneously**. Covariance is the shadow of dependence seen through a second-order lens. The full CF sees everything.

## The Multivariate Gaussian

The multivariate Gaussian is the one distribution where the second-order shadow is the whole picture. For $\mathbf{X} \sim N(\boldsymbol{\mu}, \Sigma)$ with mean vector $\boldsymbol{\mu} \in \mathbb{R}^d$ and covariance matrix $\Sigma \in \mathbb{R}^{d \times d}$:

$$\varphi_{\mathbf{X}}(\mathbf{t}) = \exp\!\left(i\,\boldsymbol{\mu}^T\mathbf{t} - \frac{1}{2}\mathbf{t}^T\Sigma\,\mathbf{t}\right)$$

This is the exponential of a quadratic form in $\mathbf{t}$. The log-CF is:

$$\ln \varphi = i\,\boldsymbol{\mu}^T\mathbf{t} - \frac{1}{2}\sum_{j,k} \Sigma_{jk}\,t_j t_k$$

No terms beyond second order. The cumulant-generating function is exactly quadratic. This means:

- All cumulants of order $\geq 3$ are zero
- The distribution is completely determined by its first two moments ($\boldsymbol{\mu}$ and $\Sigma$)
- **Uncorrelated implies independent** (because if $\Sigma$ is diagonal, the quadratic form separates: $\mathbf{t}^T\Sigma\,\mathbf{t} = \sum_j \sigma_j^2 t_j^2$, and the joint CF factors into a product of univariate Gaussian CFs)

This last point is unique to the Gaussian. For any other joint distribution, you can be uncorrelated without being independent. The Gaussian is the only distribution whose dependence structure is fully captured by pairwise covariances.

In the bivariate case ($d = 2$):

$$\varphi_{X,Y}(s, t) = \exp\!\left(i(\mu_1 s + \mu_2 t) - \frac{1}{2}(\sigma_1^2 s^2 + 2\rho\sigma_1\sigma_2\,st + \sigma_2^2 t^2)\right)$$

The **correlation coefficient** $\rho$ appears as the coefficient of the cross-term $st$ in the exponent. When $\rho = 0$, the cross-term vanishes, the exponent separates into a function of $s$ alone plus a function of $t$ alone, and the CF factors. When $\rho \neq 0$, the cross-term couples $s$ and $t$, preventing factorization.

The geometry: the level curves of $|\varphi_{X,Y}(s,t)|$ in the $(s,t)$-plane are ellipses. Their orientation is determined by $\rho$. For $\rho = 0$, the ellipses are axis-aligned (the surface is a product). For $\rho \neq 0$, the ellipses are tilted -- the axes of the frequency-domain ellipse are rotated relative to the coordinate axes by an angle determined by $\rho$.

## Joint Cumulants

The joint cumulant-generating function is:

$$\Psi_{X,Y}(s, t) = \ln \varphi_{X,Y}(s, t)$$

Joint cumulants are extracted by mixed partial derivatives:

$$\kappa_{j,k} = \frac{1}{i^{j+k}} \frac{\partial^{j+k}}{\partial s^j\,\partial t^k} \Psi(s, t)\bigg|_{0,0}$$

The first few:

| Cumulant | Value | Meaning |
|---|---|---|
| $\kappa_{1,0}$ | $E[X]$ | mean of $X$ |
| $\kappa_{0,1}$ | $E[Y]$ | mean of $Y$ |
| $\kappa_{2,0}$ | $\text{Var}(X)$ | variance of $X$ |
| $\kappa_{0,2}$ | $\text{Var}(Y)$ | variance of $Y$ |
| $\kappa_{1,1}$ | $\text{Cov}(X,Y)$ | linear dependence |
| $\kappa_{2,1}$ | $E[(X-\mu_X)^2(Y-\mu_Y)]$ | asymmetric 3rd-order dependence |
| $\kappa_{1,2}$ | $E[(X-\mu_X)(Y-\mu_Y)^2]$ | asymmetric 3rd-order dependence |

For the Gaussian, $\kappa_{j,k} = 0$ whenever $j + k \geq 3$. The cumulant structure terminates at second order. For non-Gaussian joint distributions, the higher joint cumulants are nonzero and encode the dependence that covariance misses.

Independence in cumulant language: $X$ and $Y$ are independent if and only if $\kappa_{j,k} = 0$ for all $j \geq 1, k \geq 1$. That is, **all mixed cumulants vanish** -- not just the covariance ($\kappa_{1,1}$), but every cross-term at every order.

## Marginals Don't Determine the Joint

A fundamental fact: knowing $\varphi_X(s)$ and $\varphi_Y(t)$ separately does **not** determine $\varphi_{X,Y}(s, t)$. Many different joint distributions can share the same marginals.

The simplest example: let $X, Y \sim N(0, 1)$ with correlation $\rho$. For any $\rho \in [-1, 1]$, both marginals are $N(0, 1)$. But the joint CF is:

$$\varphi_{X,Y}(s, t) = \exp\!\left(-\frac{1}{2}(s^2 + 2\rho st + t^2)\right)$$

Different $\rho$ values give different joint CFs with identical marginal slices along the axes (since $\varphi_{X,Y}(s, 0) = e^{-s^2/2}$ and $\varphi_{X,Y}(0, t) = e^{-t^2/2}$ regardless of $\rho$).

For non-Gaussian distributions, the gap is even larger. **Copula theory** formalizes this: any set of marginal distributions can be coupled by any copula (dependence structure) to produce a valid joint distribution. The copula is exactly the information in the joint CF that is not determined by the marginals.

In CF language: $\varphi_{X,Y}(s, t)$ decomposes into marginal information (the axis slices) plus dependence information (everything else). The marginals constrain the CF on the axes; the copula fills in the interior of the $(s, t)$-plane.

## Conditional Distributions in the Frequency Domain

The conditional density $f_{Y|X}(y|x) = f_{X,Y}(x,y) / f_X(x)$ doesn't have a clean CF analog -- division in the spatial domain doesn't translate to a simple operation in the frequency domain.

However, the **conditional characteristic function** is well defined:

$$\varphi_{Y|X=x}(t) = E[e^{itY} | X = x] = \int e^{ity}\,f_{Y|X}(y|x)\,dy$$

This is a function of both $t$ (the distributional frequency for $Y$) and $x$ (the conditioning value of $X$). It captures how the spectral content of $Y$ changes as $X$ varies.

For the bivariate Gaussian with correlation $\rho$:

$$Y | X = x \sim N\!\left(\mu_Y + \rho\frac{\sigma_Y}{\sigma_X}(x - \mu_X),\; \sigma_Y^2(1 - \rho^2)\right)$$

The conditional CF is:

$$\varphi_{Y|X=x}(t) = \exp\!\left(i\left[\mu_Y + \rho\frac{\sigma_Y}{\sigma_X}(x - \mu_X)\right]t - \frac{\sigma_Y^2(1-\rho^2)}{2}t^2\right)$$

Two things change with $x$: the **location** (phase) shifts linearly in $x$, and the **scale** (width) shrinks by the factor $\sqrt{1 - \rho^2}$. At $\rho = 0$, conditioning on $X$ has no effect -- the conditional CF equals the marginal CF. At $|\rho| = 1$, the conditional variance vanishes -- $Y$ is a deterministic function of $X$.

## The Multivariate CLT

The CLT generalizes to random vectors. If $\mathbf{X}_1, \mathbf{X}_2, \ldots$ are i.i.d. random vectors in $\mathbb{R}^d$ with mean $\boldsymbol{\mu}$ and covariance matrix $\Sigma$, then:

$$\frac{1}{\sqrt{n}}\sum_{k=1}^n (\mathbf{X}_k - \boldsymbol{\mu}) \stackrel{d}{\to} N(\mathbf{0}, \Sigma)$$

The proof follows the univariate CF argument from [003](003_fourier-vs-laplace-transforms-of-pdfs.md), applied to the joint CF. Expand $\varphi_{\mathbf{X}}(\mathbf{t})$ near $\mathbf{t} = \mathbf{0}$:

$$\varphi_{\mathbf{X}}(\mathbf{t}) = 1 + i\,\boldsymbol{\mu}^T\mathbf{t} - \frac{1}{2}\mathbf{t}^T E[\mathbf{X}\mathbf{X}^T]\,\mathbf{t} + o(\|\mathbf{t}\|^2)$$

After centering and taking the $n$-th power:

$$\left[\varphi_{\mathbf{X}}\!\left(\frac{\mathbf{t}}{\sqrt{n}}\right) e^{-i\boldsymbol{\mu}^T\mathbf{t}/\sqrt{n}}\right]^n \to \exp\!\left(-\frac{1}{2}\mathbf{t}^T\Sigma\,\mathbf{t}\right)$$

The limit is the joint CF of $N(\mathbf{0}, \Sigma)$. The covariance matrix $\Sigma$ of the original distribution passes directly into the limit. The dependence structure survives the CLT -- correlations between components are preserved in the Gaussian limit.

This is a stronger result than applying the univariate CLT to each component separately. The univariate CLT tells you each $\bar{X}_j$ converges to a Gaussian marginal. The multivariate CLT tells you the **joint** distribution of $(\bar{X}_1, \ldots, \bar{X}_d)$ converges to a multivariate Gaussian, preserving the correlation structure.

## Independence Under Transformations

A useful application of the joint CF: determining when functions of random variables are independent.

If $\mathbf{X} \sim N(\mathbf{0}, I_d)$ (i.i.d. standard normal components) and $A$ is an orthogonal matrix ($A^T A = I$), then $\mathbf{Y} = A\mathbf{X}$ also has i.i.d. standard normal components. Proof via the joint CF:

$$\varphi_{\mathbf{Y}}(\mathbf{t}) = E[e^{i\mathbf{t}^T A\mathbf{X}}] = E[e^{i(A^T\mathbf{t})^T\mathbf{X}}] = \varphi_{\mathbf{X}}(A^T\mathbf{t}) = e^{-\|A^T\mathbf{t}\|^2/2} = e^{-\|\mathbf{t}\|^2/2}$$

The last step uses $\|A^T\mathbf{t}\|^2 = \mathbf{t}^T A A^T \mathbf{t} = \mathbf{t}^T\mathbf{t} = \|\mathbf{t}\|^2$ (orthogonality). The joint CF of $\mathbf{Y}$ equals the joint CF of $\mathbf{X}$, which factors as $\prod_j e^{-t_j^2/2}$. So the components of $\mathbf{Y}$ are independent standard normals.

This is the **rotational invariance** of the multivariate standard normal: it's the unique distribution whose joint CF depends only on $\|\mathbf{t}\|$, not on the direction of $\mathbf{t}$. The joint CF is radially symmetric in frequency space.

No other distribution has this property. For any non-Gaussian $\mathbf{X}$ with i.i.d. components, an orthogonal rotation $A\mathbf{X}$ will generically produce dependent components. The Gaussian is special -- a fact that the joint CF makes transparent.

## The Cram&eacute;r-Wold Theorem

A distribution on $\mathbb{R}^d$ is uniquely determined by all its one-dimensional projections. Formally:

**Theorem (Cram&eacute;r-Wold):** Two random vectors $\mathbf{X}$ and $\mathbf{Y}$ in $\mathbb{R}^d$ have the same distribution if and only if $\mathbf{t}^T\mathbf{X} \stackrel{d}{=} \mathbf{t}^T\mathbf{Y}$ for all $\mathbf{t} \in \mathbb{R}^d$.

In CF language: $\varphi_{\mathbf{X}}(\mathbf{t}) = \varphi_{\mathbf{Y}}(\mathbf{t})$ for all $\mathbf{t}$ if and only if $\varphi_{\mathbf{t}^T\mathbf{X}}(1) = \varphi_{\mathbf{t}^T\mathbf{Y}}(1)$ for all $\mathbf{t}$.

The multivariate CF at point $\mathbf{t}$ equals the univariate CF of the projection $\mathbf{t}^T\mathbf{X}$ evaluated at 1. So the joint CF is recoverable from the family of all one-dimensional projections. The $d$-dimensional problem reduces to a family of one-dimensional problems -- one for each direction in $\mathbb{R}^d$.

This is the theoretical foundation of **projection-based methods**: tomographic reconstruction, random projections in machine learning, and the proof strategy of the multivariate CLT (it suffices to show convergence of $\mathbf{t}^T\mathbf{S}_n$ for each fixed $\mathbf{t}$, then invoke Cram&eacute;r-Wold).

## What the Joint CF Reveals That Marginals Cannot

To summarize the hierarchy of information:

| What you know | What it determines | What it misses |
|---|---|---|
| Marginal CFs $\varphi_X(s)$, $\varphi_Y(t)$ | Each variable's full distribution | All dependence |
| Covariance $\text{Cov}(X,Y)$ | Linear association strength | Nonlinear dependence |
| Joint CF $\varphi_{X,Y}(s,t)$ on axes | Marginals (redundant) | Dependence |
| Joint CF $\varphi_{X,Y}(s,t)$ everywhere | **Everything** | Nothing |

The joint CF is the complete object. It encodes:
- Each variable's shape (via axis slices)
- Linear dependence (via the mixed second derivative at the origin)
- All nonlinear dependence (via higher mixed derivatives and off-axis behavior)
- Whether independence holds (via the factorization test)
- The distribution of any linear combination $aX + bY$ (via the slice $\varphi_{X,Y}(as, bs)$ along the line through the origin with slope $b/a$)

The last point connects back to [007](007_convolution-independence-and-multiplication.md): the CF of $Z = aX + bY$ is $\varphi_Z(t) = \varphi_{X,Y}(at, bt)$. This is the joint CF evaluated along a ray in the $(s,t)$-plane. Different linear combinations correspond to different rays. The joint CF on all rays determines the joint CF everywhere (by the Cram&eacute;r-Wold theorem), so the set of all linear combinations determines the joint distribution.

---

*Next: [010: The Characteristic Function as a Complete Invariant](010_the-cf-as-complete-invariant.md)*
