import numpy as np
from scipy.special import gamma, zeta
from math import pi, log

def generate_prime_cheby_data():
    """Generate data for pi(x) and psi(x) comparison"""
    def is_prime(n):
        if n < 2: return False
        if n == 2: return True
        if n % 2 == 0: return False
        for i in range(3, int(n**0.5) + 1, 2):
            if n % i == 0: return False
        return True
    
    x = np.linspace(2, 100, 1000)
    pi_x = [sum(1 for i in range(2, int(xi)+1) if is_prime(i)) for xi in x]
    
    # Chebyshev function
    def psi(x):
        result = 0
        n = 2
        while n <= x:
            if is_prime(n):
                power = 1
                while n**power <= x:
                    result += log(n)
                    power += 1
            n += 1
        return result
    
    psi_x = [psi(xi)/log(xi) for xi in x]
    
    np.savetxt('data_prime_cheby.csv', 
               np.column_stack((x, pi_x, psi_x)), 
               delimiter=',', header='x,pi_x,psi_x',
               comments='')

def generate_distribution_data():
    """Generate data for zero spacing and prime gap distributions"""
    spacing = np.linspace(0, 4, 200)
    
    # GUE distribution
    zero_freq = 32/pi**2 * spacing**2 * np.exp(-4*spacing**2/pi)
    
    # Simplified prime gap distribution (log-normal approximation)
    prime_freq = np.exp(-(np.log(spacing) - np.log(log(2)))**2 / (2*0.5**2))
    
    np.savetxt('data_distributions.csv',
               np.column_stack((spacing, zero_freq, prime_freq)),
               delimiter=',', header='spacing,zero_freq,prime_freq',
               comments='')

def generate_Z_function_data():
    """Generate data for Riemann-Siegel Z function"""
    t = np.linspace(0, 50, 1000)
    
    def theta(t):
        return np.angle(np.pi**(-1j*t/2) * gamma(0.25 + 1j*t/2))
    
    # Simplified Z function calculation
    Z_real = np.cos(theta(t))
    Z_imag = np.sin(theta(t))
    
    np.savetxt('data_Z_function.csv',
               np.column_stack((t, Z_real, Z_imag)),
               delimiter=',', header='t,Z_real,Z_imag',
               comments='')

if __name__ == "__main__":
    generate_prime_cheby_data()
    generate_distribution_data()
    generate_Z_function_data()
