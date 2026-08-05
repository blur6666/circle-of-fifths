# Agent Notes

## Runtime

This is a static browser application. Open `index.html` directly; there is no
package manager, build step, or test runner.

For agent-driven browser validation, serve the repository over HTTP instead of
using a `file://` URL. Run the VS Code task `preview: serve`, or start the same
server from a terminal:

```powershell
py -m http.server 4173 --bind 127.0.0.1
```

The canonical preview URL is `http://127.0.0.1:4173/`.

## Browser Validation

- In Codex IDE or CLI, use the project-configured `playwright` MCP server. The
  built-in `@Browser` surface is not available in those clients.
- After cloning or changing `.codex/config.toml`, trust the project, restart the
  Codex extension/session, and confirm `playwright` is connected with `/mcp`.
- In the ChatGPT desktop app, the built-in Browser plugin may be used instead:
  invoke `@Browser` and open the canonical preview URL.
- For every feature or bugfix that changes rendered UI or interaction, inspect
  the page at desktop (1440 x 900) and narrow mobile (390 x 844), check the
  browser console for new errors, and exercise the affected controls.
- Report which viewport sizes and interactions were checked. If browser tooling
  is unavailable, say so explicitly; do not describe source inspection as a
  completed browser validation.

## Ownership

- `index.html` defines the controls, dashboard, guide, and page structure. The
  `<script>` order at the end of `<body>` is load-bearing: `js/config.js` creates
  the `CF` namespace and each later file attaches to it.
- `js/config.js` holds the constants and the `KEYS` table.
- `js/geometry.js` holds point maths, the SVG node builders, and `norm`/`ease`.
- `js/staves.js` holds the key-signature layout, plus the `STAVES` table and
  `R_RIM`. `R_RIM` reads like a radius constant but is computed from `STAVES`,
  which needs this file's functions — moving it to `config.js` makes it a forward
  reference. Leave it where it is.
- `tests.html` loads only those three files. Keeping them free of scene state is
  what makes that possible; do not reach for the DOM or interaction state in them.
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
  modes snapping to 30-degree positions, arrows, reset, mask hiding, and motion
  toggles. On narrow mobile, also verify key playback uses the selected key,
  stops on a second press, and does not overlap.
