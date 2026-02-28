import { SCALE_NAMES } from "./scales.js";

export type SynthWaveform = "saw" | "square" | "triangle" | "sine" | "fm" | "am" | "fat" | "pwm" | "pulse";
export type VoiceType = "synth" | "bass" | "pad" | "lead";
export type DrumName = "kick" | "snare" | "hat" | "clap" | "tom" | "rim" | "shaker" | "crash" | (string & {});
export type FxName = "reverb" | "delay" | "distortion" | "chorus" | "filter" | "phaser" | "tremolo" | "bitcrusher" | "pingpong" | "compressor" | "eq" | "autowah" | "pitchshift" | "freeverb" | "vibrato" | "stereowidener" | "chebyshev" | "jcreverb" | (string & {});
export type ArpMode = "up" | "down" | "updown" | "random";
export type DrumStep = "x" | "." | "~";
export type PatternKind = "note" | "chord" | "rest" | "tie";
export interface PatternStep { kind: PatternKind; notes: string[]; velocity: number; }
export type Command =
  | { type: "bpm"; value: number }
  | { type: "scale"; mode: string; root: string }
  | { type: VoiceType; waveform: SynthWaveform | string; pattern: any[] }
  | { type: "arp"; mode: ArpMode; rate: string; waveform: SynthWaveform | string; pattern: any[] }
  | { type: "drum"; name: DrumName; pattern: DrumStep[] }
  | { type: "fx"; name: FxName; params: number[]; options?: Record<string, number | string | boolean> }
  | { type: "vol"; voice: string; value: number }
  | { type: "swing"; value: number }
  | { type: "oct"; value: number };
export interface ParseError { line: number; message: string; }
export interface ParseResult { commands: Command[]; errors: ParseError[]; }

const NOTE_RE = /^[A-G][#b]?-?\d+$/;
const TOKEN_RE = /\[[^\]]+\](?::\d+)?(?:\*\d+)?|\S+/g;
const WAVEFORMS = new Set<SynthWaveform>(["saw", "square", "triangle", "sine", "fm", "am", "fat", "pwm", "pulse"]);
const DRUMS = new Set<DrumName>(["kick", "snare", "hat", "clap", "tom", "rim", "shaker", "crash"]);
const FX = new Set<FxName>(["reverb", "delay", "distortion", "chorus", "filter", "phaser", "tremolo", "bitcrusher", "pingpong", "compressor", "eq", "autowah", "pitchshift", "freeverb", "vibrato", "stereowidener", "chebyshev", "jcreverb"]);
const ARP = new Set<ArpMode>(["up", "down", "updown", "random"]);
const SCALES = new Set(SCALE_NAMES);
const DEFAULT_VELOCITY = 100;

function parseRepeat(raw: string): { token: string; count: number } {
  const m = /^(.*)\*(\d+)$/.exec(raw);
  return m ? { token: m[1], count: Math.max(1, Number(m[2])) } : { token: raw, count: 1 };
}

function cloneStep(step: PatternStep, count: number): PatternStep[] {
  return Array.from({ length: count }, () => ({ ...step, notes: [...step.notes] }));
}

