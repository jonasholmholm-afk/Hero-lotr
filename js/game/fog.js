export function revealAround(s, p, cx, cy, r) {
  const m = s.map;
  for (let y = cy - r; y <= cy + r; y++) {
    if (y < 0 || y >= m.h) continue;
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || x >= m.w) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r) p.fog[y * m.w + x] = 1;
    }
  }
}
export function isRevealed(s, p, x, y) {
  const m = s.map;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
  return p.fog[y * m.w + x] === 1;
}
