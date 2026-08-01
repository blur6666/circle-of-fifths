/* Circle of fifths — draws the wheel into #wheel as SVG.
   Angles: 0 = 12 o'clock, increasing clockwise.

   Styling follows the "Nocturne" study: dark stage, twelve hues spaced evenly
   round the circle so position becomes colour, and the mask as a spotlight —
   outside it the disc is blurred and desaturated as well as dimmed. */

const SVGNS = 'http://www.w3.org/2000/svg';

/* The outer coloured band. **Off**: it existed only to hold the key signatures, and
   they no longer sit inside it — they hang off the rim at a fixed size and overrun
   it, so the band was left as an empty ring of colour. Turn it back on to get it
   back; the staves don't move either way, they just start further out. */
const SHOW_KEY_SIGNATURES = false;

/* The staff PNGs that go in that band. Turn this **off** to empty the ring while
   working on the rest of the wheel — and keep it off if `staves/` is ever cleared,
   since an <image> pointing at a missing file draws Chrome's broken-image icon,
   which is worse than nothing. See staves/README.md. */
const SHOW_STAVES = true;

/* The accidental-count numbers printed next to the staves (0, 1, 2 ... and the
   5b / 7# pairs on the enharmonic sectors). Parked for now — flip to true to bring
   them back; the staves re-centre themselves to make room. */
const SHOW_COUNTS = false;

// ---------------------------------------------------------------- geometry
/* Ring radii are the design's `emphasis-major` preset, scaled from its 760-unit
   stage to the 1000-unit one this file has always drawn in (x 1000/760). The
   diminished ring is a thin inner collar — it carries one short label and doesn't
   need a third of the radius; minors and majors take the middle, and the signature
   band is wide enough for a proper staff when we get to it. */
const CX = 500, CY = 500;
const R_HUB   = 80;    // blank centre
const R_DIM   = 178;   // outer edge of the diminished ring
const R_MINOR = 293;   // outer edge of the minor ring
const R_MAJOR = 400;   // outer edge of the major ring
const R_SIGS  = 500;   // outer edge once the key signatures are shown
const R_OUT   = SHOW_KEY_SIGNATURES ? R_SIGS : R_MAJOR;

// Each label sits in the middle of its band, and is sized off that band's width.
const R_DIM_TEXT   = (R_HUB   + R_DIM)   / 2;
const R_MINOR_TEXT = (R_DIM   + R_MINOR) / 2;
const R_MAJOR_TEXT = (R_MINOR + R_MAJOR) / 2;
const R_SIG        = (R_MAJOR + R_OUT)   / 2;   // where the key-signature graphics sit

/* Fraction of the band each label takes. The design's numbers left the inner rings
   very small once the wheel is capped to one screen — the diminished ring was
   landing near 8px — so these run larger than the study. The two-name variants are
   held back by width, not height: `B♭°/A♯°` has to clear the seams either side of a
   30° sector at r=137, which is only ~72 units wide. */
const FS_MAJOR = two => (R_MAJOR - R_MINOR) * (two ? 0.99  : 0.54);  
const FS_MINOR = two => (R_MINOR - R_DIM)   * (two ? 0.99  : 0.42);
const FS_DIM   = two => (R_DIM   - R_HUB)   * (two ? 0.99  : 0.3);

const SECTOR = 30;          // degrees per key

// ------------------------------------------------------------------- data
// Clockwise from the top. `dual` keys show both spellings and both key signatures.
// `dim` is the diminished chord of that key (the vii°).
const KEYS = [
  { major: 'C',       minor: 'a',       dim: 'B°',        sharps: 0,},
  { major: 'G',       minor: 'e',       dim: 'F♯°',       sharps: 1 },
  { major: 'D',       minor: 'b',       dim: 'C♯°',       sharps: 2 },
  { major: 'A',       minor: 'f♯',      dim: 'G♯°',       sharps: 3 },
  { major: 'E',       minor: 'c♯',      dim: 'D♯°',       sharps: 4 },
  { major: 'B',       minor: 'g♯',      dim: 'A♯°',       sharps: 5 },
  { major: 'F♯',      minor: 'd♯',      dim: 'E♯°',       sharps: 6 },
  { major: 'C♯',      minor: 'a♯',      dim: 'B♯°',       sharps: 7 },
  { major: 'A♭',      minor: 'f',       dim: 'G°',        flats: 4 },
  { major: 'E♭',      minor: 'c',       dim: 'D°',        flats: 3 },
  { major: 'B♭',      minor: 'g',       dim: 'A°',        flats: 2 },
  { major: 'F',       minor: 'd',       dim: 'E°',        flats: 1 }
];

