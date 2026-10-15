export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const chebyshev = (x1, y1, x2, y2) => Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
export const key = (x, y) => y * 4096 + x;

export const DIRS8 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
];
export const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function fmt(n) {
  n = Math.round(n);
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// Tiny DOM helper: el('div.class#id', {attrs}, ...children)
export function el(spec, attrs, ...children) {
  const m = spec.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const tag = (m && m[1]) || 'div';
  const node = document.createElement(tag);
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g) || []) {
      if (part[0] === '.') node.classList.add(part.slice(1));
      else node.id = part.slice(1);
    }
  }
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
    }
  } else if (attrs !== undefined && attrs !== null) {
    children.unshift(attrs);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

export function sum(arr, fn = (x) => x) {
  let s = 0;
  for (const a of arr) s += fn(a);
  return s;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function ordinalDay(day) {
  const d = ((day - 1) % 7) + 1;
  const w = Math.floor((day - 1) / 7) % 4 + 1;
  const m = Math.floor((day - 1) / 28) + 1;
  return { d, w, m };
}

export function roman(n) {
  const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
  return s;
}
