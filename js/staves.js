/* The key signature images: which staff each sector carries, how wide it is, what
   it is called, and where it sits. Pure apart from staffImage, which builds a node
   but keeps no state. */

CF.staves = (function () {

const {
  CX, CY, R_OUT, SECTOR, KEYS,
  STAFF_DIR, STAFF_S, STAFF_GAP, STAFF_OPACITY,
  STAFF_H, STAFF_W0, STAFF_W_STEP, STAFF_SLACK, STAFF_CLEF,
  SHARP_ORDER, FLAT_ORDER
} = CF.config;
const { pt, el } = CF.geometry;

const staffW = (kind, n, both) => staffBoxW(kind, n, both) * STAFF_SLACK;

// The enharmonic sector uses one combined staff image.
const staffSrc = (kind, n, both) =>
  both               ? `${STAFF_DIR}/hybrid-${both[0]}-${both[1]}.png`
  : n === 0          ? `${STAFF_DIR}/none.png`
                     : `${STAFF_DIR}/${kind}s-${n}.png`;

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
/* Lives here rather than in config.js, where the brief groups it with the other
   radii: it is computed from STAVES, which needs this file's functions, so a
   config.js copy would be a forward reference. */
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

return {
  isDual, staffPart, staffBoxW, staffW, staffSrc,
  accidentals, spelt, staffTitle, staffAt, staffImage,
  STAVES, R_RIM
};

})();
