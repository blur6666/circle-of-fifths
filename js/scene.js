/* Builds the SVG scene, then hands its rendered layers to the controls module. */

CF.scene = (function () {

const {
  CX, CY, R_HUB, R_DIM, R_MINOR, R_MAJOR, R_OUT,
  R_DIM_TEXT, R_MINOR_TEXT, R_MAJOR_TEXT,
  FS_MAJOR, FS_MINOR, FS_DIM,
  SECTOR, KEYS,
  fillDim, fillMin, fillMaj, textMaj, textMin, textDim,
  C_STAGE, C_DISC, C_HUB, SEAM_W,
  C_MASK_EDGE
} = CF.config;
const { pt, el, text, textLines, ringSector } = CF.geometry;
const { staffAt, staffImage, STAVES, R_RIM } = CF.staves;
const { buildSpotlight } = CF.spotlight;

// ----------------------------------------------------------------- naming
const twoNames = s => s.includes('/');
const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
const minorChord = name => name.split('/').map(note => `${note[0].toUpperCase()}${note.slice(1)}m`).join('/');
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
  // fill only - the key name reads as sitting in the blank centre, not in a dial
  el('circle', { cx: CX, cy: CY, r: R_HUB, fill: C_HUB }, g);
  const name = text(g, '', { x: CX, y: CY, class: 'hub-key' });
  const dashMajor = document.getElementById('dash-major');
  const dashMinor = document.getElementById('dash-minor');
  const dashDim = document.getElementById('dash-dim');
  const dashSignature = document.getElementById('dash-signature');
  const dashChords = document.getElementById('dash-chords');
  const dashModes = document.getElementById('dash-modes');

  return i => {
    const k = KEYS[i];
    name.textContent = k.major;
    name.setAttribute('font-size', twoNames(k.major) ? 30 : 58);
    name.setAttribute('fill', textMaj(i));
    if (dashMajor) dashMajor.textContent = k.major;
    if (dashMinor) dashMinor.textContent = k.minor;
    if (dashDim) dashDim.textContent = k.dim;
    if (dashSignature) dashSignature.textContent = sigText(k);
    if (dashChords) dashChords.textContent = [
      k.major,
      minorChord(k.scale[1]),
      minorChord(k.scale[2]),
      k.scale[3],
      k.scale[4],
      minorChord(k.scale[5]),
      k.dim
    ].join(' · ');
    if (dashModes) {
      const [selectedMode, ...otherModes] = k.scale.map((note, degree) => ({
        note, label: `${note} ${MODE_NAMES[degree]}`
      }));
      otherModes.sort((a, b) => a.note.split('/')[0].localeCompare(b.note.split('/')[0]));
      dashModes.textContent = [selectedMode, ...otherModes].map(mode => mode.label).join('\n');
    }
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

  /* The floor under the diminished ring, in the blank centre's own colour. The ring
     covers it completely while it is on the wheel; take the ring off and the band it
     occupied reads as part of the empty middle rather than as bare disc. */
  el('circle', { cx: CX, cy: CY, r: R_DIM, fill: C_HUB }, bg);

  /* Everything that must not turn over when the wheel does, with the point it
     pivots about - its own anchor, not the centre. #disc gets rotate(a) and each of
     these gets rotate(-a) about itself, so it travels round the circle but stays
     the right way up. See setWheel() in wireControls. */
  const uprights = [];
  const upright = (node, ax, ay) => uprights.push({ node, ax, ay });

  /* Every node that belongs to the diminished ring - its sectors, the inner half of
     each seam, and its labels - so the whole band can be taken off the wheel. */
  const dimParts = [];

  KEYS.forEach((k, i) => {
    const mid = i * SECTOR;
    const a0 = mid - SECTOR / 2, a1 = mid + SECTOR / 2;

    // ring backgrounds
    el('path', { d: ringSector(R_MINOR, R_MAJOR, a0, a1), fill: fillMaj(i) }, bg);
    el('path', { d: ringSector(R_DIM,   R_MINOR, a0, a1), fill: fillMin(i) }, bg);
    dimParts.push(el('path', {
      d: ringSector(R_HUB, R_DIM, a0, a1), fill: fillDim(i), class: 'dim-sector'
    }, bg));

    /* Divider between this sector and the next - a seam of stage colour. Split at
       R_DIM rather than drawn as one line, so the part crossing the diminished ring
       can vanish with it and the rest stays put. */
    const [sx0, sy0] = pt(R_HUB, a1);
    const [sxd, syd] = pt(R_DIM, a1);
    const [sx1, sy1] = pt(R_OUT, a1);
    dimParts.push(el('line', {
      x1: sx0, y1: sy0, x2: sxd, y2: syd, class: 'dim-seam',
      stroke: C_STAGE, 'stroke-width': SEAM_W
    }, strokes));
    el('line', {
      x1: sxd, y1: syd, x2: sx1, y2: sy1,
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
    const dimLabel = twoNames(k.dim) ? textLines(labels, k.dim.split('/'), dimAttrs)
                                     : text(labels, k.dim, dimAttrs);
    dimParts.push(dimLabel);
    upright(dimLabel, dmx, dmy);

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

  /* The "you can turn this" cue for wheel mode: one violet line at each boundary of
     the playable cells. Outside #disc so the spotlight leaves it alone and the scrim
     cannot dim it. */
  [
    ['arm-ring', R_OUT - 2, 3],
    ['arm-hub',  R_HUB + 5, 2.4]
  ].forEach(([id, r, width]) => {
    el('circle', {
      id, cx: CX, cy: CY, r,
      fill: 'none', stroke: C_MASK_EDGE, 'stroke-width': width,
      opacity: 0, style: 'pointer-events: none'
    }, svg);
  });

  /* Inline styles rather than a body class: #disc is duplicated into the spotlight's
     <use> veil, and that clone only repaints when the source nodes' own style changes. */
  const setDimRingVisible = visible => {
    const display = visible ? '' : 'none';
    for (const node of dimParts) node.style.display = display;
  };

  CF.controls.wireControls(spot, showKey, disc, uprights, placeStaves, setDimRingVisible);
}

return { draw };

})();
