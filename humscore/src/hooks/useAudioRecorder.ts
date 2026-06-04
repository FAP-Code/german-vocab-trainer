import { useCallback, useRef, useState } from 'react';
import { detectPitch, groupPitchesToNotes, type PitchSample } from '../utils/pitchDetection';
import {
  noteEventToDetectedNote,
} from '../utils/noteConversion';
import type { DetectedNote } from '../types';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error';

export interface AudioRecorderAPI {
  state: RecorderState;
  error: string | null;
  elapsed: number; // seconds
  currentFrequency: number; // Hz, 0 = silence
  waveformData: Uint8Array;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<{ notes: DetectedNote[]; audioBlob: Blob | null; duration: number }>;
  reset: () => void;
}

const FFT_SIZE = 2048;
const ANALYSIS_INTERVAL_MS = 50; // analyse every 50ms

export function useAudioRecorder(): AudioRecorderAPI {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentFrequency, setCurrentFrequency] = useState(0);
  const [waveformData, setWaveformData] = useState<Uint8Array>(new Uint8Array(128));

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pitchSamplesRef = useRef<PitchSample[]>([]);
  const analysisTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);

  const stopTimers = () => {
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    analysisTimerRef.current = null;
    elapsedTimerRef.current = null;
  };

  const startAnalysis = useCallback(() => {
    if (!analyserRef.current || !audioCtxRef.current) return;
    const analyser = analyserRef.current;
    const sampleRate = audioCtxRef.current.sampleRate;
    const buffer = new Float32Array(FFT_SIZE);
    const waveBuffer = new Uint8Array(analyser.frequencyBinCount);

    analysisTimerRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      analyser.getByteTimeDomainData(waveBuffer);
      setWaveformData(new Uint8Array(waveBuffer));

      const freq = detectPitch(buffer, sampleRate);
      if (freq > 0) {
        const now = audioCtxRef.current!.currentTime;
        pitchSamplesRef.current.push({ frequency: freq, time: now });
        setCurrentFrequency(Math.round(freq * 10) / 10);
      } else {
        setCurrentFrequency(0);
      }
    }, ANALYSIS_INTERVAL_MS);
  }, []);

  const start = useCallback(async () => {
    try {
      setState('requesting');
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Build Web Audio graph
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder for audio capture (playback later)
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      pitchSamplesRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100); // collect data every 100ms
      startTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
      setState('recording');
      startAnalysis();

      elapsedTimerRef.current = window.setInterval(() => {
        setElapsed(
          pausedElapsedRef.current +
            (Date.now() - startTimeRef.current) / 1000,
        );
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('denied') || msg.includes('NotAllowed')) {
        setError(
          'Microphone access was denied. Please allow microphone access in your browser settings and try again.',
        );
      } else if (msg.includes('NotFound') || msg.includes('Requested device not found')) {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(`Could not access microphone: ${msg}`);
      }
      setState('error');
    }
  }, [startAnalysis]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    pausedElapsedRef.current += (Date.now() - startTimeRef.current) / 1000;
    stopTimers();
    setState('paused');
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    startTimeRef.current = Date.now();
    setState('recording');
    startAnalysis();

    elapsedTimerRef.current = window.setInterval(() => {
      setElapsed(
        pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000,
      );
    }, 100);
  }, [startAnalysis]);

  const stop = useCallback((): Promise<{
    notes: DetectedNote[];
    audioBlob: Blob | null;
    duration: number;
  }> => {
    return new Promise((resolve) => {
      stopTimers();
      const duration =
        pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000;
      setState('stopped');
      setCurrentFrequency(0);

      const samples = [...pitchSamplesRef.current];
      const groups = groupPitchesToNotes(samples);
      const notes = groups.map((g, i) => noteEventToDetectedNote(g, i));

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          const mimeType = recorder.mimeType;
          const blob =
            chunksRef.current.length > 0
              ? new Blob(chunksRef.current, { type: mimeType })
              : null;
          cleanup();
          resolve({ notes, audioBlob: blob, duration });
        };
        recorder.stop();
      } else {
        cleanup();
        resolve({ notes, audioBlob: null, duration });
      }
    });
  }, []);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  };

  const reset = useCallback(() => {
    stopTimers();
    cleanup();
    pitchSamplesRef.current = [];
    chunksRef.current = [];
    setElapsed(0);
    setCurrentFrequency(0);
    setWaveformData(new Uint8Array(128));
    setError(null);
    setState('idle');
  }, []);

  return {
    state,
    error,
    elapsed,
    currentFrequency,
    waveformData,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}

function getSupportedMimeType(): string | null {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}
