# Circle of Fifths

Study aid for music theory. Solo amateur project, one user, Chrome on Windows.
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
clockwise; 12 sectors of 30°, clockwise from C. Centre (500,500): hub r=96,
diminished ring to 178, minor to 293, major to 400, outer to 491. Those are the
design's `emphasis-major` preset scaled from its 760-unit stage by 1000/760 — the
diminished ring is a thin inner collar, majors and minors take the middle, and the
signature band is wide enough for real staves later. Each label sits at the middle
of its band and is sized off that band's width (`FS_MAJOR`/`FS_MINOR`/`FS_DIM`), so
re-proportioning the rings re-sizes the type with them. The viewBox reframes itself
to the outermost visible ring, so its origin is *not* (0,0) — see the mask note
below. Rings inner→outer: diminished chord (vii° of the key), relative minor, major
key, key signature. All text stays upright. Everything the spotlight acts on goes
inside `<g id="disc">`; the hub read-out is drawn after, on top.

Colours are JS constants, not CSS vars — Chrome won't resolve `var()` inside SVG
presentation attributes. The palette is the design's **Nocturne**: dark stage, one
hue per sector at `(45 + i*30) % 360`, so C is amber at the top, A green, Gb/F#
blue, F magenta back round. Fills/text are `oklch()` at fixed lightness per ring
(`fillDim`/`fillMin`/`fillMaj`/`fillSig`, `textMaj`/`textMin`/`textDim`/`ink`) —
change the hue formula and the whole wheel follows. Seams between sectors and
between rings are stage-colour strokes, not lines of their own.

**Type runs larger and brighter than the study, on purpose.** The design stepped
label lightness down as you move inward (0.91 / 0.84 / 0.75) and sized the inner
bands small; at the size this actually renders — see Sizing — that left the middle
of the wheel muddy and the diminished ring near 8px. The three `text*` lightnesses
now sit close together, which *increases* centre contrast because the inner bands
are the darkest fills, and the `FS_*` fractions are up across the board. Size, not
lightness, carries the hierarchy. The hub's sub-line was the worst of it: the
study's `#6b7183` on a near-black hub was effectively invisible. Don't "restore"
these to the study's numbers.

## Key signatures are PNGs

The outer ring places a picture of the real staff, one file per key signature, in
`staves/`: `none.png` (C — clef and bare staff), `sharps-1.png` … `sharps-7.png`,
`flats-1.png` … `flats-7.png`. **`staves/*.svg` are the source** — LilyPond grand
staves — and `staves/convert.sh` cuts the bass half off each one and normalises it
into the PNG. Both source and output are committed; `script.js` only positions them.
How the cut works, and why one file needs a fallback, is in `staves/README.md`.

`staffImage()` sizes each box from `STAFF_H`, `STAFF_W0` and `STAFF_W_STEP` — the
PNG's height and width expressed in staff-line gaps, **measured from what
convert.sh actually produces**, not guessed from the design. Sharps get a wider step
than flats because the glyph is wider. `preserveAspectRatio` is `meet`, and
`STAFF_SLACK` deliberately keeps the box a couple of percent wider than the art so
*height* is always the binding side — since every PNG is the same height, that is
what guarantees identical line spacing from sector to sector. Re-measure all four if
convert.sh's output size changes.

### They hang off the rim, and that is deliberate

**Every staff is the same size. This is a hard requirement — do not reintroduce
anything that scales one sector's staff differently from another's.**

`STAFF_S` is a *chosen* constant, not solved from the geometry. It used to be solved
— shrunk until the widest signature fitted inside the old outer band — and that made
them illegibly small. They are now placed outside the disc and are free to overrun
it; there is no containing ring any more (`SHOW_KEY_SIGNATURES` is off, because the
band existed only to hold them and was left an empty ring of colour).

Resting placement is precomputed into `STAVES` before anything is drawn, because the
viewBox has to be framed around it. Each staff is upright while the rim curves away
beneath it, so a block covers a different amount of radius depending where it sits —
height at 12 o'clock, full width at 3. Putting every centre on one circle would shove
the 7-sharp one back over the major ring and into its label, so instead **each is
pushed out by half its own reach**: all twelve start at the same radius and hang
outward as far as they individually need. The outer boundary is therefore ragged.
That is the price of uniform size, and it is paid on black where it doesn't show.

`staffAt(w, h, deg)` is that calculation, and it is a *function of the current
angle*, not of the sector — because the wheel turns now. See below.

