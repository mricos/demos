# Convolution, Independence, and the Multiplication Principle

*Continues from [006: Interlude -- Reality, Symmetry, and the Uncertainty Principle](006_interlude-reality-symmetry-uncertainty.md)*

## The Central Miracle

In [003](003_fourier-vs-laplace-transforms-of-pdfs.md) we stated in two lines the fact that both the characteristic function and the MGF convert convolution to multiplication. This article unpacks that statement completely. It is arguably the single most useful property of integral transforms, and the reason probability theory, signal processing, and linear systems theory all converge on the same mathematics.

The claim: if $X$ and $Y$ are independent random variables, then the PDF of their sum $Z = X + Y$ is the **convolution** of their individual PDFs:

$$f_Z(z) = (f_X * f_Y)(z) = \int_{-\infty}^{\infty} f_X(u)\,f_Y(z - u)\,du$$

And the characteristic function of the sum is the **product** of the individual CFs:

$$\varphi_Z(t) = \varphi_X(t) \cdot \varphi_Y(t)$$

Convolution in the spatial domain becomes multiplication in the frequency domain. This is a theorem, not a definition. Let's prove it, understand why it works, and see what it buys us.

## Why Sums of Independent Variables Produce Convolutions

Start from the definition of independence. Two continuous random variables $X$ and $Y$ are independent if their joint density factors:

$$f_{X,Y}(x, y) = f_X(x) \cdot f_Y(y)$$

Now let $Z = X + Y$. What is $f_Z(z)$? We need $P(Z \leq z)$, which means summing probability over all pairs $(x, y)$ with $x + y \leq z$:

$$P(Z \leq z) = \iint_{x + y \leq z} f_X(x)\,f_Y(y)\,dx\,dy$$

Substitute $y = z - x$ (for fixed $x$, the constraint $x + y \leq z$ becomes $y \leq z - x$):

$$P(Z \leq z) = \int_{-\infty}^{\infty} f_X(x) \left[\int_{-\infty}^{z - x} f_Y(y)\,dy\right] dx = \int_{-\infty}^{\infty} f_X(x)\,F_Y(z - x)\,dx$$

Differentiate with respect to $z$:

$$f_Z(z) = \int_{-\infty}^{\infty} f_X(x)\,f_Y(z - x)\,dx$$

This is the convolution integral. The key step was factoring the joint density -- this is where **independence** enters. Without independence, the joint density doesn't factor, the integral doesn't separate, and you don't get a convolution. Dependence between $X$ and $Y$ couples them in ways that convolution cannot express.

## The Mechanics of Convolution

The convolution $(f * g)(z) = \int f(x)\,g(z - x)\,dx$ has a physical interpretation: **slide $g$ across $f$ and compute the overlap at each position $z$**.

For each output value $z$:
1. Reverse $g$: form $g(-x)$
2. Shift it to position $z$: form $g(z - x)$
3. Multiply pointwise by $f(x)$
4. Integrate: the total overlap is $f_Z(z)$

This "slide and multiply" operation asks: **in how many ways can $X$ and $Y$ combine to produce $Z = z$?** Each way contributes $f_X(x) \cdot f_Y(z - x)$ (the probability of $X = x$ times the probability of $Y = z - x$), and the integral sums over all such ways. Independence guarantees these contributions multiply.

## Why the Transform Converts It to Multiplication

Now take the characteristic function of $Z$:

$$\varphi_Z(t) = \int e^{itz} f_Z(z)\,dz = \int e^{itz} \left[\int f_X(x)\,f_Y(z - x)\,dx\right] dz$$

