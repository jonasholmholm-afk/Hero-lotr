// Hex grid helpers using "odd-r" horizontal layout (pointy-top hexes,
// odd rows shifted half a hex to the right) – the same layout as HoMM3.
export const BF_W = 13;
export const BF_H = 9;

export function hexKey(x, y) { return y * 64 + x; }
export function fromKey(k) { return [k % 64, Math.floor(k / 64)]; }
export function inField(x, y) { return x >= 0 && y >= 0 && x < BF_W && y < BF_H; }

export function neighbors(x, y) {
  const odd = y & 1;
  const n = odd
    ? [[x + 1, y], [x - 1, y], [x + 1, y - 1], [x, y - 1], [x + 1, y + 1], [x, y + 1]]
    : [[x + 1, y], [x - 1, y], [x, y - 1], [x - 1, y - 1], [x, y + 1], [x - 1, y + 1]];
  return n.filter(([a, b]) => inField(a, b));
}

export function toCube(x, y) {
  const q = x - (y - (y & 1)) / 2;
  const r = y;
  return [q, r, -q - r];
}

export function hexDist(x1, y1, x2, y2) {
  const [aq, ar, as] = toCube(x1, y1);
  const [bq, br, bs] = toCube(x2, y2);
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as - bs));
}

// Pixel centre for hex (x,y) given hex "size" (outer radius) and origin.
export function hexCenter(x, y, size, ox = 0, oy = 0) {
  const w = Math.sqrt(3) * size;
  const px = ox + w * (x + 0.5 * (y & 1)) + w / 2;
  const py = oy + size * 1.5 * y + size;
  return [px, py];
}

export function pixelToHex(px, py, size, ox = 0, oy = 0) {
  // brute-force nearest centre (field is small)
  let best = null, bd = Infinity;
  for (let y = 0; y < BF_H; y++) {
    for (let x = 0; x < BF_W; x++) {
      const [cx, cy] = hexCenter(x, y, size, ox, oy);
      const d = (cx - px) ** 2 + (cy - py) ** 2;
      if (d < bd) { bd = d; best = [x, y]; }
    }
  }
  if (bd > size * size) return null;
  return best;
}

export function hexPolygon(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  return pts;
}
