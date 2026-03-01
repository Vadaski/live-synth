import { parseDrumPattern, parseFxOptions, parsePattern } from "./parse-pattern.js";
import { SCALE_NAMES } from "./scales.js";
import {
  ARP_MODES,
  type ArpMode,
  type Command,
  DRUMS,
  type DrumName,
  ENV_KEYS,
  type EnvKey,
  FILTER_TYPES,
  FX_NAMES,
  type FilterType,
  type FxName,
  type ParseError,
  type ParseResult,
  type SynthWaveform,
  VOICE_KEY_RE,
  type VoiceType,
  WAVEFORMS,
} from "./types.js";

export type {
  ArpMode,
  Command,
  DrumName,
  DrumStep,
  EnvKey,
  FilterType,
  FxName,
  ParseError,
  ParseResult,
  PatternKind,
  PatternStep,
  SynthWaveform,
  VoiceType,
} from "./types.js";

const NOTE_RE = /^[A-G][#b]?-?\d+$/;
const TOKEN_RE = /\[[^\]]+\](?::\d+)?(?:\*\d+)?|\S+/g;
const SCALES = new Set(SCALE_NAMES);

function tokenize(line: string): string[] {
  return line.match(TOKEN_RE) ?? [];
}
function parseVoice(
  tokens: string[],
  type: VoiceType,
): { waveform: SynthWaveform; patternTokens: string[] } {
  const base = type === "pad" ? "fat" : "saw";
  const maybe = tokens[1]?.toLowerCase() as SynthWaveform | undefined;
  const hasWave = !!maybe && WAVEFORMS.has(maybe);
  return {
    waveform: (hasWave ? maybe : base) as SynthWaveform,
    patternTokens: tokens.slice(hasWave ? 2 : 1),
  };
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
      const v = Number(tokens[1]);
      Number.isFinite(v) && v >= 20 && v <= 300
        ? commands.push({ type: "bpm", value: v })
        : errors.push({ line: i, message: `Invalid BPM: ${tokens[1]}` });
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
      if (!ARP_MODES.has(mode)) errors.push({ line: i, message: `Invalid arp mode: ${tokens[1]}` });
      else {
        const mw = tokens[3]?.toLowerCase() as SynthWaveform | undefined;
        const hw = !!mw && WAVEFORMS.has(mw);
        const pat = parsePattern(tokens.slice(hw ? 4 : 3));
        pat
          ? commands.push({
              type: "arp",
              mode,
              rate: tokens[2] ?? "16n",
              waveform: (hw ? mw : "saw") as SynthWaveform,
              pattern: pat,
            })
          : errors.push({ line: i, message: "Invalid arp pattern" });
      }
      continue;
    }
    if (keyword === "drum" || DRUMS.has(keyword as DrumName)) {
      const name = (keyword === "drum" ? tokens[1] : tokens[0]) as DrumName;
      const pat = parseDrumPattern(tokens.slice(keyword === "drum" ? 2 : 1));
      if (!DRUMS.has(name)) errors.push({ line: i, message: `Unknown drum: ${name}` });
      else if (!pat) errors.push({ line: i, message: `Invalid drum pattern for ${name}` });
      else commands.push({ type: "drum", name, pattern: pat });
      continue;
    }
    if (keyword === "fx") {
      const maybeTarget = tokens[1] ?? "";
      const hasTarget = VOICE_KEY_RE.test(maybeTarget);
      const nameToken = hasTarget ? (tokens[2] ?? "") : maybeTarget;
      const name = nameToken as FxName;
      if (!FX_NAMES.has(name)) errors.push({ line: i, message: `Unknown effect: ${nameToken}` });
      else {
        const { params, opts } = parseFxOptions(tokens.slice(hasTarget ? 3 : 2));
        const target = hasTarget ? maybeTarget : undefined;
        commands.push({ type: "fx", name, target, params, options: opts });
      }
      continue;
    }
    if (keyword === "env") {
      const target = tokens[1] ?? "";
      if (!VOICE_KEY_RE.test(target)) {
        errors.push({ line: i, message: `Invalid voice target: ${target}` });
        continue;
      }
      const params: Partial<Record<EnvKey, number>> = {};
      let valid = true;
      for (const tok of tokens.slice(2)) {
        const m = /^(\w+)=(.+)$/.exec(tok);
        if (!m || !ENV_KEYS.has(m[1] as EnvKey) || !Number.isFinite(Number(m[2]))) {
          errors.push({ line: i, message: `Invalid env param: ${tok}` });
          valid = false;
          break;
        }
        params[m[1] as EnvKey] = Number(m[2]);
      }
      if (valid && Object.keys(params).length > 0) commands.push({ type: "env", target, params });
      else if (valid) errors.push({ line: i, message: "No env params specified" });
      continue;
    }
    if (keyword === "filter") {
      const target = tokens[1] ?? "";
      if (!VOICE_KEY_RE.test(target)) {
        errors.push({ line: i, message: `Invalid voice target: ${target}` });
        continue;
      }
      const filterType = (tokens[2] ?? "") as FilterType;
      if (!FILTER_TYPES.has(filterType)) {
        errors.push({ line: i, message: `Invalid filter type: ${tokens[2]}` });
        continue;
      }
      const frequency = Number(tokens[3]);
      if (!Number.isFinite(frequency) || frequency <= 0) {
        errors.push({ line: i, message: `Invalid frequency: ${tokens[3]}` });
        continue;
      }
      const Q = tokens[4] !== undefined ? Number(tokens[4]) : 1;
      if (!Number.isFinite(Q) || Q <= 0) {
        errors.push({ line: i, message: `Invalid Q factor: ${tokens[4]}` });
        continue;
      }
      commands.push({ type: "filter", target, filterType, frequency, Q });
      continue;
    }
    if (keyword === "vol") {
      const v = Number(tokens[2]);
      !tokens[1] || !Number.isFinite(v)
        ? errors.push({ line: i, message: "Usage: vol <voiceId> <dB>" })
        : commands.push({ type: "vol", voice: tokens[1], value: v });
      continue;
    }
    if (keyword === "swing") {
      const v = Number(tokens[1]);
      !Number.isFinite(v) || v < 0 || v > 1
        ? errors.push({ line: i, message: "Swing must be 0..1" })
        : commands.push({ type: "swing", value: v });
      continue;
    }
    if (keyword === "oct") {
      const v = Number(tokens[1]);
      !Number.isInteger(v) || Math.abs(v) > 4
        ? errors.push({ line: i, message: "Octave shift must be integer -4..4" })
        : commands.push({ type: "oct", value: v });
      continue;
    }
    errors.push({ line: i, message: `Unknown command: ${keyword}` });
  }
  if (pending)
    errors.push({ line: lines.length - 1, message: `Missing pattern for ${pending.type}` });
  return { commands, errors };
}
