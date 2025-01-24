import mpmath
import numpy as np

# Set precision
mpmath.mp.dps = 15

# Generate data for the Riemann zeta function along the critical line
t_values = np.linspace(-30, 30, 100)
with open('zeta_data.csv', 'w') as f:
    f.write("t,Re(zeta),Im(zeta)\n")  # Add header
    for t in t_values:
        zeta_value = mpmath.zeta(0.5 + 1j * t)
        f.write(f"{t},{mpmath.re(zeta_value)},{mpmath.im(zeta_value)}\n")