// ----------------------------------------------------------------- colour
/* Twelve hues, evenly spaced round the wheel: C amber at the top, walking through
   green at A, blue at G♭/F♯ and magenta back round to F. Position becomes colour.
   Set as SVG attributes, so they must be real colour values — Chrome does not
   resolve var() inside presentation attributes. */
const hue = i => (45 + i * 30) % 360;

const fillDim = i => `oklch(0.26 0.05 ${hue(i)})`;
const fillMin = i => `oklch(0.305 0.075 ${hue(i)})`;
const fillMaj = i => `oklch(0.37 0.1 ${hue(i)})`;
const fillSig = i => `oklch(0.215 0.035 ${hue(i)})`;

/* The study stepped these down as you move inward — 0.91 / 0.84 / 0.75 — which
   reads as depth on a big canvas but leaves the middle of the wheel muddy at the
   size this actually renders at. The inner bands are the *darkest* fills (0.305 and
   0.26), so holding all three labels near the same lightness gives the centre more
   contrast, not less, and the size difference still carries the hierarchy. */
const textMaj = i => `oklch(0.95 0.15 ${hue(i)})`;
const textMin = i => `oklch(0.93 0.13 ${hue(i)})`;
const textDim = i => `oklch(0.91 0.11 ${hue(i)})`;
const ink     = i => `oklch(0.88 0.13 ${hue(i)})`;   // key-signature marks

const C_STAGE   = '#0a0b0f';   // the dark behind everything; also every seam
const C_DISC    = '#141720';   // under the sectors, so the seams read as gaps
const C_HUB     = '#0a0b0f';
const C_HUB_RIM = '#3a4058';
const C_HUB_SUB = '#aab0c4';   // on a near-black hub, the study's #6b7183 vanished
const SEAM_W    = 2.6;

/* Only labels carrying two spellings get shrunk to fit. Note this is NOT the same
   as the sector's `dual` flag: C is dual (both spellings of it are written the same
   way) but its names are single, so C / a / B° stay full size like their
   neighbours. */
const twoNames = s => s.includes('/');

// -------------------------------------------------------------- spotlight
/* The mask: a window 3 sectors wide over the staff, major and minor rings, and
   1 sector wide over the diminished ring. Everything outside it is blurred,
   desaturated and dimmed, so peripheral keys stay recognisable as shapes without
   competing for attention. All three are dialled here. */
/* How far the outside is dimmed towards C_STAGE. This is the spotlight — at 0.13 it
   was worth about 11% and the unlit keys read as fully lit. Luminance does the work
   here rather than SPOT_SAT, because dimming reads as "further away" while draining
   colour reads as "out of focus", which is the thing that looked wrong. */
const SCRIM_ALPHA = 0.31;
/* Blur is **off**, and at 1 it was doing nothing anyway — removing the primitive
   left the render pixel-identical, because 1 user unit is about half a screen pixel
   at the size this draws. Don't reach for this to explain a soft-looking label: the
   labels lose apparent sharpness outside the window because SPOT_SAT drains their
   colour and the scrim flattens the contrast against the sector behind them, not
   because anything is resampled. Measured: edge energy is the same either side of
   the window, saturation drops by a third. */
const SPOT_BLUR   = 0;      // feGaussianBlur, in user units
const SPOT_SAT    = 0.90;   // saturation kept outside the window
/* The window's edge is a solid grey, not a translucent white. It runs straight over
   the stage-coloured seams between sectors, and at 0.85 those showed through and
   left the line looking dirty and uneven along its length. This is roughly what the
   translucent version composited to over the dark, but it now reads the same
   wherever it crosses. */
const C_MASK_EDGE = '#c1c4d6';
const MASK_EDGE_A = 1;
const MASK_EDGE_W = 4.6;    // the window's hairline, in user units
const C_MASK_GLOW = 'rgba(150,120,255,.75)';
const MASK_GLOW_R = 21;

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

function circlePath(r) {
  return `M${CX - r} ${CY} A${r} ${r} 0 1 0 ${CX + r} ${CY} ` +
         `A${r} ${r} 0 1 0 ${CX - r} ${CY} Z`;
}

// ------------------------------------------------------- key signature PNGs
/* The signature ring shows a picture of the real staff, one PNG per key
   signature. Drop them in `staves/`:

     none.png                     C — clef and bare staff, no accidentals
     sharps-1.png … sharps-7.png
     flats-1.png  … flats-7.png

   They are built from the LilyPond SVGs alongside them by `staves/convert.sh`,
   which cuts the bass half off each grand staff and normalises the vertical window
   so every file is the same height with the staff in the same place. Re-run it if
   the SVGs change; re-measure the three numbers below if its output size does.

   Ink colour is baked into the PNG — a cool grey, dark enough not to outshout the
   key names it sits beside. That's the trade for using pictures: the staves can't
   take the sector's hue the way the ring labels do. */
const STAFF_DIR = 'staves';

