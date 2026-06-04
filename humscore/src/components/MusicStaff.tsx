import type { DetectedNote, NoteValue } from '../types';
import {
  noteToStaffPosition,
  getLedgerLinePositions,
  isAccidental,
  frequencyToMidi,
  midiToNoteName,
  midiToFrequency,
  durationToNoteValue,
} from '../utils/noteConversion';

// ─── Layout constants ─────────────────────────────────────────────────────────

const LINE_SPACING = 12;   // px between adjacent staff lines
const STAFF_W_MIN = 360;
const NOTE_RX = 6.5;       // note head semi-major axis
const NOTE_RY = 4.5;       // note head semi-minor axis
const FIRST_X = 58;        // x of first note (after clef)
const NOTE_GAP = 30;       // horizontal spacing between notes
const MIDDLE_LINE_Y = 74;  // SVG y of middle staff line (B4)
const SVG_H = 160;         // total SVG height (enough for ledger lines above/below)

// Map diatonic step offset from B4 to SVG Y (higher pos = higher pitch = lower Y)
function posToY(pos: number): number {
  return MIDDLE_LINE_Y - pos * (LINE_SPACING / 2);
}

// ─── Treble Clef (drawn as SVG paths — no Unicode) ───────────────────────────

function TrebleClef({ x }: { x: number }) {
  const bottomLine = posToY(-4); // E4
  const topLine    = posToY(4);  // F5
  const gLine      = posToY(-2); // G4 – the G clef loops around this line
  const stemTop    = topLine - 14;
  const stemBot    = bottomLine + 10;
  const mx = x + 6; // center x of stem

  return (
    <g>
      {/* Vertical stem */}
      <line x1={mx} y1={stemTop} x2={mx} y2={stemBot} stroke="#94a3b8" strokeWidth={1.4} />

      {/* Top curl – small oval above the staff */}
      <ellipse
        cx={mx + 2} cy={stemTop + 6}
        rx={5.5} ry={4.5}
        fill="none" stroke="#94a3b8" strokeWidth={1.1}
      />

      {/* Body loop around G line */}
      <ellipse
        cx={mx - 0.5} cy={gLine}
        rx={6} ry={4}
        fill="none" stroke="#94a3b8" strokeWidth={1.2}
      />

      {/* Bottom scroll below staff */}
      <ellipse
        cx={mx - 2} cy={stemBot - 3}
        rx={4} ry={2.5}
        fill="none" stroke="#94a3b8" strokeWidth={1.0}
      />
    </g>
  );
}

// ─── Single note head with stem / flag ───────────────────────────────────────

function NoteHead({
  x,
  pos,
  note,
  nv,
}: {
  x: number;
  pos: number;
  note: DetectedNote;
  nv: NoteValue;
}) {
  const y = posToY(pos);

  // Stem direction: notes at/above middle line → stem goes down, else up
  const stemDown = pos >= 0;
  const stemX = stemDown ? x - NOTE_RX + 1 : x + NOTE_RX - 1;
  const stemLen = LINE_SPACING * 3.5;
  const stemEndY = stemDown ? y + stemLen : y - stemLen;

  // Ledger lines
  const ledgerPositions = getLedgerLinePositions(pos);

  // Note head fill depends on value
  const isOpen = nv === 'whole' || nv === 'half';
  const headFill = isOpen ? 'none' : '#f1f5f9';
  const headStroke = '#f1f5f9';
  const headStrokeW = isOpen ? 1.8 : 0;
  // Whole note is wider
  const rx = nv === 'whole' ? NOTE_RX + 1.5 : NOTE_RX;
  const ry = NOTE_RY;

  return (
    <g>
      {/* Ledger lines */}
      {ledgerPositions.map(lp => {
        const ly = posToY(lp);
        return (
          <line
            key={lp}
            x1={x - rx - 4} y1={ly}
            x2={x + rx + 4} y2={ly}
            stroke="#94a3b8" strokeWidth={1.4}
          />
        );
      })}

      {/* Stem (not for whole notes) */}
      {nv !== 'whole' && (
        <line
          x1={stemX} y1={y}
          x2={stemX} y2={stemEndY}
          stroke="#f1f5f9" strokeWidth={1.4}
        />
      )}

      {/* Eighth-note flag */}
      {nv === 'eighth' && (
        <path
          d={
            stemDown
              ? `M ${stemX} ${y + stemLen} Q ${stemX - 10} ${y + stemLen * 0.65} ${stemX + 6} ${y + stemLen * 0.3}`
              : `M ${stemX} ${y - stemLen} Q ${stemX + 10} ${y - stemLen * 0.65} ${stemX - 6} ${y - stemLen * 0.3}`
          }
          fill="none" stroke="#f1f5f9" strokeWidth={1.4} strokeLinecap="round"
        />
      )}

      {/* Note head */}
      <ellipse
        cx={x} cy={y}
        rx={rx} ry={ry}
        fill={headFill}
        stroke={headStroke}
        strokeWidth={headStrokeW}
        transform={`rotate(-10, ${x}, ${y})`}
      />

      {/* Accidental (sharp ♯ or flat ♭) */}
      {isAccidental(note.name) && (
        <text
          x={x - rx - 9} y={y + ry + 1}
          fontSize={11} fill="#a5b4fc"
          fontFamily="serif" textAnchor="middle"
        >
          {note.name.includes('#') ? '♯' : '♭'}
        </text>
      )}

      {/* Note label (name + octave) below head */}
      <text
        x={x} y={y + ry + 14}
        fontSize={7.5} fill="#475569"
        textAnchor="middle" fontFamily="monospace"
      >
        {note.name}{note.octave}
      </text>
    </g>
  );
}

