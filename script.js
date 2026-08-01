/* Draws the circle of fifths into #wheel. Angles start at 12 o'clock and increase clockwise. */

const SVGNS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------- geometry
/* Ring geometry in SVG user units. */
const CX = 500, CY = 500;
const R_HUB   = 100;    // blank centre
const R_DIM   = 178;   // outer edge of the diminished ring
const R_MINOR = 293;   // outer edge of the minor ring
const R_MAJOR = 400;   // outer edge of the major ring
const R_OUT   = R_MAJOR;

// Label positions and sizes derive from their ring widths.
const R_DIM_TEXT   = (R_HUB   + R_DIM)   / 2;
const R_MINOR_TEXT = (R_DIM   + R_MINOR) / 2;
const R_MAJOR_TEXT = (R_MINOR + R_MAJOR) / 2;

// `two` accommodates the enharmonic Gb/F# sector.
const FS_MAJOR = two => (R_MAJOR - R_MINOR) * (two ? 0.35 : 0.54);
const FS_MINOR = two => (R_MINOR - R_DIM)   * (two ? 0.29 : 0.42);
const FS_DIM   = two => (R_DIM   - R_HUB)   * (two ? 0.35 : 0.40);

const SECTOR = 30;          // degrees per key

// ------------------------------------------------------------------- data
// Clockwise from the top. A key naming both `flats` and `sharps` carries both
// spellings and both key signatures. `dim` is the diminished chord of the key (vii°).
const KEYS = [
  { major: 'C',       minor: 'a',       dim: 'B°',        sharps: 0,},
  { major: 'G',       minor: 'e',       dim: 'F#°',       sharps: 1 },
  { major: 'D',       minor: 'b',       dim: 'C#°',       sharps: 2 },
  { major: 'A',       minor: 'f#',      dim: 'G#°',       sharps: 3 },
  { major: 'E',       minor: 'c#',      dim: 'D#°',       sharps: 4 },
  { major: 'B',       minor: 'g#',      dim: 'A#°',       sharps: 5 },
  { major: 'Gb/F#',   minor: 'eb/d#',   dim: 'F°/E#°',    flats: 6, sharps: 6 },
  { major: 'Db',      minor: 'bb',      dim: 'C°',        flats: 5 },
  { major: 'Ab',      minor: 'f',       dim: 'G°',        flats: 4 },
  { major: 'Eb',      minor: 'c',       dim: 'D°',        flats: 3 },
  { major: 'Bb',      minor: 'g',       dim: 'A°',        flats: 2 },
  { major: 'F',       minor: 'd',       dim: 'E°',        flats: 1 }
];

// ----------------------------------------------------------------- colour
// SVG presentation attributes need resolved colour values rather than CSS variables.
const hue = i => (45 + i * 30) % 360;

const fillDim = i => `oklch(0.26 0.05 ${hue(i)})`;
const fillMin = i => `oklch(0.305 0.075 ${hue(i)})`;
const fillMaj = i => `oklch(0.37 0.1 ${hue(i)})`;

const textMaj = i => `oklch(0.95 0.15 ${hue(i)})`;
const textMin = i => `oklch(0.93 0.13 ${hue(i)})`;
const textDim = i => `oklch(0.91 0.11 ${hue(i)})`;

const C_STAGE   = '#0a0b0f';   // the dark behind everything; also every seam
const C_DISC    = '#141720';   // under the sectors, so the seams read as gaps
const C_HUB     = '#0a0b0f';
const C_HUB_RIM = '#3a4058';
const C_HUB_SUB = '#aab0c4';   // on a near-black hub, the study's #6b7183 vanished
const SEAM_W    = 2.6;

const twoNames = s => s.includes('/');

// -------------------------------------------------------------- spotlight
// Spotlight tuning.
const SCRIM_ALPHA = 0.31;
const SPOT_BLUR   = 0;      // feGaussianBlur, in user units
const SPOT_SAT    = 0.90;   // saturation kept outside the window
const C_MASK_EDGE = '#f5f6ff';
const MASK_EDGE_A = 1;
const MASK_EDGE_W = 5.2;    // the window's hairline, in user units
const C_MASK_GLOW = 'rgba(160,125,255,.92)';
const MASK_GLOW_R = 24;

