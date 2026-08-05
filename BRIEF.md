# Circle of Fifths — execution brief

Hand this to a coding agent working inside the `circle-of-fifths` repository.

**This brief is staged. Each stage ends with a hard stop.** Do not begin a stage
before the previous one has been verified and approved by the repository owner.
The work restructures 933 lines of rendering and interaction code that currently
has no test coverage; running it as one pass is how the counter-rotation math
gets silently broken.

---

## 0. Repository context

`circle-of-fifths` is a static browser application: an interactive circle of
fifths for exploring major keys, relative minors, diminished chords, key
signatures, diatonic chords, and modes. A rotatable SVG disc sits under a fixed
"mask" window that exposes one key's full harmonic palette; either the disc or
the mask can be turned, and the dashboard names whatever the window currently
frames.

**Current tree:**

```
index.html          159 lines — controls, dashboard, guide, page structure
script.js           933 lines — the entire SVG scene and all interaction state
style.css           592 lines — layout, animation, lighting, star field
AGENTS.md           agent-facing notes and validation rules
README.md           usage docs + a nine-section visual-design essay
TODO.md             raw working log
image.png           710KB screenshot, 1578×1233
staves/             13 raster PNGs — key signature glyphs
.codex/config.toml  Codex-specific Playwright MCP configuration
.vscode/tasks.json  "preview: serve" task
```

**Goal:** prepare the repository to be published as a portfolio piece. It is
currently private. Nothing here is user-facing yet, so there is no pressure to
keep anything working between stages other than what the verification steps
require.

**Runtime:** static, no build step, no package manager, no dependencies. Served
locally with `py -m http.server 4173 --bind 127.0.0.1`, canonical preview URL
`http://127.0.0.1:4173/`. It will eventually be served from a GitHub Pages
subpath, so **all asset paths must stay relative.**

---

## 1. Decisions already made — do not relitigate

| # | Decision |
| --- | --- |
| D1 | **Pointer dragging is disabled** until the direction bug is fixed. Arrows and Reset remain. |
| D2 | The README's visual-design essay is **deleted**, not relocated. The constants it describes are already documented in code comments. |
| D3 | The global namespace object is **`CF`**. |
| D4 | Git history will be rebuilt as a single squashed commit by the owner, after this work. **Do not run any history-rewriting commands.** |
| D5 | Codex-specific tooling config is **genericized**, not kept. |
| D6 | A small test suite — roughly 20–30 assertions — over the pure layer. |
| D7 | No new features. The `TODO.md` `LATER` block is out of scope. |

---

## 2. Hard constraints — do not violate

- **No build step, no package manager, no dependencies, no test runner.**
- **All asset paths stay relative.** `staves/` is referenced through
  `STAFF_DIR = 'staves'`; keep it that way.
- **`KEYS` is clockwise from C and `SECTOR` is 30 degrees.** If the key model
  changes, both change together. Nothing in this brief should change either.
- **Preserve the counter-rotation logic.** `#disc` receives `rotate(a)`, and
  each upright element receives `rotate(-a)` about its own anchor so it travels
  around the circle while staying the right way up. `setDisc()`, `setWheel()`,
  and `buildSpotlight().setAngle()` follow *different* rotation rules. This is
  the highest-risk area in the repository.
- **`target` is the settled destination; `drawn` is the current rendered
  angle.** Arrow and Reset movement go through `glide()`.
- **`keyIndex()` derives the selected key from `target.mask - target.wheel`,**
  and the dashboard updates through `showKey()` whenever that changes.
- **The scrim is defined in SVG user space** so it stays anchored to the moving
  mask layer. Moving `defs` construction relative to the rest of the build order
  will break it.
- Keep the base stage colour dark and background motion subtle. Maintain the
  `prefers-reduced-motion` fallback when touching animation.

---

# STAGE 1 — Extract the pure layer and stand up tests

**Nothing else changes in this stage.** `script.js` keeps working exactly as it
does now. The only structural change is that pure functions and constants move
out of it into files it loads first.

## 1.1 Introduce the `CF` namespace

Follow the pattern from the owner's other repository:

- The first script file declares `var CF = {};`
- Every subsequent file is an IIFE attaching to `CF`.
- Plain `<script>` tags at the end of `<body>` in dependency order. **Not ES
  modules.**
- Only the final entry point executes anything on load. Everything else defines.

## 1.2 Create `js/config.js`

