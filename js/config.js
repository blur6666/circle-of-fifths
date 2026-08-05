/* Constants and data. First file loaded: it creates the CF namespace.
   Pure — no DOM, no scene state, so tests.html can load it on its own. */

var CF = {};

CF.config = (function () {

const SVGNS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------- geometry
/* Ring geometry in SVG user units. */
const CX = 500, CY = 500;
const R_HUB   = 90;     // blank centre
const R_DIM   = 192;   // outer edge of the diminished ring
const R_MINOR = 293;   // outer edge of the minor ring
const R_MAJOR = 400;   // outer edge of the major ring
const R_OUT   = R_MAJOR;
const R_MASK_OUT = R_OUT - 10; // inset exposes the disc beneath the floating mask

// Label positions and sizes derive from their ring widths.
const R_DIM_TEXT   = (R_HUB   + R_DIM)   / 2;
const R_MINOR_TEXT = (R_DIM   + R_MINOR) / 2;
const R_MAJOR_TEXT = (R_MINOR + R_MAJOR) / 2;

// `two` accommodates the enharmonic Gb/F# sector.
const FS_MAJOR = two => (R_MAJOR - R_MINOR) * (two ? 0.35 : 0.54);
const FS_MINOR = two => (R_MINOR - R_DIM)   * (two ? 0.29 : 0.42);
const FS_DIM   = two => (R_DIM   - R_HUB)   * (two ? 0.35 : 0.40);

const SECTOR = 30;          // degrees per key

// ------------------------------------------------------------------- data
// Clockwise from the top. A key naming both `flats` and `sharps` carries both
// spellings and both key signatures. `dim` is the diminished chord of the key (vii°).
const KEYS = [
  { major: 'C',       minor: 'a',       dim: 'B°',        sharps: 0, scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  { major: 'G',       minor: 'e',       dim: 'F#°',       sharps: 1, scale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
  { major: 'D',       minor: 'b',       dim: 'C#°',       sharps: 2, scale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
  { major: 'A',       minor: 'f#',      dim: 'G#°',       sharps: 3, scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
  { major: 'E',       minor: 'c#',      dim: 'D#°',       sharps: 4, scale: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
  { major: 'B',       minor: 'g#',      dim: 'A#°',       sharps: 5, scale: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  { major: 'Gb/F#',   minor: 'eb/d#',   dim: 'F°/E#°',    flats: 6, sharps: 6, scale: ['Gb/F#', 'Ab/G#', 'Bb/A#', 'Cb/B', 'Db/C#', 'Eb/D#', 'F/E#'] },
  { major: 'Db',      minor: 'bb',      dim: 'C°',        flats: 5, scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] },
  { major: 'Ab',      minor: 'f',       dim: 'G°',        flats: 4, scale: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
  { major: 'Eb',      minor: 'c',       dim: 'D°',        flats: 3, scale: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
  { major: 'Bb',      minor: 'g',       dim: 'A°',        flats: 2, scale: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
  { major: 'F',       minor: 'd',       dim: 'E°',        flats: 1, scale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] }
];

const ROOT_MIDI = [60, 67, 62, 69, 64, 71, 66, 61, 68, 63, 70, 65];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

// ----------------------------------------------------------------- colour
// SVG presentation attributes need resolved colour values rather than CSS variables.
const hue = i => (45 + i * 30) % 360;

const fillDim = i => `oklch(0.26 0.05 ${hue(i)})`;
const fillMin = i => `oklch(0.305 0.075 ${hue(i)})`;
const fillMaj = i => `oklch(0.37 0.1 ${hue(i)})`;

const textMaj = i => `oklch(0.95 0.15 ${hue(i)})`;
const textMin = i => `oklch(0.93 0.13 ${hue(i)})`;
const textDim = i => `oklch(0.91 0.11 ${hue(i)})`;

const C_STAGE   = '#0a0b0f';   // the dark behind everything; also every seam
const C_DISC    = '#141720';   // under the sectors, so the seams read as gaps
const C_HUB     = '#0a0b0f';
const C_HUB_RIM = '#3a4058';
const SEAM_W    = 2.6;

// -------------------------------------------------------------- spotlight
// Spotlight tuning.
const SCRIM_ALPHA = 0.58;    // darkness nearest the mask
const SCRIM_DECAY = 0.62;    // fraction of the scrim ellipse where most darkness fades
const SCRIM_FAR_ALPHA = 0.04;
const SCRIM_X = CX;
const SCRIM_Y = CY - 215;
const SCRIM_RX = 310;
const SCRIM_RY = 245;
const SPOT_BLUR   = 0;      // feGaussianBlur, in user units
const SPOT_SAT    = 0.90;   // saturation kept outside the window
const C_MASK_EDGE = '#f5f6ff';
const MASK_EDGE_A = 1;
const MASK_EDGE_W = 5.2;    // the window's hairline, in user units
const C_MASK_GLOW = 'rgba(160,125,255,.92)';
const MASK_GLOW_R = 10;
const MASK_SHADOW_DY = 1;
const MASK_SHADOW_R  = 3;
const MASK_SHADOW_A  = 0.8;
const MASK_ARMED_SHADOW_DY = 25;
const MASK_ARMED_SHADOW_R  = 8;
const MASK_ARMED_SHADOW_A  = 0.5;

// Degrees sit in the leading outer corner of each mask cell.
const DEGREE_LABELS = [
  ['IV',   R_MAJOR - 55, -40, 26], ['I',   R_MAJOR - 57, -10, 26], ['V',   R_MAJOR - 60, 20, 26],
  ['ii',   R_MINOR - 30, -40, 26], ['vi',  R_MINOR - 30, -10, 26], ['iii', R_MINOR - 30, 20, 26],
  ['vii°', R_DIM   - 20, -4, 16]
];

// ------------------------------------------------------- key signature PNGs
/* The signature ring uses pre-rendered staff images. */
const STAFF_DIR = 'staves';

// Staff scale, measured in staff-line gaps.
const STAFF_S   = 13;
const STAFF_GAP = 8;    // clearance between the disc edge and the staff block

/* Keep the staff images from outshouting the key names. */
const STAFF_OPACITY = 0.8;

/* Staff image dimensions in staff-line gaps. Slack makes height constrain scaling
   so every image keeps the same staff-line spacing. */
const STAFF_H      = 7.62;
const STAFF_W0     = 5.50;
const STAFF_W_STEP = { sharp: 1.094, flat: 0.900 };
const STAFF_SLACK  = 1.02;

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
  C_STAGE, C_DISC, C_HUB, C_HUB_RIM, SEAM_W,
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
