import { parse, type Command, type DrumName, type DrumStep, type FxName, type PatternStep, type SynthWaveform, type VoiceType } from "../audio/parser.js";

export type TrackType = "synth" | "bass" | "drum" | "pad" | "lead";
export interface LiveSynthAgentOptions { bpm?: number; scale?: string; root?: string }
type Track = { name: string; type: TrackType; pattern: string; muted: boolean };
type Effect = { name: string; params: number[] };
interface LoopEngine {
  applyCommands(commands: Command[]): void;
  start(): Promise<void>;
  stop(): void;
  setBpm(bpm: number): void;
  setOnBeat(cb: (beat: number) => void): void;
  setOnNote(cb: (note: string) => void): void;
}

const DRUMS = new Set<DrumName>(["kick", "hat", "snare", "clap", "tom", "rim", "shaker", "crash"]);
const WAVES: Record<Exclude<TrackType, "drum">, SynthWaveform> = {
  synth: "saw",
  bass: "sine",
  pad: "triangle",
  lead: "square",
};
const isDrumName = (value: string): value is DrumName => DRUMS.has(value as DrumName);

export class LiveSynthAgent {
  private bpm: number;
  private mode: string;
  private root: string;
  private playing = false;
  private tracks = new Map<string, Track>();
  private effects: Effect[] = [];
  private beatListeners = new Set<(beat: number) => void>();
  private noteListeners = new Set<(note: string) => void>();
  private enginePromise: Promise<LoopEngine | null> | null = null;
  private beatTimer: ReturnType<typeof setInterval> | null = null;
  private beat = 0;

  constructor(options: LiveSynthAgentOptions = {}) {
    this.bpm = options.bpm ?? 120;
    this.mode = options.scale ?? "minor";
    this.root = options.root ?? "C4";
  }

  async play(code: string): Promise<void> {
    const parsed = parse(code);
    if (parsed.errors.length) throw new Error(parsed.errors.map((e) => `line ${e.line + 1}: ${e.message}`).join("; "));
    this.loadFromCommands(parsed.commands);
    this.playing = true;
    await this.syncPlayback();
  }

  stop(): void {
    this.playing = false;
    this.toggleHeadless(false);
    void this.ensureEngine().then((engine) => engine?.stop());
  }

  setBpm(bpm: number): void { this.bpm = Math.max(20, Math.min(300, Math.round(bpm))); this.refresh(); }
  setScale(mode: string, root: string): void { this.mode = mode.toLowerCase(); this.root = root; this.refresh(); }
  addTrack(name: string, type: TrackType, pattern: string): void { this.tracks.set(name, { name, type, pattern: pattern.trim(), muted: false }); this.refresh(); }
  removeTrack(name: string): void { this.tracks.delete(name); this.refresh(); }
  muteTrack(name: string): void { const t = this.tracks.get(name); if (t) { t.muted = true; this.refresh(); } }
  unmuteTrack(name: string): void { const t = this.tracks.get(name); if (t) { t.muted = false; this.refresh(); } }
  addEffect(name: string, ...params: number[]): void { this.effects.push({ name, params }); this.refresh(); }
  clearEffects(): void { this.effects = []; this.refresh(); }

  getState(): { playing: boolean; bpm: number; scale: string; tracks: string[]; effects: string[] } {
    return {
      playing: this.playing,
      bpm: this.bpm,
      scale: `${this.mode} ${this.root}`,
      tracks: [...this.tracks.keys()],
      effects: this.effects.map((fx) => `${fx.name}${fx.params.length ? `(${fx.params.join(",")})` : ""}`),
    };
  }

  toCode(): string {
    const lines: string[] = [`bpm ${this.bpm}`, `scale ${this.mode} ${this.root}`, ""];
    for (const t of this.tracks.values()) {
      if (t.muted) lines.push(`// muted ${t.name}`);
      if (t.type === "drum") {
        const drum = isDrumName(t.name) ? t.name : "kick";
        if (drum !== t.name) lines.push(`// track ${t.name}`);
        lines.push(`${drum} ${t.pattern}`);
      } else {
        lines.push(`${t.type} ${WAVES[t.type]}`);
        lines.push(`  ${t.pattern}`);
      }
      lines.push("");
    }
    for (const fx of this.effects) lines.push(`fx ${fx.name}${fx.params.length ? ` ${fx.params.join(" ")}` : ""}`);
    return lines.join("\n").trim();
  }

  onBeat(callback: (beat: number) => void): void { this.beatListeners.add(callback); }
  onNote(callback: (note: string) => void): void { this.noteListeners.add(callback); }

  private refresh(): void { if (this.playing) void this.syncPlayback().catch(() => undefined); }

