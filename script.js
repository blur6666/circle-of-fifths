/* Circle of fifths — draws the wheel into #wheel as SVG.
   Angles: 0 = 12 o'clock, increasing clockwise. */

const SVGNS = 'http://www.w3.org/2000/svg';

/* The outer ring with the key-signature staff grids. */
const SHOW_KEY_SIGNATURES = true;

/* The accidental-count numbers printed next to those grids (0, 1, 2 ... and the
   5b / 7# pairs on the enharmonic sectors). Parked for now — flip to true to bring
   them back; the grids re-centre themselves to make room. */
const SHOW_COUNTS = false;

// ---------------------------------------------------------------- geometry
const CX = 500, CY = 500;
const R_HUB   = 113;   // blank centre
const R_MINOR = 193;   // outer edge of the minor ring
const R_MAJOR = 268;   // outer edge of the major ring
const R_SIGS  = 470;   // outer edge once the key signatures are shown
const R_OUT   = SHOW_KEY_SIGNATURES ? R_SIGS : R_MAJOR;

const R_MINOR_TEXT = 152;
const R_MAJOR_TEXT = 229;
const R_SIG        = 372;   // where the key-signature graphics sit

const SECTOR = 30;          // degrees per key

// ------------------------------------------------------------------- data
// The key signature grid is a treble staff: five lines + four spaces.
const LINES  = ['F', 'D', 'B', 'G', 'E'];   // top to bottom
const SPACES = ['E', 'C', 'A', 'F'];        // top to bottom, offset half a step

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

// Where each accidental lands on the grid: 'L<i>' = line, 'S<i>' = space.
// The reference chart uses one fixed box per note *name*, so the sharp and flat
// maps are identical and the two duplicate boxes (bottom line E, bottom space F)
// are never filled. Verified against the chart: its 7-flat grid fills the top-line
// F, not the bottom-space F, even though a real Cb key signature writes Fb there.
const SHARP_SLOT = { F: 'L0', C: 'S1', G: 'L3', D: 'L1', A: 'S2', E: 'S0', B: 'L2' };
const FLAT_SLOT  = { B: 'L2', E: 'S0', A: 'S2', D: 'L1', G: 'L3', C: 'S1', F: 'L0' };

// Clockwise from the top. `dual` keys show both spellings and both key signatures.
const KEYS = [
  { major: 'C',           minor: 'a',            flats: 0, sharps: 0, dual: true  },
  { major: 'G',           minor: 'e',            sharps: 1 },
  { major: 'D',           minor: 'b',            sharps: 2 },
  { major: 'A',           minor: 'f♯',      sharps: 3 },
  { major: 'E',           minor: 'c♯',      sharps: 4 },
  { major: 'C♭/B',   minor: 'a♭/g♯', flats: 7, sharps: 5, dual: true },
  { major: 'G♭/F♯', minor: 'e♭/d♯', flats: 6, sharps: 6, dual: true },
  { major: 'D♭/C♯', minor: 'b♭/a♯', flats: 5, sharps: 7, dual: true },
  { major: 'A♭',     minor: 'f',            flats: 4 },
  { major: 'E♭',     minor: 'c',            flats: 3 },
  { major: 'B♭',     minor: 'g',            flats: 2 },
  { major: 'F',           minor: 'd',            flats: 1 }
];

// Hue per sector, walking the wheel: cool blues down the sharp side, warm reds
// back up the flat side, with the red/blue seam at the top like the reference.
const HUES = [0, 210, 222, 235, 248, 262, 285, 320, 345, 358, 8, 12];
const ink   = i => `hsl(${HUES[i]} 45% 33%)`;
const solid = i => `hsl(${HUES[i]} 45% 46%)`;

// Set as SVG attributes, so they must be real colours — Chrome does not resolve
// var() inside presentation attributes. Keep in sync with style.css.
const C_RING_OUTER = '#ffffff';
const C_RING_MAJOR = '#ededed';
const C_RING_MINOR = '#dcdcdc';
const C_HUB        = '#cfcbcb';
const C_LINE       = '#9a9a9a';
const C_CELL       = '#b9b9b9';

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

function ringSector(r1, r2, a0, a1) {
  const [x0, y0] = pt(r2, a0), [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r1, a1), [x3, y3] = pt(r1, a0);
  return `M${x0} ${y0} A${r2} ${r2} 0 0 1 ${x1} ${y1} ` +
         `L${x2} ${y2} A${r1} ${r1} 0 0 0 ${x3} ${y3} Z`;
}

/* Which staff slots are filled for `count` accidentals of the given kind. */
function filledSlots(count, kind) {
  const order = kind === 'sharp' ? SHARP_ORDER : FLAT_ORDER;
  const slots = kind === 'sharp' ? SHARP_SLOT : FLAT_SLOT;
  const set = new Set();
  for (let i = 0; i < count; i++) set.add(slots[order[i]]);
  return set;
}

// --------------------------------------------------------- staff-grid glyph
const CELL_W = 20, CELL_H = 17;

/* One key-signature graphic, centred on (x, y). */
function staffGrid(parent, x, y, count, kind, sectorIndex) {
  const g = el('g', { transform: `translate(${x} ${y})` }, parent);
  const on = filledSlots(count, kind);
  const fill = solid(sectorIndex);

  const cell = (slot, label, cx0, cy0) => {
    const lit = on.has(slot);
    el('rect', {
      x: cx0 - CELL_W / 2, y: cy0 - CELL_H / 2,
      width: CELL_W, height: CELL_H,
      fill: lit ? fill : '#ffffff',
      stroke: lit ? fill : C_CELL,
      'stroke-width': 1
    }, g);
    text(g, label, {
      x: cx0, y: cy0 + 0.5,
      class: 'cell-letter' + (lit ? ' on' : ''),
      'font-size': 11
    });
  };

  // lines: left column, five cells
  LINES.forEach((n, i) => cell('L' + i, n, -CELL_W / 2, (i - 2) * CELL_H));
  // spaces: right column, four cells, offset by half a step
  SPACES.forEach((n, i) => cell('S' + i, n, CELL_W / 2, (i - 1.5) * CELL_H));

  return g;
}