function parsePatternToken(raw: string): PatternStep[] | null {
  const { token, count } = parseRepeat(raw);
  if (token === ".") return cloneStep({ kind: "rest", notes: [], velocity: DEFAULT_VELOCITY }, count);
  if (token === "~") return cloneStep({ kind: "tie", notes: [], velocity: DEFAULT_VELOCITY }, count);
  const chord = /^\[([^\]]+)\](?::(\d+))?$/.exec(token);
  if (chord) {
    const notes = chord[1].trim().split(/\s+/);
    if (!notes.length || notes.some((n) => !NOTE_RE.test(n))) return null;
    return cloneStep({ kind: "chord", notes, velocity: clampVelocity(chord[2]) }, count);
  }
  const note = /^([A-G][#b]?-?\d+)(?::(\d+))?$/.exec(token);
  if (!note) return null;
  return cloneStep({ kind: "note", notes: [note[1]], velocity: clampVelocity(note[2]) }, count);
}

function parsePattern(tokens: string[]): PatternStep[] | null {
  const out: PatternStep[] = [];
  for (const token of tokens) {
    const parsed = parsePatternToken(token);
    if (!parsed) return null;
    out.push(...parsed);
  }
  return out.length ? out : null;
}

function parseDrumPattern(tokens: string[]): DrumStep[] | null {
  const out: DrumStep[] = [];
  for (const raw of tokens) {
    const { token, count } = parseRepeat(raw);
    if (token !== "x" && token !== "." && token !== "~") return null;
    for (let i = 0; i < count; i++) out.push(token);
  }
  return out.length ? out : null;
}

function clampVelocity(raw?: string): number {
  const value = Number(raw ?? DEFAULT_VELOCITY);
  return Math.max(1, Math.min(127, Number.isFinite(value) ? Math.round(value) : DEFAULT_VELOCITY));
}

function tokenize(line: string): string[] {
  return line.match(TOKEN_RE) ?? [];
}

function parseVoice(tokens: string[], type: VoiceType): { waveform: SynthWaveform; patternTokens: string[] } {
  const base = type === "pad" ? "fat" : "saw";
  const maybe = tokens[1]?.toLowerCase() as SynthWaveform | undefined;
  const hasWave = !!maybe && WAVEFORMS.has(maybe);
  return { waveform: (hasWave ? maybe : base) as SynthWaveform, patternTokens: tokens.slice(hasWave ? 2 : 1) };
}

export function parse(text: string): ParseResult {
  const commands: Command[] = [];
  const errors: ParseError[] = [];
  let pending: { type: VoiceType; waveform: SynthWaveform } | null = null;
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\/\/.*$/, "").trim();
    if (!raw) continue;
    const tokens = tokenize(raw);
    if (!tokens.length) continue;
    const keyword = tokens[0].toLowerCase();

    if (pending) {
      const pattern = parsePattern(tokens);
      if (pattern) {
        commands.push({ type: pending.type, waveform: pending.waveform, pattern });
        pending = null;
        continue;
      }
      errors.push({ line: i, message: `Expected pattern after ${pending.type}` });
      pending = null;
    }

    if (keyword === "bpm") {
      const value = Number(tokens[1]);
      Number.isFinite(value) && value >= 20 && value <= 300 ? commands.push({ type: "bpm", value }) : errors.push({ line: i, message: `Invalid BPM: ${tokens[1]}` });
      continue;
    }
    if (keyword === "scale") {
      const mode = tokens[1] ?? "";
      const root = tokens[2] ?? "";
      if (!SCALES.has(mode)) errors.push({ line: i, message: `Unknown scale: ${mode}` });
      else if (!NOTE_RE.test(root)) errors.push({ line: i, message: `Invalid root note: ${root}` });
      else commands.push({ type: "scale", mode, root });
      continue;
    }
    if (keyword === "synth" || keyword === "bass" || keyword === "pad" || keyword === "lead") {
      const type = keyword as VoiceType;
      const { waveform, patternTokens } = parseVoice(tokens, type);
      const pattern = parsePattern(patternTokens);
      if (pattern) commands.push({ type, waveform, pattern });
      else if (!patternTokens.length) pending = { type, waveform };
      else errors.push({ line: i, message: `Invalid pattern for ${type}` });
      continue;
    }
    if (keyword === "arp") {
      const mode = (tokens[1] ?? "") as ArpMode;
      if (!ARP.has(mode)) errors.push({ line: i, message: `Invalid arp mode: ${tokens[1]}` });
      else {
        const maybe = tokens[3]?.toLowerCase() as SynthWaveform | undefined;
        const hasWave = !!maybe && WAVEFORMS.has(maybe);
        const pattern = parsePattern(tokens.slice(hasWave ? 4 : 3));
        pattern ? commands.push({ type: "arp", mode, rate: tokens[2] ?? "16n", waveform: (hasWave ? maybe : "saw") as SynthWaveform, pattern }) : errors.push({ line: i, message: "Invalid arp pattern" });
      }
      continue;
    }
    if (keyword === "drum" || DRUMS.has(keyword as DrumName)) {
      const name = (keyword === "drum" ? tokens[1] : tokens[0]) as DrumName;
      const pattern = parseDrumPattern(tokens.slice(keyword === "drum" ? 2 : 1));
      if (!DRUMS.has(name)) errors.push({ line: i, message: `Unknown drum: ${name}` });
      else if (!pattern) errors.push({ line: i, message: `Invalid drum pattern for ${name}` });
      else commands.push({ type: "drum", name, pattern });
      continue;
    }
    if (keyword === "fx") {
      const name = (tokens[1] ?? "") as FxName;
      if (!FX.has(name)) errors.push({ line: i, message: `Unknown effect: ${tokens[1]}` });
      else {
        const params: number[] = [];
        const options: Record<string, number | string | boolean> = {};
        for (const token of tokens.slice(2)) {
          const [key, rawValue] = token.split("=");
          if (rawValue === undefined) {
            const n = Number(token);
            if (Number.isFinite(n)) params.push(n);
          } else {
            const n = Number(rawValue);
            options[key] = Number.isFinite(n) ? n : rawValue === "true" ? true : rawValue === "false" ? false : rawValue;
          }
        }
        commands.push({ type: "fx", name, params, options });
      }
      continue;
    }
    if (keyword === "vol") {
      const value = Number(tokens[2]);
      !tokens[1] || !Number.isFinite(value) ? errors.push({ line: i, message: "Usage: vol <voiceId> <dB>" }) : commands.push({ type: "vol", voice: tokens[1], value });
      continue;
    }
    if (keyword === "swing") {
      const value = Number(tokens[1]);
      !Number.isFinite(value) || value < 0 || value > 1 ? errors.push({ line: i, message: "Swing must be 0..1" }) : commands.push({ type: "swing", value });
      continue;
    }
    if (keyword === "oct") {
      const value = Number(tokens[1]);
      !Number.isInteger(value) || Math.abs(value) > 4 ? errors.push({ line: i, message: "Octave shift must be integer -4..4" }) : commands.push({ type: "oct", value });
      continue;
    }
    errors.push({ line: i, message: `Unknown command: ${keyword}` });
  }

  if (pending) errors.push({ line: lines.length - 1, message: `Missing pattern for ${pending.type}` });
  return { commands, errors };
}
