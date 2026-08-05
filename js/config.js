/* Constants and data. First file loaded: it creates the CF namespace.
   Pure — no DOM, no scene state, so tests.html can load it on its own. */

var CF = {};

CF.config = (function () {

const SVGNS = 'http://www.w3.org/2000/svg'; // XML namespace needed to create SVG elements via createElementNS

// ---------------------------------------------------------------- geometry
/* Ring geometry in SVG user units. */
const CX = 500, CY = 500; // centre of the wheel, in SVG user-space coordinates
const R_HUB   = 90;     // blank centre
const R_DIM   = 192;   // outer edge of the diminished ring
const R_MINOR = 293;   // outer edge of the minor ring
const R_MAJOR = 400;   // outer edge of the major ring
const R_OUT   = R_MAJOR; // outer edge of the whole wheel; alias of R_MAJOR for readability at call sites
const R_MASK_OUT = R_OUT - 10; // inset exposes the disc beneath the floating mask

// Label positions and sizes derive from their ring widths.
const R_DIM_TEXT   = (R_HUB   + R_DIM)   / 2; // radius where diminished-chord labels are centred
const R_MINOR_TEXT = (R_DIM   + R_MINOR) / 2; // radius where minor-chord labels are centred
const R_MAJOR_TEXT = (R_MINOR + R_MAJOR) / 2; // radius where major-chord labels are centred

// `two` accommodates the enharmonic Gb/F# sector.
const FS_MAJOR = two => (R_MAJOR - R_MINOR) * (two ? 0.35 : 0.54); // font size for major-ring labels
const FS_MINOR = two => (R_MINOR - R_DIM)   * (two ? 0.29 : 0.42); // font size for minor-ring labels
const FS_DIM   = two => (R_DIM   - R_HUB)   * (two ? 0.35 : 0.40); // font size for diminished-ring labels

const SECTOR = 30;          // degrees per key (360° / 12 keys)

// ------------------------------------------------------------------- data
// Clockwise from the top. A key naming both `flats` and `sharps` carries both
// spellings and both key signatures. `dim` is the diminished chord of the key (vii°).
const KEYS = [
  { major: 'C',       minor: 'Am',      dim: 'B°',        sharps: 0, scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  { major: 'G',       minor: 'Em',      dim: 'F#°',       sharps: 1, scale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
  { major: 'D',       minor: 'Bm',      dim: 'C#°',       sharps: 2, scale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
  { major: 'A',       minor: 'F#m',     dim: 'G#°',       sharps: 3, scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
  { major: 'E',       minor: 'C#m',     dim: 'D#°',       sharps: 4, scale: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
  { major: 'B',       minor: 'G#m',     dim: 'A#°',       sharps: 5, scale: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  { major: 'Gb/F#',   minor: 'Ebm/D#m', dim: 'F°/E#°',    flats: 6, sharps: 6, scale: ['Gb/F#', 'Ab/G#', 'Bb/A#', 'Cb/B', 'Db/C#', 'Eb/D#', 'F/E#'] },
  { major: 'Db',      minor: 'Bbm',     dim: 'C°',        flats: 5, scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] },
  { major: 'Ab',      minor: 'Fm',      dim: 'G°',        flats: 4, scale: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
  { major: 'Eb',      minor: 'Cm',      dim: 'D°',        flats: 3, scale: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
  { major: 'Bb',      minor: 'Gm',      dim: 'A°',        flats: 2, scale: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
  { major: 'F',       minor: 'Dm',      dim: 'E°',        flats: 1, scale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] }
];

const ROOT_MIDI = [60, 67, 62, 69, 64, 71, 66, 61, 68, 63, 70, 65]; // MIDI note number of each key's tonic, index-aligned with KEYS; drives audio playback
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]; // semitone offsets of the major (Ionian) scale degrees from the tonic

// ----------------------------------------------------------------- colour
// SVG presentation attributes need resolved colour values rather than CSS variables.
const hue = i => (45 + i * 30) % 360; // hue in degrees for key index i; 30° apart so all 12 keys sweep the colour wheel, offset 45° off red

const fillDim = i => `oklch(0.26 0.05 ${hue(i)})`;  // fill colour for a key's diminished-ring segment (darkest)
const fillMin = i => `oklch(0.305 0.075 ${hue(i)})`; // fill colour for a key's minor-ring segment
const fillMaj = i => `oklch(0.37 0.1 ${hue(i)})`;   // fill colour for a key's major-ring segment (lightest)

const textMaj = i => `oklch(0.95 0.15 ${hue(i)})`; // text colour for a key's major-chord label
const textMin = i => `oklch(0.93 0.13 ${hue(i)})`; // text colour for a key's minor-chord label
const textDim = i => `oklch(0.91 0.11 ${hue(i)})`; // text colour for a key's diminished-chord label

const C_STAGE   = '#0a0b0f';   // the dark behind everything; also every seam
const C_DISC    = '#141720';   // under the sectors, so the seams read as gaps
const C_HUB     = '#0a0b0f';   // fill colour of the hub circle at the wheel's centre
const SEAM_W    = 2.6;         // stroke width of the seams separating sectors and rings

// -------------------------------------------------------------- spotlight
// Spotlight tuning.
const SCRIM_ALPHA =     0.58;    // darkness nearest the mask
const SCRIM_DECAY =     0.62;    // fraction of the scrim ellipse where most darkness fades
const SCRIM_FAR_ALPHA = 0.04;    // darkness at the far edge of the scrim, away from the mask
const SCRIM_X =         CX;      // centre-x of the scrim ellipse
const SCRIM_Y =         CY - 215; // centre-y of the scrim ellipse, offset above the wheel's centre
const SCRIM_RX =        310;     // horizontal radius of the scrim ellipse
const SCRIM_RY =        245;     // vertical radius of the scrim ellipse
const SPOT_BLUR =       0;      // feGaussianBlur, in user units
const SPOT_SAT =        0.90;   // saturation kept outside the window
const C_MASK_EDGE =     '#f5f6ff'; // colour of the mask window's edge hairline
const MASK_EDGE_A =     1;         // opacity of the mask window's edge hairline
const MASK_EDGE_W =     5.2;    // the window's hairline, in user units
const C_MASK_GLOW =     'rgba(160,125,255,.92)'; // glow colour applied to the mask edge when armed
const MASK_GLOW_R =     10;    // glow blur radius applied to the mask edge when armed, in user units
const MASK_SHADOW_DY =  1;     // drop-shadow y-offset under the mask at rest
const MASK_SHADOW_R  =  3;     // drop-shadow blur radius under the mask at rest
const MASK_SHADOW_A  =  0.8;   // drop-shadow opacity under the mask at rest
const MASK_ARMED_SHADOW_DY = 25; // drop-shadow y-offset under the mask once armed (cast further)
const MASK_ARMED_SHADOW_R  = 8;  // drop-shadow blur radius under the mask once armed (softer)
const MASK_ARMED_SHADOW_A  = 0.5; // drop-shadow opacity under the mask once armed (fainter)

// Degrees sit in the leading outer corner of each mask cell.
// Each entry is [label, radius, angle, font size], placed in polar coordinates
// (radius/angle) around the wheel's centre, angle in degrees from the armed slice.
const DEGREE_LABELS = [
  ['IV',   R_MAJOR - 45, -40, 26], ['I',   R_MAJOR - 45, -10, 26], ['V',   R_MAJOR - 40, 20, 26],
  ['ii',   R_MINOR - 25, -40, 26], ['vi', R_MINOR - 25, -10, 26],  ['iii', R_MINOR - 25, 20, 26],
  ['vii°', R_DIM   - 20, -4, 16]
];

// ------------------------------------------------------- key signature PNGs
/* The signature ring uses pre-rendered staff images. */
const STAFF_DIR = 'staves'; // folder holding the pre-rendered staff PNGs

// Staff scale, measured in staff-line gaps.
const STAFF_S   = 13;   // pixels per staff-line gap; scales every staff image uniformly
const STAFF_GAP = 8;    // clearance between the disc edge and the staff block

/* Keep the staff images from outshouting the key names. */
const STAFF_OPACITY = 0.8;

/* Staff image dimensions in staff-line gaps. Slack makes height constrain scaling
   so every image keeps the same staff-line spacing. */
const STAFF_H      = 7.62; // staff image height, in staff-line gaps
const STAFF_W0     = 5.50; // base staff image width with no accidentals, in staff-line gaps
const STAFF_W_STEP = { sharp: 1.094, flat: 0.900 }; // extra width added per sharp/flat accidental, in staff-line gaps
const STAFF_SLACK  = 1.02; // multiplier applied to the computed width to leave a little breathing room

/* Clef plus lead-in, in staff-line gaps — the part the spliced-on second half does
   not repeat. */
const STAFF_CLEF = 4.29;

/* The order accidentals are added in — which is also the order they are written on
   the staff, so the first n of these are exactly what the picture shows. */
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/* R_RIM is documented as a radius constant but is derived from the staff layout,
   so it lives in staves.js — see the note there. */

return {
  SVGNS,
  CX, CY, R_HUB, R_DIM, R_MINOR, R_MAJOR, R_OUT, R_MASK_OUT,
  R_DIM_TEXT, R_MINOR_TEXT, R_MAJOR_TEXT,
  FS_MAJOR, FS_MINOR, FS_DIM,
  SECTOR, KEYS, ROOT_MIDI, MAJOR_SCALE,
  hue, fillDim, fillMin, fillMaj, textMaj, textMin, textDim,
  C_STAGE, C_DISC, C_HUB, SEAM_W,
  SCRIM_ALPHA, SCRIM_DECAY, SCRIM_FAR_ALPHA, SCRIM_X, SCRIM_Y, SCRIM_RX, SCRIM_RY,
  SPOT_BLUR, SPOT_SAT,
  C_MASK_EDGE, MASK_EDGE_A, MASK_EDGE_W, C_MASK_GLOW, MASK_GLOW_R,
  MASK_SHADOW_DY, MASK_SHADOW_R, MASK_SHADOW_A,
  MASK_ARMED_SHADOW_DY, MASK_ARMED_SHADOW_R, MASK_ARMED_SHADOW_A,
  DEGREE_LABELS,
  STAFF_DIR, STAFF_S, STAFF_GAP, STAFF_OPACITY,
  STAFF_H, STAFF_W0, STAFF_W_STEP, STAFF_SLACK, STAFF_CLEF,
  SHARP_ORDER, FLAT_ORDER
};

})();

// Disabled until the unresolved pointer-drag direction bug is fixed.
CF.config.dragEnabled = false;
