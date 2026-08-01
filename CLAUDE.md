# Circle of Fifths

Study aid for music theory. Solo amateur project, one user, Chrome on Chrome OS.
No build step, no dependencies, no tests, no framework. `index.html` + `style.css` +
`script.js` — open index.html directly.

## Working agreement

Don't do more than asked; ask if unsure. No tests, no architecture, no
hardware/software edge-case support unless asked. Styling adaptations are fine.
The reference images were dropped from the repo once a proper design mockup was on
the way. Everything they encoded is written down below, so you shouldn't need them —
but they are still in git history if you do:

    git show 0fac0cd:circle-of-fifths-chart.jpg > chart.jpg

(likewise `circle-of-fifths-chart-mask-example.jpg`, the owner's mask sketch, and
`circle-of-fifths-mask.png`, a photo of a physical wheel.)

## How it draws

`script.js` builds the wheel as SVG into `#wheel`. Angle 0 = 12 o'clock, increasing
clockwise; 12 sectors of 30°, clockwise from C. Centre (500,500): hub r=62,
diminished ring to 144, minor to 208, major to 274, outer to 444, staff grids at
r=359. The viewBox reframes itself to the outermost visible ring, so its origin is
*not* (0,0) — see the mask note below. Rings inner→outer: diminished chord (vii° of
the key), relative minor, major key, key signature. All text stays upright.
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

## Mask

A window that fades everything but one key: 3 cells wide over the staff, major and
minor rings, narrowing to 1 cell over the diminished ring. Built once over sector 0
(straight up) by `windowPath()`, then rotated. Dimming is one `evenodd` path —
outer circle + hub circle + the window — filled with the page background at 0.82.

Positioned with the SVG `transform="rotate(a cx cy)"` **attribute**, tweened by
hand with rAF. Do not switch this to a CSS transform: the viewBox origin is offset
from (0,0), and `transform-box`/`transform-origin` put the pivot ~41px off, which
sends the mask sliding off-centre as it turns.

Arrows above and below the wheel step it by one fifth; a switch toggles it.

How it is meant to be read: usually the *middle* major cell, or the middle minor
cell, is the root of the key — the rest of the window is that key's other chords.
There are other uses the owner hasn't detailed.

## Sizing

`#wheel` is capped by width, by 950px, and by `100vh - 132px` so the wheel plus both
arrow rows fit one screen. Below ~1080px of viewport height the height cap wins and
the staff-grid letters get small; raise the subtraction to trade scrolling for
legibility.

## Status

Phases 1 and 2 done. Next up is a styling pass, pending the owner's designer —
do not start it unprompted.
