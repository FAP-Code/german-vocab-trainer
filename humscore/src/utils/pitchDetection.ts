/**
 * Autocorrelation-based monophonic pitch detector.
 * Suitable for humming/singing (one note at a time, ~80–880 Hz range).
 *
 * Future improvement: replace with ML-based model (e.g. CREPE, SPICE)
 * for polyphonic and more accurate pitch tracking.
 */

const MIN_FREQ = 60;   // ~B1, below normal singing range
const MAX_FREQ = 1200; // a bit above soprano high C

export function detectPitch(buffer: Float32Array, sampleRate: number): number {
  // -1 means "no pitch / silence"
  const rms = getRMS(buffer);
  if (rms < 0.008) return -1;

  const maxPeriod = Math.floor(sampleRate / MIN_FREQ);
  const minPeriod = Math.ceil(sampleRate / MAX_FREQ);

  // Trim edges to reduce noise influence
  const buf = trimSilence(buffer);
  if (buf.length < minPeriod * 2) return -1;

  // Build normalized autocorrelation
  const acSize = Math.min(buf.length, maxPeriod + 1);
  const ac = new Float32Array(acSize);

  // Compute power of full signal once
  let power = 0;
  for (let i = 0; i < buf.length; i++) power += buf[i] * buf[i];

  for (let lag = 0; lag < acSize; lag++) {
    let sum = 0;
    for (let i = 0; i < buf.length - lag; i++) {
      sum += buf[i] * buf[i + lag];
    }
    ac[lag] = sum / (power + 1e-9);
  }

  // Find first dip then first peak (standard ACF pitch trick)
  let dip = minPeriod;
  while (dip < acSize - 1 && ac[dip] > ac[dip + 1]) dip++;

  let bestLag = -1;
  let bestVal = 0.3; // confidence threshold
  for (let lag = dip; lag < acSize; lag++) {
    if (ac[lag] > bestVal) {
      bestVal = ac[lag];
      bestLag = lag;
    }
  }

  if (bestLag < minPeriod) return -1;

  // Parabolic interpolation for sub-sample accuracy
  const refined = refine(ac, bestLag);
  const freq = sampleRate / refined;

  if (freq < MIN_FREQ || freq > MAX_FREQ) return -1;
  return freq;
}

function getRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

function trimSilence(buffer: Float32Array): Float32Array {
  const threshold = 0.015;
  let start = 0;
  let end = buffer.length - 1;
  while (start < buffer.length / 2 && Math.abs(buffer[start]) < threshold) start++;
  while (end > buffer.length / 2 && Math.abs(buffer[end]) < threshold) end--;
  return buffer.slice(start, end + 1);
}

function refine(ac: Float32Array, peak: number): number {
  if (peak <= 0 || peak >= ac.length - 1) return peak;
  const x1 = ac[peak - 1];
  const x2 = ac[peak];
  const x3 = ac[peak + 1];
  const denom = 2 * x2 - x1 - x3;
  if (Math.abs(denom) < 1e-9) return peak;
  return peak + (x3 - x1) / (2 * denom);
}

/**
 * Groups a stream of pitch samples (frequency + timestamp) into note events.
 * Consecutive samples within SEMITONE_TOLERANCE semitones are merged.
 *
 * Replace this with a proper HMM or neural grouping for AI-grade accuracy.
 */
export interface PitchSample {
  frequency: number;
  time: number;
}

export interface NoteEvent {
  frequency: number;
  startTime: number;
  endTime: number;
  duration: number;
}

const SEMITONE_TOLERANCE = 1.2; // semitones
const MIN_NOTE_DURATION = 0.08;  // seconds – ignore very short blips

export function groupPitchesToNotes(samples: PitchSample[]): NoteEvent[] {
  if (samples.length === 0) return [];

  const events: NoteEvent[] = [];
  let groupStart = 0;
  const freqToSemitone = (f: number) => 12 * Math.log2(f / 440) + 69;

  for (let i = 1; i <= samples.length; i++) {
    const prev = samples[i - 1];
    const curr = i < samples.length ? samples[i] : null;

    const differentNote =
      !curr ||
      Math.abs(freqToSemitone(curr.frequency) - freqToSemitone(prev.frequency)) >
        SEMITONE_TOLERANCE ||
      curr.time - prev.time > 0.3; // gap > 300ms → new note

    if (differentNote) {
      const grouped = samples.slice(groupStart, i);
      const avgFreq =
        grouped.reduce((s, p) => s + p.frequency, 0) / grouped.length;
      const start = grouped[0].time;
      const end = grouped[grouped.length - 1].time;
      const dur = end - start;

      if (dur >= MIN_NOTE_DURATION) {
        events.push({
          frequency: avgFreq,
          startTime: start,
          endTime: end,
          duration: dur,
        });
      }
      groupStart = i;
    }
  }

  return events;
}
