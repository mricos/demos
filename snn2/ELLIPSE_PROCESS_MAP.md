# Ellipse Drawing Process Map - Variable Transformation Analysis

## STEP 1: Data Generation
**Location**: `data-generator.js` lines 95-141

```
Input: gmmConfig parameters
  - centers[c][d]: class c, dimension d mean
  - spreads[c][d]: class c, dimension d standard deviation
  - separationMultiplier, spreadMultiplier

Process:
1. Generate standard normal samples: z ~ N(0,1)
2. Scale by spreads: sample[d] = z * spreads[c][d]
3. Translate by centers: features[d] = centers[c][d] + sample[d]

Output: data[] array
  - data[i].features[dimX] = x-coordinate in DATA SPACE
  - data[i].features[dimY] = y-coordinate in DATA SPACE
  - data[i].class = 0, 1, or 2
```

## STEP 2: Covariance Computation
**Location**: `statistics.js` lines 15-43 or `synthetic-iris.html` lines 1709-1730

```
Input: data[], classIdx, dimX, dimY

Process:
1. Filter to class: classData = data.filter(d => d.class === classIdx)
2. Compute means in DATA SPACE:
   meanX = Σ(features[dimX]) / n
   meanY = Σ(features[dimY]) / n

3. Compute covariance in DATA SPACE:
   dx = features[dimX] - meanX
   dy = features[dimY] - meanY
   covXX = Σ(dx * dx) / n
   covYY = Σ(dy * dy) / n
   covXY = Σ(dx * dy) / n

Output: { covXX, covYY, covXY, meanX, meanY }
  - All values in DATA SPACE coordinates
  - Covariance matrix: [[covXX, covXY], [covXY, covYY]]
```

## STEP 3: Eigenvalue Decomposition
**Location**: `scatter-plot.js` lines 17-32 or `synthetic-iris.html` lines 1737-1757

```
Input: covXX, covYY, covXY (DATA SPACE)

Covariance Matrix Form:
  Σ = [[a, b],    where a = covXX
       [c, d]]          b = covXY = c (symmetric)
                        d = covYY

Eigenvalues (characteristic equation):
  det(Σ - λI) = 0
  (a - λ)(d - λ) - bc = 0
  λ² - (a+d)λ + (ad - bc) = 0

  trace = a + d
  det = ad - bc
  discriminant = sqrt((trace/2)² - det)

  λ₁ = trace/2 + discriminant  (LARGER eigenvalue)
  λ₂ = trace/2 - discriminant  (smaller eigenvalue)

Eigenvector for λ₁:
  (Σ - λ₁I)v = 0
  [[a - λ₁,  b   ], [v₁] = [0]
   [c,      d - λ₁]]  [v₂]   [0]

  From first row: (a - λ₁)v₁ + b·v₂ = 0

  If b ≈ 0 (no covariance):
    - If a >= d: eigenvector is [1, 0], angle = 0
    - If a < d: eigenvector is [0, 1], angle = π/2

  If b != 0:
    (a - λ₁)v₁ = -b·v₂
    v₁/v₂ = -b/(a - λ₁) = (λ₁ - a)/b

    So eigenvector v = [λ₁ - a, b]  (not normalized)

    Angle = atan2(v₂, v₁) = atan2(b, λ₁ - a)

CURRENT BUG: Code uses atan2(λ₁ - a, b) which treats vector as [b, λ₁ - a]
CORRECT: Should use atan2(b, λ₁ - a) for vector [λ₁ - a, b]

Output:
  - λ₁, λ₂ (DATA SPACE variance along principal axes)
  - angle (DATA SPACE orientation, radians)
```

## STEP 4: Canvas Coordinate Transform
**Location**: `scatter-plot.js` lines 13-15, 38-39

```
Input: meanX, meanY, angle (DATA SPACE)
       minX, maxX, minY, maxY (DATA SPACE ranges)
       w, h, pad (CANVAS dimensions in pixels)

Transform center to CANVAS SPACE:
  cx = pad + ((meanX - minX) / (maxX - minX)) * (w - 2*pad)
  cy = h - pad - ((meanY - minY) / (maxY - minY)) * (h - 2*pad)

  NOTE: Y-axis is INVERTED (canvas y increases downward)

Transform radii to CANVAS SPACE:
  rx = nstd * sqrt(λ₁) * (w - 2*pad) / (maxX - minX)
  ry = nstd * sqrt(λ₂) * (h - 2*pad) / (maxY - minY)

  NOTE: Different scaling for X and Y due to aspect ratio

Adjust angle for inverted Y-axis:
  canvas_angle = -angle

  REASON: Y-axis flip reverses rotation direction
```

## STEP 5: Ellipse Rendering
**Location**: `scatter-plot.js` lines 41-54

```
ctx.save()
ctx.translate(cx, cy)     // Move to ellipse center
ctx.rotate(canvas_angle)   // Rotate coordinate system
ctx.ellipse(0, 0, rx, ry, 0, 0, 2π)  // Draw at origin
ctx.restore()
```

## CRITICAL ISSUE ANALYSIS

### The Bug Chain:
1. **Eigenvector calculation** computes angle in DATA SPACE
2. **Y-axis inversion** happens in canvas transform
3. **Different aspect ratios** for X and Y scaling

### Why Some Plots Are Wrong:

When plotting dimX vs dimY where dimX != dimY:
- The data has covariance computed in DATA SPACE
- The canvas scaling is DIFFERENT for X and Y dimensions
- This creates a DISTORTION in the ellipse shape

Example: Sepal Length (range 4-8) vs Petal Length (range 1-7)
- Data space: covXX ≈ 0.16, covYY ≈ 0.25, covXY ≈ 0.1
- Canvas: X scaled by factor ~200/(8-4) = 50 pixels/unit
- Canvas: Y scaled by factor ~200/(7-1) = 33 pixels/unit
- DIFFERENT SCALES cause angle distortion!

### The Real Problem:

**The eigenvector angle is computed in DATA SPACE, but the ellipse is rendered in CANVAS SPACE with NON-UNIFORM scaling!**

When scales differ between X and Y:
- A vector at angle θ in data space
- Maps to angle θ' in canvas space where θ' ≠ θ
- The current code doesn't account for this!

### Correct Solution:

Option 1: Compute angle AFTER scaling transformation
Option 2: Adjust angle based on scale ratio
Option 3: Apply full covariance transformation in canvas space

Most robust: Transform covariance matrix to canvas space, then compute eigendecomposition