// ─── Staff lines ──────────────────────────────────────────────────────────────

function StaffLines({ svgWidth }: { svgWidth: number }) {
  const linePositions = [-4, -2, 0, 2, 4];
  return (
    <>
      {linePositions.map(p => (
        <line
          key={p}
          x1={8} y1={posToY(p)}
          x2={svgWidth - 6} y2={posToY(p)}
          stroke="#475569" strokeWidth={1.2}
        />
      ))}
    </>
  );
}

// ─── Test-mode scale (C4 → C6) ───────────────────────────────────────────────

const TEST_SCALE_MIDI: number[] = [60,62,64,65,67,69,71,72,74,76,77,79,81,83,84];
// C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6

function buildTestNotes(): DetectedNote[] {
  return TEST_SCALE_MIDI.map((midi, i) => {
    const { name, octave } = midiToNoteName(midi);
    const freq = midiToFrequency(midi);
    return {
      id: `test-${i}`,
      name,
      octave,
      midiNumber: midi,
      frequency: Math.round(freq * 10) / 10,
      duration: 0.5,
      timestamp: i * 0.5,
      noteValue: 'quarter' as NoteValue,
      confidence: 1,
    };
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MusicStaffProps {
  notes: DetectedNote[];
  maxVisible?: number;
  testMode?: boolean;
}

export default function MusicStaff({
  notes,
  maxVisible = 12,
  testMode = false,
}: MusicStaffProps) {
  const displayNotes = testMode ? buildTestNotes() : notes.slice(0, maxVisible);

  const svgWidth = Math.max(
    STAFF_W_MIN,
    FIRST_X + displayNotes.length * NOTE_GAP + 40,
  );

  const endBarX = FIRST_X + displayNotes.length * NOTE_GAP + 10;

  return (
    <div className="overflow-x-auto rounded-2xl bg-slate-800/80 p-2 scrollbar-hide">
      <svg
        viewBox={`0 0 ${svgWidth} ${SVG_H}`}
        width={svgWidth}
        height={SVG_H}
        xmlns="http://www.w3.org/2000/svg"
        aria-label={testMode ? 'Test staff C4–C6 scale' : 'Music staff with detected notes'}
      >
        <StaffLines svgWidth={svgWidth} />

        <TrebleClef x={8} />

        {/* Opening bar line */}
        <line
          x1={FIRST_X - 6} y1={posToY(-4)}
          x2={FIRST_X - 6} y2={posToY(4)}
          stroke="#475569" strokeWidth={1.4}
        />

        {/* Notes */}
        {displayNotes.map((note, i) => {
          const pos = noteToStaffPosition(note);
          const nv: NoteValue = note.noteValue ?? durationToNoteValue(note.duration);
          const x = FIRST_X + i * NOTE_GAP;
          return (
            <NoteHead key={note.id} x={x} pos={pos} note={note} nv={nv} />
          );
        })}

        {/* Double bar line at end */}
        {displayNotes.length > 0 && (
          <>
            <line
              x1={endBarX} y1={posToY(-4)}
              x2={endBarX} y2={posToY(4)}
              stroke="#475569" strokeWidth={1.4}
            />
            <line
              x1={endBarX + 4} y1={posToY(-4)}
              x2={endBarX + 4} y2={posToY(4)}
              stroke="#475569" strokeWidth={3.5}
            />
          </>
        )}

        {/* Empty state */}
        {displayNotes.length === 0 && (
          <text
            x={svgWidth / 2} y={MIDDLE_LINE_Y}
            textAnchor="middle" fill="#475569"
            fontSize={12} fontFamily="system-ui"
          >
            No notes detected
          </text>
        )}
      </svg>

      {testMode && (
        <p className="text-center text-xs text-slate-500 mt-1 pb-1">
          C4 · D4 · E4 · F4 · G4 · A4 · B4 · C5 · D5 · E5 · F5 · G5 · A5 · B5 · C6
        </p>
      )}
    </div>
  );
}
