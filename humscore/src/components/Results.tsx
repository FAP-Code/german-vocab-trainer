import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecording, updateRecordingNotes, base64ToBlob } from '../utils/storage';
import { exportJSON, exportMIDI, exportPDF } from '../utils/exportUtils';
import type { Recording, DetectedNote, NoteValue } from '../types';
import MusicStaff from './MusicStaff';
import NoteEditor from './NoteEditor';
import { durationToNoteValue } from '../utils/noteConversion';

const NV_ICON: Record<NoteValue, string> = {
  whole:   '𝅝 ',
  half:    '𝅗',
  quarter: '♩',
  eighth:  '♪',
};

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<DetectedNote | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showTestStaff, setShowTestStaff] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRecording(id).then((rec) => {
      setRecording(rec ?? null);
      if (rec?.audioBlobBase64 && rec.audioMimeType) {
        const blob = base64ToBlob(rec.audioBlobBase64, rec.audioMimeType);
        setAudioUrl(URL.createObjectURL(blob));
      }
      setLoading(false);
    });
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [id]);

  const handleNoteEdit = useCallback(
    async (updated: DetectedNote) => {
      if (!recording) return;
      const newNotes = recording.notes.map((n) =>
        n.id === updated.id ? updated : n,
      );
      await updateRecordingNotes(recording.id, newNotes);
      setRecording({ ...recording, notes: newNotes });
      setEditingNote(null);
    },
    [recording],
  );

  const handleExport = useCallback(
    async (type: 'json' | 'midi' | 'pdf') => {
      if (!recording) return;
      setExporting(type);
      try {
        if (type === 'json') exportJSON(recording);
        else if (type === 'midi') exportMIDI(recording);
        else await exportPDF(recording);
      } finally {
        setTimeout(() => setExporting(null), 800);
      }
    },
    [recording],
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-slate-400">Recording not found.</p>
        <button onClick={() => navigate('/')} className="text-brand-400 underline">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-400 active:bg-slate-700"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-white truncate">{recording.name}</h1>
          <p className="text-xs text-slate-500">
            {recording.notes.length} notes · {recording.durationSeconds.toFixed(1)}s
          </p>
        </div>
        {/* Dev toolbar */}
        <div className="flex gap-1">
          <button
            onClick={() => setShowTestStaff(v => !v)}
            className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors min-h-[32px] ${
              showTestStaff ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
            title="Test staff (C4–C6)"
          >
            𝄞
          </button>
          <button
            onClick={() => setShowDebug(v => !v)}
            className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors min-h-[32px] ${
              showDebug ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
            title="Toggle debug output"
          >
            dbg
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* ── Audio player ──────────────────────────────────────────────────── */}
        {audioUrl && (
          <div className="rounded-2xl bg-slate-800 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Playback
            </p>
            <audio controls src={audioUrl} className="w-full" style={{ colorScheme: 'dark' }} />
          </div>
        )}

        {/* ── Test staff ────────────────────────────────────────────────────── */}
        {showTestStaff && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
                Test Staff — C4 to C6
              </p>
              <span className="text-xs text-slate-500">(confirm note placement is correct)</span>
            </div>
            <MusicStaff notes={[]} testMode maxVisible={20} />
          </div>
        )}

        {/* ── Staff preview ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
            Staff Preview
          </p>
          <MusicStaff notes={recording.notes} maxVisible={12} />
          {recording.notes.length > 12 && (
            <p className="text-xs text-slate-600 text-center mt-1">
              Showing first 12 of {recording.notes.length} notes
            </p>
          )}
        </div>

        {/* ── Debug output ──────────────────────────────────────────────────── */}
        {showDebug && recording.notes.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-brand-800/50 p-3">
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-3">
              Debug — Detected Notes
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-slate-400 border-collapse">
                <thead>
                  <tr className="border-b border-slate-700">
                    {['#','Note','MIDI','Freq','Dur','NoteVal','Conf'].map(h => (
                      <th key={h} className="text-left px-2 py-1 text-brand-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recording.notes.map((n, i) => {
                    const nv: NoteValue = n.noteValue ?? durationToNoteValue(n.duration);
                    const conf = n.confidence != null ? n.confidence.toFixed(2) : '—';
                    const confColor =
                      n.confidence == null ? 'text-slate-600'
                      : n.confidence >= 0.75 ? 'text-emerald-400'
                      : n.confidence >= 0.5 ? 'text-amber-400'
                      : 'text-red-400';
                    return (
                      <tr key={n.id} className="border-b border-slate-800/50 even:bg-slate-800/30">
                        <td className="px-2 py-1 text-slate-600">{i + 1}</td>
                        <td className="px-2 py-1 text-white font-bold">
                          {n.name}<span className="text-brand-400">{n.octave}</span>
                        </td>
                        <td className="px-2 py-1">{n.midiNumber}</td>
                        <td className="px-2 py-1">{n.frequency} Hz</td>
                        <td className="px-2 py-1">{n.duration.toFixed(3)}s</td>
                        <td className="px-2 py-1 text-slate-300">{nv}</td>
                        <td className={`px-2 py-1 ${confColor}`}>{conf}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Conf = NSDF peak height (0–1). Green ≥0.75, amber ≥0.5, red &lt;0.5.
            </p>
          </div>
        )}

        {/* ── Note list ─────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
            Detected Notes · tap to edit
          </p>
          {recording.notes.length === 0 ? (
            <div className="rounded-2xl bg-slate-800 p-6 text-center">
              <p className="text-slate-500 text-sm">
                No notes detected. Try humming clearly, one note at a time, in a quiet room.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recording.notes.map((note, i) => {
                const nv: NoteValue = note.noteValue ?? durationToNoteValue(note.duration);
                return (
                  <button
                    key={note.id}
                    onClick={() => setEditingNote(note)}
                    className="w-full flex items-center gap-3 rounded-2xl bg-slate-800 p-3.5 active:bg-slate-700 transition-colors text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300 text-sm font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="font-bold text-white text-base leading-tight">
                          {note.name}
                          <span className="text-brand-400 text-sm ml-0.5">{note.octave}</span>
                        </p>
                        <span className="text-slate-500 text-sm" aria-label={nv}>
                          {NV_ICON[nv]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {note.frequency} Hz · {note.duration.toFixed(2)}s · @{note.timestamp.toFixed(2)}s
                        {note.confidence != null && ` · conf ${note.confidence.toFixed(2)}`}
                      </p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-600 shrink-0">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Export ────────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
            Export
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['pdf', 'midi', 'json'] as const).map((type) => {
              const labels = { pdf: 'PDF', midi: 'MIDI', json: 'JSON' };
              const icons  = { pdf: '📄', midi: '🎹', json: '{ }' };
              return (
                <button
                  key={type}
                  onClick={() => handleExport(type)}
                  disabled={!!exporting}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-800 py-4 active:bg-slate-700 transition-colors disabled:opacity-50 min-h-[72px]"
                >
                  {exporting === type ? (
                    <div className="h-5 w-5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                  ) : (
                    <span className="text-xl" aria-hidden>{icons[type]}</span>
                  )}
                  <span className="text-xs font-semibold text-slate-300">{labels[type]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── New recording ─────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate('/record')}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600/20 border border-brand-600/40 py-4 text-brand-300 font-semibold active:bg-brand-600/30 transition-colors min-h-[52px]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <circle cx="12" cy="12" r="8" />
          </svg>
          Record New Melody
        </button>

        <div className="h-4" />
      </div>

      {editingNote && (
        <NoteEditor
          note={editingNote}
          onSave={handleNoteEdit}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
}
