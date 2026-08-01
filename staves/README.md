# Key signature staves

`*.svg` are the LilyPond exports — the source. `convert.sh` turns them into the
PNGs the wheel actually loads:

    none.png                     C — clef and bare staff, no accidentals
    sharps-1.png … sharps-7.png
    flats-1.png  … flats-5.png

Five flat keys are on the wheel — Db Ab Eb Bb F. Positions 5 and 6 are spelled with
sharps (B, F#), so `6flats/7flats.svg` are kept as source in case that changes; raise
`FLATS_MAX` in the script to build their PNGs again.

Both are committed. Re-run `bash convert.sh` from this folder after changing an SVG.
Needs ImageMagick 7 with the rsvg delegate; nothing else in the project does, which
is why this is a one-off script and not a build step.

## What convert.sh does

The SVGs are **grand staves** — treble clef and key signature on the left, bass clef
and the same signature again on the right, sharing one continuous 5-line staff. The
wheel wants only the treble half, so each file is cut vertically in the blank gap
between the last treble accidental and the bass clef. The gap is found by column ink
profile; the staff lines run edge to edge, so "blank" means *staff-lines-only*, not
zero ink.

Two normalisations make every staff land on the wheel at one scale:

- The **vertical window is measured from the staff lines**, not the file's own
  bounding box. Sources differ in height — a sharp above the top line makes the
  export taller — so cropping to the bounding box would put the staff in a different
  place in each file. Every output is 238px tall with the staff at the same rows.
- The **horizontal cut is checked against a straight-line model** of where the gap
  should be, and the model wins if they disagree by more than 15px. `6flats.svg` has
  whole notes and a barline in it that no other file has, so its widest gap is in the
  wrong place. Worth re-exporting that one to match the rest; until then the model
  covers it.

Ink is recoloured on the way through — `INK` at the top of the script, currently a
cool grey. Near-white read louder than the key names it sits beside. `script.js`
lays a further `STAFF_OPACITY` over the top, so there are two knobs and they stack:
this one needs the script re-run, that one is instant.

That recolouring is the trade for using pictures rather than drawn SVG — the staves
can't take the sector's hue the way the ring labels do.

## If you re-export

Keep the same LilyPond staff size across all 16 files. Widths may differ freely —
more accidentals should simply be wider — but the line spacing must not change, and
neither should the vertical extents, or `convert.sh`'s constants need re-measuring.

If the output size changes, update `STAFF_H`, `STAFF_W0` and `STAFF_W_STEP` in
`script.js` to match: they are the PNG's height and width expressed in staff-line
gaps, and they're what keeps the artwork in proportion inside its slot on the ring.

Spelling is the artwork's business, not the code's — write the signatures properly.
The lettered box grid this replaced used one box per note name and cheated the 7th
flat onto the top line; that dodge is gone with it.