/* Every staff is drawn at exactly this size — one staff-line gap, in user units.
   It is a chosen number, not a solved one, and that is the whole point: the wheel
   used to shrink the staves until the widest one fitted inside the signature band,
   which made them tiny. They now hang off the rim and are free to overrun it.

   Raising this makes the staves bigger *and* the coloured disc smaller, because the
   viewBox has to grow to hold them and everything scales down together. Roughly, on
   a 505px-wide wheel: 11 -> 4.9px line gap, disc 354px; 13 -> 5.4px, 343px;
   18 -> 6.8px, 304px. */
const STAFF_S   = 13;
const STAFF_GAP = 8;    // clearance between the disc edge and the staff block

/* Two separate knobs hold the staves back from shouting, and they stack:
   `INK` in staves/convert.sh is baked into the PNGs (a cool grey, not white), and
   this rides on top. Back either out on its own — this one is instant, the other
   needs `bash convert.sh` re-run. */
const STAFF_OPACITY = 0.8;

/* Measured off what convert.sh actually produces, in staff-line gaps: every file
   is 7.62 gaps tall (staff is 4 of those; the rest is the clef's reach above and
   below), and the width starts at 5.5 for clef and margins, then grows a fixed step
   per accidental — sharps are wider glyphs than flats.

   The 2% on the width is load-bearing. `preserveAspectRatio="meet"` scales by
   whichever of width/height is tighter; since every PNG is the same height and the
   box height is always `STAFF_H * s`, forcing height to be the tighter one gives
   every staff on the wheel an identical scale — which is what makes the line
   spacing match from sector to sector. */
const STAFF_H      = 7.62;
const STAFF_W0     = 5.50;
const STAFF_W_STEP = { sharp: 1.094, flat: 0.900 };
const STAFF_SLACK  = 1.02;

const staffW = (kind, n) => (STAFF_W0 + n * STAFF_W_STEP[kind]) * STAFF_SLACK;

const staffSrc = (kind, n) =>
  n === 0 ? `${STAFF_DIR}/none.png` : `${STAFF_DIR}/${kind}s-${n}.png`;

/* Which staff a sector carries. A key names one or the other, never both — a
   missing property means zero, which is C. */
const staffPart = k => [k.sharps ? 'sharp' : 'flat', k.sharps || k.flats || 0];

/* The order accidentals are added in — which is also the order they are written on
   the staff, so the first n of these are exactly what the picture shows. */
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/* What the staff says, in words: "E major — 4 sharps: F♯ C♯ G♯ D♯". Goes in a
   <title>, which Chrome shows on hover and screen readers announce, so the one
   element covers both. Worth having: the staves render around 22px tall, too small
   to count accidentals at a glance. */
