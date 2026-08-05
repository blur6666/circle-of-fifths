/* Point maths, SVG node builders, and the timing curves. `el`, `text` and
   `textLines` create DOM nodes but hold no state and read no globals beyond
   SVGNS, so they belong with the pure helpers rather than with the scene. */

CF.geometry = (function () {

const { SVGNS, CX, CY } = CF.config;

// ------------------------------------------------------------------ helpers
function pt(r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function el(name, attrs = {}, parent = null) {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

function text(parent, str, attrs = {}) {
  const t = el('text', Object.assign({
    'text-anchor': 'middle',
    'dominant-baseline': 'central'
  }, attrs), parent);
  t.textContent = str;
  return t;
}

// Two-line labels remain a single SVG text node.
function textLines(parent, lines, attrs) {
  const t = text(parent, '', attrs);
  lines.forEach((line, i) => {
    el('tspan', { x: attrs.x, dy: i === 0 ? '-0.55em' : '1.1em' }, t).textContent = line;
  });
  return t;
}

function ringSector(r1, r2, a0, a1) {
  const [x0, y0] = pt(r2, a0), [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r1, a1), [x3, y3] = pt(r1, a0);
  return `M${x0} ${y0} A${r2} ${r2} 0 0 1 ${x1} ${y1} ` +
         `L${x2} ${y2} A${r1} ${r1} 0 0 0 ${x3} ${y3} Z`;
}

function circlePath(r) {
  return `M${CX - r} ${CY} A${r} ${r} 0 1 0 ${CX + r} ${CY} ` +
         `A${r} ${r} 0 1 0 ${CX - r} ${CY} Z`;
}

// ---------------------------------------------------------------- movement
const DUR = 380;    // ms per step
const WHEEL_POWER_DOWN_MS = 1200;

/* Overshoot and settle — the step runs past its mark by about 7% and is pulled back,
   which reads as the wheel dropping into a detent. Standard easeOutBack; c1 is how
   far it overshoots. No ease-in, so a click bites immediately. */
const ease = t => {
  const c1 = 1.45, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// nearest equivalent angle in (-180, 180], so Reset takes the short way home
const norm = a => ((a % 360) + 540) % 360 - 180;

return {
  pt, el, text, textLines, ringSector, circlePath,
  norm, ease, DUR, WHEEL_POWER_DOWN_MS
};

})();
