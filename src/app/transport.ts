import * as Tone from "tone";
import { getBpm, getIsPlaying, setBpm, start, stop } from "../audio/loop-engine.js";
import { parse } from "../audio/parser.js";
import { getMasterChannel } from "../audio/synth-pool.js";
import { PRESETS, loadSavedCode } from "./presets.js";

type VisualMode = "void" | "field" | "drift" | "pulse";
const VISUAL_MODE_MAP: Record<VisualMode, string> = {
  void: "void",
  field: "grid",
  drift: "stars",
  pulse: "matrix",
};
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

function createKnob(
  container: HTMLElement,
  label: string,
  min: number,
  max: number,
  value: number,
  onChange: (v: number) => void,
  formatValue?: (v: number) => string,
): { setValue: (v: number) => void; getValue: () => number } {
  const group = document.createElement("div");
  group.className = "knob-group";

  const labelEl = document.createElement("div");
  labelEl.className = "knob-label";
  labelEl.textContent = label;

  const knobEl = document.createElement("div");
  knobEl.className = "knob";
  const pointer = document.createElement("div");
  pointer.className = "knob-pointer";
  knobEl.append(pointer);

  const valueEl = document.createElement("div");
  valueEl.className = "knob-value";

  group.append(labelEl, knobEl, valueEl);
  container.append(group);

  let current = value;
  const range = max - min;

  function update(v: number): void {
    current = clamp(v, min, max);
    const ratio = (current - min) / range;
    const angle = -135 + ratio * 270;
    pointer.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    valueEl.textContent = formatValue ? formatValue(current) : String(Math.round(current));
  }

  let dragging = false;
  let startY = 0;
  let startVal = 0;

  knobEl.addEventListener("pointerdown", (e) => {
    dragging = true;
    startY = e.clientY;
    startVal = current;
    knobEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  knobEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dy = startY - e.clientY;
    const sensitivity = range / 150;
    const next = clamp(startVal + dy * sensitivity, min, max);
    update(next);
    onChange(next);
  });
  knobEl.addEventListener("pointerup", () => {
    dragging = false;
  });
  knobEl.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const step = range / 100;
      const next = clamp(current + (e.deltaY < 0 ? step : -step), min, max);
      update(next);
      onChange(next);
    },
    { passive: false },
  );

  update(value);
  return {
    setValue: (v: number) => update(v),
    getValue: () => current,
  };
}

