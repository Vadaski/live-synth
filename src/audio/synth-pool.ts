import * as Tone from "tone";
import type { DrumName, EnvKey, FilterType, SynthWaveform, VoiceType } from "./types.js";

export type VoiceRole = VoiceType | "arp";
// biome-ignore lint/suspicious/noExplicitAny: Tone.js PolySynth generic requires any for DuoSynth
type AnyPoly = Tone.PolySynth<any>;
export type SynthNode = AnyPoly | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth;
export interface SynthEntry {
  synth: SynthNode;
  channel: Tone.Channel;
}
const synthCache = new Map<string, SynthEntry>();
let masterChannel: Tone.Channel | null = null;
const WAVE: Record<Exclude<SynthWaveform, "fm" | "am">, string> = {
  saw: "sawtooth",
  square: "square",
  triangle: "triangle",
  sine: "sine",
  fat: "fatsawtooth",
  pulse: "pulse",
  pwm: "pwm",
};
const BASE_VOL: Record<VoiceRole, number> = { synth: -10, bass: -8, pad: -12, lead: -8, arp: -9 };

export function getMasterChannel(): Tone.Channel {
  if (!masterChannel) masterChannel = new Tone.Channel({ volume: -6 }).toDestination();
  return masterChannel;
}

type PSP = Parameters<AnyPoly["set"]>[0];

function oscType(w: SynthWaveform, fat: string, fallback: string): string {
  return w === "fat" ? fat : (WAVE[w as Exclude<SynthWaveform, "fm" | "am">] ?? fallback);
}

function createPolyWave(waveform: Exclude<SynthWaveform, "fm" | "am">): Tone.PolySynth {
  const p = new Tone.PolySynth(Tone.Synth);
  p.set({
    oscillator: { type: WAVE[waveform] },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.35, release: 0.5 },
  } as PSP);
  return p;
}

function createLead(waveform: SynthWaveform): Tone.PolySynth<Tone.MonoSynth> {
  const p = new Tone.PolySynth(Tone.MonoSynth);
  p.maxPolyphony = 6;
  p.set({
    oscillator: { type: oscType(waveform, "fatsquare", "square") as never },
    envelope: { attack: 0.005, decay: 0.08, sustain: 0.2, release: 0.15 },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.12,
      sustain: 0.15,
      release: 0.2,
      baseFrequency: 600,
      octaves: 4.5,
    },
  } as PSP);
  return p;
}

function createBass(waveform: SynthWaveform): Tone.PolySynth<Tone.MonoSynth> {
  const p = new Tone.PolySynth(Tone.MonoSynth);
  p.maxPolyphony = 4;
  p.set({
    oscillator: { type: oscType(waveform, "fattriangle", "sine") as never },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    filterEnvelope: {
      attack: 0.005,
      decay: 0.2,
      sustain: 0.2,
      release: 0.4,
      baseFrequency: 80,
      octaves: 2.5,
    },
  } as PSP);
  return p;
}

function createPad(): AnyPoly {
  const p = new Tone.PolySynth(Tone.DuoSynth);
  p.set({
    voice0: {
      envelope: { attack: 0.5, decay: 0.6, sustain: 0.8, release: 2 },
      oscillator: { type: "fatsawtooth" },
    },
    voice1: {
      envelope: { attack: 0.5, decay: 0.6, sustain: 0.8, release: 2 },
      oscillator: { type: "fattriangle" },
    },
  } as PSP);
  return p;
}

function createArp(): Tone.PolySynth {
  const p = new Tone.PolySynth(Tone.Synth);
  p.maxPolyphony = 8;
  p.set({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0.05, release: 0.08 },
  } as PSP);
  return p;
}
function createVoiceSynth(role: VoiceRole, waveform: SynthWaveform): SynthNode {
  if (role === "arp") return createArp();
  if (role === "pad") return createPad();
  if (role === "lead") return createLead(waveform);
  if (role === "bass") return createBass(waveform);
  if (waveform === "fm") return new Tone.PolySynth(Tone.FMSynth);
  if (waveform === "am") return new Tone.PolySynth(Tone.AMSynth);
  const FAT_OVERRIDE: Record<string, string> = {
    fat: "fatsawtooth",
    square: "fatsquare",
    triangle: "fattriangle",
  };
  if (FAT_OVERRIDE[waveform]) {
    const p = createPolyWave(
      waveform === "fat" ? "saw" : (waveform as Exclude<SynthWaveform, "fm" | "am">),
    );
    p.set({ oscillator: { type: FAT_OVERRIDE[waveform] } } as PSP);
    return p;
  }
  return createPolyWave(waveform as Exclude<SynthWaveform, "fm" | "am" | "fat">);
}

