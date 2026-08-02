# Circle of Fifths

An interactive circle of fifths for exploring major keys, relative minors,
diminished chords, key signatures, diatonic chords, and modes.

## Using the wheel

- Choose whether the arrows and pointer drag move the **wheel** or the **mask**.
- Use the arrows for one-key steps, or drag across the wheel for a free turn. On
	release, the moving layer snaps to the nearest key position.
- The highlighted window shows one complete major-key chord palette. The centre
	reads the selected major key, and the panel lists its relative minor,
	diminished chord, signature, diatonic chords, and modes.
- Hover a staff to read its signature.
- The controls below the guide can hide the mask glow, wheel glow, or floating
	degree-label animation.

## Features

- Twelve major-key sectors arranged clockwise by ascending fifths.
- Relative-minor and diminished-chord rings, plus real staff images for key
	signatures, including the combined Gb/F# signature.
- A physical mask window that exposes the I, ii, iii, IV, V, vi, and vii°
	harmonic material for the selected key.
- Keyboard-accessible controls, pointer dragging, responsive single-column
	layout, a reduced-motion fallback, and a subtle animated star field.

## Visual system

This project is built around a dark stage, a floating key window, and a handful of carefully tuned glow, shadow, and pulse effects. The effects are split between the SVG wheel scene (`script.js`) and the surrounding UI chrome (`style.css`).

## 1. Stage and panel atmosphere

- `#0a0b0f` (`C_STAGE`) is the base stage colour.
- The panel and wheel container use a dark, slightly bluish neutral (`#141720`) so the disc reads as a recessed object, not a flat piece of artwork.
- The control rail uses a layered panel treatment with a slight top highlight and a soft inset edge, which helps the left-side UI feel like it sits above the stage.

## 2. Disc and seam shading

- The ring sectors are painted with warm, slightly saturated hues using `oklch(...)` fills.
- The under-disc area uses a darker neutral (`C_DISC`) so the seams between sectors visually read as gaps instead of solid filled wedges.
- The hub is a small, almost-black central disc with a lighter rim, giving the centre a clean “hole” or “window” feel.

## 3. Spotlight scrim

- The window is not a simple hard mask. It uses a radial gradient scrim (`spot-scrim`) that is darkest around the edge of the window and fades outward toward the rest of the disc.
- This makes the active key area feel “lit” while the outside of the wheel stays more shadowed and atmospheric.
- The scrim is defined in SVG user space, so it stays anchored to the moving mask layer as the wheel rotates.

## 4. Mask edge bloom and cast shadow

- The window outline is drawn as a near-white hairline (`C_MASK_EDGE`) with a restrained drop shadow that reads like a compact cast edge.
- When the mask is armed, the edge gains a stronger shadow and a violet bloom, adding an “active/ready” visual state.
- The glow is not a large neon effect; it is intentionally short and tight so the mask still reads as a precise physical cutout rather than a glowing overlay.

## 5. Arm glow cue for mask mode

- The mask mode hint is a second, thicker copy of the same window path.
- That copy is invisible by default and briefly pulses at low opacity while `body.armed-mask` is active.
- The pulsing is intentionally subtle so the cue reads as a signal of movement rather than a bright flash.

## 6. Arm glow cue for wheel mode

- In wheel mode, the wheel gains several glowing circles around the outer rim and hub.
- These are rendered as lightweight rim/hub glows rather than dashed “ants,” so they feel more like illuminated boundaries.
- The glow pulses softly in a loop, then fades out smoothly using a short power-down animation when the wheel stops being armed.

## 7. Floating degree labels and soft ground shadow

- Each degree label sits inside its own hover container and is animated with a tiny vertical float loop.
- A matching ellipse shadow sits underneath the label, with a subtle pulse animation.
- The result is a gentle “drone” effect that suggests the labels are hovering above the surface without becoming distracting.

## 8. Staff image opacity and contrast

- Staff glyphs use a lowered opacity (`STAFF_OPACITY = 0.8`) so they never overpower the key name or the mask outline.
- This keeps the signature ring readable while still preserving the decorative music-notation layer.

## 9. Motion-aware reduced-motion fallback

- For users with `prefers-reduced-motion`, all of the more pronounced pulse and glow cycles are simplified or disabled so the scene remains readable without the stronger animation cues.
