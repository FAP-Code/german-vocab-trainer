import type { DetectedNote } from '../types';
import { noteToStaffPosition, isAccidental } from '../utils/noteConversion';

interface MusicStaffProps {
  notes: DetectedNote[];
  maxVisible?: number;
}

const LINE_SPACING = 12; // px between staff lines
const STAFF_WIDTH = 340;
const NOTE_HEAD_RX = 7;
const NOTE_HEAD_RY = 5;
const FIRST_NOTE_X = 72; // after clef
const NOTE_SPACING = 28;
const MIDDLE_LINE_Y = 70; // y of middle (3rd) line of staff

// Maps diatonic step offset from B4 reference to Y on staff
function posToY(pos: number): number {
  // +pos = above middle line (B4) → smaller Y
  return MIDDLE_LINE_Y - pos * (LINE_SPACING / 2);
}

// Draw treble clef as simplified SVG path
function TrebleClef({ x, y }: { x: number; y: number }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={LINE_SPACING * 9}
      fill="#e2e8f0"
      fontFamily="serif"
      dominantBaseline="auto"
      opacity={0.9}
    >
      𝄞
    </text>
  );
}

function NoteHead({
  x,
  y,
  pos,
  note,
}: {
  x: number;
  y: number;
  pos: number;
  note: DetectedNote;
}) {
  const stemDir = pos >= 0 ? -1 : 1; // above middle → stem down
  const stemEndY = stemDir === -1 ? y - LINE_SPACING * 3.5 : y + LINE_SPACING * 3.5;

  // Ledger lines above staff
  const ledgerLines: number[] = [];
  if (pos >= 6) {
    for (let p = 6; p <= pos + (pos % 2 !== 0 ? 1 : 0); p += 2) {
      if (p % 2 === 0) ledgerLines.push(posToY(p));
    }
  }
  // Ledger lines below staff
  if (pos <= -6) {
    for (let p = -6; p >= pos - (pos % 2 !== 0 ? 1 : 0); p -= 2) {
      if (p % 2 === 0) ledgerLines.push(posToY(p));
    }
  }

  return (
    <g>
      {/* Ledger lines */}
      {ledgerLines.map((ly) => (
        <line
          key={ly}
          x1={x - NOTE_HEAD_RX - 3}
          y1={ly}
          x2={x + NOTE_HEAD_RX + 3}
          y2={ly}
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
      ))}

      {/* Stem */}
      <line
        x1={stemDir === -1 ? x + NOTE_HEAD_RX - 1 : x - NOTE_HEAD_RX + 1}
        y1={y}
        x2={stemDir === -1 ? x + NOTE_HEAD_RX - 1 : x - NOTE_HEAD_RX + 1}
        y2={stemEndY}
        stroke="#e2e8f0"
        strokeWidth={1.5}
      />

      {/* Note head */}
      <ellipse
        cx={x}
        cy={y}
        rx={NOTE_HEAD_RX}
        ry={NOTE_HEAD_RY}
        fill="#f1f5f9"
        transform={`rotate(-12, ${x}, ${y})`}
      />

      {/* Accidental */}
      {isAccidental(note.name) && (
        <text
          x={x - NOTE_HEAD_RX - 8}
          y={y + NOTE_HEAD_RY}
          fontSize={11}
          fill="#a5b4fc"
          fontFamily="serif"
        >
          {note.name.includes('#') ? '♯' : '♭'}
        </text>
      )}

      {/* Note label below head */}
      <text
        x={x}
        y={y + NOTE_HEAD_RY + 12}
        fontSize={8}
        fill="#64748b"
        textAnchor="middle"
        fontFamily="monospace"
      >
        {note.name}
        {note.octave}
      </text>
    </g>
  );
}

export default function MusicStaff({ notes, maxVisible = 10 }: MusicStaffProps) {
  const visible = notes.slice(0, maxVisible);
  const totalWidth = FIRST_NOTE_X + visible.length * NOTE_SPACING + 24;
  const svgWidth = Math.max(STAFF_WIDTH, totalWidth);
  const svgHeight = 140;

  // Staff line Y positions (lines 1–5 from bottom = lines at pos -4,-2,0,+2,+4 in diatonic steps)
  const linePositions = [-4, -2, 0, 2, 4]; // diatonic step offsets from B4

  return (
    <div className="overflow-x-auto rounded-2xl bg-slate-800/80 p-2">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Music staff with detected notes"
      >
        {/* Staff lines */}
        {linePositions.map((p) => (
          <line
            key={p}
            x1={10}
            y1={posToY(p)}
            x2={svgWidth - 8}
            y2={posToY(p)}
            stroke="#475569"
            strokeWidth={1.2}
          />
        ))}

        {/* Treble clef */}
        <TrebleClef x={8} y={posToY(-4) + 6} />

        {/* Bar line at start */}
        <line
          x1={FIRST_NOTE_X - 8}
          y1={posToY(-4)}
          x2={FIRST_NOTE_X - 8}
          y2={posToY(4)}
          stroke="#475569"
          strokeWidth={1.5}
        />

        {/* Notes */}
        {visible.map((note, i) => {
          const pos = noteToStaffPosition(note);
          const x = FIRST_NOTE_X + i * NOTE_SPACING;
          const y = posToY(pos);
          return (
            <NoteHead key={note.id} x={x} y={y} pos={pos} note={note} />
          );
        })}

        {/* End bar line */}
        {visible.length > 0 && (
          <>
            <line
              x1={FIRST_NOTE_X + visible.length * NOTE_SPACING + 8}
              y1={posToY(-4)}
              x2={FIRST_NOTE_X + visible.length * NOTE_SPACING + 8}
              y2={posToY(4)}
              stroke="#475569"
              strokeWidth={1.5}
            />
            <line
              x1={FIRST_NOTE_X + visible.length * NOTE_SPACING + 11}
              y1={posToY(-4)}
              x2={FIRST_NOTE_X + visible.length * NOTE_SPACING + 11}
              y2={posToY(4)}
              stroke="#475569"
              strokeWidth={3}
            />
          </>
        )}

        {/* Empty state */}
        {visible.length === 0 && (
          <text
            x={svgWidth / 2}
            y={MIDDLE_LINE_Y}
            textAnchor="middle"
            fill="#475569"
            fontSize={13}
            fontFamily="system-ui"
          >
            No notes detected yet
          </text>
        )}
      </svg>
    </div>
  );
}
