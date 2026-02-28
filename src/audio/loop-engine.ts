import * as Tone from "tone";
import type { Command, DrumName, DrumStep, PatternStep, SynthWaveform, VoiceType } from "./parser.js";
import { applyEffects } from "./effects.js";
import { quantizeToScale } from "./scales.js";
import { disposeAll, getDrumSynth, getVoiceSynth, setVoiceVolume, type VoiceRole } from "./synth-pool.js";
type Schedulable = { dispose: () => void }; type ScaleState = { root: string; mode: string } | null;
type VoiceCommand = Extract<Command, { type: VoiceType }>; type ArpCommand = Extract<Command, { type: "arp" }>;
type DrumCommand = Extract<Command, { type: "drum" }>; type VolCommand = Extract<Command, { type: "vol" }>;
type OctCommand = Extract<Command, { type: "oct" }>; type SwingCommand = Extract<Command, { type: "swing" }>;

const DEFAULT_DB: Record<VoiceRole, number> = { synth: -10, bass: -8, pad: -12, lead: -8, arp: -9 };
const NOTE_RE = /^([A-G][#b]?)(-?\d+)$/;
const ARP_MODE: Record<ArpCommand["mode"], "up" | "down" | "upDown" | "random"> = { up: "up", down: "down", updown: "upDown", random: "random" };
const WAVEFORMS = new Set<SynthWaveform>(["saw", "square", "triangle", "sine", "fm", "am", "fat", "pwm", "pulse"]);
const DRUM_NAMES = new Set<DrumName>(["kick", "snare", "hat", "clap", "tom", "rim", "shaker", "crash"]);
let scheduled: Schedulable[] = [];
let currentScale: ScaleState = null;
let currentOctave = 0;
let isPlaying = false;
let onBeatCallback: ((beat: number) => void) | null = null;
let onNoteCallback: ((note: string) => void) | null = null;
export function setOnBeat(cb: (beat: number) => void): void { onBeatCallback = cb; }
export function setOnNote(cb: (note: string) => void): void { onNoteCallback = cb; }

function clearScheduled(): void { for (const item of scheduled) item.dispose(); scheduled = []; }

function shiftOctave(note: string, octaves: number): string { const m = NOTE_RE.exec(note); return !octaves || !m ? note : `${m[1]}${Number(m[2]) + octaves}`; }

function mapNotes(notes: string[]): string[] {
  return notes.map((raw) => {
    const inScale = currentScale ? quantizeToScale(raw, currentScale.root, currentScale.mode) : raw;
    return shiftOctave(inScale, currentOctave);
  });
}

function normalizeWaveform(waveform: string): SynthWaveform {
  return WAVEFORMS.has(waveform as SynthWaveform) ? (waveform as SynthWaveform) : "saw";
}

function toPatternSteps(pattern: PatternStep[] | string[]): PatternStep[] {
  if (!pattern.length) return [];
  if (typeof pattern[0] !== "string") return pattern as PatternStep[];
  return (pattern as string[]).map((token) => {
    if (token === ".") return { kind: "rest", notes: [], velocity: 100 } satisfies PatternStep;
    if (token === "~") return { kind: "tie", notes: [], velocity: 100 } satisfies PatternStep;
    const chord = /^\[([^\]]+)\](?::(\d+))?$/.exec(token);
    if (chord) return { kind: "chord", notes: chord[1].trim().split(/\s+/), velocity: Number(chord[2] ?? 100) } satisfies PatternStep;
    const note = /^([A-G][#b]?-?\d+)(?::(\d+))?$/.exec(token);
    return { kind: "note", notes: [note?.[1] ?? "C4"], velocity: Number(note?.[2] ?? 100) } satisfies PatternStep;
  });
}

function noteDurationSteps(index: number, pattern: PatternStep[]): number {
  let steps = 1;
  for (let i = index + 1; i < pattern.length && pattern[i].kind === "tie"; i++) steps++;
  return steps;
}

function triggerVoice(key: string, role: VoiceRole, waveform: string, notes: string[], rate: string, velocity = 1, tieSteps = 1, time?: number): void {
  const entry = getVoiceSynth(key, normalizeWaveform(waveform), role);
  const noteArg = notes.length === 1 ? notes[0] : notes;
  const durSeconds = Tone.Time(rate).toSeconds() * tieSteps;
  const synth = entry.synth as unknown as { triggerAttackRelease?: (note: unknown, dur: number, t: number | undefined, vel?: number) => void; triggerAttack?: (note: string, t: number | undefined, vel?: number) => void };
  if (typeof synth.triggerAttackRelease === "function") synth.triggerAttackRelease(noteArg, durSeconds, time, velocity);
  else if (typeof synth.triggerAttack === "function" && typeof noteArg === "string") synth.triggerAttack(noteArg, time, velocity);
}

function scheduleVoice(type: VoiceType, id: string, cmd: VoiceCommand): void {
  const pattern = toPatternSteps(cmd.pattern);
  const values = pattern.map((step, index) => ({ step, index }));
  const seq = new Tone.Sequence(
    (time, value) => {
      if (value.step.kind === "rest" || value.step.kind === "tie") return;
      const notes = mapNotes(value.step.notes);
      const velocity = Math.max(0.05, Math.min(1, value.step.velocity / 127));
      triggerVoice(id, type, cmd.waveform, notes, "8n", velocity, noteDurationSteps(value.index, pattern), time);
      onNoteCallback?.(notes.join("+"));
    },
    values,
    "8n",
  );
  seq.loop = true;
  seq.start(0);
  scheduled.push(seq);
}

function scheduleArp(id: string, cmd: ArpCommand): void {
  const arpPattern = toPatternSteps(cmd.pattern);
  const notes: Array<{ note: string; velocity: number }> = [];
  for (const step of arpPattern) {
    if (step.kind === "rest" || step.kind === "tie") continue;
    for (const note of step.notes) notes.push({ note, velocity: step.velocity });
  }
  if (!notes.length) return;
  const pattern = new Tone.Pattern((time, value) => {
    const mapped = mapNotes([value.note])[0];
    const velocity = Math.max(0.05, Math.min(1, value.velocity / 127));
    triggerVoice(id, "arp", cmd.waveform, [mapped], cmd.rate, velocity, 1, time);
    onNoteCallback?.(mapped);
  }, notes, ARP_MODE[cmd.mode]);
  pattern.interval = cmd.rate;
  pattern.start(0);
  scheduled.push(pattern);
}

function scheduleDrum(cmd: DrumCommand): void {
  if (!DRUM_NAMES.has(cmd.name as DrumName)) return;
  const name = cmd.name as DrumName;
  const entry = getDrumSynth(name);
  const seq = new Tone.Sequence(
    (time, step: DrumStep) => {
      if (step !== "x") return;
      const synth = entry.synth as unknown as { triggerAttackRelease?: (...args: unknown[]) => void };
      if (!synth.triggerAttackRelease) return;
      if (name === "kick") synth.triggerAttackRelease("C1", "16n", time, 1);
      else if (name === "tom") synth.triggerAttackRelease("G1", "16n", time, 0.9);
      else synth.triggerAttackRelease("16n", time, 0.85);
    },
    cmd.pattern,
    "8n",
  );
  seq.loop = true;
  seq.start(0);
  scheduled.push(seq);
}

function ensureBeatTracker(): void {
  const transport = Tone.getTransport() as ReturnType<typeof Tone.getTransport> & { _beatTracker?: Tone.Loop };
  if (transport._beatTracker) return;
  let beat = 0;
  const loop = new Tone.Loop((time) => {
    Tone.getDraw().schedule(() => {
      onBeatCallback?.(beat);
      beat = (beat + 1) % 16;
    }, time);
  }, "8n");
  loop.start(0);
  transport._beatTracker = loop;
}

export function applyCommands(commands: Command[]): void {
  clearScheduled();
  currentOctave = 0;
  let swing = 0;
  const counts: Record<VoiceRole, number> = { synth: 0, bass: 0, pad: 0, lead: 0, arp: 0 };
  const volumes = new Map<string, number>((commands.filter((c): c is VolCommand => c.type === "vol")).map((c) => [c.voice, c.value]));

  for (const cmd of commands) {
    if (cmd.type === "bpm") Tone.getTransport().bpm.value = cmd.value;
    else if (cmd.type === "scale") currentScale = { root: cmd.root, mode: cmd.mode };
    else if (cmd.type === "oct") currentOctave = (cmd as OctCommand).value;
    else if (cmd.type === "swing") swing = (cmd as SwingCommand).value;
  }

  Tone.getTransport().swing = Math.max(0, Math.min(1, swing));
  Tone.getTransport().swingSubdivision = "8n";

  for (const cmd of commands) {
    if (cmd.type === "synth" || cmd.type === "bass" || cmd.type === "pad" || cmd.type === "lead") {
      const type = cmd.type;
      const id = `${type}${++counts[type]}`;
      scheduleVoice(type, id, cmd as VoiceCommand);
      setVoiceVolume(id, volumes.get(id) ?? DEFAULT_DB[type]);
    } else if (cmd.type === "arp") {
      const id = `arp${++counts.arp}`;
      scheduleArp(id, cmd);
      setVoiceVolume(id, volumes.get(id) ?? DEFAULT_DB.arp);
    } else if (cmd.type === "drum") scheduleDrum(cmd);
  }

  applyEffects(commands);
  ensureBeatTracker();
}
export async function start(): Promise<void> { if (isPlaying) return; await Tone.start(); Tone.getTransport().start(); isPlaying = true; }
export function stop(): void { Tone.getTransport().stop(); clearScheduled(); isPlaying = false; }
export function getIsPlaying(): boolean { return isPlaying; }
export function getBpm(): number { return Tone.getTransport().bpm.value; }
export function setBpm(bpm: number): void { Tone.getTransport().bpm.value = bpm; }
export function dispose(): void { stop(); disposeAll(); }
