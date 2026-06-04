import type { DetectedNote, Recording, ExportData } from '../types';
import { noteToStaffPosition, isAccidental } from './noteConversion';

// ─── JSON Export ──────────────────────────────────────────────────────────────

export function exportJSON(recording: Recording): void {
  const data: ExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    recording: {
      id: recording.id,
      name: recording.name,
      durationSeconds: recording.durationSeconds,
    },
    notes: recording.notes,
    metadata: {
      noteCount: recording.notes.length,
      uniqueNotes: [...new Set(recording.notes.map((n) => n.name + n.octave))],
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, `${sanitizeFilename(recording.name)}.json`);
}

// ─── MIDI Export ─────────────────────────────────────────────────────────────
// Standard MIDI File (Type 0) — single track
// Future improvement: integrate @tonejs/midi or a dedicated MIDI library for
// full SMF support (velocity curves, multiple channels, etc.)

export function exportMIDI(recording: Recording): void {
  const ticksPerBeat = 480;
  const bpm = 120;
  const microsecondsPerBeat = Math.round(60_000_000 / bpm);
  const secondsPerTick = 60 / (bpm * ticksPerBeat);

  const trackEvents: number[] = [];

  // Track name meta-event
  appendMetaEvent(trackEvents, 0, 0x03, stringToBytes(recording.name));

  // Tempo meta-event (FF 51 03 tt tt tt)
  appendMetaEvent(trackEvents, 0, 0x51, [
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff,
  ]);

  // Program change: Piano (channel 0, program 0)
  trackEvents.push(...varLen(0), 0xc0, 0x00);

  let lastTick = 0;

  for (const note of recording.notes) {
    const startTick = Math.round(note.timestamp / secondsPerTick);
    const endTick = Math.round(
      (note.timestamp + note.duration) / secondsPerTick,
    );
    const midi = Math.max(0, Math.min(127, note.midiNumber));

    // Note On
    const deltaOn = startTick - lastTick;
    trackEvents.push(...varLen(deltaOn), 0x90, midi, 80);
    lastTick = startTick;

    // Note Off
    const deltaOff = endTick - lastTick;
    trackEvents.push(...varLen(deltaOff), 0x80, midi, 0);
    lastTick = endTick;
  }

  // End of track
  appendMetaEvent(trackEvents, 0, 0x2f, []);

  const trackData = new Uint8Array(trackEvents);

  // MIDI header chunk
  const header = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, // MThd
    0x00, 0x00, 0x00, 0x06, // chunk length = 6
    0x00, 0x00,             // format 0
    0x00, 0x01,             // 1 track
    (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff,
  ]);

  // Track chunk
  const trackLen = trackData.length;
  const trackHeader = new Uint8Array([
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    (trackLen >> 24) & 0xff,
    (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff,
    trackLen & 0xff,
  ]);

  const midi = new Uint8Array(
    header.length + trackHeader.length + trackData.length,
  );
  midi.set(header, 0);
  midi.set(trackHeader, header.length);
  midi.set(trackData, header.length + trackHeader.length);

  const blob = new Blob([midi], { type: 'audio/midi' });
  triggerDownload(blob, `${sanitizeFilename(recording.name)}.mid`);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
// Produces a simple A4 sheet with the note sequence and a staff preview.
// Future improvement: use VexFlow or LilyPond for proper music engraving.

export async function exportPDF(recording: Recording): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('HumScore', MARGIN, 17);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(recording.name, MARGIN, 24);

  // Meta info
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(
    `Recorded: ${new Date(recording.createdAt).toLocaleString()}   |   Notes detected: ${recording.notes.length}   |   Duration: ${recording.durationSeconds.toFixed(1)}s`,
    MARGIN,
    36,
  );

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, 40, PAGE_W - MARGIN, 40);

  // Staff preview
  drawPDFStaff(doc, recording.notes, MARGIN, 50, CONTENT_W);

  // Note table
  let y = 115;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Detected Notes', MARGIN, y);
  y += 6;

  const headers = ['#', 'Note', 'Octave', 'Freq (Hz)', 'Duration (s)', 'Time (s)'];
  const colWidths = [12, 25, 22, 32, 34, 30];
  const colX = colWidths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? MARGIN : acc[i - 1] + colWidths[i - 1]);
    return acc;
  }, []);

  // Table header
  doc.setFillColor(240, 240, 250);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 130);
  headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 5));
  y += 8;

  doc.setTextColor(50, 50, 50);
  recording.notes.forEach((note, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 252);
      doc.rect(MARGIN, y - 1, CONTENT_W, 6.5, 'F');
    }
    const row = [
      String(idx + 1),
      note.name,
      String(note.octave),
      note.frequency.toFixed(1),
      note.duration.toFixed(2),
      note.timestamp.toFixed(2),
    ];
    doc.setFontSize(8);
    row.forEach((v, i) => doc.text(v, colX[i] + 1, y + 4));
    y += 6.5;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Generated by HumScore  •  Page ${p} of ${pageCount}`,
      PAGE_W / 2,
      292,
      { align: 'center' },
    );
  }

  doc.save(`${sanitizeFilename(recording.name)}.pdf`);
}

// ─── PDF Staff Drawing ────────────────────────────────────────────────────────

function drawPDFStaff(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  notes: DetectedNote[],
  x: number,
  y: number,
  width: number,
): void {
  const LINE_SPACING = 4;
  const staffTop = y + 10;

  // Draw 5 staff lines
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  for (let i = 0; i < 5; i++) {
    const lineY = staffTop + i * LINE_SPACING;
    doc.line(x, lineY, x + width, lineY);
  }

  // Treble clef label
  doc.setFontSize(24);
  doc.setTextColor(80, 80, 80);
  doc.text('𝄞', x + 1, staffTop + LINE_SPACING * 4 + 2);

  // Notes
  const noteStartX = x + 16;
  const noteSpacing = Math.min(14, (width - 20) / Math.max(notes.length, 1));

  notes.slice(0, Math.floor((width - 20) / noteSpacing)).forEach((note, i) => {
    const pos = noteToStaffPosition(note);
    const noteY = staffTop + LINE_SPACING * 2 - pos * (LINE_SPACING / 2);
    const noteX = noteStartX + i * noteSpacing;

    // Ledger lines
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    if (pos >= 6) {
      for (let l = 6; l <= pos + (pos % 2 === 0 ? 0 : -1); l += 2) {
        const ly = staffTop + LINE_SPACING * 2 - l * (LINE_SPACING / 2);
        doc.line(noteX - 2, ly, noteX + 5, ly);
      }
    }
    if (pos <= -6) {
      for (let l = -6; l >= pos - (pos % 2 === 0 ? 0 : 1); l -= 2) {
        const ly = staffTop + LINE_SPACING * 2 - l * (LINE_SPACING / 2);
        doc.line(noteX - 2, ly, noteX + 5, ly);
      }
    }

    // Note head (filled ellipse)
    doc.setFillColor(30, 30, 30);
    doc.ellipse(noteX + 1.5, noteY, 2.0, 1.4, 'F');

    // Stem
    const stemDir = pos >= 0 ? -1 : 1;
    const stemEnd = stemDir === -1 ? noteY - 10 : noteY + 10;
    doc.setLineWidth(0.4);
    doc.line(noteX + 3.5, noteY, noteX + 3.5, stemEnd);

    // Accidental
    if (isAccidental(note.name)) {
      doc.setFontSize(5);
      doc.setTextColor(30, 30, 30);
      doc.text(note.name.includes('#') ? '#' : 'b', noteX - 4, noteY + 1.5);
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function varLen(value: number): number[] {
  const bytes: number[] = [];
  bytes.unshift(value & 0x7f);
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

function appendMetaEvent(
  arr: number[],
  delta: number,
  type: number,
  data: number[],
): void {
  arr.push(...varLen(delta), 0xff, type, ...varLen(data.length), ...data);
}

function stringToBytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'humscore';
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
