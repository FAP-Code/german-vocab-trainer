import type { NoteEvent } from '../utils/pitchDetection';
import { groupPitchesToNotes } from './pitchDetection';
import type { DetectedNote } from '../types';

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

export function frequencyToMidi(frequency: number): number {
  // MIDI number where A4 = 69 = 440 Hz
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

export function midiToNoteName(
  midi: number,
  preferFlats = false,
): { name: string; octave: number } {
  const octave = Math.floor(midi / 12) - 1;
  const degree = ((midi % 12) + 12) % 12;
  const name = preferFlats
    ? NOTE_NAMES_FLAT[degree]
    : NOTE_NAMES_SHARP[degree];
  return { name, octave };
}

export function noteEventToDetectedNote(
  event: NoteEvent,
  index: number,
  preferFlats = false,
): DetectedNote {
  const midi = frequencyToMidi(event.frequency);
  const { name, octave } = midiToNoteName(midi, preferFlats);
  return {
    id: `note-${index}-${Date.now()}`,
    name,
    octave,
    midiNumber: midi,
    frequency: Math.round(event.frequency * 100) / 100,
    duration: Math.round(event.duration * 1000) / 1000,
    timestamp: Math.round(event.startTime * 1000) / 1000,
  };
}

/** Treble-clef staff position (0 = middle line B4, + = up, – = down) */
export function noteToStaffPosition(note: DetectedNote): number {
  const BASE: Record<string, number> = {
    C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
  };
  const baseName = note.name.replace('#', '').replace('b', '');
  const step = BASE[baseName] ?? 0;
  // Octave 4, C = 0 on a chromatic scale, but staff uses diatonic steps
  // Middle B4 is reference (position 0 = 3rd line of treble clef)
  return (note.octave - 4) * 7 + step - 6; // -6 to center around B4
}

export function isAccidental(noteName: string): boolean {
  return noteName.includes('#') || noteName.includes('b');
}

export const ALL_NOTE_NAMES = [
  'C', 'C#', 'D', 'Eb', 'E', 'F',
  'F#', 'G', 'Ab', 'A', 'Bb', 'B',
];

export const OCTAVES = [2, 3, 4, 5, 6];

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
