export interface Preset {
  name: string;
  code: string;
}

export const PRESETS: Preset[] = [
  {
    name: "Cyberpunk Ambient",
    code: `bpm 90
scale minor C4
synth saw
  Cmin7 . . Ebaug . . Abmaj7 .
env synth1 attack=0.3 decay=0.5 release=1.5
filter synth1 lowpass 2000 1
fx synth1 reverb 3 wet=0.5
bass triangle
  C2 . . C2 . . G1 .
env bass1 decay=0.4 release=0.8
fx bass1 delay 0.3 0.4
kick x . . x . . x .
hat . x . x . x . x
fx reverb 1.5`,
  },
  {
    name: "Acid Techno",
    code: `bpm 138
scale minor A3
synth saw
  Amin7 . . . Dmin7 . . .
filter synth1 lowpass 800 4
env synth1 attack=0.01 decay=0.3 sustain=0.2 release=0.2
bass saw
  A1 . . A1 A1 . . A1
filter bass1 lowpass 400 3
kick x . x . x . x .
hat . x . x . x . x
snare . . . . x . . .
fx distortion 0.3
fx delay 0.125 0.3`,
  },
  {
    name: "Lo-Fi Chill",
    code: `bpm 75
scale pentatonic D4
synth triangle
  Dmaj7 . . . Gmaj7 . . .
env synth1 attack=0.05 decay=0.6 sustain=0.5 release=1.2
fx synth1 reverb 4 wet=0.6
bass sine
  D2 . . . D2 . D2 .
env bass1 decay=0.8 release=1.0
kick x . . . x . . .
hat . . x . . . x .
fx reverb 3 0.5
fx chorus 3 3 0.6`,
  },
  {
    name: "Drum Machine",
    code: `bpm 120
kick x . . x . . x .
kick . . x . . . . x
snare . . . . x . . .
hat x x x x x x x x
clap . . . . x . . .
fx reverb 1.5 0.3`,
  },
  {
    name: "Empty Canvas",
    code: `// Live Synth — type your music
// Ctrl+Enter to play, Ctrl+. to stop
bpm 120
scale minor C4
synth saw
  C4 . . . . . . .`,
  },
  {
    name: "Synthwave Sunset",
    code: `bpm 98
scale minor F4
synth saw
  Fmin7 . . . Bbmin7 . . .
env synth1 attack=0.08 decay=0.4 sustain=0.7 release=1.0
filter synth1 lowpass 3000 1
fx synth1 chorus 2.2 2.8 0.6
synth am
  . Dbmaj7 . . . Absus4 . .
env synth2 attack=0.2 release=2.5
fx synth2 reverb 5 wet=0.7
bass triangle
  F2 . . C2 . . D2 .
kick x . . . x . . .
snare . . . . x . . .
hat . x . x . x . x
fx reverb 4 0.55
fx delay 0.25 0.35`,
  },
  {
    name: "Industrial",
    code: `bpm 128
scale chromatic D3
synth fm
  Ddim7 . . . Cdim7 . . .
filter synth1 highpass 300 2
env synth1 attack=0.01 decay=0.2 sustain=0.4 release=0.3
fx synth1 distortion 0.5
bass saw
  D2 D2 . D2 . D2 . C2
filter bass1 lowpass 200 2
kick x . x x . x . x
snare . . . . x . . x
hat x x x x x x x x
fx distortion 0.72 0.65
fx filter 1.5 140 5`,
  },
  {
    name: "Minimal Techno",
    code: `bpm 126
scale dorian E3
synth sine
  Emin7 . . . . . . .
env synth1 attack=0.02 decay=0.4 sustain=0.3 release=0.8
filter synth1 bandpass 900 3
fx synth1 delay 0.125 0.2
bass saw
  E2 . . E2 . . D2 .
env bass1 decay=0.3 release=0.5
filter bass1 lowpass 350 2
kick x . . . x . . .
hat . . x . . . x .
snare . . . . x . . .`,
  },
  {
    name: "Ambient Space",
    code: `bpm 70
scale major G4
synth triangle
  Gmaj9 . . . . . . .
env synth1 attack=1.5 decay=1.0 sustain=0.8 release=4.0
fx synth1 reverb 8 wet=0.8
synth fm
  . . . . Dmaj7 . . .
env synth2 attack=2.0 release=5.0
filter synth2 lowpass 1200 1
bass sine
  G2 . . . D2 . . .
env bass1 attack=0.5 release=3.0
hat . . . x . . . x
fx reverb 6 0.7
fx delay 0.5 0.45`,
  },
  {
    name: "DnB Roller",
    code: `bpm 170
scale minor F3
synth square
  Fmin7 . . . Cmin7 . . .
filter synth1 lowpass 2400 2
env synth1 attack=0.01 decay=0.2 sustain=0.5 release=0.3
bass fm
  F2 F2 . C2 F2 . D#2 .
filter bass1 lowpass 500 3
kick x . . x . x . .
snare . . x . . . x .
hat x x . x x . x .
clap . . . . x . . .
fx distortion 0.2 0.3
fx delay 0.125 0.25`,
  },
  {
    name: "Chiptune",
    code: `bpm 148
scale major C4
synth square
  Cmajor . Gmajor . Aminor . Fmajor .
env synth1 attack=0.005 decay=0.1 sustain=0.6 release=0.1
synth square
  . C6 . G5 . E5 . C5
fx synth2 delay 0.25 0.2
bass square
  C2 . C2 . G1 . G1 .
kick x . . . x . . .
hat . x . x . x . x`,
  },
  {
    name: "Jazz Lounge",
    code: `bpm 92
scale dorian G3
synth am
  Gmin9 . . . Cdom7 . . .
env synth1 attack=0.15 decay=0.5 sustain=0.6 release=1.8
fx synth1 reverb 3 wet=0.45
synth sine
  . . Ebmaj7 . . . Bbmaj9 .
env synth2 attack=0.2 release=2.0
bass sine
  G2 . . D2 . . C2 .
kick x . . . x . . .
snare . . . . x . . .
hat . x . . . x . .
swing 0.12`,
  },
  {
    name: "Jazz Chords",
    code: `bpm 88
scale major C4
synth am
  Cmaj9 . . Aminor . . Fmaj7 .
env synth1 attack=0.12 decay=0.4 sustain=0.7 release=2.0
fx synth1 reverb 5 wet=0.5
fx synth1 chorus 1.5 2.0 0.35
pad fat
  Fmaj9 . . . . Cmaj9 . .
env pad1 attack=1.0 decay=0.8 sustain=0.9 release=3.0
filter pad1 lowpass 2500 1
fx pad1 reverb 7 wet=0.7
bass sine
  C2 . . . G2 . . .
hat . x . . . x . .
kick x . . . x . . .
swing 0.15`,
  },
  {
    name: "Ambient Textures",
    code: `bpm 60
scale lydian A4
pad fat
  Amaj9 . . . . . . .
env pad1 attack=2.0 decay=1.5 sustain=0.85 release=6.0
filter pad1 lowpass 3000 1
fx pad1 reverb 10 wet=0.85
fx pad1 chorus 0.8 4.0 0.5
synth triangle
  . . . . Emaj7 . . .
env synth1 attack=3.0 release=8.0
filter synth1 highpass 200 1
fx synth1 delay 0.75 0.5
bass sine
  A2 . . . . . . .
env bass1 attack=1.0 release=5.0
filter bass1 lowpass 400 1
hat . . . . x . . .
fx reverb 6 0.7`,
  },
];

const STORAGE_KEY = "live-synth:saved-code";
const EXPORT_MARK = "LIVE_SYNTH_PRESET";

export function saveCode(code: string): void {
  localStorage.setItem(STORAGE_KEY, code);
}
export function loadSavedCode(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export async function copyPresetToClipboard(code: string, name = "Custom"): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  const payload = JSON.stringify({ mark: EXPORT_MARK, name, code }, null, 2);
  try {
    await navigator.clipboard.writeText(payload);
    return true;
  } catch {
    return false;
  }
}

export async function pastePresetFromClipboard(): Promise<string | null> {
  if (!navigator.clipboard?.readText) return null;
  try {
    const raw = (await navigator.clipboard.readText()).trim();
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && "code" in parsed) {
        const code = (parsed as { code?: unknown }).code;
        if (typeof code === "string" && code.trim()) return code.replace(/\r\n/g, "\n").trim();
      }
    } catch {}
    return raw.replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
}
