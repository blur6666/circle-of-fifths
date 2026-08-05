/* Builds the SVG scene, then hands its rendered layers to the controls module. */

CF.scene = (function () {

const {
  CX, CY, R_HUB, R_DIM, R_MINOR, R_MAJOR, R_OUT,
  R_DIM_TEXT, R_MINOR_TEXT, R_MAJOR_TEXT,
  FS_MAJOR, FS_MINOR, FS_DIM,
  SECTOR, KEYS,
  fillDim, fillMin, fillMaj, textMaj, textMin, textDim,
  C_STAGE, C_DISC, C_HUB, C_HUB_RIM, SEAM_W,
  C_MASK_EDGE
} = CF.config;
const { pt, el, text, textLines, ringSector } = CF.geometry;
const { staffAt, staffImage, STAVES, R_RIM } = CF.staves;
const { buildSpotlight } = CF.spotlight;

// ----------------------------------------------------------------- naming
const twoNames = s => s.includes('/');
const sigText = k => {
  const parts = [];
  if (k.flats) parts.push(`${k.flats} flats`);
  if (k.sharps) parts.push(`${k.sharps} sharps`);
  return parts.join(' · ') || 'no sharps or flats';
};

// --------------------------------------------------------------------- hub
/* The centre reads out whichever key the window is sitting on. */
function buildHub(svg) {
  const g = el('g', { id: 'hub' }, svg);
  el('circle', {
    cx: CX, cy: CY, r: R_HUB,
    fill: C_HUB, stroke: C_HUB_RIM, 'stroke-width': 2.1
  }, g);
  const name = text(g, '', { x: CX, y: CY, class: 'hub-key' });
  const dashMajor = document.getElementById('dash-major');
  const dashMinor = document.getElementById('dash-minor');
  const dashDim = document.getElementById('dash-dim');
  const dashSignature = document.getElementById('dash-signature');
  const dashChords = document.getElementById('dash-chords');
  const dashModes = document.getElementById('dash-modes');

  return i => {
    const k = KEYS[i];
    const previous = KEYS[(i + KEYS.length - 1) % KEYS.length];
    const next = KEYS[(i + 1) % KEYS.length];
    name.textContent = k.major;
    name.setAttribute('font-size', twoNames(k.major) ? 30 : 58);
    name.setAttribute('fill', textMaj(i));
    if (dashMajor) dashMajor.textContent = k.major;
    if (dashMinor) dashMinor.textContent = k.minor;
    if (dashDim) dashDim.textContent = k.dim;
    if (dashSignature) dashSignature.textContent = sigText(k);
    if (dashChords) dashChords.textContent =
      `${previous.major} · ${k.major} · ${next.major} / ${previous.minor} · ${k.minor} · ${next.minor} / ${k.dim}`;
    if (dashModes) dashModes.textContent = k.scale.map((note, degree) =>
      `${note} ${['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'][degree]}`).join(' · ');
  };
}

// ------------------------------------------------------------------- render
function draw() {
  const svg = document.getElementById('wheel');

  // frame the viewBox to whatever reaches furthest - the disc, or the staves
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
     pivots about - its own anchor, not the centre. #disc gets rotate(a) and each of
     these gets rotate(-a) about itself, so it travels round the circle but stays
     the right way up. See setWheel() in wireControls. */
  const uprights = [];
  const upright = (node, ax, ay) => uprights.push({ node, ax, ay });

  KEYS.forEach((k, i) => {
    const mid = i * SECTOR;
    const a0 = mid - SECTOR / 2, a1 = mid + SECTOR / 2;

    // ring backgrounds
    el('path', { d: ringSector(R_MINOR, R_MAJOR, a0, a1), fill: fillMaj(i) }, bg);
    el('path', { d: ringSector(R_DIM,   R_MINOR, a0, a1), fill: fillMin(i) }, bg);
    el('path', { d: ringSector(R_HUB,   R_DIM,   a0, a1), fill: fillDim(i) }, bg);

    // divider between this sector and the next - a seam of stage colour
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
     they have to move along their own path rather than simply ride round with it -
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

  // the spotlight sits on top of the disc; build the hub before its inner arm glow
  const spot = buildSpotlight(svg, defs);
  const showKey = buildHub(svg);

  /* The "you can turn this" cue for wheel mode - matching violet glows on the outer
     rim and hub rim, each doubled with a small black gap to separate the illuminated
     boundaries. This makes the disc read like it turns beneath both illuminated edges.
     Outside #disc so the spotlight leaves it alone and the scrim cannot dim either glow. */
  [
    ['arm-ring',       R_OUT - 2,  3],
    ['arm-ring-outer', R_OUT + 8,  3],
    ['arm-hub',        R_HUB + 5,  2.4],
    ['arm-hub-inner',  R_HUB - 3,  2.4]
  ].forEach(([id, r, width]) => {
    el('circle', {
      id, cx: CX, cy: CY, r,
      fill: 'none', stroke: C_MASK_EDGE, 'stroke-width': width,
      opacity: 0, style: 'pointer-events: none'
    }, svg);
  });

  CF.controls.wireControls(spot, showKey, disc, uprights, placeStaves);
}

return { draw };

})();
