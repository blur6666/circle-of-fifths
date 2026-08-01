# Circle of Fifths

Study aid for music theory. Solo amateur project, one user, Chrome on Chrome OS.
No build step, no dependencies, no tests, no framework. `index.html` + `style.css` +
`script.js` — open index.html directly.

## Working agreement

Don't do more than asked; ask if unsure. No tests, no architecture, no
hardware/software edge-case support unless asked. Styling adaptations are fine.
Reference image: `circle-of-fifths-chart.jpg` — copy it; you don't need to reason
about music theory.

## How it draws

`script.js` builds the wheel as SVG into `#wheel`. Angle 0 = 12 o'clock, increasing
clockwise; 12 sectors of 30°, clockwise from C. In a 1000-unit viewBox centred
(500,500): hub r=113, minor ring to 193, major ring to 268, outer ring to 470,
staff grids at r=372. The viewBox reframes itself to the outermost visible ring.
Rings inner→outer: relative minor, major key, key signature. All text stays upright.
Ring/hub/box colours are JS constants, not CSS vars — Chrome won't resolve `var()`
inside SVG presentation attributes.

## The outer graphic is a staff, not a piano

Left column = the 5 staff lines (F D B G E, top down); right column = the 4 spaces
(E C A F), offset half a step. Filled box = that note takes the sharp/flat.
The chart uses **one box per note name**, so: the bottom-line E and bottom-space F
never fill in any key, and the 7th flat goes in the *top-line* F (a real C♭ signature
would put F♭ in the bottom space). This is deliberate — keep it.

## Enharmonic sectors

C (top) and the three at the bottom get two grids — flat spelling screen-left, sharp
screen-right — and dual names: D♭/C♯ (b♭/a♯), G♭/F♯ (e♭/d♯), C♭/B (a♭/g♯). The two
counts really do differ (D♭ = 5 flats, the same keys as C♯ = 7 sharps).

## Flags, top of script.js

- `SHOW_KEY_SIGNATURES` — the whole outer ring. On.
- `SHOW_COUNTS` — the accidental-count numbers beside the grids. **Off** by choice.
  Turning it on re-spreads the grids to make room and needs a line put back in the
  index.html legend.

## Status

Phase 1 done. Phase 2: a rotating "mask" element that shows/hides values
geometrically — do not build until the steps are given.