// Degrees sit in the leading outer corner of each mask cell.
const DEGREE_LABELS = [
  ['IV',   R_MAJOR - 30, -40, 26], ['I',   R_MAJOR - 30, -10, 26], ['V',   R_MAJOR - 30, 20, 26],
  ['ii',   R_MINOR - 20, -40, 26], ['vi',  R_MINOR - 20, -10, 26], ['iii', R_MINOR - 20, 20, 26],
  ['vii°', R_DIM - 13, -4, 16]
];

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

// ------------------------------------------------------- key signature PNGs
/* The signature ring uses pre-rendered staff images. */
const STAFF_DIR = 'staves';

// Staff scale, measured in staff-line gaps.
const STAFF_S   = 13;
const STAFF_GAP = 8;    // clearance between the disc edge and the staff block

/* Keep the staff images from outshouting the key names. */
const STAFF_OPACITY = 0.8;

/* Staff image dimensions in staff-line gaps. Slack makes height constrain scaling
   so every image keeps the same staff-line spacing. */
const STAFF_H      = 7.62;
const STAFF_W0     = 5.50;
const STAFF_W_STEP = { sharp: 1.094, flat: 0.900 };
const STAFF_SLACK  = 1.02;

const staffW = (kind, n, both) => staffBoxW(kind, n, both) * STAFF_SLACK;

// The enharmonic sector uses one combined staff image.
const staffSrc = (kind, n, both) =>
  both               ? `${STAFF_DIR}/hybrid-${both[0]}-${both[1]}.png`
  : n === 0          ? `${STAFF_DIR}/none.png`
                     : `${STAFF_DIR}/${kind}s-${n}.png`;

/* Clef plus lead-in, in staff-line gaps — the part the spliced-on second half does
   not repeat. */
const STAFF_CLEF = 4.29;

/* Which staff a sector carries. Most name one or the other — a missing property means
   zero, which is C. `Gb/F#` names both, and takes the hybrid: `both` is [flats,
   sharps] and the kind/count fall back to the flat half for anything that needs one
   value. */
const isDual = k => k.flats != null && k.sharps != null;

const staffPart = k => isDual(k)
  ? ['flat', k.flats, [k.flats, k.sharps]]
  : [k.sharps ? 'sharp' : 'flat', k.sharps || k.flats || 0, null];

/* Width in gaps. The hybrid is the flat staff plus the sharp staff minus the clef the
   second half drops. */
const staffBoxW = (kind, n, both) => both
  ? (STAFF_W0 + both[0] * STAFF_W_STEP.flat)
    + (STAFF_W0 + both[1] * STAFF_W_STEP.sharp) - STAFF_CLEF
  : STAFF_W0 + n * STAFF_W_STEP[kind];

/* The order accidentals are added in — which is also the order they are written on
   the staff, so the first n of these are exactly what the picture shows. */
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/* What the staff says, in words: "E major — 4 sharps: F# C# G# D#". Goes in a
   <title>, which Chrome shows on hover and screen readers announce, so the one
   element covers both. Worth having: the staves render around 22px tall, too small
   to count accidentals at a glance. */
const accidentals = (kind, n) =>
  (kind === 'sharp' ? SHARP_ORDER : FLAT_ORDER)
    .slice(0, n).map(note => note + (kind === 'sharp' ? '#' : 'b')).join(' ');

const spelt = (kind, n) => `${n} ${kind}${n > 1 ? 's' : ''}: ${accidentals(kind, n)}`;

function staffTitle(k, kind, n, both) {
  // the hybrid holds two signatures, so it names both — "Gb/F#" splits to match
  if (both) {
    const [flatName, sharpName] = k.major.split('/');
    return `${flatName} major — ${spelt('flat', both[0])}`
         + `   ·   ${sharpName} major — ${spelt('sharp', both[1])}`;
  }
  if (n === 0) return `${k.major} major — no sharps or flats`;
  return `${k.major} major — ${spelt(kind, n)}`;
}

