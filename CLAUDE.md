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
hue per sector at `(45 + i*30) % 360`, so C is amber at the top, A green, G♭/F♯
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

Placement is precomputed into `STAVES` before anything is drawn, because the viewBox
has to be framed around it. Each staff is upright while the rim curves away beneath
it, so a block covers a different amount of radius depending where it sits — height
at 12 o'clock, full width at 3. Putting every centre on one circle would shove the
7-sharp one back over the major ring and into its label, so instead **each is pushed
out by half its own reach**: all twelve start at the same radius and hang outward as
far as they individually need. The outer boundary is therefore ragged. That is the
price of uniform size, and it is paid on black where it doesn't show.

`R_RIM` is how far the drawing actually reaches, corners included. It frames the
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

## No enharmonic sectors any more

The wheel used to give C and the three at the bottom two spellings and two key
signatures each — `D♭/C♯`, `G♭/F♯`, `C♭/B`. That is gone: the bottom half is now
written as sharps throughout (B, F♯, C♯) and only A♭ E♭ B♭ F carry flats, so every
sector has exactly one name per ring and one key signature. `flats-5/6/7.png` are
orphaned by that and nothing loads them.

If duals ever come back, note what bit last time: a key that names only `sharps: 0`
and no `flats` made `k.sharps || k.flats` evaluate to `undefined`, which turned
`STAFF_S` into `NaN` through `Math.min` and blanked *every* staff on the wheel, not
just that one. Hence the `|| 0` in `staffPart`.

### Why there is no sharp/flat switch, and what it costs

A control to flip 5/6/7 between `B F♯ C♯` and `C♭ G♭ D♭` was considered and dropped.
It would not fix anything — it would only move which keys are wrong.

The window spans three adjacent sectors (IV, I, V), so only five windows touch the
enharmonic block: roots `E`, 5, 6, 7, and `A♭`. The other seven are correct under any
spelling. Twelve sectors cannot hold fifteen keys, so **no layout gets all five
right** — three is the ceiling, and four layouts tie at 10 of 12 overall:

| positions 5, 6, 7 | correct | misspelled |
|---|---|---|
| **B, F♯, C♯** (ours) | E, B, F♯ | C♯, A♭ |
| B, F♯, D♭ | E, B, A♭ | F♯, D♭ |
| B, G♭, D♭ | E, D♭, A♭ | B, G♭ |
| C♭, G♭, D♭ | G♭, D♭, A♭ | E, C♭ |

The middle two are **mixed** — a sharp spelling next to a flat one — and that is
musically fine. It is tempting to reason that the three must flip as a unit because
any *correct* window spells them uniformly; that inference is wrong, because two
windows have to break whatever you choose, and mixed layouts simply break different
ones.

**Two windows are knowingly wrong, and are not bugs:**

- `A♭` major shows its IV as `C♯`, where the music says `D♭`.
- `C♯` major shows its V as `A♭`, where the music says `G♯` — a spelling that has no
  sector at all.

Don't "fix" either in isolation. Changing position 7 to `D♭` repairs `A♭` but breaks
`F♯` and `D♭` instead; the score stays 10 of 12. Only change the spelling if the
owner wants a different pair of casualties.

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

Arrows above and below the wheel step it by one fifth; a switch toggles it (which
hides the veil as well as the scrim, so the whole wheel goes sharp). The hub reads
out whichever key the window is on, with its accidental count under it.

How it is meant to be read: usually the *middle* major cell, or the middle minor
cell, is the root of the key — the rest of the window is that key's other chords.
There are other uses the owner hasn't detailed.

## Sizing

`#wheel` is capped by width, by 950px, and by `100vh - 132px` so the wheel plus both
arrow rows fit one screen. On a 1366x768 Chromebook that lands the wheel near 505px,
and everything in the SVG is in user units scaled by that — the wheel's viewBox is
1012 wide, so a size of *n* user units renders at about *n*/2 px.

This is what killed the old lettered box grids: their letters were 1% of the wheel's
width, i.e. ~5px on screen, and no font-size could fix it because the signature band
is only 9% of the radius. Reclaiming the whole 132px of page chrome would only buy
~18%. Staff PNGs sidestep it — hairlines and accidental glyphs stay legible at a
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

**Now: the type pass.** Sizes and label colours have had one round — bigger, and
brighter through the middle. Still open: the page moved to Roboto, which has no ♯
or ♭, so those come from a system fallback and sit oddly next to the letters.

Loose ends: `6flats.svg` wants re-exporting without its notes and barline (see
`staves/README.md`), and `SHOW_COUNTS` has never been used since the staves landed —
decide whether it stays.

Known nit: Space Grotesk has no ♯ or ♭, so those fall through to Noto Music, whose
glyphs sit low and large next to the letters. Visible on `D♭/C♯`, `f♯` and the
diminished ring.
