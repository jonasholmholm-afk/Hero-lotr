import { RNG } from './rng.js';

// Smooth value noise with fractal layering – used by the map generator and
// by the procedural texture painter.
export class Noise {
  constructor(seed) {
    const r = new RNG(seed);
    const perm = [];
    for (let i = 0; i < 256; i++) perm.push(i);
    r.shuffle(perm);
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
    this.g = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.g[i] = r.next();
  }
  val(ix, iy) {
    return this.g[this.p[(this.p[ix & 255] + iy) & 255]];
  }
  noise(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    let fx = x - x0, fy = y - y0;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = this.val(x0, y0), b = this.val(x0 + 1, y0);
    const c = this.val(x0, y0 + 1), d = this.val(x0 + 1, y0 + 1);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
    let a = 1, f = 1, s = 0, n = 0;
    for (let o = 0; o < oct; o++) {
      s += a * this.noise(x * f, y * f);
      n += a;
      a *= gain;
      f *= lac;
    }
    return s / n;
  }
}