export function createTransportBar(
  container: HTMLElement,
  onToggle: () => void,
): { updateState: () => void; updateBpmDisplay: () => void } {
  container.innerHTML = "";
  container.className = "transport-bar";
  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = "",
    text = "",
  ): HTMLElementTagNameMap[K] => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };

  // Section 1: Playback
  const secPlayback = make("div", "transport-section");
  const titlePlayback = make("div", "transport-section-title", "PLAYBACK");
  const playBtn = make("button", "transport-btn", "\u25B6");
  playBtn.title = "Play/Stop (Ctrl/Cmd+Enter)";

  const bpmWrap = make("div", "bpm-display-wrap");
  const bpmLed = make("div", "bpm-led", "120");
  bpmWrap.append(bpmLed);

  const tapBtn = make("button", "transport-btn-mini", "TAP");
  tapBtn.title = "Tap tempo (Alt+T)";
  secPlayback.append(titlePlayback, playBtn, bpmWrap, tapBtn);

  // BPM knob
  const bpmKnob = createKnob(
    secPlayback,
    "BPM",
    40,
    200,
    Math.round(getBpm()),
    (v) => {
      setBpmValue(Math.round(v));
    },
    (v) => String(Math.round(v)),
  );

  // Section 2: Mixer
  const secMixer = make("div", "transport-section");
  const titleMixer = make("div", "transport-section-title", "MIXER");

  const master = getMasterChannel();
  const volKnob = createKnob(
    secMixer,
    "MASTER",
    -36,
    6,
    Math.round(master.volume.value),
    (v) => {
      master.volume.rampTo(Math.round(v), 0.05);
    },
    (v) => `${Math.round(v)}dB`,
  );

  const swingGroup = make("div", "slider-group");
  const swingLabel = make("div", "slider-label", "SWING 0%");
  const swingSlider = make("input") as HTMLInputElement;
  swingSlider.type = "range";
  swingSlider.min = "0";
  swingSlider.max = "0.75";
  swingSlider.step = "0.01";
  swingGroup.append(swingLabel, swingSlider);

  secMixer.append(titleMixer, swingGroup);

  // Section 3: Visuals & Presets
  const secVisuals = make("div", "transport-section");
  const titleVisuals = make("div", "transport-section-title", "SCENE");

  const vStack = make("div", "slider-group");
  const modeWrap = make("div", "visualizer-mode-switcher");
  const modeButtons = new Map<VisualMode, HTMLButtonElement>();
  for (const mode of ["void", "field", "drift", "pulse"] as const) {
    const b = make("button", "transport-btn-mini", mode.toUpperCase());
    modeButtons.set(mode, b);
    modeWrap.append(b);
  }

  const presetWrap = make("div", "preset-quick-group");
  const quickButtons: HTMLButtonElement[] = [];
  PRESETS.slice(0, 5).forEach((preset, index) => {
    const b = make("button", "preset-quick-btn", `${index + 1}.${preset.name.split(" ")[0]}`);
    quickButtons.push(b);
    presetWrap.append(b);
  });
  vStack.append(modeWrap, presetWrap);
  secVisuals.append(titleVisuals, vStack);

  // Section 4: Status
  const secStatus = make("div", "transport-section");
  const titleStatus = make("div", "transport-section-title", "STATUS");

  const vStackStatus = make("div", "slider-group");
  const beat = make("div", "beat-indicator");
  const dots = Array.from({ length: 8 }, () => make("span", "beat-dot"));
  for (const d of dots) beat.append(d);

  const rowBottom = make("div");
  rowBottom.style.display = "flex";
  rowBottom.style.gap = "8px";
  rowBottom.style.alignItems = "center";
  const meter = make("div", "scope-meter");
  const level = make("div", "scope-level");
  meter.append(level);
  const status = make("div", "transport-status", "READY");
  rowBottom.append(meter, status);

  vStackStatus.append(beat, rowBottom);
  secStatus.append(titleStatus, vStackStatus);

  container.append(secPlayback, secMixer, secVisuals, secStatus);

  // Logic
  let beatTimer: number | null = null;
  let beatIndex = 0;
  let activeMode: VisualMode = "void";
  const taps: number[] = [];

  const setMode = (mode: VisualMode): void => {
    activeMode = mode;
    document.body.dataset.visualMode = VISUAL_MODE_MAP[mode];
    modeButtons.forEach((btn, key) => btn.classList.toggle("active", key === mode));
  };
  const setQuickState = (): void => {
    const selected = document.querySelector<HTMLSelectElement>(".preset-select")?.value ?? "";
    quickButtons.forEach((btn, i) => btn.classList.toggle("active", PRESETS[i]?.name === selected));
  };
  const getScaleLabel = (): string => {
    let scale = "minor C4";
    const src = loadSavedCode() ?? "";
    for (const cmd of parse(src).commands)
      if (cmd.type === "scale") scale = `${cmd.mode} ${cmd.root}`;
    return scale;
  };
  const updateStatus = (): void => {
    const state = getIsPlaying() ? "PLAYING" : "STOPPED";
    status.innerHTML = `<span style="color:var(--accent)">${getScaleLabel()}</span> <span>${state}</span>`;
    status.classList.toggle("active", getIsPlaying());
  };
  const restartBeatClock = (): void => {
    if (beatTimer !== null) {
      window.clearInterval(beatTimer);
      beatTimer = null;
    }
    for (const d of dots) d.classList.remove("active");
    beatIndex = 0;
    if (!getIsPlaying()) return;
    const ms = Math.max(80, 60000 / Math.max(getBpm(), 40) / 2);
    beatTimer = window.setInterval(() => {
      dots.forEach((d, i) => d.classList.toggle("active", i === beatIndex));
      beatIndex = (beatIndex + 1) % dots.length;
    }, ms);
  };
  const setBpmValue = (next: number): void => {
    setBpm(clamp(Math.round(next), 40, 200));
    updateBpmDisplay();
  };
  const tapTempo = (): void => {
    taps.push(performance.now());
    if (taps.length > 6) taps.shift();
    if (taps.length < 2) return;
    const gaps = taps
      .slice(1)
      .map((v, i) => v - taps[i])
      .filter((g) => g > 160 && g < 2000);
    if (gaps.length > 0) setBpmValue(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length));
  };
  const applyPreset = (idx: number): void => {
    const select = document.querySelector<HTMLSelectElement>(".preset-select");
    const preset = PRESETS[idx];
    if (!select || !preset) return;
    select.value = preset.name;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    setQuickState();
  };
  const togglePlayback = async (forceStop = false): Promise<void> => {
    if (forceStop || getIsPlaying()) stop();
    else {
      onToggle();
      await start();
    }
    updateState();
    updateBpmDisplay();
  };
  const playOrRefresh = async (): Promise<void> => {
    onToggle();
    if (!getIsPlaying()) await start();
    updateState();
    updateBpmDisplay();
  };

  const meterLoop = (): void => {
    const gain = (volKnob.getValue() + 36) / 42;
    const swing = Number(swingSlider.value);
    const live = getIsPlaying() ? gain * (0.42 + Math.random() * (0.58 + swing * 0.3)) : 0.03;
    level.style.width = `${Math.round(Math.min(1, live) * 100)}%`;
    window.requestAnimationFrame(meterLoop);
  };
  window.requestAnimationFrame(meterLoop);

  playBtn.addEventListener("click", () => {
    void togglePlayback();
  });
  tapBtn.addEventListener("click", tapTempo);
  swingSlider.addEventListener("input", () => {
    const swing = Number(swingSlider.value);
    swingLabel.textContent = `SWING ${Math.round(swing * 100)}%`;
    Tone.getTransport().swingSubdivision = "8n";
    Tone.getTransport().swing = swing;
  });
  modeButtons.forEach((btn, mode) => btn.addEventListener("click", () => setMode(mode)));
  quickButtons.forEach((btn, i) => btn.addEventListener("click", () => applyPreset(i)));
  document
    .querySelector<HTMLSelectElement>(".preset-select")
    ?.addEventListener("change", setQuickState);

  window.addEventListener("keydown", (ev) => {
    const k = ev.key.toLowerCase();
    const ctrl = ev.ctrlKey || ev.metaKey;
    if (ctrl && ev.key === "Enter") {
      ev.preventDefault();
      void playOrRefresh();
      return;
    }
    if (ctrl && ev.code === "Space") {
      ev.preventDefault();
      void togglePlayback();
      return;
    }
    if (ctrl && k === ".") {
      ev.preventDefault();
      void togglePlayback(true);
      return;
    }
    if (ctrl && k === "arrowup") {
      ev.preventDefault();
      setBpmValue(getBpm() + 1);
      return;
    }
    if (ctrl && k === "arrowdown") {
      ev.preventDefault();
      setBpmValue(getBpm() - 1);
      return;
    }
    if (ev.altKey && /^[1-5]$/.test(ev.key)) {
      ev.preventDefault();
      applyPreset(Number(ev.key) - 1);
      return;
    }
    if (ev.altKey && k === "t") {
      ev.preventDefault();
      tapTempo();
      return;
    }
    const modeKey: Record<string, VisualMode> = { v: "void", f: "field", d: "drift", p: "pulse" };
    if (ev.altKey && modeKey[k]) {
      ev.preventDefault();
      setMode(modeKey[k]);
    }
  });

  function updateState(): void {
    const playing = getIsPlaying();
    playBtn.textContent = playing ? "\u25A0" : "\u25B6";
    playBtn.classList.toggle("playing", playing);
    playBtn.classList.add("state-flip");
    window.setTimeout(() => playBtn.classList.remove("state-flip"), 200);
    updateStatus();
    restartBeatClock();
  }
  function updateBpmDisplay(): void {
    const bpm = Math.round(getBpm());
    bpmKnob.setValue(bpm);
    bpmLed.textContent = String(bpm).padStart(3, "0");
    updateStatus();
    restartBeatClock();
  }

  swingSlider.value = String(Tone.getTransport().swing ?? 0);
  setMode(activeMode);
  setQuickState();
  updateBpmDisplay();
  updateState();
  window.setInterval(updateStatus, 700);
  return { updateState, updateBpmDisplay };
}