/* Where each staff sits, worked out up front so the viewBox can be framed around
   them before anything is drawn.

   The staves stay upright while the rim curves away under them, so the same block
   covers a different amount of radius depending where it sits: at 12 o'clock only
   its height points outward, at 3 o'clock its full width does. Placing every centre
   on one circle would therefore shove the wide ones (7 sharps) far back over the
   major ring and into its label. Instead each one is pushed out by half its own
   reach, so all twelve *start* at the same radius and hang outward as far as they
   individually need. The outer boundary comes out ragged; that is fine, it is on
   black, and it is the ragged edge that lets every staff be the same size. */
/* Top-left corner of a block of this size sitting at this angle. Called again for
   every staff on every frame the wheel turns: a block keeps its size and its
   upright-ness as it travels, so the radius that clears the rim is a function of
   where it currently is, not of where it started. Pinning each one to its resting
   radius instead would drive the wide ones 76 units into the disc by the time they
   reached 3 o'clock; pushing every one out by its diagonal so it clears at any
   angle would cost 15% of the disc's size, permanently, to buy clearance that only
   matters mid-turn. So it is recomputed, and at rest this is exactly the old
   layout. Mid-turn the wide ones swing out past the viewBox — see #wheel's
   overflow in style.css. */
function staffAt(w, h, deg) {
  const th = deg * Math.PI / 180;
  const reach = w * Math.abs(Math.sin(th)) + h * Math.abs(Math.cos(th));
  const [cx, cy] = pt(R_OUT + STAFF_GAP + reach / 2, deg);
  return [cx - w / 2, cy - h / 2];
}

const STAVES = KEYS.map((k, i) => {
  const [kind, n, both] = staffPart(k);
  const deg = i * SECTOR;
  const w = staffW(kind, n, both) * STAFF_S, h = STAFF_H * STAFF_S;
  const [x, y] = staffAt(w, h, deg);
  return { kind, n, both, w, h, deg, x, y,
           title: staffTitle(k, kind, n, both) };
});

/* How far the drawing actually reaches **at rest** — the disc, or the corner of
   whichever staff sticks out furthest. Corners matter: a block at 12 o'clock is
   pushed out by its height but is wider than it is tall, so its corners beat its
   centre line. Turning the wheel can push a wide staff 12% further out than this,
   sideways only (vertically the resting frame is never beaten); that is why the
   element does not clip its overflow rather than why this number is bigger. */
const R_RIM = STAVES.reduce((m, s) => Math.max(m,
    Math.hypot(Math.max(Math.abs(s.x - CX), Math.abs(s.x + s.w - CX)),
               Math.max(Math.abs(s.y - CY), Math.abs(s.y + s.h - CY)))), R_OUT);

/* One key signature. `pointer-events: all` so the whole box is hoverable rather
   than just the inked pixels — the target is small enough as it is. */
function staffImage(parent, s) {
  const img = el('image', {
    href: staffSrc(s.kind, s.n, s.both),
    x: s.x, y: s.y, width: s.w, height: s.h,
    preserveAspectRatio: 'xMidYMid meet',
    opacity: STAFF_OPACITY,
    class: 'staff',
    style: 'pointer-events: all'
  }, parent);
  el('title', {}, img).textContent = s.title;
  return img;
}

// -------------------------------------------------------------------- mask
/* The window, drawn over sector 0 (straight up); the whole group is rotated to
   move it. Wide part = 3 sectors, from the minor ring out; narrow part = 1
   sector, over the diminished ring only.

   It stops at the disc edge, and deliberately takes no account of the staves hanging
   outside it — they are never dimmed, blurred or lit by the spotlight, whichever key
   is selected. R_RIM is only used to frame the viewBox. */
