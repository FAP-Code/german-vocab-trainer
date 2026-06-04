import type { NoteEvent } from './pitchDetection';
import { groupPitchesToNotes } from './pitchDetection';
import type { DetectedNote, NoteValue } from '../types';

// Re-export for convenience
export { groupPitchesToNotes };
export type { NoteEvent };

const NOTE_NAMES_SHARP = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

const NOTE_NAMES_FLAT = [
  'C', 'Db', 'D', 'Eb', 'E', 'F',
  'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const;

// ─── Frequency / MIDI conversion ──────────────────────────────────────────────

export function frequencyToMidi(frequency: number): number {
  // Standard formula: A4 = 69 = 440 Hz
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

export function midiToNoteName(
  midi: number,
  preferFlats = false,
): { name: string; octave: number } {
  // MIDI octave convention: C-1 = 0, C0 = 12, C4 = 60, C5 = 72
  const octave = Math.floor(midi / 12) - 1;
  const degree = ((midi % 12) + 12) % 12;
  const name = preferFlats
    ? NOTE_NAMES_FLAT[degree]
    : NOTE_NAMES_SHARP[degree];
  return { name, octave };
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Verification:
// frequencyToMidi(261.63) = round(12*log2(261.63/440)+69) = round(12*(-0.750)+69) = round(60.0) = 60 → C4 ✓
// frequencyToMidi(440)    = 69 → A4 ✓
// frequencyToMidi(523.25) = round(12*0.25+69) = 72 → C5 ✓
// midiToNoteName(60) → { name:'C', octave:4 } ✓
// midiToNoteName(72) → { name:'C', octave:5 } ✓

// ─── Note value (duration → symbol) ──────────────────────────────────────────

/**
 * Maps a detected note duration to a standard music symbol.
 * Thresholds per the spec:
 *   < 0.35 s  → eighth note  ♪
 *   0.35–0.9  → quarter note ♩
 *   0.9–1.8   → half note
 *   ≥ 1.8     → whole note
 */
export function durationToNoteValue(duration: number): NoteValue {
  if (duration >= 1.8) return 'whole';
  if (duration >= 0.9) return 'half';
  if (duration >= 0.35) return 'quarter';
  return 'eighth';
}

export const NOTE_VALUE_LABEL: Record<NoteValue, string> = {
  whole:   'Whole (𝅝)',
  half:    'Half (𝅗𝅥)',
  quarter: 'Quarter (♩)',
  eighth:  'Eighth (♪)',
};

// ─── Staff position ───────────────────────────────────────────────────────────

/**
 * Returns the diatonic staff position relative to the B4 middle line.
 * Positive = above B4, negative = below B4.
 *
 * Staff lines (treble clef):
 *   pos = -4 → E4  (bottom line)
 *   pos = -2 → G4
 *   pos =  0 → B4  (middle line)
 *   pos = +2 → D5
 *   pos = +4 → F5  (top line)
 *
 * Ledger lines:
 *   pos = -6 → C4  (middle C — one ledger line below staff)
 *   pos = +6 → A5  (one ledger line above staff)
 */
export function noteToStaffPosition(note: DetectedNote): number {
  const DIATONIC_STEP: Record<string, number> = {
    C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
  };
  const baseName = note.name.replace('#', '').replace('b', '');
  const step = DIATONIC_STEP[baseName] ?? 0;
  // B4 is at diatonic offset 6 within octave 4 → reference = octave 4, step 6
  return (note.octave - 4) * 7 + step - 6;
}

/**
 * Computes the Y positions (in SVG/PDF user units) of ledger lines needed for
 * a note at the given staff position.
 *
 * Rule: ledger lines appear at even positions outside [-4, 4].
 *   Below staff (pos ≤ -6): lines from -6 down to nearest even ≥ pos (toward staff).
 *   Above staff (pos ≥  6): lines from  6 up  to nearest even ≤ pos (toward staff).
 *
 * "Nearest even ≥ pos" for negative values = Math.ceil(pos/2)*2
 *   e.g. pos=-6 → -6 (one line, the C4 line, drawn THROUGH the note)
 *        pos=-7 → -6 (one line, the C4 line, drawn BELOW the B3 note)
 *        pos=-8 → -8 (two lines: C4 and A3)
 */
export function getLedgerLinePositions(pos: number): number[] {
  const result: number[] = [];

  if (pos <= -6) {
    // stop = nearest even at or above pos (less negative), i.e. ceiling to even
    const stop = Math.ceil(pos / 2) * 2;
    for (let p = -6; p >= stop; p -= 2) result.push(p);
  }

  if (pos >= 6) {
    // stop = nearest even at or below pos (less positive), i.e. floor to even
    const stop = Math.floor(pos / 2) * 2;
    for (let p = 6; p <= stop; p += 2) result.push(p);
  }

  return result;
}

export function isAccidental(noteName: string): boolean {
  return noteName.includes('#') || noteName.includes('b');
}

// ─── Note event → DetectedNote ────────────────────────────────────────────────

export function noteEventToDetectedNote(
  event: NoteEvent,
  index: number,
  preferFlats = false,
): DetectedNote {
  const midi = frequencyToMidi(event.frequency);
  const { name, octave } = midiToNoteName(midi, preferFlats);
  const duration = Math.round(event.duration * 1000) / 1000;
  return {
    id: `note-${index}-${Date.now()}`,
    name,
    octave,
    midiNumber: midi,
    frequency: Math.round(event.frequency * 100) / 100,
    duration,
    timestamp: Math.round(event.startTime * 1000) / 1000,
    noteValue: durationToNoteValue(duration),
    confidence: Math.round((event.confidence ?? 0) * 100) / 100,
  };
}

// ─── Editor helpers ───────────────────────────────────────────────────────────

export const ALL_NOTE_NAMES = [
  'C', 'C#', 'D', 'Eb', 'E', 'F',
  'F#', 'G', 'Ab', 'A', 'Bb', 'B',
];

export const OCTAVES = [2, 3, 4, 5, 6];
