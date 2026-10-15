// Generic A* over a grid with 8-way movement.
class Heap {
  constructor() { this.a = []; }
  push(n) {
    const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

/**
 * findPath(w,h, sx,sy, tx,ty, stepCost(fromX,fromY,toX,toY,isDest) -> cost or Infinity)
 * Returns array of [x,y] excluding start, or null. Also each entry carries cost.
 */
export function findPath(w, h, sx, sy, tx, ty, stepCost, maxNodes = 200000) {
  if (sx === tx && sy === ty) return [];
  const idx = (x, y) => y * w + x;
  const g = new Float64Array(w * h).fill(Infinity);
  const from = new Int32Array(w * h).fill(-1);
  const closed = new Uint8Array(w * h);
  const heap = new Heap();
  g[idx(sx, sy)] = 0;
  heap.push({ x: sx, y: sy, f: 0 });
  let n = 0;
  while (heap.size) {
    const cur = heap.pop();
    const ci = idx(cur.x, cur.y);
    if (closed[ci]) continue;
    closed[ci] = 1;
    if (cur.x === tx && cur.y === ty) {
      const path = [];
      let i = ci;
      while (i !== idx(sx, sy)) {
        path.push({ x: i % w, y: Math.floor(i / w), g: g[i] });
        i = from[i];
      }
      return path.reverse();
    }
    if (++n > maxNodes) return null;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const isDest = nx === tx && ny === ty;
      let c = stepCost(cur.x, cur.y, nx, ny, isDest);
      if (!(c < Infinity)) continue;
      if (dx && dy) c *= 1.4142;
      const ng = g[ci] + c;
      if (ng < g[ni]) {
        g[ni] = ng; from[ni] = ci;
        const hx = Math.max(Math.abs(tx - nx), Math.abs(ty - ny));
        heap.push({ x: nx, y: ny, f: ng + hx * 50 });
      }
    }
  }
  return null;
}

/** Dijkstra flood: returns Float64Array of costs from (sx,sy) within budget */
export function floodCosts(w, h, sx, sy, stepCost, budget) {
  const idx = (x, y) => y * w + x;
  const g = new Float64Array(w * h).fill(Infinity);
  const heap = new Heap();
  g[idx(sx, sy)] = 0;
  heap.push({ x: sx, y: sy, f: 0 });
  while (heap.size) {
    const cur = heap.pop();
    const ci = idx(cur.x, cur.y);
    if (cur.f > g[ci]) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      let c = stepCost(cur.x, cur.y, nx, ny, false);
      if (!(c < Infinity)) continue;
      if (dx && dy) c *= 1.4142;
      const ng = g[ci] + c;
      if (ng <= budget && ng < g[idx(nx, ny)]) {
        g[idx(nx, ny)] = ng;
        heap.push({ x: nx, y: ny, f: ng });
      }
    }
  }
  return g;
}