function windowPath() {
  const w = SECTOR * 1.5;   // 45° — half-width of the 3-cell part
  const n = SECTOR * 0.5;   // 15° — half-width of the 1-cell part
  const [ax, ay] = pt(R_OUT, -w), [bx, by] = pt(R_OUT, w);
  const [cx, cy] = pt(R_DIM,  w), [dx, dy] = pt(R_DIM,  n);
  const [ex, ey] = pt(R_HUB,  n), [fx, fy] = pt(R_HUB, -n);
  const [gx, gy] = pt(R_DIM, -n), [hx, hy] = pt(R_DIM, -w);
  return `M${ax} ${ay} A${R_OUT} ${R_OUT} 0 0 1 ${bx} ${by}` +
         ` L${cx} ${cy} A${R_DIM} ${R_DIM} 0 0 0 ${dx} ${dy}` +
         ` L${ex} ${ey} A${R_HUB} ${R_HUB} 0 0 0 ${fx} ${fy}` +
         ` L${gx} ${gy} A${R_DIM} ${R_DIM} 0 0 0 ${hx} ${hy} Z`;
}

/* Three layers, all keyed to the same window shape:
   - a blurred, desaturated copy of the disc, clipped to everything *outside* it
   - the scrim, which dims that same region towards the stage colour
   - the window edge itself, a near-white hairline with a violet bloom.
   The blurred copy is a <use> of the sharp disc underneath, so where the clip
   cuts it away the original shows through untouched. Clipping happens after
   filtering, which is what keeps the window edge crisp. */
function buildSpotlight(svg, defs) {
  const win     = windowPath();
  const outside = `${circlePath(R_OUT)} ${circlePath(R_HUB)} ${win}`;

  const clip  = el('clipPath', { id: 'spot-outside', clipPathUnits: 'userSpaceOnUse' }, defs);
  const shape = el('path', { d: outside, 'clip-rule': 'evenodd' }, clip);

  const filter = el('filter', {
    id: 'spot-veil', x: '-4%', y: '-4%', width: '108%', height: '108%',
    'color-interpolation-filters': 'sRGB'
  }, defs);
  // skipped entirely at 0 rather than left as a no-op primitive, so the filter is
  // a pure colour pass and nothing gets resampled
  if (SPOT_BLUR > 0) el('feGaussianBlur', { stdDeviation: SPOT_BLUR }, filter);
  el('feColorMatrix', { type: 'saturate', values: SPOT_SAT }, filter);

  // Purely decorative overlays, both of them. pointer-events off so they can't
  // swallow hover from the disc underneath — and so the veil's duplicate <title>
  // elements, copied wholesale out of #disc, can never fire a second tooltip.
  el('use', {
    href: '#disc',
    'clip-path': 'url(#spot-outside)',
    filter: 'url(#spot-veil)',
    style: 'pointer-events: none'
  }, svg);

  const g = el('g', { id: 'mask', style: 'pointer-events: none' }, svg);
  el('path', {
    d: outside, 'fill-rule': 'evenodd', fill: C_STAGE, opacity: SCRIM_ALPHA
  }, g);
  const degreeNodes = DEGREE_LABELS.map(([label, radius, angle, size]) => {
    const [x, y] = pt(radius, angle);
    return { node: text(g, label, {
      x, y, class: 'degree-label', fill: C_MASK_EDGE, 'font-size': size, opacity: 0.9
    }), x, y };
  });
  /* The "you can turn this" cue for mask mode: the same window outline, drawn fat
     and invisible underneath the real one, pulsed by JS when body.armed-mask is
     set. A separate element rather than an animation on the edge itself, so the
     edge keeps its colour and bloom as JS constants. */
  const armGlow = el('path', {
    d: win, class: 'arm-glow', fill: 'none', stroke: C_MASK_EDGE,
    'stroke-width': MASK_EDGE_W * 2.4, 'stroke-linejoin': 'round', opacity: 0
  }, g);
  el('path', {
    d: win, fill: 'none', stroke: C_MASK_EDGE,
    'stroke-width': MASK_EDGE_W, 'stroke-linejoin': 'round', opacity: MASK_EDGE_A,
    style: `filter: drop-shadow(0 0 ${MASK_GLOW_R}px ${C_MASK_GLOW})`
  }, g);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pulse = null;

  return {
    /* The mask is placed with the SVG rotate(angle cx cy) attribute rather than a
       CSS transform: with the viewBox offset away from the origin, transform-box/
       transform-origin put the pivot in the wrong place. The clip shape has to
       turn with it, so both get the same transform. */
    setAngle(a) {
      const t = `rotate(${a} ${CX} ${CY})`;
      g.setAttribute('transform', t);
      shape.setAttribute('transform', t);
      for (const { node, x, y } of degreeNodes) {
        node.setAttribute('transform', `rotate(${-a} ${x} ${y})`);
      }
    },
    setArmed(armed) {
      if (!armed) {
        if (pulse) clearInterval(pulse);
        pulse = null;
        armGlow.style.opacity = '0';
        return;
      }
      if (prefersReducedMotion) {
        if (pulse) clearInterval(pulse);
        pulse = null;
        armGlow.style.opacity = '0.45';
        return;
      }
      if (pulse) return;
      let on = true;
      armGlow.style.opacity = '0.12';
      pulse = setInterval(() => {
        on = !on;
        armGlow.style.opacity = on ? '0.95' : '0.12';
      }, 700);
    }
  };
}