function cached(key: string, factory: () => SynthNode, vol: number): SynthEntry {
  let entry = synthCache.get(key);
  if (!entry) {
    const synth = factory();
    const ch = new Tone.Channel({ volume: vol }).connect(getMasterChannel());
    synth.connect(ch);
    entry = { synth, channel: ch };
    synthCache.set(key, entry);
  }
  return entry;
}
export function getVoiceSynth(key: string, waveform: SynthWaveform, role: VoiceRole): SynthEntry {
  return cached(key, () => createVoiceSynth(role, waveform), BASE_VOL[role]);
}
type E4 = [number, number, number, number];
const toEnv = ([attack, decay, sustain, release]: E4) => ({ attack, decay, sustain, release });
const MEMBRANE: Record<string, { pitchDecay: number; octaves: number; e: E4 }> = {
  kick: { pitchDecay: 0.04, octaves: 6, e: [0.001, 0.45, 0, 0.08] },
  tom: { pitchDecay: 0.02, octaves: 3, e: [0.001, 0.3, 0, 0.05] },
};
const METAL: Record<string, { h: number; r: number; m: number; e: E4 }> = {
  rim: { h: 5.1, r: 1200, m: 12, e: [0.001, 0.08, 0, 0.02] },
  crash: { h: 3.8, r: 2600, m: 20, e: [0.001, 0.45, 0, 0.35] },
};
const NOISE: Record<string, { t: "white" | "pink" | "brown"; e: E4 }> = {
  shaker: { t: "brown", e: [0.001, 0.08, 0, 0.02] },
  hat: { t: "white", e: [0.001, 0.03, 0, 0.01] },
  snare: { t: "pink", e: [0.002, 0.14, 0, 0.03] },
};

function createDrum(name: DrumName): SynthNode {
  const mb = MEMBRANE[name];
  if (mb)
    return new Tone.MembraneSynth({
      pitchDecay: mb.pitchDecay,
      octaves: mb.octaves,
      envelope: toEnv(mb.e),
    });
  const mt = METAL[name];
  if (mt)
    return new Tone.MetalSynth({
      envelope: toEnv(mt.e),
      harmonicity: mt.h,
      resonance: mt.r,
      modulationIndex: mt.m,
    });
  const ns = NOISE[name] ?? { t: "white" as const, e: [0.002, 0.12, 0, 0.04] as E4 };
  return new Tone.NoiseSynth({ noise: { type: ns.t }, envelope: toEnv(ns.e) });
}

export function getDrumSynth(name: DrumName): SynthEntry {
  return cached(`drum:${name}`, () => createDrum(name), -8);
}

export function getVoiceChannel(key: string): Tone.Channel | null {
  return synthCache.get(key)?.channel ?? null;
}
export function setVoiceVolume(key: string, vol: number): void {
  const entry = synthCache.get(key);
  if (entry) entry.channel.volume.value = vol;
}

export function setVoiceEnvelope(key: string, params: Partial<Record<EnvKey, number>>): void {
  const entry = synthCache.get(key);
  if (!entry) return;
  const synth = entry.synth as unknown as { set?: (opts: PSP) => void };
  if (typeof synth.set === "function") synth.set({ envelope: params } as PSP);
}

const voiceFilters = new Map<string, Tone.Filter>();

export function setVoiceFilter(
  key: string,
  filterType: FilterType,
  frequency: number,
  Q: number,
): void {
  const entry = synthCache.get(key);
  if (!entry) return;
  const existing = voiceFilters.get(key);
  if (existing) existing.dispose();
  const filter = new Tone.Filter({ type: filterType, frequency, Q });
  voiceFilters.set(key, filter);
  entry.synth.disconnect();
  entry.synth.connect(filter);
  filter.connect(entry.channel);
}

export function disposeAll(): void {
  for (const filter of voiceFilters.values()) filter.dispose();
  voiceFilters.clear();
  for (const entry of synthCache.values()) {
    entry.synth.dispose();
    entry.channel.dispose();
  }
  synthCache.clear();
  if (masterChannel) {
    masterChannel.dispose();
    masterChannel = null;
  }
}
