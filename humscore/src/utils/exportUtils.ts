import type { DetectedNote, Recording, ExportData, NoteValue } from '../types';
import {
  noteToStaffPosition,
  getLedgerLinePositions,
  isAccidental,
  durationToNoteValue,
} from './noteConversion';

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
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `${sanitizeFilename(recording.name)}.json`,
  );
}

// ─── MIDI Export ─────────────────────────────────────────────────────────────

export function exportMIDI(recording: Recording): void {
  const ticksPerBeat = 480;
  const bpm = 120;
  const microsecondsPerBeat = Math.round(60_000_000 / bpm);
  const secondsPerTick = 60 / (bpm * ticksPerBeat);

  const track: number[] = [];

  appendMetaEvent(track, 0, 0x03, stringToBytes(recording.name));
  appendMetaEvent(track, 0, 0x51, [
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff,
  ]);
  track.push(...varLen(0), 0xc0, 0x00); // program: piano

  let lastTick = 0;
  for (const note of recording.notes) {
    const startTick = Math.round(note.timestamp / secondsPerTick);
    const endTick = Math.round((note.timestamp + note.duration) / secondsPerTick);
    const midi = Math.max(0, Math.min(127, note.midiNumber));
    const deltaOn = startTick - lastTick;
    track.push(...varLen(deltaOn), 0x90, midi, 80);
    lastTick = startTick;
    const deltaOff = endTick - lastTick;
    track.push(...varLen(deltaOff), 0x80, midi, 0);
    lastTick = endTick;
  }
  appendMetaEvent(track, 0, 0x2f, []);

  const trackData = new Uint8Array(track);
  const header = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
    0x00, 0x00, 0x00, 0x01,
    (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff,
  ]);
  const trackLen = trackData.length;
  const trackHeader = new Uint8Array([
    0x4d, 0x54, 0x72, 0x6b,
    (trackLen >> 24) & 0xff, (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff, trackLen & 0xff,
  ]);
  const out = new Uint8Array(header.length + trackHeader.length + trackData.length);
  out.set(header, 0);
  out.set(trackHeader, header.length);
  out.set(trackData, header.length + trackHeader.length);
  triggerDownload(new Blob([out], { type: 'audio/midi' }), `${sanitizeFilename(recording.name)}.mid`);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export async function exportPDF(recording: Recording): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('HumScore', MARGIN, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(recording.name, MARGIN, 22);

  // ── Meta ────────────────────────────────────────────────────────────────────
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.text(
    `Recorded: ${new Date(recording.createdAt).toLocaleString()}   |   ` +
    `Notes: ${recording.notes.length}   |   Duration: ${recording.durationSeconds.toFixed(1)}s`,
    MARGIN, 34,
  );
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, 37, PAGE_W - MARGIN, 37);

  // ── Staff preview ────────────────────────────────────────────────────────────
  drawPDFStaff(doc, recording.notes, MARGIN, 42, CONTENT_W);

  // ── Note table ───────────────────────────────────────────────────────────────
  let y = 110;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Detected Notes', MARGIN, y);
  y += 5;

  const headers = ['#', 'Note', 'Oct', 'Freq (Hz)', 'Dur (s)', 'Time (s)', 'Symbol', 'Conf'];
  const colW    = [10,   20,    14,    28,         22,       22,         22,       16];
  const colX: number[] = [];
  let cx = MARGIN;
  for (const w of colW) { colX.push(cx); cx += w; }

  doc.setFillColor(235, 235, 248);
  doc.rect(MARGIN, y, CONTENT_W, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 130);
  headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 4.5));
  y += 7;

  doc.setTextColor(40, 40, 40);
  for (let idx = 0; idx < recording.notes.length; idx++) {
    if (y > 272) { doc.addPage(); y = 18; }
    const note = recording.notes[idx];
    const nv: NoteValue = note.noteValue ?? durationToNoteValue(note.duration);
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 253);
      doc.rect(MARGIN, y - 1, CONTENT_W, 6, 'F');
    }
    const row = [
      String(idx + 1),
      note.name,
      String(note.octave),
      note.frequency.toFixed(1),
      note.duration.toFixed(2),
      note.timestamp.toFixed(2),
      nv,
      note.confidence != null ? note.confidence.toFixed(2) : '—',
    ];
    doc.setFontSize(7.5);
    row.forEach((v, i) => doc.text(v, colX[i] + 1, y + 4));
    y += 6;
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(170, 170, 170);
    doc.text(`Generated by HumScore  |  Page ${p} of ${pages}`, PAGE_W / 2, 292, { align: 'center' });
  }

  doc.save(`${sanitizeFilename(recording.name)}.pdf`);
}

