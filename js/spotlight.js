/* The SVG spotlight: the fixed window edge plus the clipped, rotating scrim. */

CF.spotlight = (function () {

const {
  CX, CY, R_HUB, R_DIM, R_OUT, R_MASK_OUT, SECTOR,
  SCRIM_ALPHA, SCRIM_DECAY, SCRIM_FAR_ALPHA, SCRIM_X, SCRIM_Y, SCRIM_RX, SCRIM_RY,
  SPOT_BLUR, SPOT_SAT,
  C_STAGE, C_MASK_EDGE, MASK_EDGE_A, MASK_EDGE_W, C_MASK_GLOW, MASK_GLOW_R,
  MASK_SHADOW_DY, MASK_SHADOW_R, MASK_SHADOW_A,
  MASK_ARMED_SHADOW_DY, MASK_ARMED_SHADOW_R, MASK_ARMED_SHADOW_A,
  DEGREE_LABELS
} = CF.config;
const { pt, el, text, circlePath } = CF.geometry;

/* The window, drawn over sector 0 (straight up); the whole group is rotated to
   move it. Wide part = 3 sectors, from the minor ring almost to the rim; narrow
   part = 1 sector, over the diminished ring only.

   It deliberately stops short of the disc edge to reveal the floor beneath the mask,
   and takes no account of the staves hanging outside it - they are never dimmed,
   blurred or lit by the spotlight, whichever key is selected. R_RIM only frames the
   viewBox. */
function windowPath(withDim = true) {
  const w = SECTOR * 1.5;   // 45 degrees - half-width of the 3-cell part
  const n = SECTOR * 0.5;   // 15 degrees - half-width of the 1-cell part
  const [ax, ay] = pt(R_MASK_OUT, -w), [bx, by] = pt(R_MASK_OUT, w);
  const [cx, cy] = pt(R_DIM,  w), [hx, hy] = pt(R_DIM, -w);
  const wide = `M${ax} ${ay} A${R_MASK_OUT} ${R_MASK_OUT} 0 0 1 ${bx} ${by} L${cx} ${cy}`;
  /* With the diminished ring off the wheel there is no 1-cell part to frame, so the
     window closes straight across R_DIM and becomes a plain 3-cell arc. */
  if (!withDim) return `${wide} A${R_DIM} ${R_DIM} 0 0 0 ${hx} ${hy} Z`;
  const [dx, dy] = pt(R_DIM,  n);
  const [ex, ey] = pt(R_HUB,  n), [fx, fy] = pt(R_HUB, -n);
  const [gx, gy] = pt(R_DIM, -n);
  return `${wide} A${R_DIM} ${R_DIM} 0 0 0 ${dx} ${dy}` +
         ` L${ex} ${ey} A${R_HUB} ${R_HUB} 0 0 0 ${fx} ${fy}` +
         ` L${gx} ${gy} A${R_DIM} ${R_DIM} 0 0 0 ${hx} ${hy} Z`;
}

/* The window plus the region the scrim and veil cover: everything on the disc but
   the window and the blank middle. That middle grows to R_DIM when the diminished
   ring is hidden, so the emptied band is left clean rather than dimmed. */
function spotPaths(withDim) {
  const win = windowPath(withDim);
  return { win, outside: `${circlePath(R_OUT)} ${circlePath(withDim ? R_HUB : R_DIM)} ${win}` };
}

/* Three layers, all keyed to the same window shape:
   - a blurred, desaturated copy of the disc, clipped to everything *outside* it
   - the scrim, which dims that same region towards the stage colour
   - the window edge itself, a near-white hairline with a short cast shadow and violet bloom.
   The blurred copy is a <use> of the sharp disc underneath, so where the clip
   cuts it away the original shows through untouched. Clipping happens after
   filtering, which is what keeps the window edge crisp. */
function buildSpotlight(svg, defs) {
  const { win, outside } = spotPaths(true);

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

  /* The scrim is darkest around the mask and fades towards the rest of the disc.
     The gradient lives in the rotating mask layer, so its ellipse follows the window. */
  const scrim = el('radialGradient', {
    id: 'spot-scrim', gradientUnits: 'userSpaceOnUse',
    cx: 0, cy: 0, r: 1,
    gradientTransform: `translate(${SCRIM_X} ${SCRIM_Y}) scale(${SCRIM_RX} ${SCRIM_RY})`
  }, defs);
  el('stop', { offset: '0%', 'stop-color': C_STAGE, 'stop-opacity': SCRIM_ALPHA }, scrim);
  el('stop', { offset: `${SCRIM_DECAY * 100}%`, 'stop-color': C_STAGE, 'stop-opacity': 0.12 }, scrim);
  el('stop', { offset: '100%', 'stop-color': C_STAGE, 'stop-opacity': SCRIM_FAR_ALPHA }, scrim);

  // Purely decorative overlays, both of them. pointer-events off so they can't
  // swallow hover from the disc underneath - and so the veil's duplicate <title>
  // elements, copied wholesale out of #disc, can never fire a second tooltip.
  const veil = el('use', {
    href: '#disc',
    'clip-path': 'url(#spot-outside)',
    filter: 'url(#spot-veil)',
    style: 'pointer-events: none'
  }, svg);

  const g = el('g', { id: 'mask', style: 'pointer-events: none' }, svg);
  const scrimPath = el('path', {
    d: outside, 'fill-rule': 'evenodd', fill: 'url(#spot-scrim)'
  }, g);
  const degreeNodes = DEGREE_LABELS.map(([label, radius, angle, size], index) => {
    const [x, y] = pt(radius, angle);
    // vii° is the only degree sitting inside the diminished ring, so it leaves with it
    const isDim = radius < R_DIM;
    const animationDelay = `-${(index * 4) / DEGREE_LABELS.length}s`;
    const hoverContainer = el('g', { class: 'hover-container' }, g);
    text(hoverContainer, label, {
      x, y, class: 'degree-label drone', fill: C_MASK_EDGE, 'font-size': size, opacity: 0.9,
      style: `animation-delay: ${animationDelay}`
    });
    el('ellipse', {
      cx: x, cy: y + size * 0.65, rx: size * 0.95, ry: size * 0.19, class: 'shadow',
      style: `animation-delay: ${animationDelay}`
    }, hoverContainer);
    return { node: hoverContainer, x, y, isDim };
  });
  /* The "you can turn this" cue for mask mode: the same window outline, drawn fat
     and invisible underneath the real one, pulsed by JS when body.armed-mask is
     set. A separate element rather than an animation on the edge itself, so the
     edge keeps its colour and bloom as JS constants. */
  const armGlow = el('path', {
    d: win, class: 'arm-glow', fill: 'none', stroke: C_MASK_EDGE,
    'stroke-width': MASK_EDGE_W * 2.4, 'stroke-linejoin': 'round', opacity: 0
  }, g);
  const maskEdgeFilter = (dy, radius, alpha, glowing) =>
    `drop-shadow(0 ${dy}px ${radius}px rgba(0, 0, 0, ${alpha}))` +
    (glowing ? ` drop-shadow(0 0 ${MASK_GLOW_R}px ${C_MASK_GLOW})` : '');
  const maskEdge = el('path', {
    d: win, fill: 'none', stroke: C_MASK_EDGE,
    'stroke-width': MASK_EDGE_W, 'stroke-linejoin': 'round', opacity: MASK_EDGE_A,
    style: `filter: ${maskEdgeFilter(MASK_SHADOW_DY, MASK_SHADOW_R, MASK_SHADOW_A, false)}; ` +
           'transition: filter 320ms linear'
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
    setVisible(visible) {
      const display = visible ? '' : 'none';
      veil.style.display = display;
      g.style.display = display;
    },
    /* Reshape the window when the diminished ring comes and goes. Every path keyed to
       the window has to be redrawn together - the edge, its glow, the scrim, and the
       clip the veil is cut with - or they stop agreeing about where the window is. */
    setDimVisible(visible) {
      const p = spotPaths(visible);
      shape.setAttribute('d', p.outside);
      scrimPath.setAttribute('d', p.outside);
      armGlow.setAttribute('d', p.win);
      maskEdge.setAttribute('d', p.win);
      for (const degree of degreeNodes) {
        if (degree.isDim) degree.node.style.display = visible ? '' : 'none';
      }
    },
    setArmed(armed) {
      const glowEnabled = armed && !document.body.classList.contains('mask-glow-off');
      maskEdge.style.filter = glowEnabled
        ? maskEdgeFilter(MASK_ARMED_SHADOW_DY, MASK_ARMED_SHADOW_R, MASK_ARMED_SHADOW_A, true)
        : maskEdgeFilter(MASK_SHADOW_DY, MASK_SHADOW_R, MASK_SHADOW_A, false);
      if (!armed) {
        if (pulse) clearInterval(pulse);
        pulse = null;
        armGlow.style.opacity = '0';
        return;
      }
      if (document.body.classList.contains('mask-glow-off')) {
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

return { buildSpotlight };

})();