Move, unchanged: `SVGNS`, `CX`, `CY`, the radius constants (`R_HUB`, `R_DIM`,
`R_MINOR`, `R_MAJOR`, `R_OUT`, `R_MASK_OUT`, `R_RIM`, the `*_TEXT` radii), the
font-size helpers `FS_*`, `SECTOR`, `KEYS`, `ROOT_MIDI`, `MAJOR_SCALE`, the
colour helpers (`hue`, `fill*`, `text*`, `C_*`, `SEAM_W`), all `SCRIM_*` and
`SPOT_*` constants, all `MASK_*` constants, `DEGREE_LABELS`, and every `STAFF_*`
constant including `STAFF_DIR`, `SHARP_ORDER`, and `FLAT_ORDER`.

Keep every existing comment with the constant it explains. Those comments are
the reason the deleted README essay is no loss — do not strip them.

## 1.3 Create `js/geometry.js`

Move, unchanged: `pt`, `el`, `text`, `textLines`, `ringSector`, `circlePath`,
`norm`, `ease`, `DUR`, `WHEEL_POWER_DOWN_MS`.

`el`, `text`, and `textLines` create DOM nodes but hold no state and read no
globals beyond `SVGNS` — they belong here.

## 1.4 Create `js/staves.js`

Move, unchanged: `isDual`, `staffPart`, `staffBoxW`, `staffW`, `staffSrc`,
`accidentals`, `spelt`, `staffTitle`, `staffAt`, `staffImage`.

## 1.5 Create `tests.html`

Model it on the piano repository's `tests.html`: a standalone page that loads
**only** `config.js`, `geometry.js`, and `staves.js`, runs assertions, and
prints a pass/fail tally with expected-vs-actual on failure. No framework.

Target roughly 20–30 assertions. Suggested coverage — **derive every expected
value from the current implementation, do not invent one from theory**:

**`KEYS` table integrity**
- Exactly 12 entries.
- Every entry has a 7-note `scale` array.
- Successive roots are a perfect fifth apart: consecutive `ROOT_MIDI` values
  differ by 7 semitones mod 12.
- `ROOT_MIDI.length === KEYS.length`.
- For every **non-dual** key, `dim` equals the seventh scale degree plus `°`
  (C → `B°`, G → `F#°`). **The `Gb/F#` entry is deliberately exempt** — it
  carries `F°/E#°` against a scale degree of `F/E#`, so exclude it explicitly
  rather than loosening the assertion.
- Exactly one key satisfies `isDual`.

**Angle math**
- `norm(0)`, `norm(190)`, `norm(-190)`, `norm(180)`, `norm(360)`, `norm(540)` —
  confirm the documented contract that the result lands in (-180, 180].
- `ease(0)` and `ease(1)` hit their endpoints exactly.
- `ease` overshoots above 1 somewhere in the middle — assert that a sampled
  midpoint exceeds 1, since the overshoot is the documented intent.

**Staff math**
- `accidentals('sharp', 4)` and `accidentals('flat', 2)` produce the correct
  ordered accidental lists.
- `accidentals(kind, 0)` is empty.
- `spelt('sharp', 1)` uses the **singular** "sharp"; `spelt('flat', 2)` uses the
  plural. This pluralization branch is worth pinning.
- `staffBoxW` with `n = 0` equals `STAFF_W0`.
- The hybrid width equals the flat half plus the sharp half minus one
  `STAFF_CLEF`.
- `staffSrc` returns `none.png` at zero, `hybrid-6-6.png` for the dual case, and
  the correct `sharps-N` / `flats-N` name otherwise.
- `staffPart` returns the flat half plus a `both` pair for the dual key, and a
  null `both` for every other key.

**Geometry**
- `pt(r, deg)` at the cardinal angles. Read the implementation to determine the
  angle convention before writing these; do not assume 0° is up.
- `ringSector` and `circlePath` return non-empty path strings beginning with a
  move command.

## 1.6 Update `index.html`

Add the three new files as `<script>` tags **before** `script.js`, in dependency
order: `config.js`, `geometry.js`, `staves.js`. `script.js` continues to hold
everything else and continues to call `draw()` at the end.

Add a comment above the block noting that order is load-bearing and `config.js`
creates `CF`.

## 1.7 STAGE 1 VERIFICATION — then stop

1. Open `tests.html` over HTTP. All assertions pass.
2. Open the app at `http://127.0.0.1:4173/`. The wheel renders identically to
   before. Compare against `image.png` in the repo root, which is a screenshot
   of the current desktop layout.
3. Check the console for new errors or 404s.
4. Exercise: both arrows, Reset, the mask/wheel mode checkbox, hide-mask, both
   glow toggles, and the degree-drone toggle.
5. Check desktop (1440×900) and narrow mobile (390×844).
6. Confirm the staves still render and their hover titles still read correctly,
   including the `Gb/F#` hybrid.

**Report which viewports and interactions were actually checked. Do not describe
source inspection as completed browser validation. Then stop and wait.**