// ─── PDF Staff ────────────────────────────────────────────────────────────────
//
// Y coordinate system in jsPDF (all in mm, y increases downward):
//   staffTop     = y param + small offset  (top line = F5)
//   staffTop + 4*LS  = bottom line = E4
//   middle line (B4) = staffTop + 2*LS
//
// Staff position mapping:
//   noteY = middleLineY - pos * (LS/2)
//   pos=+4 (F5) → staffTop ✓
//   pos=-4 (E4) → staffTop + 4*LS ✓

function drawPDFStaff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  notes: DetectedNote[],
  marginX: number,
  startY: number,
  width: number,
): void {
  const LS = 3.8;         // mm between staff lines
  const staffTop = startY + 6;  // top staff line (F5)
  const bottomLineY = staffTop + 4 * LS;  // E4
  const middleLineY = staffTop + 2 * LS;  // B4

  // 5 staff lines
  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.25);
  for (let i = 0; i < 5; i++) {
    doc.line(marginX, staffTop + i * LS, marginX + width, staffTop + i * LS);
  }

  // ── Treble clef (drawn geometrically — no Unicode) ──────────────────────────
  // Root cause of "Ø4Ý" garbage: the Unicode char U+1D11E is absent from the
  // standard jsPDF Helvetica/Times fonts. We draw an approximation instead.
  const clefX = marginX + 1;
  const stemX = clefX + 4;
  const gLineY = bottomLineY - LS;       // G4 = 2nd line from bottom

  doc.setLineWidth(0.55);
  doc.setDrawColor(40, 40, 40);
  // Vertical stem
  doc.line(stemX, staffTop - 5, stemX, bottomLineY + 4);
  // Top spiral (small oval above top line)
  doc.setLineWidth(0.4);
  doc.ellipse(stemX + 1.5, staffTop - 3, 2.5, 2.0, 'D');
  // Loop around G4 line
  doc.setLineWidth(0.5);
  doc.ellipse(stemX, gLineY, 2.8, 1.8, 'D');
  // Bottom scroll
  doc.setLineWidth(0.35);
  doc.ellipse(stemX - 1.5, bottomLineY + 2.5, 2.0, 1.2, 'D');

  // ── Notes ────────────────────────────────────────────────────────────────────
  const noteStartX = marginX + 14;
  const noteSpacing = Math.min(12, (width - 18) / Math.max(notes.length, 1));
  const maxNotes = Math.floor((width - 18) / noteSpacing);

  notes.slice(0, maxNotes).forEach((note, i) => {
    const pos = noteToStaffPosition(note);
    const noteY = middleLineY - pos * (LS / 2);
    const noteX = noteStartX + i * noteSpacing;
    const nv: NoteValue = note.noteValue ?? durationToNoteValue(note.duration);
    const isOpen = nv === 'whole' || nv === 'half';
    const headRX = nv === 'whole' ? 2.4 : 1.9;
    const headRY = 1.3;

    // Ledger lines
    doc.setDrawColor(70, 70, 70);
    doc.setLineWidth(0.22);
    for (const lp of getLedgerLinePositions(pos)) {
      const ly = middleLineY - lp * (LS / 2);
      doc.line(noteX - headRX - 1.5, ly, noteX + headRX + 1.5, ly);
    }

    // Stem (not for whole)
    if (nv !== 'whole') {
      const stemDown = pos >= 0;
      const sx = stemDown ? noteX - headRX + 0.5 : noteX + headRX - 0.5;
      const sy1 = noteY;
      const sy2 = stemDown ? noteY + LS * 3.5 : noteY - LS * 3.5;
      doc.setLineWidth(0.3);
      doc.setDrawColor(20, 20, 20);
      doc.line(sx, sy1, sx, sy2);

      // Flag for eighth note
      if (nv === 'eighth') {
        doc.setLineWidth(0.3);
        // Simple curved flag approximation using a short diagonal line
        if (stemDown) {
          doc.line(sx, sy2, sx - 2.5, sy2 + 1.5);
        } else {
          doc.line(sx, sy2, sx + 2.5, sy2 + 1.5);
        }
      }
    }

    // Note head
    doc.setLineWidth(0.3);
    if (isOpen) {
      doc.setDrawColor(20, 20, 20);
      doc.ellipse(noteX, noteY, headRX, headRY, 'D');
    } else {
      doc.setFillColor(20, 20, 20);
      doc.ellipse(noteX, noteY, headRX, headRY, 'F');
    }

    // Accidental
    if (isAccidental(note.name)) {
      doc.setFontSize(5);
      doc.setTextColor(20, 20, 20);
      doc.text(
        note.name.includes('#') ? '#' : 'b',
        noteX - headRX - 2.5,
        noteY + headRY + 0.5,
      );
    }

    // Note label below head (small text)
    doc.setFontSize(5.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`${note.name}${note.octave}`, noteX, noteY + headRY + 2.5, { align: 'center' });
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

function appendMetaEvent(arr: number[], delta: number, type: number, data: number[]): void {
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
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