// --------------------------------------------------------------------- hub
/* The centre reads out whichever key the window is sitting on. */
function sigText(k) {
  const parts = [];
  if (k.flats)  parts.push(k.flats + 'b');
  if (k.sharps) parts.push(k.sharps + '#');
  return parts.join('  /  ') || 'no # or b';
}

function buildHub(svg) {
  const g = el('g', { id: 'hub' }, svg);
  el('circle', {
    cx: CX, cy: CY, r: R_HUB,
    fill: C_HUB, stroke: C_HUB_RIM, 'stroke-width': 2.1
  }, g);
  const name = text(g, '', { x: CX, y: CY - 16, class: 'hub-key' });
  const sig  = text(g, '', { x: CX, y: CY + 30, class: 'hub-sig', 'font-size': 22, fill: C_HUB_SUB });

  return i => {
    const k = KEYS[i];
    name.textContent = k.major;
    name.setAttribute('font-size', twoNames(k.major) ? 30 : 58);
    name.setAttribute('fill', textMaj(i));
    sig.textContent = sigText(k);
  };
}

// ------------------------------------------------------------------- render
function draw() {
  const svg = document.getElementById('wheel');

  // frame the viewBox to whatever reaches furthest — the disc, or the staves
  // hanging off it
  const pad = R_RIM + 12;
  svg.setAttribute('viewBox', `${CX - pad} ${CY - pad} ${pad * 2} ${pad * 2}`);

  const defs = el('defs', {}, svg);

  // everything the spotlight acts on lives in #disc, so it can be re-used blurred
  const disc    = el('g', { id: 'disc' }, svg);
  const bg      = el('g', {}, disc);
  const strokes = el('g', {}, disc);
  const labels  = el('g', {}, disc);

  el('circle', { cx: CX, cy: CY, r: R_OUT, fill: C_DISC }, bg);

  /* Everything that must not turn over when the wheel does, with the point it
     pivots about — its own anchor, not the centre. #disc gets rotate(a) and each of
     these gets rotate(-a) about itself, so it travels round the circle but stays
     the right way up. See setDisc() in wireControls. */
  const uprights = [];
  const upright = (node, ax, ay) => uprights.push({ node, ax, ay });

  KEYS.forEach((k, i) => {
    const mid = i * SECTOR;
    const a0 = mid - SECTOR / 2, a1 = mid + SECTOR / 2;

    // ring backgrounds
    el('path', { d: ringSector(R_MINOR, R_MAJOR, a0, a1), fill: fillMaj(i) }, bg);
    el('path', { d: ringSector(R_DIM,   R_MINOR, a0, a1), fill: fillMin(i) }, bg);
    el('path', { d: ringSector(R_HUB,   R_DIM,   a0, a1), fill: fillDim(i) }, bg);

    // divider between this sector and the next — a seam of stage colour
    const [dx0, dy0] = pt(R_HUB, a1), [dx1, dy1] = pt(R_OUT, a1);
    el('line', {
      x1: dx0, y1: dy0, x2: dx1, y2: dy1,
      stroke: C_STAGE, 'stroke-width': SEAM_W
    }, strokes);

    // --- diminished (innermost), minor, then major names
    const [dmx, dmy] = pt(R_DIM_TEXT, mid);
    const dimAttrs = {
      x: dmx, y: dmy, class: 'dim-label',
      'font-size': FS_DIM(twoNames(k.dim)), fill: textDim(i)
    };
    // the diminished ring is the narrowest band, so a dual name stacks rather than
    // running "F°/E#°" across it and colliding with the seams
    upright(twoNames(k.dim) ? textLines(labels, k.dim.split('/'), dimAttrs)
                            : text(labels, k.dim, dimAttrs), dmx, dmy);

    const [mnx, mny] = pt(R_MINOR_TEXT, mid);
    upright(text(labels, k.minor, {
      x: mnx, y: mny, class: 'minor-label',
      'font-size': FS_MINOR(twoNames(k.minor)), fill: textMin(i)
    }), mnx, mny);

    const [mjx, mjy] = pt(R_MAJOR_TEXT, mid);
    upright(text(labels, k.major, {
      x: mjx, y: mjy, class: 'major-label',
      'font-size': FS_MAJOR(twoNames(k.major)), fill: textMaj(i)
    }), mjx, mjy);

  });

  // ring boundaries, as seams rather than lines
  [R_DIM, R_MINOR, R_MAJOR].forEach(r => {
    el('circle', {
      cx: CX, cy: CY, r, fill: 'none', stroke: C_STAGE, 'stroke-width': SEAM_W
    }, strokes);
  });

  /* The key signatures, hung off the rim rather than boxed into a ring. They sit
     *outside* #disc, in the fixed frame: they were never touched by the spotlight
     anyway (the clip and the scrim both stop at R_OUT), and when the wheel turns
     they have to move along their own path rather than simply ride round with it —
     see staffAt. Being out of #disc also stops the blurred veil making a clipped-
     away duplicate of all twelve. */
  const stavesG = el('g', { id: 'staves' }, svg);
  STAVES.forEach(s => { s.node = staffImage(stavesG, s); });

  const placeStaves = a => {
    for (const s of STAVES) {
      const [x, y] = staffAt(s.w, s.h, s.deg + a);
      s.node.setAttribute('x', x);
      s.node.setAttribute('y', y);
    }
  };

  // the spotlight sits on top of the disc; the hub reads out over the lot
  const spot = buildSpotlight(svg, defs);

  /* The "you can turn this" cue for wheel mode — marching ants just inside the rim,
     pulsed and crawled by CSS when body.armed-wheel is set. Outside #disc so the
     spotlight leaves it alone and it isn't copied into the blurred veil, and after
     it so the scrim doesn't dim the two thirds of it that fall outside the window. */
  el('circle', {
    id: 'arm-ring', cx: CX, cy: CY, r: R_OUT - 7,
    fill: 'none', stroke: C_MASK_EDGE, 'stroke-width': 3,
    'stroke-dasharray': '10 14', opacity: 0, style: 'pointer-events: none'
  }, svg);

  wireControls(spot, buildHub(svg), disc, uprights, placeStaves);
}