  private async ensureEngine(): Promise<LoopEngine | null> {
    if (!this.enginePromise) {
      const importer = new Function("m", "return import(m)") as (m: string) => Promise<unknown>;
      this.enginePromise = importer("../audio/loop-engine.js")
        .then((mod) => {
          const engine = mod as LoopEngine;
          engine.setOnBeat((b) => this.beatListeners.forEach((cb) => cb(b)));
          engine.setOnNote((n) => this.noteListeners.forEach((cb) => cb(n)));
          return engine;
        })
        .catch(() => null);
    }
    return this.enginePromise;
  }

  private async syncPlayback(): Promise<void> {
    const engine = await this.ensureEngine();
    if (!engine) return this.toggleHeadless(true);
    this.toggleHeadless(false);
    engine.setBpm(this.bpm);
    engine.applyCommands(this.toCommands());
    await engine.start();
  }

  private toCommands(): Command[] {
    const commands: Command[] = [{ type: "bpm", value: this.bpm }, { type: "scale", mode: this.mode, root: this.root }];
    for (const t of this.tracks.values()) {
      if (t.muted) continue;
      const tokens = t.pattern.split(/\s+/).filter(Boolean);
      if (t.type === "drum") {
        const name = DRUMS.has(t.name as DrumName) ? (t.name as DrumName) : "kick";
        const pattern: DrumStep[] = tokens.map((x) => (x === "x" ? "x" : x === "~" ? "~" : "."));
        commands.push({ type: "drum", name, pattern });
      } else {
        const type = t.type as VoiceType;
        const pattern = this.tokensToPattern(tokens);
        commands.push({ type, waveform: WAVES[t.type], pattern });
      }
    }
    for (const fx of this.effects) commands.push({ type: "fx", name: fx.name as FxName, params: fx.params, options: {} });
    return commands;
  }

  private loadFromCommands(commands: Command[]): void {
    this.tracks.clear();
    this.effects = [];
    let si = 1;
    let bi = 1;
    let di = 1;
    for (const c of commands) {
      if (c.type === "bpm") this.bpm = c.value;
      if (c.type === "scale") { this.mode = c.mode; this.root = c.root; }
      if (c.type === "synth") this.tracks.set(`synth-${si}`, { name: `synth-${si++}`, type: "synth", pattern: this.patternToString(c.pattern), muted: false });
      if (c.type === "bass") this.tracks.set(`bass-${bi}`, { name: `bass-${bi++}`, type: "bass", pattern: this.patternToString(c.pattern), muted: false });
      if (c.type === "pad") this.tracks.set(`pad-${si}`, { name: `pad-${si++}`, type: "pad", pattern: this.patternToString(c.pattern), muted: false });
      if (c.type === "lead") this.tracks.set(`lead-${bi}`, { name: `lead-${bi++}`, type: "lead", pattern: this.patternToString(c.pattern), muted: false });
      if (c.type === "drum") this.tracks.set(`${c.name}-${di}`, { name: `${c.name}-${di++}`, type: "drum", pattern: c.pattern.join(" "), muted: false });
      if (c.type === "fx") this.effects.push({ name: c.name, params: c.params });
    }
  }

  private toggleHeadless(on: boolean): void {
    if (!on) {
      if (this.beatTimer) clearInterval(this.beatTimer);
      this.beatTimer = null;
      return;
    }
    if (this.beatTimer) clearInterval(this.beatTimer);
    const step = Math.max(40, (60_000 / this.bpm) / 2);
    this.beatTimer = setInterval(() => {
      this.beat = (this.beat + 1) % 16;
      this.beatListeners.forEach((cb) => cb(this.beat));
    }, step);
  }

  private tokensToPattern(tokens: string[]): PatternStep[] {
    return tokens.map((token) => {
      if (token === ".") return { kind: "rest", notes: [], velocity: 100 };
      if (token === "~") return { kind: "tie", notes: [], velocity: 100 };
      const chord = /^\[([^\]]+)\](?::(\d+))?$/.exec(token);
      if (chord) return { kind: "chord", notes: chord[1].trim().split(/\s+/), velocity: Number(chord[2] ?? 100) };
      const note = /^([A-G][#b]?-?\d+)(?::(\d+))?$/.exec(token);
      return { kind: "note", notes: [note?.[1] ?? token], velocity: Number(note?.[2] ?? 100) };
    });
  }

  private patternToString(steps: PatternStep[] | DrumStep[]): string {
    if (!steps.length) return "";
    if (typeof steps[0] === "string") return (steps as DrumStep[]).join(" ");
    const patternSteps = steps as PatternStep[];
    return patternSteps
      .map((step) => step.kind === "rest" ? "." : step.kind === "tie" ? "~" : step.kind === "chord" ? `[${step.notes.join(" ")}]${step.velocity === 100 ? "" : `:${step.velocity}`}` : `${step.notes[0] ?? "C4"}${step.velocity === 100 ? "" : `:${step.velocity}`}`)
      .join(" ");
  }
}
