export type NoteValue = 'whole' | 'half' | 'quarter' | 'eighth';

export interface DetectedNote {
  id: string;
  name: string;       // e.g. "C", "C#", "Db"
  octave: number;     // e.g. 4 → middle C
  midiNumber: number; // 0–127
  frequency: number;  // Hz
  duration: number;   // seconds
  timestamp: number;  // seconds from start of recording
  noteValue?: NoteValue;   // symbol based on duration
  confidence?: number;     // 0–1, pitch detection confidence
}

export interface Recording {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  notes: DetectedNote[];
  durationSeconds: number;
  audioBlobBase64?: string;
  audioMimeType?: string;
}

export type AppScreen =
  | 'home'
  | 'recording'
  | 'processing'
  | 'results'
  | 'saved'
  | 'settings';

export interface PitchSample {
  frequency: number;
  time: number;
  confidence: number;
}

export type NoteNameFlat =
  | 'C' | 'Db' | 'D' | 'Eb' | 'E'
  | 'F' | 'Gb' | 'G' | 'Ab' | 'A' | 'Bb' | 'B';

export type NoteNameSharp =
  | 'C' | 'C#' | 'D' | 'D#' | 'E'
  | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface ExportData {
  version: string;
  exportedAt: string;
  recording: {
    id: string;
    name: string;
    durationSeconds: number;
  };
  notes: DetectedNote[];
  metadata: {
    noteCount: number;
    uniqueNotes: string[];
    tempoEstimate?: number;
  };
}
