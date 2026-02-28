import * as Tone from "tone";

export type WaveformMode = "linear" | "radial" | "circular";
export interface WaveformConfig {
  mode: WaveformMode;
  smoothing: number;
}

const config: WaveformConfig = { mode: "linear", smoothing: 0.15 };

let analyser: Tone.Analyser | null = null;
let fftAnalyser: Tone.Analyser | null = null;
let smoothWave: Float32Array | null = null;
let smoothFft: Float32Array | null = null;

function smooth(src: Float32Array, prev: Float32Array | null, mix: number): Float32Array {
  const dst = !prev || prev.length !== src.length ? new Float32Array(src) : prev;
  for (let i = 0; i < src.length; i++) dst[i] += (src[i] - dst[i]) * mix;
  return dst;
}

export function initAnalysers(): { waveform: Tone.Analyser; fft: Tone.Analyser } {
  if (!analyser) {
    analyser = new Tone.Analyser("waveform", 1024);
    Tone.getDestination().connect(analyser);
  }
  if (!fftAnalyser) {
    fftAnalyser = new Tone.Analyser("fft", 256);
    Tone.getDestination().connect(fftAnalyser);
  }
  return { waveform: analyser, fft: fftAnalyser };
}

export function getAudioData(): { waveform: Float32Array; fft: Float32Array } {
  const { waveform, fft } = initAnalysers();
  smoothWave = smooth(waveform.getValue() as Float32Array, smoothWave, config.smoothing);
  smoothFft = smooth(fft.getValue() as Float32Array, smoothFft, config.smoothing * 0.7);
  return { waveform: smoothWave, fft: smoothFft };
}

export function setWaveformConfig(next: Partial<WaveformConfig>): void {
  Object.assign(config, next);
}
export function setWaveformMode(mode: WaveformMode): void {
  config.mode = mode;
}
export function getWaveformConfig(): WaveformConfig {
  return { ...config };
}

export function disposeAnalysers(): void {
  analyser?.dispose();
  fftAnalyser?.dispose();
  analyser = null;
  fftAnalyser = null;
  smoothWave = null;
  smoothFft = null;
}