The staves are drawn in `<g id="staves">`, **outside `#disc`**, and are walked round
by `placeStaves()` rather than riding the disc's transform.

`R_RIM` is how far the drawing reaches **at rest**, corners included. It frames the
viewBox and **nothing else** — in particular the spotlight stops at the disc edge and
takes no account of the staves, so they are never dimmed, blurred or lit whichever
key is selected. That is deliberate; don't wire the mask back out to `R_RIM`.

Raising `STAFF_S` makes the staves bigger *and the coloured disc smaller*, since the
viewBox grows to hold them and everything scales down together. That trade is the
only lever; there is no free legibility here.

`SHOW_STAVES` takes them off entirely when you want them out of the way. Keep it off
if `staves/` is ever cleared — an `<image>` at a missing URL draws Chrome's
broken-image icon, twelve of them round the wheel — and don't put a text stand-in
back in there instead.

### What turning the wheel did to them

A staff placed for 6 o'clock is 248 units wide and 99 tall; carry it round to 3
o'clock without moving it outward and it digs **76 units into the disc**, straight
over the major label. Three ways out, and the numbers decided it:

- pin every staff at the radius that clears at *any* angle (half its diagonal) —
  correct at all times, but the viewBox has to grow to suit and the coloured disc
  loses **15.4% of its size, permanently**, to buy clearance that only matters
  while something is moving. Rejected.
- recompute the radius from the angle it is currently at — at rest this is
  byte-for-byte the old layout, and the wide ones only swing out mid-turn. Chosen.
- swap the images between fixed slots instead of moving them. Rejected: the swap is
  a jump, and the rings are gliding.

So mid-turn a staff can reach 12% further out than `R_RIM` allows for. Measured, and
it is **sideways only** — the resting frame is never beaten vertically, because a
block pointing its width outward is at 3 or 9 o'clock by definition. `#wheel` is
therefore `overflow: visible`, and the excess paints onto stage-coloured page
background either side. Don't "fix" that by growing the viewBox; that is the 15.4%
above. Two neighbouring staves can also touch briefly while they slide, since each
finds its own radius at its own rate. Transient, on black, left alone.

## No enharmonic sectors any more

The wheel used to give C and the three at the bottom two spellings and two key
signatures each — `Db/C#`, `Gb/F#`, `Cb/B`. That is gone: every sector now has exactly
one name per ring and one key signature. Sharps run 0-6 from C round to F#, then the
seam falls and flats run 5-1 from Db back to F. `flats-6/7.png` are orphaned by that
and nothing loads them.

If duals ever come back, note what bit last time: a key that names only `sharps: 0`
and no `flats` made `k.sharps || k.flats` evaluate to `undefined`, which turned
`STAFF_S` into `NaN` through `Math.min` and blanked *every* staff on the wheel, not
just that one. Hence the `|| 0` in `staffPart`.

### Why there is no sharp/flat switch, and what it costs

A control to flip 5/6/7 between `B F# C#` and `Cb Gb Db` was considered and dropped.
It would not fix anything — it would only move which keys are wrong.

The window spans three adjacent sectors (IV, I, V), so only five windows touch the
enharmonic block: roots `E`, 5, 6, 7, and `Ab`. The other seven are correct under any
spelling. Twelve sectors cannot hold fifteen keys, so **no layout gets all five
right** — three is the ceiling, and four layouts tie at 10 of 12 overall:

| positions 5, 6, 7 | correct | misspelled |
|---|---|---|
| B, F#, C# | E, B, F# | C#, Ab |
| **B, F#, Db** (ours) | E, B, Ab | F#, Db |
| B, Gb, Db | E, Db, Ab | B, Gb |
| Cb, Gb, Db | Gb, Db, Ab | E, Cb |

The middle two are **mixed** — a sharp spelling next to a flat one — and that is
musically fine. It is tempting to reason that the three must flip as a unit because
any *correct* window spells them uniformly; that inference is wrong, because two
windows have to break whatever you choose, and mixed layouts simply break different
ones.

Position 7 is spelled `Db`, chosen so that `Ab` major — much the most used key of the
group — reads correctly. **Two windows are knowingly wrong as a result, and are not
bugs:**

- `F#` major shows its V as `Db`, where the music says `C#`.
- `Db` major shows its IV as `F#`, where the music says `Gb`.

Don't "fix" either in isolation. Repairing one breaks two others and the score stays
10 of 12 whatever you do. Only change the spelling if the owner wants a different
pair of casualties.

