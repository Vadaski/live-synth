export type SynthWaveform =
  | "saw"
  | "square"
  | "triangle"
  | "sine"
  | "fm"
  | "am"
  | "fat"
  | "pwm"
  | "pulse";
export type VoiceType = "synth" | "bass" | "pad" | "lead";
export type DrumName =
  | "kick"
  | "snare"
  | "hat"
  | "clap"
  | "tom"
  | "rim"
  | "shaker"
  | "crash"
  | (string & {});
export type FilterType = "lowpass" | "highpass" | "bandpass";
export type EnvKey = "attack" | "decay" | "sustain" | "release";
export type FxName =
  | "reverb"
  | "delay"
  | "distortion"
  | "chorus"
  | "filter"
  | "phaser"
  | "tremolo"
  | "bitcrusher"
  | "pingpong"
  | "compressor"
  | "eq"
  | "autowah"
  | "pitchshift"
  | "freeverb"
  | "vibrato"
  | "stereowidener"
  | "chebyshev"
  | "jcreverb"
  | (string & {});
export type ArpMode = "up" | "down" | "updown" | "random";
export type DrumStep = "x" | "." | "~";
export type PatternKind = "note" | "chord" | "rest" | "tie";
export interface PatternStep {
  kind: PatternKind;
  notes: string[];
  velocity: number;
}
export type Command =
  | { type: "bpm"; value: number }
  | { type: "scale"; mode: string; root: string }
  | { type: VoiceType; waveform: SynthWaveform | string; pattern: PatternStep[] }
  | {
      type: "arp";
      mode: ArpMode;
      rate: string;
      waveform: SynthWaveform | string;
      pattern: PatternStep[];
    }
  | { type: "drum"; name: DrumName; pattern: DrumStep[] }
  | {
      type: "fx";
      name: FxName;
      target?: string;
      params: number[];
      options?: Record<string, number | string | boolean>;
    }
  | { type: "vol"; voice: string; value: number }
  | { type: "swing"; value: number }
  | { type: "oct"; value: number }
  | { type: "env"; target: string; params: Partial<Record<EnvKey, number>> }
  | { type: "filter"; target: string; filterType: FilterType; frequency: number; Q: number };
export interface ParseError {
  line: number;
  message: string;
}
export interface ParseResult {
  commands: Command[];
  errors: ParseError[];
}

export const WAVEFORMS = new Set<SynthWaveform>([
  "saw",
  "square",
  "triangle",
  "sine",
  "fm",
  "am",
  "fat",
  "pwm",
  "pulse",
]);
export const DRUMS = new Set<DrumName>([
  "kick",
  "snare",
  "hat",
  "clap",
  "tom",
  "rim",
  "shaker",
  "crash",
]);
export const FX_NAMES = new Set<FxName>([
  "reverb",
  "delay",
  "distortion",
  "chorus",
  "filter",
  "phaser",
  "tremolo",
  "bitcrusher",
  "pingpong",
  "compressor",
  "eq",
  "autowah",
  "pitchshift",
  "freeverb",
  "vibrato",
  "stereowidener",
  "chebyshev",
  "jcreverb",
]);
export const ARP_MODES = new Set<ArpMode>(["up", "down", "updown", "random"]);
export const FILTER_TYPES = new Set<FilterType>(["lowpass", "highpass", "bandpass"]);
export const ENV_KEYS = new Set<EnvKey>(["attack", "decay", "sustain", "release"]);
export const VOICE_KEY_RE = /^(synth|bass|pad|lead|arp)\d+$/;
