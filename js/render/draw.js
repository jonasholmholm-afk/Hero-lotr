// Small canvas drawing helpers shared by the procedural art modules.
export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
export function poly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function circle(ctx, x, y, r, fill, stroke, lw = 1) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function ellipse(ctx, x, y, rx, ry, fill, rot = 0, stroke, lw = 1) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function rrect(ctx, x, y, w, h, r, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function line(ctx, x1, y1, x2, y2, stroke, lw = 1, cap = 'round') {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineCap = cap; ctx.stroke();
}
export function lgrad(ctx, x1, y1, x2, y2, stops) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  stops.forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}
export function rgrad(ctx, x, y, r0, r1, stops, x2 = x, y2 = y) {
  const g = ctx.createRadialGradient(x, y, r0, x2, y2, r1);
  stops.forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}
// Colour helpers
export function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
export function shade(h, f) {
  const [r, g, b] = hexToRgb(h).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${r},${g},${b})`;
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
export function lighten(h, f) {
  const [r, g, b] = hexToRgb(h).map((v) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * f))));
  return `rgb(${r},${g},${b})`;
}
// A tiny deterministic hash-random for art variants
export function art_rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 10000) / 10000; };
}

// ---------- Hi-res sprite canvases ----------
// Sprites are rasterised at SPR× resolution and carry their logical size in lw/lh,
// so they stay crisp on high-DPI phones.
export const SPR = 2;
export function mkS(w, h) {
  const c = mk(Math.ceil(w * SPR), Math.ceil(h * SPR));
  c.lw = w; c.lh = h;
  c.getContext('2d').scale(SPR, SPR);
  return c;
}
export function blit(ctx, c, x, y, w = c.lw || c.width, h = c.lh || c.height) {
  ctx.drawImage(c, x, y, w, h);
}
/** Adds a dark outline around the opaque pixels of a sprite canvas (in place). */
export function outline(c, color = 'rgba(10,8,6,0.75)', px = 1) {
  const w = c.width, h = c.height;
  const tmp = mk(w, h); const t = tmp.getContext('2d');
  t.drawImage(c, 0, 0);
  t.globalCompositeOperation = 'source-in'; t.fillStyle = color; t.fillRect(0, 0, w, h);
  const out = mk(w, h); const o = out.getContext('2d');
  const d = px * SPR;
  for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, d], [d, -d], [-d, -d]]) o.drawImage(tmp, dx, dy);
  o.drawImage(c, 0, 0);
  const ctx = c.getContext('2d');
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h); ctx.drawImage(out, 0, 0); ctx.restore();
  return c;
}
/** Overlays a vertical light->shade gradient on the opaque pixels (volume). */
export function shadeSprite(c, top = 'rgba(255,245,220,0.18)', bottom = 'rgba(0,0,20,0.28)') {
  const ctx = c.getContext('2d');
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, top); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
  ctx.restore();
  return c;
}
export function softShadow(ctx, x, y, rx, ry, a = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.6, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
export function glow(ctx, x, y, r, color, a = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
/** Jagged / organic polygon helper: returns points around (cx,cy) with radius r and noise. */
export function blobPts(cx, cy, r, n, rnd, jag = 0.25) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - jag / 2 + rnd() * jag);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}
export function smoothPoly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  const p0 = pts[0], p1 = pts[1];
  ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
