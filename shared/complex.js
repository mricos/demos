/**
 * shared/complex.js — Complex number arithmetic
 *
 * Extracted from charfun/charfun-base.js. All functions operate on
 * {re, im} objects for consistency.
 *
 * Usage:
 *   import { complexMul, complexPow } from '/shared/complex.js';
 *   const result = complexMul({ re: 1, im: 2 }, { re: 3, im: 4 });
 */

/**
 * Multiply two complex numbers
 * @param {{ re: number, im: number }} a
 * @param {{ re: number, im: number }} b
 * @returns {{ re: number, im: number }}
 */
export function complexMul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

/**
 * Add two complex numbers
 * @param {{ re: number, im: number }} a
 * @param {{ re: number, im: number }} b
 * @returns {{ re: number, im: number }}
 */
export function complexAdd(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

/**
 * Subtract complex numbers (a - b)
 * @param {{ re: number, im: number }} a
 * @param {{ re: number, im: number }} b
 * @returns {{ re: number, im: number }}
 */
export function complexSub(a, b) {
  return { re: a.re - b.re, im: a.im - b.im };
}

/**
 * Raise a complex number to integer power n
 * @param {number} re - Real part
 * @param {number} im - Imaginary part
 * @param {number} n - Integer exponent
 * @returns {{ re: number, im: number }}
 */
export function complexPow(re, im, n) {
  if (n === 0) return { re: 1, im: 0 };
  if (n === 1) return { re, im };
  const mag = Math.sqrt(re * re + im * im);
  if (mag < 1e-15) return { re: 0, im: 0 };
  const ang = Math.atan2(im, re);
  const magN = Math.pow(mag, n);
  return { re: magN * Math.cos(n * ang), im: magN * Math.sin(n * ang) };
}

/**
 * Complex exponential: e^(re + i*im)
 * @param {number} re - Real part
 * @param {number} im - Imaginary part
 * @returns {{ re: number, im: number }}
 */
export function complexExp(re, im) {
  const r = Math.exp(re);
  return { re: r * Math.cos(im), im: r * Math.sin(im) };
}

/**
 * Magnitude (absolute value) of a complex number
 * @param {number} re
 * @param {number} im
 * @returns {number}
 */
export function complexMag(re, im) {
  return Math.sqrt(re * re + im * im);
}

/**
 * Argument (angle) of a complex number
 * @param {number} re
 * @param {number} im
 * @returns {number} Angle in radians
 */
export function complexArg(re, im) {
  return Math.atan2(im, re);
}

/**
 * Complex conjugate
 * @param {{ re: number, im: number }} z
 * @returns {{ re: number, im: number }}
 */
export function complexConj(z) {
  return { re: z.re, im: -z.im };
}

/**
 * Complex division (a / b)
 * @param {{ re: number, im: number }} a
 * @param {{ re: number, im: number }} b
 * @returns {{ re: number, im: number }}
 */
export function complexDiv(a, b) {
  const denom = b.re * b.re + b.im * b.im;
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}
