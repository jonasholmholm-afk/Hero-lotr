// Modal dialogs (promise based) rendered as HTML overlays.
import { el } from '../core/utils.js';

const layer = () => document.getElementById('dialogs');

export function dialog({ title, body, buttons = [{ label: 'OK', value: true }], cls = '', icon = null, closable = true, init = null }) {
  return new Promise((resolve) => {
    const box = el('div.dialog' + (cls ? '.' + cls : ''));
    const back = el('div.dialog-back', box);
    let done = false;
    const close = (v) => { if (done) return; done = true; back.classList.add('closing'); setTimeout(() => back.remove(), 160); resolve(v); };
    if (title) box.append(el('h2.dialog-title', title));
    const content = el('div.dialog-body');
    if (icon) content.append(el('div.dialog-icon', icon));
    if (typeof body === 'string') content.append(el('div.dialog-text', { html: body.replace(/\n/g, '<br>') }));
    else if (body) content.append(body);
    box.append(content);
    const row = el('div.dialog-buttons');
    for (const b of buttons) {
      const btn = el('button.btn' + (b.primary ? '.primary' : '') + (b.danger ? '.danger' : ''), { onclick: () => close(b.value), disabled: b.disabled }, b.label);
      // touch fallback: some browsers drop the click after a canvas held pointer capture
      btn.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch' && !btn.disabled) { e.preventDefault(); setTimeout(() => close(b.value), 0); } });
      row.append(btn);
    }
    box.append(row);
    if (closable) back.addEventListener('click', (e) => { if (e.target === back) close(buttons[buttons.length - 1].value); });
    else back.addEventListener('click', (e) => { if (e.target === back) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); } });
    layer().append(back);
    if (init) init(close);
    requestAnimationFrame(() => back.classList.add('open'));
  });
}
export const info = (title, text, icon) => dialog({ title, body: text, icon });
export const confirm = (title, text, yes = 'Ja', no = 'Nej') => dialog({ title, body: text, buttons: [{ label: yes, value: true, primary: true }, { label: no, value: false }] });
export function choose(title, text, options, icon) {
  return dialog({ title, body: text, icon, buttons: options.map((o, i) => ({ label: o, value: i, primary: i === 0 })) });
}

/** Non-blocking toast message */
let toastTimer = null;
export function toast(text, ms = 2200, cls = '') {
  const t = document.getElementById('toast');
  t.textContent = text; t.className = 'show ' + cls;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, ms);
}

/** Number picker for recruiting etc. Returns chosen n (0 = cancel). */
export function numberPicker({ title, body, max, min = 1, costFn = null, okLabel = 'Hyr' }) {
  return new Promise((resolve) => {
    let n = max;
    const num = el('div.picker-num', String(n));
    const costEl = el('div.picker-cost');
    const slider = el('input', { type: 'range', min: String(min), max: String(max), value: String(n), step: '1' });
    const update = () => { num.textContent = String(n); slider.value = String(n); if (costFn) costEl.innerHTML = costFn(n); };
    slider.addEventListener('input', () => { n = +slider.value; update(); });
    const btn = (lbl, f) => el('button.btn.small', { onclick: () => { n = Math.max(min, Math.min(max, f(n))); update(); } }, lbl);
    const content = el('div.picker', body ? el('div.dialog-text', { html: body }) : null,
      el('div.picker-row', btn('−', (v) => v - 1), num, btn('+', (v) => v + 1), btn('Max', () => max)), slider, costEl);
    update();
    dialog({ title, body: content, buttons: [{ label: okLabel, value: 'ok', primary: true }, { label: 'Annullér', value: null }] }).then((v) => resolve(v === 'ok' ? n : 0));
  });
}
