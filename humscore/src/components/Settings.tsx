import { getAllRecordings, deleteRecording } from '../utils/storage';

const VERSION = '1.0.0';

const improvements = [
  {
    title: 'AI Pitch Detection (CREPE / SPICE)',
    desc: 'Replace the autocorrelation algorithm with a neural-network-based pitch estimator for polyphonic and noisy audio.',
  },
  {
    title: 'MIDI Velocity & Dynamics',
    desc: 'Detect amplitude changes to add velocity and dynamics to MIDI output.',
  },
  {
    title: 'Proper Music Engraving',
    desc: 'Integrate VexFlow or LilyPond for standard-compliant sheet music rendering with bar lines, time signatures, and key signatures.',
  },
  {
    title: 'Polyphonic Detection',
    desc: 'Move beyond monophonic to detect chords and multi-voice melodies.',
  },
  {
    title: 'Cloud Sync',
    desc: 'Optional account-based sync across devices.',
  },
  {
    title: 'Real-time Staff Scrolling',
    desc: 'Display notes on the staff in real time while recording.',
  },
];

export default function Settings() {
  const clearStorage = async () => {
    if (!confirm('Delete all saved recordings? This cannot be undone.')) return;
    const all = await getAllRecordings();
    await Promise.all(all.map((r) => deleteRecording(r.id)));
    alert('All recordings deleted.');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700/60">
        <h1 className="text-xl font-bold text-white">Settings & About</h1>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* About card */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-900/60 to-slate-800 border border-brand-700/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 48 48" className="h-7 w-7 fill-white">
                <path d="M36 6v22.18A8 8 0 1 1 28 20V14l-16 3.2V36a8 8 0 1 1-8-8v-22l32-6.4V6z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white text-lg">HumScore</p>
              <p className="text-xs text-slate-400">Version {VERSION}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Hum or sing a melody and convert it to musical notes, sheet music
            preview, and MIDI — entirely on your device, offline.
          </p>
        </div>

        {/* Technical details */}
        <div className="rounded-2xl bg-slate-800 divide-y divide-slate-700/50">
          {[
            ['Audio Engine', 'Web Audio API (AnalyserNode)'],
            ['Pitch Method', 'Autocorrelation (monophonic)'],
            ['Pitch Range', '60 Hz – 1200 Hz'],
            ['Storage', 'IndexedDB (device-local)'],
            ['Export', 'PDF · MIDI Type 0 · JSON'],
            ['PWA', 'Workbox, standalone display'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-400">{k}</span>
              <span className="text-sm text-white font-medium text-right max-w-[60%]">
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* Future improvements */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
            Planned Improvements
          </p>
          <div className="space-y-2">
            {improvements.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-slate-800 p-4"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl bg-slate-800 p-4">
          <p className="text-xs font-semibold text-red-500/80 uppercase tracking-widest mb-3">
            Data
          </p>
          <button
            onClick={clearStorage}
            className="w-full py-3.5 rounded-xl bg-red-900/30 border border-red-700/40 text-red-400 font-semibold text-sm active:bg-red-900/50 min-h-[52px]"
          >
            Delete All Recordings
          </button>
        </div>

        <p className="text-center text-xs text-slate-700 pb-2">
          Built with React + Web Audio API · runs 100% in-browser
        </p>
      </div>
    </div>
  );
}