// ------------------------------------------------------------------- render
function draw() {
  const svg = document.getElementById('wheel');

  // frame the viewBox to whatever the outermost ring currently is
  const pad = R_OUT + 15;
  svg.setAttribute('viewBox', `${CX - pad} ${CY - pad} ${pad * 2} ${pad * 2}`);

  const bg      = el('g', {}, svg);
  const strokes = el('g', {}, svg);
  const labels  = el('g', {}, svg);

  KEYS.forEach((k, i) => {
    const mid = i * SECTOR;
    const a0 = mid - SECTOR / 2, a1 = mid + SECTOR / 2;

    // ring backgrounds
    if (SHOW_KEY_SIGNATURES) {
      el('path', { d: ringSector(R_MAJOR, R_OUT, a0, a1), fill: C_RING_OUTER }, bg);
    }
    el('path', { d: ringSector(R_MINOR, R_MAJOR, a0, a1), fill: C_RING_MAJOR }, bg);
    el('path', { d: ringSector(R_HUB,   R_MINOR, a0, a1), fill: C_RING_MINOR }, bg);

    // divider between this sector and the next
    const [dx0, dy0] = pt(R_HUB, a1), [dx1, dy1] = pt(R_OUT, a1);
    el('line', {
      x1: dx0, y1: dy0, x2: dx1, y2: dy1,
      stroke: ink(i), 'stroke-width': 1.4, opacity: 0.55
    }, strokes);

    // --- minor (inner) and major (middle) names
    const [mnx, mny] = pt(R_MINOR_TEXT, mid);
    text(labels, k.minor, {
      x: mnx, y: mny, class: 'minor-label',
      'font-size': k.dual ? 21 : 27, fill: ink(i)
    });

    const [mjx, mjy] = pt(R_MAJOR_TEXT, mid);
    text(labels, k.major, {
      x: mjx, y: mjy, class: 'major-label',
      'font-size': k.dual ? 29 : 40, fill: ink(i)
    });

    // the top sector doubles as the legend, like the reference chart
    if (i === 0) {
      text(labels, 'Major', { x: mjx, y: mjy + 27, class: 'qualifier', 'font-size': 17 });
      text(labels, 'minor', { x: mnx, y: mny + 20, class: 'qualifier', 'font-size': 15 });
    }

    // --- outer ring: key signature graphic(s) + accidental count
    if (!SHOW_KEY_SIGNATURES) {
      return;
    } else if (k.dual) {
      // flat spelling to the screen-left, sharp spelling to the screen-right
      const s = Math.cos(mid * Math.PI / 180) > 0 ? -1 : 1;

      // the two grids sit further apart when the numbers go between them
      const spread = SHOW_COUNTS ? 10.2 : 7.4;

      const [fgx, fgy] = pt(R_SIG, mid + s * spread);
      staffGrid(labels, fgx, fgy, k.flats, 'flat', i);
      const [sgx, sgy] = pt(R_SIG, mid - s * spread);
      staffGrid(labels, sgx, sgy, k.sharps, 'sharp', i);

      if (!SHOW_COUNTS) {
        return;
      } else if (k.flats === k.sharps) {
        // both spellings need the same number of accidentals (C = 0, Gb/F# = 6),
        // so one plain number in the middle says it — same as the reference chart
        const [nx, ny] = pt(R_SIG, mid);
        text(labels, String(k.flats), {
          x: nx, y: ny, class: 'count', 'font-size': 34, fill: ink(i)
        });
      } else {
        // the counts differ, so each grid is labelled with its own
        const [fnx, fny] = pt(R_SIG, mid + s * 3.7);
        text(labels, k.flats + '♭', {
          x: fnx, y: fny, class: 'count', 'font-size': 27, fill: ink(i)
        });
        const [snx, sny] = pt(R_SIG, mid - s * 3.7);
        text(labels, k.sharps + '♯', {
          x: snx, y: sny, class: 'count', 'font-size': 27, fill: ink(i)
        });
      }
    } else {
      // with a number alongside it, the number sits on the side facing C and the
      // graphic on the far side; on its own the graphic just centres in the sector
      const kind  = k.sharps ? 'sharp' : 'flat';
      const count = k.sharps || k.flats;
      const off   = SHOW_COUNTS ? (i <= 5 ? -5.5 : 5.5) : 0;

      if (SHOW_COUNTS) {
        const [nx, ny] = pt(R_SIG, mid + off);
        text(labels, String(count), {
          x: nx, y: ny, class: 'count', 'font-size': 34, fill: ink(i)
        });
      }

      const [gx, gy] = pt(R_SIG, mid - off);
      staffGrid(labels, gx, gy, count, kind, i);
    }
  });

  // hub + ring outlines on top of everything
  el('circle', { cx: CX, cy: CY, r: R_HUB, fill: C_HUB }, strokes);
  [...new Set([R_HUB, R_MINOR, R_MAJOR, R_OUT])].forEach(r => {
    el('circle', {
      cx: CX, cy: CY, r,
      fill: 'none', stroke: C_LINE, 'stroke-width': 1.2, opacity: 0.55
    }, strokes);
  });
}

draw();