function staffTitle(k, kind, n) {
  if (n === 0) return `${k.major} major — no sharps or flats`;
  const mark  = kind === 'sharp' ? '♯' : '♭';
  const notes = (kind === 'sharp' ? SHARP_ORDER : FLAT_ORDER)
    .slice(0, n).map(note => note + mark).join(' ');
  return `${k.major} major — ${n} ${kind}${n > 1 ? 's' : ''}: ${notes}`;
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
const STAVES = KEYS.map((k, i) => {
  const [kind, n] = staffPart(k);
  const deg = i * SECTOR, th = deg * Math.PI / 180;
  const w = staffW(kind, n) * STAFF_S, h = STAFF_H * STAFF_S;
  const reach = w * Math.abs(Math.sin(th)) + h * Math.abs(Math.cos(th));
  const [cx, cy] = pt(R_OUT + STAFF_GAP + reach / 2, deg);
  return { kind, n, w, h, x: cx - w / 2, y: cy - h / 2, title: staffTitle(k, kind, n) };
});

/* How far the drawing actually reaches — the disc, or the corner of whichever staff
   sticks out furthest. Corners matter: a block at 12 o'clock is pushed out by its
   height but is wider than it is tall, so its corners beat its centre line. */
const R_RIM = SHOW_STAVES
  ? STAVES.reduce((m, s) => Math.max(m,
      Math.hypot(Math.max(Math.abs(s.x - CX), Math.abs(s.x + s.w - CX)),
                 Math.max(Math.abs(s.y - CY), Math.abs(s.y + s.h - CY)))), R_OUT)
  : R_OUT;

/* One key signature. `pointer-events: all` so the whole box is hoverable rather
   than just the inked pixels — the target is small enough as it is. */
function staffImage(parent, s) {
  const img = el('image', {
    href: staffSrc(s.kind, s.n),
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
  const veil = el('use', {
    href: '#disc',
    'clip-path': 'url(#spot-outside)',
    filter: 'url(#spot-veil)',
    style: 'pointer-events: none'
  }, svg);

  const g = el('g', { id: 'mask', style: 'pointer-events: none' }, svg);
  el('path', {
    d: outside, 'fill-rule': 'evenodd', fill: C_STAGE, opacity: SCRIM_ALPHA
  }, g);
  el('path', {
    d: win, fill: 'none', stroke: C_MASK_EDGE,
    'stroke-width': MASK_EDGE_W, 'stroke-linejoin': 'round', opacity: MASK_EDGE_A,
    style: `filter: drop-shadow(0 0 ${MASK_GLOW_R}px ${C_MASK_GLOW})`
  }, g);

  return {
    /* The mask is placed with the SVG rotate(angle cx cy) attribute rather than a
       CSS transform: with the viewBox offset away from the origin, transform-box/
       transform-origin put the pivot in the wrong place. The clip shape has to
       turn with it, so both get the same transform. */
    setAngle(a) {
      const t = `rotate(${a} ${CX} ${CY})`;
      g.setAttribute('transform', t);
      shape.setAttribute('transform', t);
    },
    setVisible(on) {
      g.style.display    = on ? '' : 'none';
      veil.style.display = on ? '' : 'none';
    }
  };
}

// --------------------------------------------------------------------- hub
/* The centre reads out whichever key the window is sitting on. */
function sigText(k) {
  const parts = [];
  if (k.flats)  parts.push(k.flats + '♭');
  if (k.sharps) parts.push(k.sharps + '♯');
  return parts.join('  /  ') || 'no ♯ or ♭';
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

  KEYS.forEach((k, i) => {
    const mid = i * SECTOR;
    const a0 = mid - SECTOR / 2, a1 = mid + SECTOR / 2;

    // ring backgrounds
    if (SHOW_KEY_SIGNATURES) {
      el('path', { d: ringSector(R_MAJOR, R_OUT, a0, a1), fill: fillSig(i) }, bg);
    }
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
    text(labels, k.dim, {
      x: dmx, y: dmy, class: 'dim-label',
      'font-size': FS_DIM(twoNames(k.dim)), fill: textDim(i)
    });

    const [mnx, mny] = pt(R_MINOR_TEXT, mid);
    text(labels, k.minor, {
      x: mnx, y: mny, class: 'minor-label',
      'font-size': FS_MINOR(twoNames(k.minor)), fill: textMin(i)
    });

    const [mjx, mjy] = pt(R_MAJOR_TEXT, mid);
    text(labels, k.major, {
      x: mjx, y: mjy, class: 'major-label',
      'font-size': FS_MAJOR(twoNames(k.major)), fill: textMaj(i)
    });

    // --- the accidental count, when it is switched on. The staff itself is not
    // drawn here: it lives outside the disc, so it is placed after this loop.
    if (SHOW_COUNTS) {
      const [, count] = staffPart(k);
      const [nx, ny] = pt(R_SIG, mid);
      text(labels, String(count), {
        x: nx, y: ny, class: 'count', 'font-size': 30, fill: ink(i)
      });
    }
  });

  // ring boundaries, as seams rather than lines
  [R_DIM, R_MINOR, R_MAJOR].forEach(r => {
    el('circle', {
      cx: CX, cy: CY, r, fill: 'none', stroke: C_STAGE, 'stroke-width': SEAM_W
    }, strokes);
  });

  // the key signatures, hung off the rim rather than boxed into a ring. Still
  // inside #disc, so the spotlight dims and blurs them with everything else.
  if (SHOW_STAVES) STAVES.forEach(s => staffImage(labels, s));

  // the spotlight sits on top of the disc; the hub reads out over the lot
  wireControls(buildSpotlight(svg, defs), buildHub(svg));
}

// ---------------------------------------------------------------- controls
function wireControls(spot, showKey) {
  let selected = 0;    // index into KEYS; 0 = C at the top
  let current  = 0;    // angle actually drawn, in degrees
  let raf = null;

  function glideTo(target) {
    if (raf) cancelAnimationFrame(raf);
    const from  = current;
    const delta = ((target - from + 540) % 360) - 180;   // take the short way round
    const start = performance.now();
    const DUR   = 320;

    const step = now => {
      const t = Math.min(1, (now - start) / DUR);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      current = from + delta * e;
      spot.setAngle(current);
      if (t < 1) raf = requestAnimationFrame(step);
      else { current = ((target % 360) + 360) % 360; spot.setAngle(current); raf = null; }
    };
    raf = requestAnimationFrame(step);
  }

  document.querySelectorAll('[data-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = (selected + Number(btn.dataset.step) + KEYS.length) % KEYS.length;
      showKey(selected);
      glideTo(selected * SECTOR);
    });
  });

  const toggle = document.getElementById('mask-toggle');
  const show = () => spot.setVisible(toggle.checked);
  toggle.addEventListener('change', show);

  spot.setAngle(0);
  showKey(0);
  show();
}

draw();
