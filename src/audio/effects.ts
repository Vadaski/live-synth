import * as Tone from "tone";
import { type FxCommand, type FxNode, createEffect } from "./fx-factory.js";
import { getMasterChannel, getVoiceChannel } from "./synth-pool.js";
import type { Command } from "./types.js";

const masterEffects: FxNode[] = [];
const trackEffects = new Map<string, FxNode[]>();

function clearChain(chain: FxNode[]): void {
  for (const node of chain) node.effect.dispose();
  chain.length = 0;
}

function buildChain(
  source: Tone.ToneAudioNode,
  dest: Tone.ToneAudioNode,
  fxCommands: FxCommand[],
  chain: FxNode[],
): void {
  clearChain(chain);
  source.disconnect();
  if (!fxCommands.length) {
    source.connect(dest);
    return;
  }
  let current: Tone.ToneAudioNode = source;
  for (const cmd of fxCommands) {
    const effect = createEffect(cmd);
    chain.push({ name: cmd.name, effect });
    current.connect(effect);
    current = effect;
  }
  current.connect(dest);
}

export function applyEffects(commands: Command[]): void {
  const fxCommands = commands.filter((cmd): cmd is FxCommand => cmd.type === "fx" && !cmd.target);
  buildChain(getMasterChannel(), Tone.getDestination(), fxCommands, masterEffects);
}

export function applyTrackEffects(voiceKey: string, commands: Command[]): void {
  const fxCommands = commands.filter(
    (cmd): cmd is FxCommand => cmd.type === "fx" && cmd.target === voiceKey,
  );
  const channel = getVoiceChannel(voiceKey);
  if (!channel) return;
  if (!fxCommands.length) {
    disposeTrackEffects(voiceKey);
    return;
  }
  const chain = trackEffects.get(voiceKey) ?? [];
  trackEffects.set(voiceKey, chain);
  buildChain(channel, getMasterChannel(), fxCommands, chain);
}

export function disposeTrackEffects(voiceKey: string): void {
  const chain = trackEffects.get(voiceKey);
  if (!chain) return;
  clearChain(chain);
  trackEffects.delete(voiceKey);
  const channel = getVoiceChannel(voiceKey);
  if (channel) {
    channel.disconnect();
    channel.connect(getMasterChannel());
  }
}

export function disposeAllTrackEffects(): void {
  for (const key of trackEffects.keys()) disposeTrackEffects(key);
}

export function disposeEffects(): void {
  clearChain(masterEffects);
  disposeAllTrackEffects();
}
