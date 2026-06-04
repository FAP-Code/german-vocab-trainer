import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: '🎤',
    title: 'Hum or Sing',
    desc: 'Just use your phone microphone – no instruments needed.',
  },
  {
    icon: '🎵',
    title: 'Note Detection',
    desc: 'Real-time pitch analysis converts your melody into note names.',
  },
  {
    icon: '🎼',
    title: 'Sheet Preview',
    desc: 'See your melody on a musical staff instantly.',
  },
  {
    icon: '💾',
    title: 'Export & Save',
    desc: 'Download as PDF, MIDI, or JSON. Works offline.',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900/40 to-slate-900 px-6 pt-12 pb-10 text-center">
        {/* Decorative rings */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-96 w-96 rounded-full border border-brand-700/20 absolute" />
          <div className="h-64 w-64 rounded-full border border-brand-600/25 absolute" />
        </div>

        {/* Logo */}
        <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-600 shadow-2xl shadow-brand-900/60">
          <svg viewBox="0 0 48 48" className="h-14 w-14 fill-white">
            <path d="M36 6v22.18A8 8 0 1 1 28 20V14l-16 3.2V36a8 8 0 1 1-8-8v-22l32-6.4V6z" />
          </svg>
        </div>

        <h1 className="relative text-4xl font-extrabold tracking-tight text-white">
          HumScore
        </h1>
        <p className="relative mt-2 text-base text-slate-400 max-w-xs mx-auto">
          Hum or sing a melody — instantly get notes, MIDI, and sheet music.
        </p>

        <button
          onClick={() => navigate('/record')}
          className="relative mt-8 inline-flex items-center gap-3 rounded-2xl bg-brand-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-900/50 active:scale-95 transition-transform min-h-[56px]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <circle cx="12" cy="12" r="8" />
          </svg>
          Start Recording
        </button>
      </div>

      {/* Features */}
      <div className="px-4 py-6 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-2 mb-4">
          How it works
        </h2>
        {features.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-4 rounded-2xl bg-slate-800 p-4"
          >
            <span className="text-2xl select-none" aria-hidden>
              {f.icon}
            </span>
            <div>
              <p className="font-semibold text-white text-sm">{f.title}</p>
              <p className="text-sm text-slate-400 mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Offline badge */}
      <div className="mx-4 mb-6 flex items-center gap-2 rounded-xl bg-emerald-900/30 border border-emerald-700/40 px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
        <p className="text-sm text-emerald-300">
          Works offline — install to your home screen for the best experience.
        </p>
      </div>
    </div>
  );
}
