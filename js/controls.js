/* Wires the rendered layers to controls. All motion state stays function-scoped. */

CF.controls = (function () {

const { CX, CY, SECTOR, KEYS, dragEnabled } = CF.config;
const { norm, ease, DUR, WHEEL_POWER_DOWN_MS } = CF.geometry;
const { createKeyPlayer } = CF.audio;

/* Two things can turn: the window (`mask`) or the disc under it (`wheel`). The
   checkbox chooses one; Reset puts both angles back to zero.

   Both angles are unbounded: they accumulate, so you can keep going round in either
   direction forever and 390° is a different number from 30° even though it draws the
   same. Only Reset normalises, so that "home" is one short spin away rather than
   thirteen. */
function wireControls(spot, showKey, disc, uprights, placeStaves, setDimRingVisible) {
  const target = { mask: 0, wheel: 0 };   // where each layer is headed
  const drawn  = { mask: 0, wheel: 0 };   // where each layer actually is
  let raf  = null;
  let mode = null;                        // null | 'mask' | 'wheel'
  let maskHidden = false;                 // a hidden window cannot be aimed
  let wheelPowerDown = null;
  let drag = null;

  const hint  = document.getElementById('hint');
  const wheelSvg = document.getElementById('wheel');
  const hideMask = document.getElementById('hide-mask');
  const maskGlowToggle = document.getElementById('mask-glow-toggle');
  const wheelGlowToggle = document.getElementById('wheel-glow-toggle');
  const degreeDroneToggle = document.getElementById('degree-drone-toggle');
  const dimChordToggle = document.getElementById('dim-chord-toggle');
  const staffToggle = document.getElementById('staff-toggle');
  const stavesGroup = document.getElementById('staves');
  const steps = [...document.querySelectorAll('[data-step]')];

  const HINTS = {
    mask:    'Use the arrows to turn the mask',
    wheel:   'Use the arrows to turn the circle'
  };

  function syncAnimationToggles() {
    document.body.classList.toggle('mask-glow-off', Boolean(maskGlowToggle?.checked));
    document.body.classList.toggle('wheel-glow-off', Boolean(wheelGlowToggle?.checked));
    document.body.classList.toggle('degree-drones-off', Boolean(degreeDroneToggle?.checked));
    /* The diminished ring leaves the wheel entirely rather than just losing its
       names, and the mask window closes over the gap it leaves behind. */
    const showDim = !dimChordToggle?.checked;
    document.body.classList.toggle('dim-chords-off', !showDim);
    setDimRingVisible?.(showDim);
    spot.setDimVisible(showDim);

    // the staves hang outside #disc, so the whole group can simply go
    const hideStaves = Boolean(staffToggle?.checked);
    document.body.classList.toggle('staves-off', hideStaves);
    if (stavesGroup) stavesGroup.style.display = hideStaves ? 'none' : '';
  }

  syncAnimationToggles();

  function powerDownWheelGlow() {
    const ring = document.getElementById('arm-ring');
    const opacity = ring ? getComputedStyle(ring).opacity : '0.95';
    document.body.style.setProperty('--wheel-glow-start', opacity);
    document.body.classList.add('wheel-powering-down');
    if (wheelPowerDown) clearTimeout(wheelPowerDown);
    wheelPowerDown = setTimeout(() => {
      document.body.classList.remove('wheel-powering-down');
      wheelPowerDown = null;
    }, WHEEL_POWER_DOWN_MS);
  }

  function cancelWheelPowerDown() {
    if (wheelPowerDown) clearTimeout(wheelPowerDown);
    wheelPowerDown = null;
    document.body.classList.remove('wheel-powering-down');
  }

  /* The disc turns; every label on it turns back about its own anchor by the same
     amount, so it rides round the circle without going over on its head. The staves
     aren't on the disc at all - they are walked round separately, because each has
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
  createKeyPlayer(keyIndex);

  function glide() {
    if (raf) cancelAnimationFrame(raf);
    const from = { ...drawn };
    const to   = { ...target };
    const movesMask  = from.mask  !== to.mask;
    const movesWheel = from.wheel !== to.wheel;
    if (!movesMask && !movesWheel) {
      return;
    }

    const t0 = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - t0) / DUR);
      const e = t === 1 ? 1 : ease(t);
      drawn.mask  = from.mask  + (to.mask  - from.mask)  * e;
      drawn.wheel = from.wheel + (to.wheel - from.wheel) * e;
      if (movesMask)  spot.setAngle(drawn.mask);
      if (movesWheel) setWheel(drawn.wheel);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        raf = null;
      }
    };
    raf = requestAnimationFrame(tick);
  }

  /* Nothing is aimable until a layer is armed, and the mask arrows stay dead for as
     long as the window they move is hidden. */
  function syncStepButtons() {
    steps.forEach(b => {
      b.disabled = !mode || (maskHidden && b.dataset.layer === 'mask');
    });
  }

  /* Arming is shown in three places at once, because the whole point is that the
     next move should be obvious: the chosen button lights, the arrows come alive,
     and the thing that will move starts pulsing on the wheel itself. */
  function setMode(next) {
    const leavingWheel = mode === 'wheel' && next !== 'wheel';
    if (next === 'wheel') cancelWheelPowerDown();
    else if (leavingWheel) powerDownWheelGlow();
    mode = next;
    syncStepButtons();
    document.body.classList.toggle('armed-mask',  mode === 'mask');
    document.body.classList.toggle('armed-wheel', mode === 'wheel');
    spot.setArmed(mode === 'mask');
    hint.textContent = HINTS[mode];
  }

  /* One step of a twelfth. The arrows always mean "next key / previous key", so in
     wheel mode the disc turns the other way to bring that key up to the window. */
  function step(layer, dir) {
    setMode(layer);
    if (layer === 'mask') target.mask += dir * SECTOR;
    else target.wheel -= dir * SECTOR;
    showKey(keyIndex());
    glide();
  }

  function dragSpin(evt) {
    if (!drag || !mode || evt.pointerId !== drag.pointerId) return;
    const dx = evt.clientX - drag.lastX;
    drag.lastX = evt.clientX;
    const deg = dx * 0.45;
    if (drag.layer === 'mask') {
      target.mask += deg;
      drawn.mask = target.mask;
      spot.setAngle(drawn.mask);
    } else {
      target.wheel -= deg;
      drawn.wheel = target.wheel;
      setWheel(drawn.wheel);
    }
    showKey(keyIndex());
  }

  function settleDrag() {
    const layer = drag.layer;
    target[layer] = Math.round(target[layer] / SECTOR) * SECTOR;
    showKey(keyIndex());
    glide();
  }

  steps.forEach(btn =>
    btn.addEventListener('click', () => step(btn.dataset.layer, Number(btn.dataset.step))));

  // Leave the drag code intact, but do not attach listeners while its direction bug is unresolved.
  if (dragEnabled && wheelSvg) {
    wheelSvg.addEventListener('pointerdown', evt => {
      if (!mode) return;
      evt.preventDefault();
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      target[mode] = drawn[mode];
      drag = { pointerId: evt.pointerId, lastX: evt.clientX, layer: mode };
      wheelSvg.setPointerCapture(evt.pointerId);
    });
    wheelSvg.addEventListener('pointermove', dragSpin);
    wheelSvg.addEventListener('pointerup', evt => {
      if (!drag || evt.pointerId !== drag.pointerId) return;
      wheelSvg.releasePointerCapture(evt.pointerId);
      settleDrag();
      drag = null;
    });
    wheelSvg.addEventListener('pointercancel', evt => {
      if (!drag || evt.pointerId !== drag.pointerId) return;
      try { wheelSvg.releasePointerCapture(evt.pointerId); } catch {}
      settleDrag();
      drag = null;
    });
  }

  /* `reset` is off for the initial pass: the wheel is still being set up and is on C
     already, so there is nothing to wind back. */
  function applyMaskHidden(hidden, reset) {
    maskHidden = hidden;
    hideMask.setAttribute('aria-pressed', String(hidden));
    hideMask.setAttribute('aria-label', hidden ? 'Show mask' : 'Hide mask');
    hideMask.classList.toggle('is-hidden', hidden);
    hideMask.closest('.mask-control')?.classList.toggle('mask-hidden', hidden);
    spot.setVisible(!hidden);
    syncStepButtons();
    // the mask arrows grey out with the window; put the wheel back on C as it leaves
    if (hidden && reset) resetToC();
  }

  if (hideMask) {
    hideMask.addEventListener('click', () => {
      applyMaskHidden(hideMask.getAttribute('aria-pressed') !== 'true', true);
    });
  }
  if (maskGlowToggle) {
    maskGlowToggle.addEventListener('change', () => {
      syncAnimationToggles();
      if (mode === 'mask') spot.setArmed(true);
    });
  }
  if (wheelGlowToggle) {
    wheelGlowToggle.addEventListener('change', () => {
      syncAnimationToggles();
    });
  }
  if (degreeDroneToggle) {
    degreeDroneToggle.addEventListener('change', () => {
      syncAnimationToggles();
    });
  }
  if (dimChordToggle) {
    dimChordToggle.addEventListener('change', () => {
      syncAnimationToggles();
    });
  }
  if (staffToggle) {
    staffToggle.addEventListener('change', () => {
      syncAnimationToggles();
    });
  }

  /* Back to C, keeping whichever layer is armed armed. Shared with hiding the mask:
     a hidden window cannot be aimed, so the wheel returns home rather than being left
     parked on a key nothing is pointing at. */
  function resetToC() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    // wind the accumulated turns off first, so home is at most half a turn away
    drawn.mask  = norm(drawn.mask);
    drawn.wheel = norm(drawn.wheel);
    target.mask = target.wheel = 0;
    setMode(mode || 'wheel');
    showKey(0);
    glide();
  }

  document.getElementById('reset').addEventListener('click', resetToC);

  spot.setAngle(0);
  setWheel(0);
  setMode('wheel');
  showKey(0);
  // the markup declares which layers start hidden; honour it rather than repeat it
  if (hideMask) applyMaskHidden(hideMask.getAttribute('aria-pressed') === 'true', false);
}

return { wireControls };

})();