---

# STAGE 2 — Split the scene and controls, and disable dragging

Only begin after Stage 1 is approved. `tests.html` now exists as a safety net
for the pure layer, though note it does **not** cover anything in this stage.

## 2.1 Create `js/spotlight.js`

Move `windowPath` and `buildSpotlight`.

`buildSpotlight(svg, defs)` returns a closure exposing `setAngle`, `setArmed`,
and `setVisible`. **That interface must survive the move unchanged.** The scrim
lives in SVG user space and stays anchored to the moving mask layer — preserve
the order in which its `defs` are constructed relative to the rest of the scene.

## 2.2 Create `js/audio.js`

Move `createKeyPlayer`. It is self-contained: it holds its own `context`,
`playing`, `preparing`, and `finishTimer` state, and receives
`getKeyIndex` and `prepareKeyForPlayback` as arguments.

## 2.3 Create `js/scene.js`

Move `buildHub` and `draw`.

`draw()` builds the SVG scene and hands off with
`wireControls(spot, showKey, disc, uprights, placeStaves)`. That five-argument
handoff is the existing interface between the build phase and the wire phase.
**Keep it exactly as it is.** Do not "improve" it into an options object.

## 2.4 Create `js/controls.js`

Move `wireControls`. All of its mutable state — `target`, `drawn`, `raf`,
`mode`, `wheelPowerDown`, `drag`, `hasRotatedWheel` — is already function-scoped
and moves with it. There is **no top-level mutable state anywhere in
`script.js`**, so nothing needs relocating to a shared module.

## 2.5 Create `js/main.js` and delete `script.js`

`main.js` is the only file that executes on load. It should contain essentially
one call to `CF.scene.draw()`.

Once every function has a home, `script.js` is empty and is deleted. Update the
`<script>` tags in `index.html` to the final order:

```
config.js  geometry.js  staves.js  spotlight.js  audio.js  scene.js  controls.js  main.js
```

## 2.6 Disable pointer dragging

The wheel currently spins the wrong direction on drag, unpredictably and with no
reliable reproduction. Rather than ship that, dragging is switched off until it
is fixed.

**Disable it behind a flag. Do not delete the code.**

- Add `CF.config.dragEnabled = false` to `config.js`, with a comment naming the
  open bug as the reason.
- In `controls.js`, gate the `pointerdown` / `pointermove` / `pointerup` /
  `pointercancel` listener registration on that flag. Gate registration itself,
  not the handler bodies — leaving the listeners attached and returning early
  risks swallowing clicks meant for other controls.
- The `dragSpin` and `settleDrag` functions stay in the file, unreferenced when
  the flag is off.
- Update the on-screen hint text so it no longer instructs the user to drag.
  The arrows and Reset remain the way to move.

Two previously-fixed items become dormant, not broken: the drag magnetization
behaviour and the drag text-selection fix. Leave both in place — they are needed
again the moment the flag flips back.

## 2.7 STAGE 2 VERIFICATION — then stop

1. `tests.html` still passes with the same count as Stage 1.
2. The app renders identically. Compare against `image.png` again.
3. **Rotation is the risk area.** Step through all twelve keys with the arrows
   in wheel mode, then all twelve in mask mode, and confirm at every step that
   the key names, minor names, diminished chords, and degree labels stay upright
   and that the dashboard names the key framed by the window.
4. Reset from a rotated position takes the short way home.
5. The staves rotate with the disc and stay legible.
6. The mask glow, wheel glow, and degree-drone toggles all still work, and the
   armed states still show.
7. Dragging does nothing, and clicking on the wheel does not interfere with any
   other control.
8. The mobile key-player button still plays the selected key's scale and
   diatonic triads, still stops on a second press, and still auto-spins to a
   random key if the wheel has never been moved.
9. Console clean at desktop and narrow mobile.

**Report what was checked. Then stop and wait.**

---

# STAGE 3 — Documentation and publish preparation

Only begin after Stage 2 is approved.

## 3.1 Rewrite `README.md` from scratch

Delete the existing file and write a new one. **The nine-section visual-design
essay is not carried over in any form.** The constants it describes
(`SCRIM_ALPHA`, `STAFF_OPACITY`, `C_MASK_EDGE`, `MASK_ARMED_SHADOW_A` and the
rest) already carry explanatory comments in `config.js`, so the essay was a
prose duplicate of self-documenting code.

New structure:

