import { useState } from 'react';
import type { DetectedNote } from '../types';
import { ALL_NOTE_NAMES, OCTAVES, midiToFrequency, frequencyToMidi } from '../utils/noteConversion';

interface NoteEditorProps {
  note: DetectedNote;
  onSave: (updated: DetectedNote) => void;
  onClose: () => void;
}

export default function NoteEditor({ note, onSave, onClose }: NoteEditorProps) {
  const [name, setName] = useState(note.name);
  const [octave, setOctave] = useState(note.octave);

  const handleSave = () => {
    // Recalculate midi and frequency from new name+octave
    const noteNames = [
      'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
      'Db', 'Eb', 'Gb', 'Ab', 'Bb',
    ];
    const flatToSharp: Record<string, string> = {
      Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#',
    };
    const sharpName = flatToSharp[name] ?? name;
    const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const degree = sharpNames.indexOf(sharpName);
    const midi = (octave + 1) * 12 + degree;
    const freq = midiToFrequency(midi);

    onSave({
      ...note,
      name,
      octave,
      midiNumber: midi,
      frequency: Math.round(freq * 10) / 10,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-800 p-6 shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Edit Note</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 active:bg-slate-700"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-700/50 p-3 text-center">
          <p className="text-slate-400 text-xs mb-1">Current</p>
          <p className="text-2xl font-bold text-white">
            {note.name}<span className="text-brand-400">{note.octave}</span>
            <span className="text-sm text-slate-400 ml-2">{note.frequency} Hz</span>
          </p>
        </div>

        {/* Note name selector */}
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">
          Note Name
        </label>
        <div className="grid grid-cols-6 gap-1.5 mb-5">
          {ALL_NOTE_NAMES.map((n) => (
            <button
              key={n}
              onClick={() => setName(n)}
              className={`py-2 rounded-xl text-sm font-semibold transition-colors min-h-[40px] ${
                name === n
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-700 text-slate-300 active:bg-slate-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Octave selector */}
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">
          Octave
        </label>
        <div className="flex gap-2 mb-6">
          {OCTAVES.map((o) => (
            <button
              key={o}
              onClick={() => setOctave(o)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                octave === o
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-700 text-slate-300 active:bg-slate-600'
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-slate-700 text-white font-semibold active:bg-slate-600 min-h-[52px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3.5 rounded-2xl bg-brand-600 text-white font-semibold active:bg-brand-700 min-h-[52px]"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