## Flags, top of script.js

- `SHOW_KEY_SIGNATURES` — the outer coloured band. **Off**; it only ever existed to
  hold the staves, which now sit outside it. The disc ends at the major ring.
- `SHOW_STAVES` — the staff PNGs. On.
- `SHOW_COUNTS` — the accidental-count numbers on the rim. **Off** by choice, and
  never used since the staves landed. Decide whether it stays.

## Mask — a spotlight

A window that holds one key: 3 cells wide over the staff, major and minor rings,
narrowing to 1 cell over the diminished ring. Built once over sector 0 (straight up)
by `windowPath()`, then rotated. Outside it the disc is blurred and desaturated as
well as dimmed, per the design — three layers over the same `evenodd` "outside"
shape (outer circle + hub circle + the window), built in `buildSpotlight()`:

1. `<use href="#disc">` clipped to the outside region and filtered with
   `feGaussianBlur` + `feColorMatrix saturate`. Clipping happens *after* filtering,
   which is what keeps the window edge crisp while the blur bleeds behind it. The
   sharp original shows through wherever the clip cuts the copy away.
2. the scrim, dimming that same region towards the stage colour.
3. the window edge — a near-white hairline with a violet CSS `drop-shadow` bloom.

`SCRIM_ALPHA`, `SPOT_BLUR` and `SPOT_SAT` at the top of the file dial the three
independently.

Positioned with the SVG `transform="rotate(a cx cy)"` **attribute**, tweened by
hand with rAF. Do not switch this to a CSS transform: the viewBox origin is offset
from (0,0), and `transform-box`/`transform-origin` put the pivot ~41px off, which
sends the mask sliding off-centre as it turns. The clipPath's child path takes the
*same* transform on every frame — if only the mask group turns, the lit region and
the outline drift apart.

The spotlight is always on. The switch that used to hide it is gone — it was there
before the wheel could turn, and once "turn the mask" became one of two modes, a
control that removed the mask was answering a question nobody asked.

How it is meant to be read: usually the *middle* major cell, or the middle minor
cell, is the root of the key — the rest of the window is that key's other chords.
There are other uses the owner hasn't detailed.

## Two things can turn

The window can move over a still wheel, or the wheel can turn under a still window —
the second being what a physical cardboard wheel does. One at a time, and **neither
until you pick one**: `mode` is `null | 'mask' | 'wheel'` and the arrows are
`disabled` until it isn't null. That is the point, not an oversight — the dead
arrows are what make arming visible.

Angles accumulate and are never wrapped, so you can keep going round either way
forever and 390° is a different number from 30°. Only Reset normalises, via `norm()`,
so home is at most half a turn away rather than however many the user racked up.

Each press is one twelfth. The arrows are stacked vertically and point up and down —
up is the previous key, down the next, the way a list scrolls. In wheel mode the disc
turns the opposite way to bring that key up to the window. `keyIndex()` reads the hub
off the difference between the two angles, so it stays right however you mix modes.

`ease()` is easeOutBack: no ease-in, so the click bites at once, then ~7% past the
mark and pulled back. That overshoot is the whole feel — it reads as dropping into a
detent. `c1` is how far it goes over.

### Arming is signalled three times over

Because the request was specifically that the user can see the next move is
available and know how to make it: the chosen segment lights, the arrows come alive,
and the thing that will actually move starts pulsing **on the wheel itself** —
`body.armed-mask` breathes `.arm-glow` (a fat invisible copy of the window outline,
under the real one) and `body.armed-wheel` crawls `#arm-ring` (marching ants just
inside the rim). A hint line above the picker says which in words. Both cues are
CSS animations on elements whose colours still come from the JS constants; the fat
copy exists so the real edge keeps its own colour and bloom untouched.

Disabled arrows are spelled out in real greys (`#7b8199` on `#171a24`), not as an
opacity on the enabled style. At `opacity: 0.32` over a near-black stage they sank
into it and read as *absent* rather than as *waiting*, which is the opposite of the
point — they have to stay plainly visible to be plainly unavailable.

Reset returns the lot to a fresh load — verified pixel-identical — and disarms. It is
the one control that isn't grey: it borrows **hue 15**, which is sector 11's, the
crimson F is drawn in, at the ring fills' own lightness and chroma. Any "red" on this
page should come out of the wheel's twelve hues rather than off a generic palette.

### Labels stay upright while the wheel turns

