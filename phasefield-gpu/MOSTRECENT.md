
  1. Eliminated Hard Shadows - Added Edge Diffraction 
  (js/engines/webgl-engine.js)

  Problem: The calculateEdgeDiffraction function existed but was never 
  called, causing hard geometric shadows instead of wave-like spreading.

  Solution:
  - Now calling calculateEdgeDiffraction for both edge points of any
  blocking obstacle
  - Uses Huygens-Fresnel principle: edges act as secondary wave sources
  - Amplitude scales with wavelength (longer waves bend more)
  - Strength controlled by diffractionStrength parameter (0-100)

  Result: Waves now fan out beautifully around obstacles, creating soft
  interference patterns instead of sharp shadows.

  2. Enhanced Reflections (js/engines/webgl-engine.js:352-442)

  Changes:
  - Increased base reflection amplitude by 1.5× for visibility
  - Enhanced iridescent dispersion mode (reflCoeff > 1.0):
    - Chromatic shift increased from 50 to 80
    - Added spatial spreading for rainbow effects
    - Edge boost increased from 3× to 5×
  - Reflection now scales with diffractionStrength for artistic control

  Reflection Coefficient Behavior:
  - 0.0: Black body (total absorption)
  - 0.0-1.0: Partial reflection (lower = more absorption)
  - 1.0: Perfect mirror (specular reflection)
  - 1.0-2.0: Iridescent dispersion (creates rainbow spreading at boundaries)

  3. Unified Light Puck Physics (js/lightpuck.js:492-602)

  Changes:
  - Light pucks now respect diffractionStrength parameter
  - Three reflection modes synchronized with wave physics:
    - MODE 1 (reflCoeff ≈ 1.0): Perfect mirror reflection
    - MODE 2 (reflCoeff < 1.0): Diffuse scattering, scales with
  diffractionStrength
    - MODE 3 (reflCoeff > 1.0): Iridescent dispersion, enhanced rainbow
  spreading with diffractionStrength

  Result: Light pucks and waves now behave consistently!

  4. Improved Default Parameters (js/config.js)

  - Increased diffractionStrength default from 50 → 70 for more visible
  effects
  - Increased diffractionLeakage from 0.0001 → 0.001 (10× more baseline
  diffraction)
  - Added clear documentation of parameter ranges

  How to Use:

  Diffraction Strength Slider (0-100):
  - 0: Sharp geometric shadows (ray tracing mode)
  - 50: Balanced wave behavior
  - 70 (new default): Visible artistic diffraction
  - 100: Maximum wave spreading around obstacles

  Reflection Coefficient Slider (0-2.0):
  - 0.0: Black absorber
  - 0.5: Partially reflective surface
  - 1.0: Perfect mirror
  - 1.5+: Rainbow iridescence with color spreading

  What You'll See Now:

  ✅ Waves fan out smoothly around obstacles (no hard shadows)✅ Visible
  interference patterns in shadow regions✅ Reflections are stronger and
  more visible✅ Iridescent mode (reflCoeff > 1.0) creates dramatic color
  spreading✅ Light pucks scatter and disperse consistently with wave
  behavior✅ Aperture effects work on both waves AND light pucks

  The simulation is now both technically accurate (proper Huygens-Fresnel
  diffraction) and artfully beautiful (tunable with diffractionStrength)!

