# Agent Notes

## Runtime

This is a static browser application. There is no build step, package manager, dependency, or test runner.

Serve the repository over HTTP for validation:

```powershell
py -m http.server 4173 --bind 127.0.0.1
```

The canonical preview URL is `http://127.0.0.1:4173/`.

## File Ownership

- `index.html` defines the controls, dashboard, guide, page structure, and script load order.
- `js/config.js` creates the `CF` namespace and holds constants, the `KEYS` table, and `CF.config.dragEnabled`.
- `js/geometry.js` holds point maths, SVG node builders, and `norm`/`ease`.
- `js/staves.js` holds key-signature layout, the `STAVES` table, and `R_RIM`. `R_RIM` is computed from `STAVES`, so it belongs here.
- `js/spotlight.js` owns `windowPath` and `buildSpotlight`.
- `js/audio.js` owns `createKeyPlayer`.
- `js/scene.js` owns `buildHub` and `draw`.
- `js/controls.js` owns `wireControls` and all interaction state.
- `js/main.js` is the only file that executes on load; it calls `CF.scene.draw()`.
- `tests.html` loads only `config.js`, `geometry.js`, and `staves.js`. Keeping those three free of scene state makes the standalone pure-layer tests possible.
- `style.css` owns responsive layout, animation, lighting, and the space field.
- `staves/` contains the raster key-signature assets used by the SVG.

All script tags are plain tags, not ES modules. Their order is load-bearing.

## Core Contracts

- `KEYS` is clockwise from C, and `SECTOR` is 30 degrees. Keep both in sync if the key model changes.
- `target` is the settled destination; `drawn` is the current rendered angle. Arrow and reset movement use `glide()`.
- `keyIndex()` derives the selected key from `target.mask - target.wheel`. Update the dashboard through `showKey()` whenever that changes.
- The mask, wheel, labels, and staves have different rotation rules. Preserve the counter-rotation logic in `setWheel()` and `buildSpotlight().setAngle()`.
- The scrim is defined in SVG user space and stays anchored to the moving mask layer. Preserve the construction order of the SVG `defs` and scene layers.

`Gb/F#` is the one dual entry because clockwise travel from C adds sharps while counter-clockwise travel adds flats, and the diametrically opposite sector is where six sharps and six flats describe the same pitches enharmonically. It is a structural fact of the wheel, not data to normalize away. It is therefore exempt from the diminished-chord derivation rule in `tests.html`; do not change either the data or that test exclusion.

`CF.config.dragEnabled` is deliberately `false` because pointer dragging currently has an unresolved direction bug. The drag code remains in `controls.js` and must not be removed; only listener registration is gated.

## Visual And Accessibility Checks

- Keep the base stage colour dark (`--stage`) and background motion subtle.
- Maintain the `prefers-reduced-motion` fallback when touching animation.
- Verify desktop at `1440x900` and narrow mobile at `390x844`.
- Check for horizontal overflow, console errors, and missing assets.
- Exercise both arrows, Reset, mask/wheel mode, mask hiding, all visual toggles, and the disabled-drag behavior.
- Confirm staves remain legible and their hover titles and keyboard focus labels work, including `Gb/F#`.
- On narrow mobile, verify key playback uses the selected key, stops on a second press, and does not overlap.

Report which viewport sizes and interactions were actually checked. If browser tooling is unavailable, say so explicitly. Never describe source inspection as completed browser validation.
