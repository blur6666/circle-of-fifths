#!/usr/bin/env bash
# Turn the LilyPond SVG exports in this folder into the PNGs the wheel uses.
# Needs ImageMagick 7 with the rsvg delegate.  Run from this folder:  bash convert.sh
#
# The SVGs are grand staves — treble clef and key signature on the left, bass clef
# and the same signature again on the right, sharing one continuous 5-line staff.
# The wheel only wants the treble half, so each file is cut vertically in the blank
# gap between the last treble accidental and the bass clef.
#
# Two things are normalised so every staff lands on the wheel at one scale:
#   - the vertical window is measured from the staff lines, not the file's own
#     bounding box, so all outputs are the same height with the staff in the same
#     place (the source files differ: a sharp above the staff makes them taller).
#   - the horizontal cut is checked against a straight-line model of where the gap
#     should be.  6flats.svg has whole notes and a barline in it that the others
#     don't, so its widest gap is in the wrong place; the model catches that.
#
# Ink is recoloured to a cool grey on the way through — light enough to read on the
# dark stage, dark enough not to outshout the key names. Baked in, so the staves
# don't take the sector's colour the way the ring labels do. script.js lays a
# further STAFF_OPACITY over the top; the two stack.
set -euo pipefail

DENSITY=300           # source render; staff-line gap comes out at 31.25px
INK='#a8b0c6'        # staff ink. Near-white read as louder than the key names it
                     # sits next to, so it is pulled down to a cool grey.
OUT_H_ABOVE=61        # px above the top staff line  — the tallest source needs 61
OUT_H_BELOW=52        # px below the bottom staff line
CUT0=171              # px to the treble/bass gap with no accidentals
CUT_SHARP=34.14       # px added per sharp
CUT_FLAT=28.14        # px added per flat
TOL=15                # px; further than this from the model and the model wins

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

measure() {   # $1 = svg -> "W H cut staffTop staffBot"
  magick -background white -density $DENSITY "$1" -alpha remove -alpha off \
         -colorspace gray -threshold 60% -negate "$tmp/w.png"
  local W H
  # `-format` prints no trailing newline, so read exits 1 — harmless, but fatal under set -e
  read -r W H < <(magick "$tmp/w.png" -format "%w %h\n" info:) || :
  local cut top bot
  cut=$(magick "$tmp/w.png" -resize "${W}x1!" -depth 8 txt:- 2>/dev/null \
    | sed -n 's/^[0-9]*,0: (\([0-9]*\)).*/\1/p' | awk '
      {v[NR]=$1; c[$1]++}
      END{ mode=0; mc=0; for(x in c) if(c[x]+0>mc){mc=c[x];mode=x}
           lim=mode+3; first=0; last=0
           for(i=1;i<=NR;i++) if(v[i]>lim){ if(!first) first=i; last=i }
           best=0; bs=0; run=0
           for(i=first;i<=last;i++){ if(v[i]<=lim){ if(run==0) s=i; run++;
             if(run>best){best=run; bs=s} } else run=0 }
           print int(bs + best/2) - 1 }')
  read -r top bot < <(magick "$tmp/w.png" -resize "1x${H}!" -depth 8 txt:- 2>/dev/null \
    | sed -n 's/^0,[0-9]*: (\([0-9]*\)).*/\1/p' | awk '
      {v[NR]=$1} END{ mx=0; for(i=1;i<=NR;i++) if(v[i]>mx) mx=v[i]
        lim=mx*0.75; prev=0; first=-1; last=-1
        for(i=1;i<=NR;i++){ on=(v[i]>=lim)
          if(on && !prev){ if(first<0) first=i-1; last=i-1 }
          prev=on }
        print first, last }') || :
  echo "$W $H $cut $top $bot"
}

convert_one() {   # $1 = svg, $2 = kind (sharp|flat), $3 = n, $4 = out
  local W H cut top bot model
  read -r W H cut top bot < <(measure "$1") || :
  local per; [ "$2" = sharp ] && per=$CUT_SHARP || per=$CUT_FLAT
  model=$(awk -v a=$CUT0 -v b="$per" -v n="$3" 'BEGIN{printf "%d", a + b*n}')
  # the extra parens matter — awk reads `print x > n` as a redirect, not a comparison
  if [ "$(awk -v c="$cut" -v m="$model" -v t="$TOL" 'BEGIN{print (((c>m?c-m:m-c) > t) ? 1 : 0)}')" = 1 ]; then
    echo "    $1: gap found at ${cut}px, model says ${model}px — using the model"
    cut=$model
  fi
  local y=$(( top - OUT_H_ABOVE ))
  local h=$(( OUT_H_ABOVE + bot - top + OUT_H_BELOW ))
  magick -background none -density $DENSITY "$1" \
         -bordercolor none -border 200x200 \
         -crop "${cut}x${h}+200+$(( 200 + y ))" +repage \
         -fill "$INK" -colorize 100% \
         -strip "$4"
  printf "  %-14s -> %-14s %s\n" "$1" "$4" "$(magick identify -format '%wx%h' "$4")"
}

echo "sharps:"
convert_one 0sharps.svg sharp 0 none.png
for n in 1 2 3 4 5 6 7; do
  src=$([ $n = 1 ] && echo "1sharp.svg" || echo "${n}sharps.svg")
  convert_one "$src" sharp "$n" "sharps-$n.png"
done
# 1-6 flats are on the wheel: sector 6 carries both spellings (G♭ = 6 flats alongside
# F♯ = 6 sharps), then D♭ A♭ E♭ B♭ F. Only 7flats.svg is unused — raise this to 7 if a
# C♭ spelling is ever wanted.
FLATS_MAX=6

echo "flats:"
for n in $(seq 1 $FLATS_MAX); do
  src=$([ $n = 1 ] && echo "1flat.svg" || echo "${n}flats.svg")
  convert_one "$src" flat "$n" "flats-$n.png"
done
# --- the dual sector -------------------------------------------------------------
# Sector 6 carries both spellings, and two whole staves side by side barely clear
# their neighbours. One staff holding both signatures is far narrower — a single clef
# instead of two — so splice one: all of the flat file, then the sharp file from its
# first accidental onward. Every export puts the clef in the same place, so the cut
# column is a constant and the staff lines join seamlessly.
CLEF_END=134         # px; where the accidentals start in every file

hybrid() {           # $1 = flats, $2 = sharps, $3 = out
  magick "flats-$1.png" \
         \( "sharps-$2.png" -crop "+${CLEF_END}+0" +repage \) \
         +append -strip "$3"
  printf "  %-18s -> %-16s %s\n" "flats-$1 + sharps-$2" "$3" \
         "$(magick identify -format '%wx%h' "$3")"
}
echo "hybrid:"
hybrid 6 6 hybrid-6-6.png

echo
echo "Staff-line gap in the output is $(awk 'BEGIN{printf "%.2f", 125/4}')px;"
echo "every file is $(( OUT_H_ABOVE + 125 + OUT_H_BELOW ))px tall with the staff in the same place."