1. Title.
2. One or two sentences on what it is.
3. **Live demo link** — placeholder for now; the owner adds the URL at publish.
4. Hero image — `docs/hero.png` (see 3.3).
5. **How to use it** — mask versus wheel mode, the arrows, Reset, what the
   window frames, what the dashboard reads, the visual toggles, and the mobile
   play button. Adapt from the existing "Using the wheel" section, which is
   accurate; remove the drag instructions.
   **Add a short paragraph on the enharmonic meeting point**, because it is the
   payoff of the whole visualization and the current README never states it:
   turning clockwise from C adds a sharp each step, turning counter-clockwise
   adds a flat, and the sector directly opposite C is where the two directions
   arrive at the same pitches — six sharps and six flats, which is why that one
   sector carries both spellings and a combined key signature. Keep it to a few
   sentences in plain language; it is an observation about the instrument, not a
   theory lesson.
6. **Running it locally** — no build step; serve with the given command or use
   the VS Code task.
7. **Testing** — `tests.html`, what it covers, and that it deliberately covers
   the pure layer only.
8. **Known limitations (deliberate)** — a short, plain list. Include: dragging
   is disabled pending an unresolved direction bug; desktop layout has excess
   whitespace at high display scaling; key signature glyphs are raster images
   rather than vector.

Write section 8 matter-of-factly, as stated scope decisions rather than
apologies.

## 3.2 Add a LICENSE

MIT, matching the owner's other repository. Copyright holder `blur6666`, year
2026.

## 3.3 Handle the images

- Resize `image.png` to roughly 1200px wide, optimize it, and move it to
  `docs/hero.png`. It has already been checked for browser chrome and local path
  leakage and is clean.
- Delete the original 710KB `image.png` from the working tree.
- Leave `staves/` alone.

## 3.4 Untrack `TODO.md`

`git rm --cached TODO.md`, then add `TODO.md` to `.gitignore`. The file stays on
disk as the owner's working log. The `.gitignore` rule must exist even though
history will be squashed later, or it gets re-added by accident.

## 3.5 Add head metadata to `index.html`

Currently `<head>` has charset, viewport, title, and font links only. Add
`<meta name="description">` and Open Graph tags (`og:title`, `og:description`,
`og:type`, `og:url`) so a shared link renders a preview card. Leave `og:image`
out unless the owner supplies a hosted screenshot URL — a broken reference is
worse than none.

Add a favicon as an inline SVG data URI rather than a binary asset.

## 3.6 Rewrite `AGENTS.md`

This file is the most valuable document in the repository. Rewrite it carefully
rather than patching it.

**Remove:** everything Codex-specific — the `@Browser` discussion, the `/mcp`
check, the trust-and-restart steps, and the references to `.codex/config.toml`.
Delete `.codex/config.toml` itself.

**Keep, in substance:** the runtime description, the canonical preview URL, the
ownership map, the core contracts section, and the visual and accessibility
checks.

**Keep verbatim in spirit — this is the single most important line in the
repository:** the rule that an agent must report which viewport sizes and
interactions were checked, must say so explicitly when browser tooling is
unavailable, and must never describe source inspection as a completed browser
validation. Restate it in client-neutral terms.

**Add:**
- The new file layout and the rule that `main.js` is the only file that executes
  on load.
- That `tests.html` loads `config.js`, `geometry.js`, and `staves.js` only, and
  that keeping those three free of scene state is what makes that possible.
- That `CF.config.dragEnabled` is deliberately `false`, why, and that the drag
  code is retained rather than removed.
- That the `Gb/F#` key is the one dual entry, **and why**: going clockwise from
  C adds sharps, counter-clockwise adds flats, and the position diametrically
  opposite C is where the two directions meet — six sharps and six flats
  describing the same pitches enharmonically. It is not an anomaly to be
  normalized away; it is the structural fact the wheel exists to show. It is
  therefore exempt from the `dim` derivation rule in `tests.html`, and a future
  agent must not "fix" either the data or the test exclusion.

## 3.7 Update `.vscode/tasks.json` if needed

Confirm the `preview: serve` task still works. Leave it otherwise.

## 3.8 STAGE 3 VERIFICATION

1. `tests.html` passes.
2. App renders correctly at both viewports, console clean.
3. Every link in `README.md` resolves, and `docs/hero.png` displays.
4. `git status` shows `TODO.md` untracked and ignored.
5. Repository contains no reference to `.codex`, `@Browser`, or `/mcp`.
6. Confirm the head metadata renders by loading the page and inspecting it.

---

## 4. Out of scope for the agent

Handled by the repository owner:

- Squashing and rebuilding git history. **The agent runs no history commands.**
- Deleting and recreating the GitHub repository.
- Enabling GitHub Pages and adding the live URL to the README and the About
  sidebar.
- Repository description and topics.
- Filing GitHub Issues for the drag-direction bug and the high-DPI layout
  issue — done *after* publishing, since Issues filed on a repository that is
  later deleted are lost with it.
