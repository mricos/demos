# Eigenvector Math Verification - Finding the 90° Bug

## The Covariance Matrix and Eigenvectors

Given a 2D covariance matrix:
```
Σ = [[covXX,  covXY],
     [covXY,  covYY]]
```

We need eigenvector **v = [vₓ, vᵧ]** such that: **Σv = λv**

## Standard Eigenvector Formula

For eigenvalue λ, the eigenvector satisfies:
```
(Σ - λI)v = 0

[[covXX - λ,  covXY    ], [vₓ] = [0]
 [covXY,      covYY - λ]]  [vᵧ]   [0]
```

From the **first row**:
```
(covXX - λ)vₓ + covXY·vᵧ = 0
vₓ = -covXY·vᵧ / (covXX - λ)
vₓ/vᵧ = -covXY / (covXX - λ)
vₓ/vᵧ = covXY / (λ - covXX)
```

From the **second row**:
```
covXY·vₓ + (covYY - λ)vᵧ = 0
vᵧ = -covXY·vₓ / (covYY - λ)
vᵧ/vₓ = -covXY / (covYY - λ)
vᵧ/vₓ = covXY / (λ - covYY)
```

## Two Valid Formulations

### Option 1: Using first row
```
Eigenvector proportional to: v = [λ - covXX, covXY]
Angle = atan2(covXY, λ - covXX)
```

### Option 2: Using second row
```
Eigenvector proportional to: v = [covXY, λ - covYY]
Angle = atan2(λ - covYY, covXY)
```

## CRITICAL: atan2 Argument Order

**atan2(y, x)** returns the angle of vector **(x, y)** measured counterclockwise from +X axis.

So for vector **v = [vₓ, vᵧ]**:
```
angle = atan2(vᵧ, vₓ)  ← Correct order
```

## Current Code Analysis

Our current code uses:
```javascript
const a = covXX_canvas, b = covXY_canvas;
angle = Math.atan2(b, lambda1 - a);
```

This computes:
```
v = [λ₁ - covXX, covXY]
angle = atan2(covXY, λ₁ - covXX)
```

This means: **vₓ = λ₁ - covXX, vᵧ = covXY**

## Testing with Example Data

Let's trace through "Sepal Length vs Petal Length":

Typical data space values:
- covXX ≈ 0.16 (Sepal Length variance)
- covYY ≈ 0.36 (Petal Length variance)
- covXY ≈ 0.20 (positive covariance - they increase together)

Eigenvalues:
- trace = 0.52
- det = 0.0576 - 0.04 = 0.0176
- discriminant = sqrt(0.0676 - 0.0176) = sqrt(0.05) ≈ 0.224
- λ₁ = 0.26 + 0.224 = 0.484
- λ₂ = 0.26 - 0.224 = 0.036

Eigenvector for λ₁:
```
v = [λ₁ - covXX, covXY]
v = [0.484 - 0.16, 0.20]
v = [0.324, 0.20]

angle = atan2(0.20, 0.324) ≈ 31.6°
```

This should point in the direction of MAXIMUM variance (major axis).

## THE BUG: We Have the Components Swapped!

Looking at eigenvector derivation again:

From **(covXX - λ)vₓ + covXY·vᵧ = 0**:

We can write: **vᵧ = -(covXX - λ)vₓ / covXY**

If we choose **vₓ = covXY**, then:
```
vᵧ = -(covXX - λ) * covXY / covXY
vᵧ = -(covXX - λ)
vᵧ = λ - covXX
```

So eigenvector is: **v = [covXY, λ - covXX]**

**NOT** v = [λ - covXX, covXY]

## The Correct Formula

```javascript
// Eigenvector for λ₁ is [covXY, λ₁ - covXX]
const vx = b;          // covXY
const vy = lambda1 - a; // λ₁ - covXX
angle = Math.atan2(vy, vx);  // atan2(λ₁ - covXX, covXY)
```

Or equivalently:
```javascript
angle = Math.atan2(lambda1 - a, b);
```

## Summary

**Current (WRONG)**: `atan2(b, lambda1 - a)` treats eigenvector as `[λ₁-a, b]`
**Correct**: `atan2(lambda1 - a, b)` treats eigenvector as `[b, λ₁-a]`

We have X and Y components **swapped**, causing a 90° rotation error!

## Alternative: Using the Second Equation

We could also use:
```javascript
const d = covYY_canvas;
angle = Math.atan2(b, lambda1 - d);  // v = [λ₁ - covYY, covXY]
```

But this is less numerically stable when λ₁ ≈ covYY.
