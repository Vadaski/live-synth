export interface Preset { name: string; code: string }

export const PRESETS: Preset[] = [
  { name: "Cyberpunk Ambient", code: `bpm 90
scale minor C4
synth saw
  C4 . E4 . G4 . B4 .
synth triangle
  C5 . . . G4 . . .
bass triangle
  C2 . . C2 . . C2 C2
kick x . . x . . x .
hat . x . x . x . x
fx reverb 3 0.6
fx delay 0.375 0.4` },
  { name: "Acid Techno", code: `bpm 138
scale minor A3
synth saw
  A3 . C4 . A3 . E4 .
synth square
  . A5 . . . E5 . .
bass saw
  A1 . . A1 A1 . . A1
kick x . x . x . x .
hat . x . x . x . x
snare . . . . x . . .
fx distortion 0.3
fx delay 0.125 0.3
fx filter 2 300 3` },
  { name: "Lo-Fi Chill", code: `bpm 75
scale pentatonic D4
synth triangle
  D4 . F4 . A4 . D5 .
synth sine
  . . . D5 . . . A4
bass sine
  D2 . . . D2 . D2 .
kick x . . . x . . .
hat . . x . . . x .
fx reverb 4 0.7
fx chorus 3 3 0.6` },
  { name: "Drum Machine", code: `bpm 120
kick x . . x . . x .
kick . . x . . . . x
snare . . . . x . . .
hat x x x x x x x x
clap . . . . x . . .
fx reverb 1.5 0.3` },
  { name: "Empty Canvas", code: `// Live Synth — type your music
// Ctrl+Enter to play, Ctrl+. to stop
bpm 120
scale minor C4
synth saw
  C4 . . . . . . .` },
  { name: "Synthwave Sunset", code: `bpm 98
scale minor F4
synth saw
  F4 . A4 . C5 . E5 .
synth am
  . C5 . E5 . A5 . C6
bass triangle
  F2 . . C2 . . D2 .
kick x . . . x . . .
snare . . . . x . . .
hat . x . x . x . x
fx chorus 2.2 2.8 0.6
fx reverb 4.5 0.65
fx delay 0.25 0.35` },
  { name: "Industrial", code: `bpm 128
scale chromatic D3
synth fm
  D4 . D#4 . F4 . F#4 .
bass saw
  D2 D2 . D2 . D2 . C2
kick x . x x . x . x
snare . . . . x . . x
hat x x x x x x x x
clap . . . x . . . x
fx distortion 0.72 0.65
fx filter 1.5 140 5` },
  { name: "Minimal Techno", code: `bpm 126
scale dorian E3
synth sine
  E4 . . . G4 . . .
bass saw
  E2 . . E2 . . D2 .
kick x . . . x . . .
hat . . x . . . x .
snare . . . . x . . .
fx delay 0.125 0.2
fx filter 0.5 220 2` },
  { name: "Ambient Space", code: `bpm 70
scale major G4
synth triangle
  G4 . B4 . D5 . G5 .
synth fm
  . . D5 . . . B4 .
bass sine
  G2 . . . D2 . . .
hat . . . x . . . x
fx reverb 8 0.85
fx chorus 1.2 3.3 0.7
fx delay 0.5 0.45` },
  { name: "DnB Roller", code: `bpm 170
scale minor F3
synth square
  F4 . G4 . C5 . A#4 .
bass fm
  F2 F2 . C2 F2 . D#2 .
kick x . . x . x . .
snare . . x . . . x .
hat x x . x x . x .
clap . . . . x . . .
fx distortion 0.2 0.3
fx delay 0.125 0.25` },
  { name: "Chiptune", code: `bpm 148
scale major C4
synth square
  C5 E5 G5 C6 G5 E5 C5 .
synth square
  . C6 . G5 . E5 . C5
bass square
  C2 . C2 . G1 . G1 .
kick x . . . x . . .
hat . x . x . x . x
fx delay 0.25 0.2` },
  { name: "Jazz Lounge", code: `bpm 92
scale dorian G3
synth am
  G4 . A#4 . D5 . F5 .
synth sine
  . D5 . F5 . A5 . C6
bass sine
  G2 . . D2 . . C2 .
kick x . . . x . . .
snare . . . . x . . .
hat . x . . . x . .
fx chorus 2.8 2.2 0.45
fx reverb 3.5 0.4` },
];

const STORAGE_KEY = "live-synth:saved-code";
const EXPORT_MARK = "LIVE_SYNTH_PRESET";

export function saveCode(code: string): void { localStorage.setItem(STORAGE_KEY, code) }
export function loadSavedCode(): string | null { return localStorage.getItem(STORAGE_KEY) }

export async function copyPresetToClipboard(code: string, name: string = "Custom"): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  const payload = JSON.stringify({ mark: EXPORT_MARK, name, code }, null, 2);
  try { await navigator.clipboard.writeText(payload); return true; } catch { return false; }
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
