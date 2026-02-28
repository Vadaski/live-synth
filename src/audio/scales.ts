const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const SCALE_INTERVALS: Record<string, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  whole: [0, 2, 4, 6, 8, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  augmented: [0, 3, 4, 7, 8, 11],
  bebop: [0, 2, 4, 5, 7, 8, 9, 11],
  japanese: [0, 1, 5, 7, 8],
  arabic: [0, 1, 4, 5, 7, 8, 11],
  hungarian: [0, 2, 3, 6, 7, 8, 11],
  gypsy: [0, 1, 4, 5, 7, 8, 10],
};
const CHORD_INTERVALS: Record<string, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  "6": [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
};
const NOTE_RE = /^([A-G][#b]?)(-?\d+)$/;

export const SCALE_NAMES = Object.keys(SCALE_INTERVALS);

function parseNote(note: string): { name: string; octave: number } | null {
  const match = NOTE_RE.exec(note);
  return match ? { name: match[1], octave: Number(match[2]) } : null;
}

function toIndex(name: string): number {
  const natural = name[0] ?? "C";
  const base = CHROMATIC.indexOf(natural as (typeof CHROMATIC)[number]);
  if (base < 0) return 0;
  if (!name[1]) return base;
  return name[1] === "b" ? (base + 11) % 12 : (base + 1) % 12;
}

function noteToMidi(note: string): number {
  const parsed = parseNote(note);
  if (!parsed) return 60;
  return (parsed.octave + 1) * 12 + toIndex(parsed.name);
}

function midiToNote(midi: number): string {
  const safeMidi = Math.max(0, Math.round(midi));
  const name = CHROMATIC[((safeMidi % 12) + 12) % 12];
  const octave = Math.floor(safeMidi / 12) - 1;
  return `${name}${octave}`;
}

export function getScaleNotes(root: string, mode: string, octaves = 3): string[] {
  const intervals = SCALE_INTERVALS[mode] ?? SCALE_INTERVALS.chromatic;
  const rootMidi = noteToMidi(root);
  const out: string[] = [];
  for (let octave = 0; octave < octaves; octave++) {
    for (const semitones of intervals) out.push(midiToNote(rootMidi + octave * 12 + semitones));
  }
  return out;
}

export function quantizeToScale(note: string, root: string, mode: string): string {
  const intervals = SCALE_INTERVALS[mode] ?? SCALE_INTERVALS.chromatic;
  const rootMidi = noteToMidi(root);
  const noteMidi = noteToMidi(note);
  const relative = ((noteMidi - rootMidi) % 12 + 12) % 12;
  let closest = intervals[0] ?? 0;
  let minDist = 12;
  for (const semitones of intervals) {
    const dist = Math.min(Math.abs(relative - semitones), 12 - Math.abs(relative - semitones));
    if (dist < minDist) {
      minDist = dist;
      closest = semitones;
    }
  }
  const octave = Math.floor((noteMidi - rootMidi) / 12);
  return midiToNote(rootMidi + octave * 12 + closest);
}

export function chord(root: string, type: string): string[] {
  const intervals = CHORD_INTERVALS[type] ?? CHORD_INTERVALS.major;
  const rootMidi = noteToMidi(root);
  return intervals.map((semitones) => midiToNote(rootMidi + semitones));
}
