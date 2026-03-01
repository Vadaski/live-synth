// Scene facade — same API as before, backed by 2D fullscreen shader
// No Three.js dependency — pure WebGL2 generative visuals

import {
  type RendererContext,
  type Uniforms,
  disposeRenderer,
  initRenderer,
  renderFrame,
  resizeRenderer,
} from "./renderer.js";

export type NoteEntityType = "synth" | "bass" | "pad" | "lead" | "kick" | "hat";

export interface SceneContext {
  renderer: RendererContext;
}

let ctx: SceneContext | null = null;
let elapsedTime = 0;
let lastTimestamp = 0;

// Beat pulse — decays over time
let beatPulse = 0;
let beatTarget = 0;

// Note flash — brief accent on note trigger
let noteFlash = 0;

export function initScene(canvas: HTMLCanvasElement): SceneContext {
  const renderer = initRenderer(canvas);
  lastTimestamp = performance.now();
  ctx = { renderer };
  return ctx;
}

export function onBeat(beat: number): void {
  beatTarget = beat % 4 === 0 ? 1.0 : 0.4;
}

export function triggerNote(_type: NoteEntityType, _pitch = 0.5, velocity = 0.8): void {
  noteFlash = Math.min(1.0, noteFlash + velocity * 0.6);
}

export function resizeScene(width: number, height: number): void {
  if (!ctx) return;
  resizeRenderer(ctx.renderer, width, height);
}

export function renderScene(fftData?: Float32Array): void {
  if (!ctx) return;

  const now = performance.now();
  const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
  lastTimestamp = now;
  elapsedTime += dt;

  // Decay beat pulse
  beatPulse += (beatTarget - beatPulse) * dt * 6.0;
  beatTarget *= 0.92;

  // Decay note flash
  noteFlash *= Math.max(0, 1 - dt * 8.0);

  // Extract FFT energy bands
  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;
  if (fftData && fftData.length >= 32) {
    for (let i = 0; i < 4; i++) {
      const raw = (fftData[i] + 100) / 100;
      lowEnergy += Number.isFinite(raw) ? Math.max(0, Math.min(2, raw)) : 0;
    }
    for (let i = 4; i < 16; i++) {
      const raw = (fftData[i] + 100) / 100;
      midEnergy += Number.isFinite(raw) ? Math.max(0, Math.min(2, raw)) : 0;
    }
    for (let i = 16; i < 32; i++) {
      const raw = (fftData[i] + 100) / 100;
      highEnergy += Number.isFinite(raw) ? Math.max(0, Math.min(2, raw)) : 0;
    }
    lowEnergy /= 4;
    midEnergy /= 12;
    highEnergy /= 16;
  }

  const canvas = ctx.renderer.gl.canvas as HTMLCanvasElement;
  const uniforms: Uniforms = {
    uTime: elapsedTime,
    uLow: lowEnergy,
    uMid: midEnergy,
    uHigh: highEnergy,
    uBeat: beatPulse,
    uNoteFlash: noteFlash,
    uResolution: [canvas.width, canvas.height],
  };

  renderFrame(ctx.renderer, uniforms);
}

export function disposeScene(): void {
  if (!ctx) return;
  disposeRenderer(ctx.renderer);
  ctx = null;
}
