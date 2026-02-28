import * as Tone from "tone";
import type { DrumName, SynthWaveform, VoiceType } from "./parser.js";

export type VoiceRole = VoiceType | "arp";
export type SynthNode = Tone.PolySynth<any> | Tone.MonoSynth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth | Tone.PluckSynth;
export interface SynthEntry { synth: SynthNode; channel: Tone.Channel; }

const synthCache = new Map<string, SynthEntry>();
let masterChannel: Tone.Channel | null = null;
const WAVE_MAP: Record<Exclude<SynthWaveform, "fm" | "am">, string> = {
  saw: "sawtooth",
  square: "square",
  triangle: "triangle",
  sine: "sine",
  fat: "fatsawtooth",
  pulse: "pulse",
  pwm: "pwm",
};
const BASE_VOLUME: Record<VoiceRole, number> = { synth: -10, bass: -8, pad: -12, lead: -8, arp: -9 };

export function getMasterChannel(): Tone.Channel {
  if (!masterChannel) masterChannel = new Tone.Channel({ volume: -6 }).toDestination();
  return masterChannel;
}

function createPolyWave(waveform: Exclude<SynthWaveform, "fm" | "am">): Tone.PolySynth {
  const type = WAVE_MAP[waveform];
  const poly = new Tone.PolySynth(Tone.Synth);
  poly.set({ oscillator: { type }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.35, release: 0.5 } } as Parameters<typeof poly.set>[0]);
  return poly;
}

function createLead(waveform: SynthWaveform): Tone.MonoSynth {
  const mono = new Tone.MonoSynth({
    oscillator: { type: (waveform === "fat" ? "fatsquare" : WAVE_MAP[waveform as Exclude<SynthWaveform, "fm" | "am">] ?? "square") as never },
    envelope: { attack: 0.005, decay: 0.08, sustain: 0.2, release: 0.15 },
    filterEnvelope: { attack: 0.001, decay: 0.12, sustain: 0.15, release: 0.2, baseFrequency: 600, octaves: 4.5 },
  });
  return mono;
}

function createBass(waveform: SynthWaveform): Tone.MonoSynth {
  const mono = new Tone.MonoSynth({
    oscillator: { type: (waveform === "fat" ? "fattriangle" : WAVE_MAP[waveform as Exclude<SynthWaveform, "fm" | "am">] ?? "sine") as never },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.2, release: 0.4, baseFrequency: 80, octaves: 2.5 },
  });
  return mono;
}

function createPad(): Tone.PolySynth<any> {
  const pad = new Tone.PolySynth(Tone.DuoSynth);
  pad.set({
    voice0: { envelope: { attack: 0.5, decay: 0.6, sustain: 0.8, release: 2 }, oscillator: { type: "fatsawtooth" } },
    voice1: { envelope: { attack: 0.5, decay: 0.6, sustain: 0.8, release: 2 }, oscillator: { type: "fattriangle" } },
  } as Parameters<typeof pad.set>[0]);
  return pad;
}

function createVoiceSynth(role: VoiceRole, waveform: SynthWaveform): SynthNode {
  if (role === "arp") return new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3200, resonance: 0.88 });
  if (role === "pad") return createPad();
  if (role === "lead") return createLead(waveform);
  if (role === "bass") return createBass(waveform);
  if (waveform === "fm") return new Tone.PolySynth(Tone.FMSynth);
  if (waveform === "am") return new Tone.PolySynth(Tone.AMSynth);
  if (waveform === "fat") {
    const poly = createPolyWave("saw");
    poly.set({ oscillator: { type: "fatsawtooth" } } as Parameters<typeof poly.set>[0]);
    return poly;
  }
  if (waveform === "square") {
    const poly = createPolyWave("square");
    poly.set({ oscillator: { type: "fatsquare" } } as Parameters<typeof poly.set>[0]);
    return poly;
  }
  if (waveform === "triangle") {
    const poly = createPolyWave("triangle");
    poly.set({ oscillator: { type: "fattriangle" } } as Parameters<typeof poly.set>[0]);
    return poly;
  }
  return createPolyWave(waveform as Exclude<SynthWaveform, "fm" | "am" | "fat">);
}

export function getVoiceSynth(key: string, waveform: SynthWaveform, role: VoiceRole): SynthEntry {
  let entry = synthCache.get(key);
  if (!entry) {
    const synth = createVoiceSynth(role, waveform);
    const channel = new Tone.Channel({ volume: BASE_VOLUME[role] }).connect(getMasterChannel());
    synth.connect(channel);
    entry = { synth, channel };
    synthCache.set(key, entry);
  }
  return entry;
}

function createDrum(name: DrumName): SynthNode {
  if (name === "kick") return new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 6, envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.08 } });
  if (name === "tom") return new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 3, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.05 } });
  if (name === "rim") return new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.08, release: 0.02 }, harmonicity: 5.1, resonance: 1200, modulationIndex: 12 });
  if (name === "crash") return new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.45, release: 0.35 }, harmonicity: 3.8, resonance: 2600, modulationIndex: 20 });
  if (name === "shaker") return new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 } });
  if (name === "hat") return new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 } });
  if (name === "snare") return new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.002, decay: 0.14, sustain: 0, release: 0.03 } });
  return new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.04 } });
}

export function getDrumSynth(name: DrumName): SynthEntry {
  const key = `drum:${name}`;
  let entry = synthCache.get(key);
  if (!entry) {
    const synth = createDrum(name);
    const channel = new Tone.Channel({ volume: -8 }).connect(getMasterChannel());
    synth.connect(channel);
    entry = { synth, channel };
    synthCache.set(key, entry);
  }
  return entry;
}

export function setVoiceVolume(key: string, value: number): void {
  const entry = synthCache.get(key);
  if (entry) entry.channel.volume.value = value;
}

export function disposeAll(): void {
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
