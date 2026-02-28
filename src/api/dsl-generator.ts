type DrumStyle = "house" | "dnb" | "hiphop" | "rock" | "jazz" | "techno" | "latin";
type BassStyle = "walking" | "octave" | "arpeggiated" | "minimal";
type ProgressionType = "I-IV-V-I" | "ii-V-I" | "I-vi-IV-V" | "i-iv-v";
type ArpDirection = "up" | "down" | "updown" | "random";

const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

function parseNote(note: string): { name: string; octave: number } {
  const match = note.trim().match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return { name: "C", octave: 3 };
  return { name: match[1], octave: Number(match[2]) };
}

function toMidi(note: string): number {
  const { name, octave } = parseNote(note);
  const idx = name.endsWith("b")
    ? (CHROMATIC.indexOf(name[0]) + 11) % 12
    : CHROMATIC.indexOf(name);
  return (octave + 1) * 12 + (idx < 0 ? 0 : idx);
}

function toNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = CHROMATIC[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

function transpose(note: string, semitones: number): string {
  return toNote(toMidi(note) + semitones);
}

function modeIntervals(scale: string): number[] {
  return scale.toLowerCase().includes("minor") ? MINOR : MAJOR;
}

export function generateDrumPattern(style: DrumStyle): string {
  const patterns: Record<DrumStyle, string> = {
    house: "x . . . x . . . x . . . x . . .",
    dnb: "x . . x . . x . x . . x . . . x",
    hiphop: "x . . . . x . . x . . . . x . .",
    rock: "x . . . x . . . x . . . x . . .",
    jazz: "x . . x . . . x . x . . x . . .",
    techno: "x . x . x . x . x . x . x . x .",
    latin: "x . . x . x . . x . . x . x . .",
  };
  return patterns[style];
}

export function generateBassline(scale: string, root: string, style: BassStyle): string {
  const isMinor = scale.toLowerCase().includes("minor");
  const third = isMinor ? 3 : 4;
  const notes: Record<BassStyle, string[]> = {
    walking: [
      transpose(root, 0),
      transpose(root, 2),
      transpose(root, third),
      transpose(root, 5),
      transpose(root, 7),
      transpose(root, 9),
      transpose(root, 10),
      transpose(root, 12),
    ],
    octave: [0, 12, 0, 12, 0, 12, 0, 12].map((s) => transpose(root, s)),
    arpeggiated: [0, third, 7, 12, 7, third, 0, 7].map((s) => transpose(root, s)),
    minimal: [0, 0, 0, 0].map((s) => transpose(root, s)).flatMap((n) => [n, "."]),
  };
  return notes[style].join(" ");
}

export function generateChordProgression(scale: string, root: string, type: ProgressionType): string {
  const intervals = modeIntervals(scale);
  const map: Record<ProgressionType, number[]> = {
    "I-IV-V-I": [1, 4, 5, 1],
    "ii-V-I": [2, 5, 1],
    "I-vi-IV-V": [1, 6, 4, 5],
    "i-iv-v": [1, 4, 5],
  };
  const degrees = map[type];
  const tokens: string[] = [];

  for (const degree of degrees) {
    const idx = degree - 1;
    const rootOffset = intervals[idx % 7] + (idx >= 7 ? 12 : 0);
    const thirdOffset = intervals[(idx + 2) % 7] + (idx + 2 >= 7 ? 12 : 0);
    const fifthOffset = intervals[(idx + 4) % 7] + (idx + 4 >= 7 ? 12 : 0);
    tokens.push(
      transpose(root, rootOffset),
      transpose(root, thirdOffset),
      transpose(root, fifthOffset),
      ".",
    );
  }
  return tokens.join(" ");
}

export function generateArpPattern(chord: string, direction: ArpDirection): string {
  const notes = chord
    .split(/[\s,-]+/)
    .map((n) => n.trim())
    .filter((n) => /^[A-G][#b]?-?\d+$/.test(n));
  if (notes.length === 0) return "C4 E4 G4 C5";

  const up = [...notes];
  const down = [...notes].reverse();
  const updown = [...up, ...down.slice(1, -1)];
  const random = [...notes].sort(() => Math.random() - 0.5);

  switch (direction) {
    case "up":
      return up.join(" ");
    case "down":
      return down.join(" ");
    case "updown":
      return updown.join(" ");
    case "random":
      return random.join(" ");
  }
}
