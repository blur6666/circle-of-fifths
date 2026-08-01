# Agent Notes

## Runtime

This is a static browser application. Open `index.html` directly; there is no
package manager, build step, or test runner.

## Ownership

- `index.html` defines the controls, dashboard, guide, and page structure.
- `script.js` draws the SVG scene and owns all interaction state.
- `style.css` owns responsive layout, animation, lighting, and the space field.
- `staves/` contains the raster key-signature assets used by the SVG.

## Core Contracts

- `KEYS` is clockwise from C, and `SECTOR` is 30 degrees. Keep both in sync if
  the key model changes.
- `target` is the settled destination; `drawn` is the current rendered angle.
  Arrow and reset movement use `glide()`. Pointer dragging renders directly,
  then `settleDrag()` snaps the moved layer to a sector on release.
- `keyIndex()` derives the selected key from `target.mask - target.wheel`.
  Update the dashboard through `showKey()` whenever that selected key changes.
- The mask, wheel, labels, and staves have different rotation rules. Preserve
  the counter-rotation logic in `setWheel()` and `buildSpotlight().setAngle()`.

## Visual And Accessibility Checks

- Keep the base stage colour dark (`--stage`) and any background motion subtle.
- Maintain the `prefers-reduced-motion` fallback when adding animation.
- Verify desktop and narrow mobile layouts, no horizontal overflow, both drag
  modes snapping to 30-degree positions, arrows, reset, mask hiding, motion
  toggles, and metronome BPM changes.