Swap the order of integration (justified by Fubini's theorem, since $|e^{itz}| = 1$ and the densities are integrable):

$$= \int f_X(x) \left[\int e^{itz}\,f_Y(z - x)\,dz\right] dx$$

In the inner integral, substitute $w = z - x$, so $z = w + x$ and $dz = dw$:

$$= \int f_X(x) \left[\int e^{it(w + x)}\,f_Y(w)\,dw\right] dx$$

The exponential factors:

$$= \int f_X(x)\,e^{itx} \left[\int e^{itw}\,f_Y(w)\,dw\right] dx$$

The inner integral is $\varphi_Y(t)$, a constant with respect to $x$:

$$= \varphi_Y(t) \int f_X(x)\,e^{itx}\,dx = \varphi_Y(t) \cdot \varphi_X(t)$$

The proof works because $e^{it(x+y)} = e^{itx} \cdot e^{ity}$ -- the exponential converts addition in the exponent to multiplication of factors. This is the **homomorphism property** of the exponential function: it maps the additive group $(\mathbb{R}, +)$ to the multiplicative group $(\mathbb{C} \setminus \{0\}, \times)$. Convolution is the spatial-domain expression of addition; multiplication is the frequency-domain expression. The Fourier transform is the bridge because its kernel is an exponential.

The same proof works verbatim for the MGF (replace $it$ with $t$), provided the MGFs exist. The exponential homomorphism doesn't care whether the exponent is real or imaginary.

## Worked Examples

### Gaussian + Gaussian

Let $X \sim N(\mu_1, \sigma_1^2)$ and $Y \sim N(\mu_2, \sigma_2^2)$, independent.

CFs: $\varphi_X(t) = e^{i\mu_1 t - \sigma_1^2 t^2/2}$, $\varphi_Y(t) = e^{i\mu_2 t - \sigma_2^2 t^2/2}$

Product:

$$\varphi_Z(t) = e^{i(\mu_1 + \mu_2)t - (\sigma_1^2 + \sigma_2^2)t^2/2}$$

This is the CF of $N(\mu_1 + \mu_2, \sigma_1^2 + \sigma_2^2)$. The sum of independent Gaussians is Gaussian, with means adding and variances adding. Computing this by direct convolution of two Gaussian densities requires completing the square in a double integral -- it works but is laborious. The CF route is three lines.

### Uniform + Uniform

Let $X, Y \sim \text{Uniform}[-1, 1]$, independent.

CFs: $\varphi_X(t) = \varphi_Y(t) = \frac{\sin t}{t}$

Product:

$$\varphi_Z(t) = \frac{\sin^2 t}{t^2}$$

This is the CF of the **triangular distribution** on $[-2, 2]$: a tent-shaped density that peaks at 0 and declines linearly to zero at $\pm 2$. The convolution of two rectangles is a triangle -- a fact easily visualized by the "slide and overlap" picture. In the frequency domain, it's just squaring the sinc function.

### Cauchy + Cauchy

Let $X, Y \sim \text{Cauchy}(0, \gamma)$, independent.

CFs: $\varphi_X(t) = \varphi_Y(t) = e^{-\gamma|t|}$

Product:

$$\varphi_Z(t) = e^{-2\gamma|t|}$$

This is the CF of $\text{Cauchy}(0, 2\gamma)$. The sum of two Cauchy variables is still Cauchy, with the scale parameter doubled. This is a **stable distribution**: it reproduces its own form under convolution (up to rescaling). The Gaussian is also stable. The full family of stable distributions is characterized by CFs of the form $\varphi(t) = e^{-c|t|^\alpha}$ for $\alpha \in (0, 2]$, where $\alpha = 2$ is Gaussian and $\alpha = 1$ is Cauchy.

Note: this result is impossible to obtain via the MGF, since the Cauchy has no MGF. The CF is the only tool available.

### Gaussian + Laplace

Let $X \sim N(0, 1)$ and $Y \sim \text{Laplace}(0, 1)$, independent.

CFs: $\varphi_X(t) = e^{-t^2/2}$, $\varphi_Y(t) = \frac{1}{1 + t^2}$

Product:

$$\varphi_Z(t) = \frac{e^{-t^2/2}}{1 + t^2}$$

This CF does not correspond to any named distribution. The sum $Z$ has a density that must be computed by inverse Fourier transform (or numerical convolution). But the CF captures it exactly in closed form -- a compact algebraic expression encoding the full density of a distribution that has no simple spatial-domain formula.

## The Algebra of Independence

The multiplication principle reveals that the characteristic function is an **algebraic homomorphism** from the space of probability distributions (under convolution) to the space of complex-valued functions (under pointwise multiplication):

$$\varphi: (\text{Distributions}, *) \to (\text{Functions}, \times)$$

This is powerful because multiplication is easy and convolution is hard. Specifically:

| Operation | Spatial domain | Frequency domain |
|---|---|---|
| Sum of independents | convolution integral $\int f(x)g(z-x)\,dx$ | pointwise multiplication $\varphi \cdot \psi$ |
| $n$-fold sum | $n$-fold nested integral | $n$-th power $\varphi^n$ |
| Decomposition | deconvolution (ill-posed) | division $\varphi_Z / \varphi_X$ |
| Testing closure | compute convolution, check form | multiply CFs, check form |

The $n$-fold sum is where the power really shows. The PDF of $Z = X_1 + X_2 + \cdots + X_n$ (i.i.d.) requires an $(n-1)$-fold nested convolution integral. In the frequency domain, it's $\varphi_Z(t) = [\varphi_X(t)]^n$ -- exponentiation, a single operation regardless of $n$. This is what makes the CLT proof in [003](003_fourier-vs-laplace-transforms-of-pdfs.md) tractable: you take the $n$-th power and let $n \to \infty$.

## Deconvolution: Division in the Frequency Domain

If $Z = X + Y$ and you know $\varphi_Z$ and $\varphi_X$, can you recover $\varphi_Y$?

$$\varphi_Y(t) = \frac{\varphi_Z(t)}{\varphi_X(t)}$$

In principle, yes -- provided $\varphi_X(t) \neq 0$. This is **deconvolution**, and it's the frequency-domain version of solving $f_Z = f_X * f_Y$ for $f_Y$. In the spatial domain, deconvolution is an ill-posed inverse problem (small errors in $f_Z$ produce large errors in $f_Y$). In the frequency domain, it's just division -- still potentially unstable where $\varphi_X(t) \approx 0$, but algebraically transparent.

This arises in practice when you observe a signal corrupted by noise: $Z = \text{signal} + \text{noise}$. If you know the noise distribution's CF, you can divide it out to recover the signal's CF, then invert. The zeros of $\varphi_X$ are where the noise has completely destroyed information at that frequency -- deconvolution cannot recover it there.

## The Connection to Linear Systems

The convolution theorem is not specific to probability. In signal processing and linear systems theory, the same structure appears:

If $h(t)$ is the impulse response of a linear time-invariant (LTI) system and $x(t)$ is the input, the output is:

$$y(t) = (h * x)(t) = \int h(\tau)\,x(t - \tau)\,d\tau$$

Taking the Fourier transform: $Y(\omega) = H(\omega) \cdot X(\omega)$.

The transfer function $H(\omega)$ plays the same role as the characteristic function: it converts a difficult integral operation (convolution with the impulse response) into simple multiplication (scaling each frequency component independently).

The parallel is exact:

| Probability | Signal processing |
|---|---|
| PDF $f_X(x)$ | input signal $x(t)$ |
| Convolution kernel $f_Y$ | impulse response $h(t)$ |
| Sum PDF $f_Z = f_X * f_Y$ | output $y = h * x$ |
| CF $\varphi(t)$ | spectrum $X(\omega)$ |
| CF multiplication | transfer function multiplication |

In both cases, convolution is the spatial/temporal operation, multiplication is the spectral operation, and the Fourier transform is the bridge. The reason is the same in both cases: the exponential kernel $e^{itx}$ converts sums in the exponent to products of factors.

## Why Independence Is Necessary

The multiplication $\varphi_{X+Y} = \varphi_X \cdot \varphi_Y$ requires independence. What happens without it?

For general (possibly dependent) $X$ and $Y$, the CF of $Z = X + Y$ is:

$$\varphi_Z(t) = E[e^{it(X+Y)}] = E[e^{itX} \cdot e^{itY}]$$

This is the expectation of a **product** of two random variables. Independence means $E[UV] = E[U]\,E[V]$ for any functions $U = g(X)$, $V = h(Y)$. Setting $U = e^{itX}$ and $V = e^{itY}$:

$$\varphi_Z(t) = E[e^{itX}] \cdot E[e^{itY}] = \varphi_X(t) \cdot \varphi_Y(t) \quad \text{(independence)}$$

Without independence, $E[e^{itX} \cdot e^{itY}] \neq E[e^{itX}] \cdot E[e^{itY}]$ in general. The joint CF $\varphi_{X,Y}(s, t) = E[e^{i(sX + tY)}]$ encodes the dependence structure, and evaluating it along $s = t$ gives $\varphi_Z(t)$. But this does not factor into a product of marginal CFs unless $X$ and $Y$ are independent.

The converse is also true and important: if $\varphi_{X,Y}(s, t) = \varphi_X(s) \cdot \varphi_Y(t)$ for all $s, t$, then $X$ and $Y$ **are** independent. The factorization of the joint CF is equivalent to independence. This gives a practical test: to check whether two variables are independent, check whether their joint CF factors.

## The Cumulant View: Multiplication Becomes Addition

In [004](004_the-dual-variable-what-t-means.md) we introduced the cumulant-generating function $\Psi(t) = \ln \varphi(t)$. The multiplication principle becomes even simpler in this representation:

$$\Psi_{X+Y}(t) = \ln[\varphi_X(t) \cdot \varphi_Y(t)] = \ln \varphi_X(t) + \ln \varphi_Y(t) = \Psi_X(t) + \Psi_Y(t)$$

Multiplication of CFs becomes **addition** of cumulant-generating functions. Since $\Psi(t) = \sum \kappa_n (it)^n / n!$, this means:

$$\kappa_n^{(X+Y)} = \kappa_n^{(X)} + \kappa_n^{(Y)}$$

**Cumulants add under independence.** All of them -- not just the mean and variance, but skewness, kurtosis, and every higher cumulant. This is the deepest statement of the multiplication principle: independent contributions to a sum contribute independently to every aspect of shape.

Moments don't have this property. The variance of a sum of independent variables adds ($\sigma_{X+Y}^2 = \sigma_X^2 + \sigma_Y^2$), but the fourth moment does not simply add. The cumulants are precisely the quantities that **do** add, and they are extracted by taking the logarithm of the CF -- which is to say, by working in the frequency domain and then linearizing the multiplicative structure.

## The Infinite Divisibility Connection

A distribution is **infinitely divisible** if, for every positive integer $n$, it can be written as the distribution of a sum of $n$ i.i.d. random variables. In CF language:

$$\varphi(t) = [\varphi_{1/n}(t)]^n \quad \text{for some CF } \varphi_{1/n}$$

This means $\varphi(t)$ has an $n$-th root (in the space of CFs) for every $n$. The Gaussian, Poisson, Cauchy, and Gamma distributions are all infinitely divisible. The uniform and Bernoulli distributions are not.

The L&eacute;vy-Khintchine theorem characterizes all infinitely divisible distributions through their cumulant-generating function:

$$\Psi(t) = i\gamma t + \int_{\mathbb{R}} \left(e^{itx} - 1 - \frac{itx}{1 + x^2}\right) \nu(dx)$$

where $\gamma \in \mathbb{R}$ and $\nu$ is the **L&eacute;vy measure** -- a measure on $\mathbb{R} \setminus \{0\}$ that describes the "rate" of jumps of each size. The entire world of L&eacute;vy processes (Brownian motion, Poisson processes, stable processes, jump-diffusion models in finance) is built on this representation.

The multiplication principle makes this possible: if you can take $n$-th roots of CFs, you can decompose a process into arbitrarily fine independent increments. This is the foundation of continuous-time stochastic processes, and it rests entirely on the convolution-to-multiplication correspondence.

---

*Next: [008: Stable Distributions and the Generalized Central Limit Theorem](008_stable-distributions-and-generalized-clt.md)*
