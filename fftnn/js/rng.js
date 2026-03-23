// Seeded random number generator
class RNG {
  constructor(seed) {
    this.seed = seed >>> 0;
  }

  random() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  randn() {
    const u1 = this.random() || 1e-10;
    const u2 = this.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// Global RNG instance
let rng = null;

function initRng(seed) {
  rng = new RNG(seed);
}

function random() {
  return rng ? rng.random() : Math.random();
}

function randn() {
  return rng ? rng.randn() : 0;
}

export { RNG, initRng, random, randn };
