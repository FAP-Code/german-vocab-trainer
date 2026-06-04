import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import Waveform from './Waveform';
import { saveRecording, blobToBase64 } from '../utils/storage';
import type { Recording } from '../types';
import { frequencyToMidi, midiToNoteName } from '../utils/noteConversion';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s}.${ms}`;
}

function FreqDisplay({ freq }: { freq: number }) {
  if (freq <= 0) {
    return (
      <div className="text-center">
        <p className="text-4xl font-bold text-slate-600">–</p>
        <p className="text-xs text-slate-600 mt-1">Listening…</p>
      </div>
    );
  }
  const midi = frequencyToMidi(freq);
  const { name, octave } = midiToNoteName(midi);
  return (
    <div className="text-center">
      <p className="text-5xl font-extrabold text-white tracking-tight">
        {name}
        <span className="text-2xl text-brand-400 ml-1">{octave}</span>
      </p>
      <p className="text-sm text-slate-400 mt-1">{freq.toFixed(1)} Hz</p>
    </div>
  );
}

export default function RecordingScreen() {
  const navigate = useNavigate();
  const recorder = useAudioRecorder();
  const [saving, setSaving] = useState(false);

  const handleStop = useCallback(async () => {
    setSaving(true);
    const { notes, audioBlob, duration } = await recorder.stop();

    const id = `rec-${Date.now()}`;
    const recording: Recording = {
      id,
      name: `Melody ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      createdAt: new Date().toISOString(),
      notes,
      durationSeconds: duration,
    };

    if (audioBlob) {
      try {
        recording.audioBlobBase64 = await blobToBase64(audioBlob);
        recording.audioMimeType = audioBlob.type;
      } catch (_) {
        // non-fatal – skip audio storage
      }
    }

    await saveRecording(recording);
    setSaving(false);
    navigate(`/results/${id}`);
  }, [recorder, navigate]);

  const isIdle = recorder.state === 'idle' || recorder.state === 'error';
  const isRecording = recorder.state === 'recording';
  const isPaused = recorder.state === 'paused';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60">
        <button
          onClick={() => { recorder.reset(); navigate('/'); }}
          className="p-2 rounded-xl text-slate-400 active:bg-slate-700 transition-colors"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white flex-1">Recording</h1>
        {(isRecording || isPaused) && (
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            {isRecording && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
            {formatTime(recorder.elapsed)}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-between p-6 overflow-y-auto gap-6">

        {/* Error state */}
        {recorder.error && (
          <div className="w-full rounded-2xl bg-red-900/30 border border-red-700/50 p-4 text-center">
            <p className="text-red-300 text-sm">{recorder.error}</p>
            <button
              onClick={recorder.reset}
              className="mt-3 text-sm font-semibold text-brand-400 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Pitch display */}
        <div className="w-full flex flex-col items-center gap-6">
          {/* Outer ring */}
          <div
            className={`relative flex h-44 w-44 items-center justify-center rounded-full transition-all duration-300 ${
              isRecording
                ? 'bg-brand-600/20 ring-4 ring-brand-500/60 shadow-2xl shadow-brand-900/60'
                : 'bg-slate-800 ring-2 ring-slate-700'
            }`}
          >
            <FreqDisplay freq={recorder.currentFrequency} />
            {isRecording && recorder.currentFrequency > 0 && (
              <div className="absolute inset-0 rounded-full border-2 border-brand-400/30 animate-ping" />
            )}
          </div>

          {/* Waveform */}
          <div className="w-full bg-slate-800 rounded-2xl p-4">
            <Waveform
              data={recorder.waveformData}
              color={isRecording ? '#818cf8' : '#334155'}
              height={72}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="w-full space-y-3">
          {isIdle && (
            <button
              onClick={recorder.start}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-brand-600 py-5 text-lg font-semibold text-white active:scale-95 transition-transform min-h-[64px] shadow-lg shadow-brand-900/40"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                <circle cx="12" cy="12" r="8" />
              </svg>
              {recorder.state === 'error' ? 'Retry' : 'Start Recording'}
            </button>
          )}

          {isRecording && (
            <div className="flex gap-3">
              <button
                onClick={recorder.pause}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-700 py-4 font-semibold text-white active:scale-95 transition-transform min-h-[56px]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                Pause
              </button>
              <button
                onClick={handleStop}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 font-semibold text-white active:scale-95 transition-transform min-h-[56px] disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop
              </button>
            </div>
          )}

          {isPaused && (
            <div className="flex gap-3">
              <button
                onClick={recorder.resume}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 font-semibold text-white active:scale-95 transition-transform min-h-[56px]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </button>
              <button
                onClick={handleStop}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 font-semibold text-white active:scale-95 transition-transform min-h-[56px] disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop & Save
              </button>
            </div>
          )}

          {saving && (
            <div className="w-full flex items-center justify-center gap-3 py-4">
              <div className="h-5 w-5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
              <span className="text-slate-400 text-sm">Processing melody…</span>
            </div>
          )}
        </div>

        {/* Tips */}
        {isIdle && !recorder.error && (
          <div className="w-full rounded-xl bg-slate-800/60 p-4 text-center">
            <p className="text-xs text-slate-500">
              Tip: Sing or hum one note at a time, clearly and steadily, for
              best results. A quiet environment helps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
