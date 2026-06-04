/**
 * NSDF-based monophonic pitch detector (McLeod Pitch Method approach).
 *
 * ROOT CAUSE OF PREVIOUS OCTAVE ERRORS:
 *   The old autocorrelation found the GLOBAL MAXIMUM lag. For voiced audio the
 *   ACF peak at 2T (one octave down) is often slightly higher than the peak at
 *   T (the true fundamental) because both T and 2T align harmonics at 2T. This
 *   made every detected note come out one octave too low.
 *
 * FIX — two-part:
 *   1. Switch to NSDF (Normalized Square Difference Function), which normalises
 *      by the instantaneous signal power at each lag so peaks at T and 2T are
 *      more equal in height.
 *   2. "First-good-peak" strategy: among all local maxima, pick the FIRST one
 *      (smallest lag = highest frequency) whose value is ≥ 0.85 × global max.
 *      For a typical singing voice the fundamental peak always qualifies, while
 *      the subharmonic peak comes later and is therefore skipped.
 *
 * Future upgrade: replace with CREPE / SPICE (ONNX Runtime Web) for ML-grade
 * accuracy and polyphonic support.
 */

const MIN_FREQ = 70;    // Hz — slightly below C2, covers bass voices
const MAX_FREQ = 1050;  // Hz — C6 + a little headroom

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PitchResult {
  frequency: number;  // Hz; -1 = silence / no pitch found
  confidence: number; // 0–1 (NSDF peak height)
}

export interface PitchSample {
  frequency: number;
  time: number;       // AudioContext.currentTime
  confidence: number;
}

export interface NoteEvent {
  frequency: number;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number; // average over constituent samples
}

// ─── Core detector ────────────────────────────────────────────────────────────

export function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult {
  const rms = getRMS(buffer);
  if (rms < 0.01) return { frequency: -1, confidence: 0 };

  const W = buffer.length;
  const maxLag = Math.min(W - 1, Math.floor(sampleRate / MIN_FREQ));
  const minLag = Math.ceil(sampleRate / MAX_FREQ);

  if (maxLag <= minLag) return { frequency: -1, confidence: 0 };

  const nsdf = computeNSDF(buffer, W, maxLag);

  // Find all local maxima above zero in [minLag, maxLag]
  const peaks: { lag: number; val: number }[] = [];
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (
      nsdf[lag] > 0 &&
      nsdf[lag] >= nsdf[lag - 1] &&
      nsdf[lag] >= nsdf[lag + 1]
    ) {
      peaks.push({ lag, val: nsdf[lag] });
    }
  }

  if (peaks.length === 0) return { frequency: -1, confidence: 0 };

  const globalMax = peaks.reduce((m, p) => Math.max(m, p.val), 0);
  if (globalMax < 0.4) return { frequency: -1, confidence: 0 };

  // First-good-peak: the FIRST peak ≥ 0.85 × global max.
  // Choosing "first" = smallest lag = highest frequency → avoids subharmonics.
  const chosen = peaks.find(p => p.val >= 0.85 * globalMax);
  if (!chosen) return { frequency: -1, confidence: 0 };

  // Sub-sample accuracy via parabolic interpolation on NSDF
  const refined = parabolicRefine(nsdf, chosen.lag);
  const freq = sampleRate / refined;

  if (freq < MIN_FREQ || freq > MAX_FREQ) return { frequency: -1, confidence: 0 };
  return { frequency: freq, confidence: chosen.val };
}

// ─── NSDF ─────────────────────────────────────────────────────────────────────
//
// NSDF(lag) = 2 * r(lag) / m(lag)
//
// where:
//   r(lag) = Σ_{i=0}^{N-lag-1} x[i] · x[i+lag]   (cross-correlation)
//   m(lag) = Σ_{i=0}^{N-lag-1} x[i]^2
//           + Σ_{i=lag}^{N-1}   x[i]^2            (instantaneous power)
//
// Computing m(lag) from a prefix-sum array: m(lag) = cs[N-lag] + cs[N] - cs[lag]
// (where cs[i] = Σ_{j<i} x[j]^2)

function computeNSDF(buf: Float32Array, W: number, maxLag: number): Float32Array {
  // Build prefix-sum of squares
  const cs = new Float32Array(W + 1);
  for (let i = 0; i < W; i++) cs[i + 1] = cs[i] + buf[i] * buf[i];
  const totalSq = cs[W];

  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let corr = 0;
    const len = W - lag;
    for (let i = 0; i < len; i++) corr += buf[i] * buf[i + lag];

    const m = cs[W - lag] + totalSq - cs[lag];
    nsdf[lag] = m > 1e-10 ? (2 * corr) / m : 0;
  }
  return nsdf;
}

function parabolicRefine(nsdf: Float32Array, peak: number): number {
  if (peak <= 0 || peak >= nsdf.length - 1) return peak;
  const x1 = nsdf[peak - 1];
  const x2 = nsdf[peak];
  const x3 = nsdf[peak + 1];
  const denom = 2 * x2 - x1 - x3;
  if (Math.abs(denom) < 1e-10) return peak;
  return peak + (x3 - x1) / (2 * denom);
}

function getRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

// ─── Note grouping ────────────────────────────────────────────────────────────

const SEMITONE_TOLERANCE = 1.5; // semitones — consecutive samples within this are merged
const MIN_NOTE_DURATION = 0.1;  // seconds — discard blips shorter than this
const MIN_CONFIDENCE = 0.45;    // discard low-confidence samples

export function groupPitchesToNotes(samples: PitchSample[]): NoteEvent[] {
  // Filter low-confidence samples first
  const valid = samples.filter(s => s.confidence >= MIN_CONFIDENCE);
  if (valid.length === 0) return [];

  const events: NoteEvent[] = [];
  const freqToSemitone = (f: number) => 12 * Math.log2(f / 440) + 69;

  let groupStart = 0;
  for (let i = 1; i <= valid.length; i++) {
    const prev = valid[i - 1];
    const curr = i < valid.length ? valid[i] : null;

    const split =
      !curr ||
      Math.abs(freqToSemitone(curr.frequency) - freqToSemitone(prev.frequency)) > SEMITONE_TOLERANCE ||
      curr.time - prev.time > 0.35; // gap > 350 ms → new note

    if (split) {
      const group = valid.slice(groupStart, i);
      const dur = group[group.length - 1].time - group[0].time;

      if (dur >= MIN_NOTE_DURATION) {
        // Use median frequency (more robust than mean against outlier samples)
        const sorted = [...group].sort((a, b) => a.frequency - b.frequency);
        const medianFreq = sorted[Math.floor(sorted.length / 2)].frequency;
        const avgConf = group.reduce((s, p) => s + p.confidence, 0) / group.length;

        events.push({
          frequency: medianFreq,
          startTime: group[0].time,
          endTime: group[group.length - 1].time,
          duration: dur,
          confidence: avgConf,
        });
      }
      groupStart = i;
    }
  }

  return events;
}
