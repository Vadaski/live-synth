import * as Tone from "tone";
import type { Command, FxName } from "./parser.js";
import { getMasterChannel } from "./synth-pool.js";

type FxCommand = Extract<Command, { type: "fx" }>;
interface FxNode { name: FxName; effect: Tone.ToneAudioNode; }

const activeEffects: FxNode[] = [];

function n(cmd: FxCommand, key: string, index: number, fallback: number): number {
  const opt = cmd.options?.[key];
  if (typeof opt === "number" && Number.isFinite(opt)) return opt;
  const v = cmd.params[index];
  return Number.isFinite(v) ? v : fallback;
}

function setWet(node: Tone.ToneAudioNode, value: number | undefined): void {
  if (value === undefined) return;
  const wet = (node as unknown as { wet?: { value: number } }).wet;
  if (wet) wet.value = value;
}

function maybeStart<T extends Tone.ToneAudioNode>(node: T): T {
  const anyNode = node as unknown as { start?: () => void };
  if (typeof anyNode.start === "function") anyNode.start();
  return node;
}

function createEffect(cmd: FxCommand): Tone.ToneAudioNode {
  switch (cmd.name) {
    case "reverb":
      return new Tone.Reverb({ decay: n(cmd, "decay", 0, 2), preDelay: n(cmd, "preDelay", 1, 0.01), wet: n(cmd, "wet", 2, 0.35) });
    case "delay":
      return new Tone.FeedbackDelay({ delayTime: n(cmd, "delayTime", 0, 0.25), feedback: n(cmd, "feedback", 1, 0.35), wet: n(cmd, "wet", 2, 0.25) });
    case "pingpong":
      return new Tone.PingPongDelay({ delayTime: n(cmd, "delayTime", 0, 0.25), feedback: n(cmd, "feedback", 1, 0.3), wet: n(cmd, "wet", 2, 0.25) });
    case "distortion":
      return new Tone.Distortion({ distortion: n(cmd, "distortion", 0, 0.35), wet: n(cmd, "wet", 1, 0.4), oversample: "2x" });
    case "chorus":
      return maybeStart(new Tone.Chorus({ frequency: n(cmd, "frequency", 0, 2.5), delayTime: n(cmd, "delayTime", 1, 2.5), depth: n(cmd, "depth", 2, 0.7), spread: n(cmd, "spread", 3, 180), wet: n(cmd, "wet", 4, 0.35) }));
    case "filter":
      return maybeStart(new Tone.AutoFilter({ frequency: n(cmd, "frequency", 0, 1), baseFrequency: n(cmd, "baseFrequency", 1, 200), octaves: n(cmd, "octaves", 2, 3), wet: n(cmd, "wet", 3, 0.4) }));
    case "phaser":
      return new Tone.Phaser({ frequency: n(cmd, "frequency", 0, 0.4), octaves: n(cmd, "octaves", 1, 3), baseFrequency: n(cmd, "baseFrequency", 2, 250), wet: n(cmd, "wet", 3, 0.4) });
    case "tremolo":
      return maybeStart(new Tone.Tremolo({ frequency: n(cmd, "frequency", 0, 8), depth: n(cmd, "depth", 1, 0.75), spread: n(cmd, "spread", 2, 0), wet: n(cmd, "wet", 3, 0.4) }));
    case "bitcrusher": {
      const node = new Tone.BitCrusher(n(cmd, "bits", 0, 4));
      setWet(node, n(cmd, "wet", 1, 0.4));
      return node;
    }
    case "compressor":
      return new Tone.Compressor({ threshold: n(cmd, "threshold", 0, -18), ratio: n(cmd, "ratio", 1, 4), attack: n(cmd, "attack", 2, 0.003), release: n(cmd, "release", 3, 0.2), knee: n(cmd, "knee", 4, 30) });
    case "eq":
      return new Tone.EQ3({ low: n(cmd, "low", 0, 0), mid: n(cmd, "mid", 1, 0), high: n(cmd, "high", 2, 0), lowFrequency: n(cmd, "lowFrequency", 3, 400), highFrequency: n(cmd, "highFrequency", 4, 2500) });
    case "autowah":
      return new Tone.AutoWah({ baseFrequency: n(cmd, "baseFrequency", 0, 100), octaves: n(cmd, "octaves", 1, 6), sensitivity: n(cmd, "sensitivity", 2, 0), Q: n(cmd, "Q", 3, 2), gain: n(cmd, "gain", 4, 2), follower: n(cmd, "follower", 5, 0.2) });
    case "pitchshift":
      return new Tone.PitchShift({ pitch: n(cmd, "pitch", 0, 0), windowSize: n(cmd, "windowSize", 1, 0.1), delayTime: n(cmd, "delayTime", 2, 0), feedback: n(cmd, "feedback", 3, 0), wet: n(cmd, "wet", 4, 0.4) });
    case "freeverb":
      return new Tone.Freeverb({ roomSize: n(cmd, "roomSize", 0, 0.7), dampening: n(cmd, "dampening", 1, 2500), wet: n(cmd, "wet", 2, 0.4) });
    case "vibrato":
      return new Tone.Vibrato({
        frequency: n(cmd, "frequency", 0, 5),
        depth: n(cmd, "depth", 1, 0.1),
        maxDelay: n(cmd, "maxDelay", 2, 0.005),
        type: String(cmd.options?.type ?? "sine") as "sine",
        wet: n(cmd, "wet", 3, 0.35),
      });
    case "stereowidener": {
      const node = new Tone.StereoWidener(n(cmd, "width", 0, 0.6));
      setWet(node, n(cmd, "wet", 1, 1));
      return node;
    }
    case "chebyshev": {
      const node = new Tone.Chebyshev(n(cmd, "order", 0, 50));
      setWet(node, n(cmd, "wet", 1, 0.35));
      return node;
    }
    case "jcreverb": {
      const node = new Tone.JCReverb(n(cmd, "roomSize", 0, 0.4));
      setWet(node, n(cmd, "wet", 1, 0.35));
      return node;
    }
    default:
      return new Tone.Gain(1);
  }
}

function clearEffects(): void {
  for (const node of activeEffects) node.effect.dispose();
  activeEffects.length = 0;
}

export function applyEffects(commands: Command[]): void {
  const fxCommands = commands.filter((cmd): cmd is FxCommand => cmd.type === "fx");
  clearEffects();
  const master = getMasterChannel();
  master.disconnect();
  if (!fxCommands.length) {
    master.toDestination();
    return;
  }
  let chain: Tone.ToneAudioNode = master;
  for (const cmd of fxCommands) {
    const effect = createEffect(cmd);
    activeEffects.push({ name: cmd.name, effect });
    chain.connect(effect);
    chain = effect;
  }
  chain.connect(Tone.getDestination());
}

export function disposeEffects(): void {
  clearEffects();
}