`#disc` takes `rotate(a)`; every label on it takes `rotate(-a)` about **its own
anchor**, so it travels round the circle without going over on its head. The list is
built during `draw()` by `upright()`. This keeps the wheel's oldest rule ("all text
stays upright") rather than copying the cardboard wheel literally, because the type
here is already at the edge of legible — see Sizing. The staves are handled
separately and are not in that list; see the staves section.

Two things this costs: the veil is a filtered `<use>` of a `#disc` that now moves,
so it re-filters every frame instead of once, and 36 labels get a `setAttribute` per
frame. Both fine at this size, but that is the budget if anything else wants adding
to the rotating group.

## Two screens

The page is two sections, each `min-height: 100vh`. The first is the instrument and
nothing else; the second is the reading of it, in prose. A link at the foot of the
right-hand column is the only thing pointing down — without it the second screen is
invisible.

Screen one is three grid columns, `1fr auto 1fr`:

- **left** — the whole control column, at the window's vertical midpoint and hard
  against the left edge: hint, mode picker, the two arrows stacked, then Reset held
  back a little so it can't be hit by accident.
- **middle** — the wheel.
- **right** — `How to read it`, the short version.

`1fr auto 1fr` puts the wheel in the middle of the **window**, not of the leftovers.
That is the point of the layout, and it means the two side columns are equal by
construction — you cannot give the guide more room than the controls without moving
the wheel off centre. Under 1000px it all collapses to one column.

The title is `position: absolute` in the top-left corner. In flow it pushed the wheel
down by its own height, and the wheel is sized off whatever height is left, so it was
costing ~55px of diameter to sit in a corner that is empty anyway.

## Sizing

`#wheel` is `min(100vh - 76px, 58vw)`. Only 42 of that 76 is real chrome (the
screen's top and bottom padding); the other 34 buys clearance on the right — see
below. Everything in the SVG is in user units scaled by that: the viewBox is 1166
wide, so *n* user units render at roughly *n*/1.7 px on a 1366x768 screen. That is
about 20% more than before the layout moved, when the wheel shared a column with the
title and two rows of controls.

**The guide's width and the wheel's height are one constraint, not two.** At
1366x768 the wheel is 692 wide, and the widest key signature swung round to 3
o'clock reaches 43px past the box's own edge, to x=1072; the guide starts at 1095.
At 722/255 a staff crawled over the text mid-turn — seen, not theorised. Widening
one means shrinking the other. The left column has no such problem: the controls
clear the same overrun by 140px.

This is what killed the old lettered box grids: their letters were 1% of the wheel's
width, i.e. ~5px on screen, and no font-size could fix it because the signature band
is only 9% of the radius. The layout has since bought most of the room there was to
buy and it still would not be enough. Staff PNGs sidestep it — hairlines and accidental glyphs stay legible at a
size where fifteen letters in boxes never could. Keep that in mind before adding
anything else text-shaped to the outer ring.

The diminished ring labels are the next smallest thing at ~8px; if anything needs
more room, they do.

## Fonts

Space Grotesk and Noto Music, pulled from Google Fonts in `index.html`. Still no
build step and nothing installed, but the page now wants the network on first load;
the stack falls back to `system-ui` offline.

## Status

Phases 1 and 2 done. The Nocturne styling pass from `design-reference.html` is
applied — geometry, palette, type and the spotlight. The lettered box grids are
gone; the outer ring is wired to place staff PNGs and sits empty until they arrive.

The staves are in and on — real LilyPond artwork, converted and placed, fitting
inside the band at every sector.

Wheel rotation is in: mask-or-wheel mode picker, armed cues, unlimited stepping
either way with an overshoot snap, and Reset. See "Two things can turn".

The page has been rebuilt around it — two full-height screens, title in the corner,
controls down the left, the wheel given the whole middle of the window, and the
reading of it on the right and on screen two. See "Two screens".

**Now: the type pass.** Sizes and label colours have had one round — bigger, and
brighter through the middle. Still open: the page moved to Roboto, which has no #
or b, so those come from a system fallback and sit oddly next to the letters.

Loose ends: `6flats.svg` wants re-exporting without its notes and barline (see
`staves/README.md`), and `SHOW_COUNTS` has never been used since the staves landed —
decide whether it stays.

Known nit: Space Grotesk has no # or b, so those fall through to Noto Music, whose
glyphs sit low and large next to the letters. Visible on `Db/C#`, `f#` and the
diminished ring.
