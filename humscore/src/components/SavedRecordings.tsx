import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRecordings, deleteRecording } from '../utils/storage';
import type { Recording } from '../types';

export default function SavedRecordings() {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await getAllRecordings();
    setRecordings(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteRecording(id);
      setConfirmDelete(null);
      load();
    },
    [load],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700/60 shrink-0">
        <h1 className="text-xl font-bold text-white">Saved Recordings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Stored on your device
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-slate-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-slate-600">
                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
              </svg>
            </div>
            <p className="text-slate-400 text-base font-medium">No recordings yet</p>
            <p className="text-slate-600 text-sm">
              Head to the Record tab and hum a melody to get started.
            </p>
            <button
              onClick={() => navigate('/record')}
              className="mt-2 px-6 py-3.5 rounded-2xl bg-brand-600 text-white font-semibold active:bg-brand-700 min-h-[52px]"
            >
              Record Now
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl bg-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => navigate(`/results/${rec.id}`)}
                  className="w-full flex items-start gap-3 p-4 active:bg-slate-700 transition-colors text-left"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-brand-600/25 flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5 text-brand-400"
                    >
                      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {rec.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(rec.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-xs text-slate-600">
                        {rec.notes.length} notes
                      </span>
                      <span className="text-xs text-slate-600">
                        {rec.durationSeconds.toFixed(1)}s
                      </span>
                      {rec.notes.length > 0 && (
                        <span className="text-xs text-brand-500/70 font-mono">
                          {rec.notes
                            .slice(0, 5)
                            .map((n) => n.name)
                            .join(' ')}
                          {rec.notes.length > 5 && '…'}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-slate-600 shrink-0 mt-0.5"
                  >
                    <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                  </svg>
                </button>

                {/* Delete row */}
                <div className="border-t border-slate-700/40 px-4 py-2 flex justify-end">
                  {confirmDelete === rec.id ? (
                    <div className="flex gap-3 items-center">
                      <span className="text-xs text-slate-400">Delete this recording?</span>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-slate-400 py-1 px-3 rounded-lg active:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="text-xs text-red-400 font-semibold py-1 px-3 rounded-lg active:bg-red-900/30"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(rec.id)}
                      className="text-xs text-slate-600 py-1.5 px-3 rounded-lg active:bg-slate-700 flex items-center gap-1"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