// ---------------------------------------------------------------- controls
/* Two things can turn: the window (`mask`) or the disc under it (`wheel`). The
   checkbox chooses one; Reset puts both angles back to zero.

   Both angles are unbounded: they accumulate, so you can keep going round in either
   direction forever and 390° is a different number from 30° even though it draws the
   same. Only Reset normalises, so that "home" is one short spin away rather than
   thirteen. */
const DUR = 380;    // ms per step

/* Overshoot and settle — the step runs past its mark by about 7% and is pulled back,
   which reads as the wheel dropping into a detent. Standard easeOutBack; c1 is how
   far it overshoots. No ease-in, so a click bites immediately. */
const ease = t => {
  const c1 = 1.45, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// nearest equivalent angle in (-180, 180], so Reset takes the short way home
const norm = a => ((a % 360) + 540) % 360 - 180;

function wireControls(spot, showKey, disc, uprights, placeStaves) {
  const target = { mask: 0, wheel: 0 };   // where each layer is headed
  const drawn  = { mask: 0, wheel: 0 };   // where each layer actually is
  let raf  = null;
  let mode = null;                        // null | 'mask' | 'wheel'

  const hint  = document.getElementById('hint');
  const moveMask = document.getElementById('move-mask');
  const steps = [...document.querySelectorAll('[data-step]')];

  const HINTS = {
    mask:    'The arrows turn the mask',
    wheel:   'The arrows turn the wheel'
  };

  /* The disc turns; every label on it turns back about its own anchor by the same
     amount, so it rides round the circle without going over on its head. The staves
     aren't on the disc at all — they are walked round separately, because each has
     to find its own radius as it goes. */
  function setWheel(a) {
    disc.setAttribute('transform', `rotate(${a} ${CX} ${CY})`);
    const back = -a;
    for (const u of uprights) {
      u.node.setAttribute('transform', `rotate(${back} ${u.ax} ${u.ay})`);
    }
    placeStaves(a);
  }

  // which key the window is sitting over, once both layers are counted
  const keyIndex = () =>
    ((Math.round((target.mask - target.wheel) / SECTOR) % KEYS.length) + KEYS.length)
      % KEYS.length;

  function glide() {
    if (raf) cancelAnimationFrame(raf);
    const from = { ...drawn };
    const to   = { ...target };
    const movesMask  = from.mask  !== to.mask;
    const movesWheel = from.wheel !== to.wheel;
    if (!movesMask && !movesWheel) return;

    const t0 = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - t0) / DUR);
      const e = t === 1 ? 1 : ease(t);
      drawn.mask  = from.mask  + (to.mask  - from.mask)  * e;
      drawn.wheel = from.wheel + (to.wheel - from.wheel) * e;
      if (movesMask)  spot.setAngle(drawn.mask);
      if (movesWheel) setWheel(drawn.wheel);
      if (t < 1) raf = requestAnimationFrame(tick);
      else raf = null;
    };
    raf = requestAnimationFrame(tick);
  }

  /* Arming is shown in three places at once, because the whole point is that the
     next move should be obvious: the chosen button lights, the arrows come alive,
     and the thing that will move starts pulsing on the wheel itself. */
  function setMode(next) {
    mode = next;
    if (moveMask) moveMask.checked = mode === 'mask';
    steps.forEach(b => { b.disabled = !mode; });
    document.body.classList.toggle('armed-mask',  mode === 'mask');
    document.body.classList.toggle('armed-wheel', mode === 'wheel');
    spot.setArmed(mode === 'mask');
    hint.textContent = HINTS[mode];
  }

  /* One step of a twelfth. The arrows always mean "next key / previous key", so in
     wheel mode the disc turns the other way to bring that key up to the window. */
  function step(dir) {
    if (!mode) return;
    if (mode === 'mask') target.mask  += dir * SECTOR;
    else                 target.wheel -= dir * SECTOR;
    showKey(keyIndex());
    glide();
  }

  steps.forEach(btn =>
    btn.addEventListener('click', () => step(Number(btn.dataset.step))));

  if (moveMask) {
    moveMask.addEventListener('change', () => {
      setMode(moveMask.checked ? 'mask' : 'wheel');
    });
  }

  document.getElementById('reset').addEventListener('click', () => {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    // wind the accumulated turns off first, so home is at most half a turn away
    drawn.mask  = norm(drawn.mask);
    drawn.wheel = norm(drawn.wheel);
    target.mask = target.wheel = 0;
    setMode(moveMask && moveMask.checked ? 'mask' : 'wheel');
    showKey(0);
    glide();
  });

  spot.setAngle(0);
  setWheel(0);
  setMode('wheel');
  showKey(0);
}

draw();
