// Live Synth — main entry point
// Wire up: Editor → Parser → Audio Engine → 3D Visual Engine
import "./styles.css";
import { createHelpPanel } from "./app/help.js";
import { PRESETS, loadSavedCode, saveCode } from "./app/presets.js";
import { createTransportBar } from "./app/transport.js";
import {
  applyCommands,
  getIsPlaying,
  setOnBeat,
  setOnNote,
  start,
  stop,
} from "./audio/loop-engine.js";
import type { Command, ParseResult } from "./audio/parser.js";
import { createEditor } from "./editor/setup.js";
import {
  type NoteEntityType,
  initScene,
  renderScene,
  resizeScene,
  onBeat as sceneOnBeat,
  triggerNote,
} from "./visual/scene.js";
import { getAudioData } from "./visual/waveform.js";

// ---- Loader ----
const loader = document.getElementById("loader");
if (loader) {
  setTimeout(() => {
    loader.classList.add("fade-out");
    setTimeout(() => loader.remove(), 600);
    const appEl = document.getElementById("app");
    if (appEl) appEl.style.opacity = "1";
  }, 1000);
}

// ---- State ----
let currentCommands: Command[] = [];
let _currentBeat = 0;
let lastParseResult: ParseResult = { commands: [], errors: [] };

// ---- DOM Setup ----
const app = document.getElementById("app") as HTMLElement;

const header = document.createElement("div");
header.className = "app-header";
const title = document.createElement("div");
title.className = "app-title";
title.textContent = "LIVE SYNTH";

const headerRight = document.createElement("div");
headerRight.className = "header-right";
const presetSelectWrap = document.createElement("div");
presetSelectWrap.className = "preset-select-wrapper";
const presetSelect = document.createElement("select");
presetSelect.className = "preset-select";
for (const preset of PRESETS) {
  const opt = document.createElement("option");
  opt.value = preset.name;
  opt.textContent = preset.name;
  presetSelect.append(opt);
}
presetSelectWrap.append(presetSelect);

const helpBtn = document.createElement("button");
helpBtn.className = "help-btn";
helpBtn.textContent = "?";
helpBtn.setAttribute("aria-label", "Open usage manual");
helpBtn.title = "Usage manual (? or F1)";

headerRight.append(presetSelectWrap, helpBtn);
header.append(title, headerRight);

const main = document.createElement("div");
main.className = "main-content";

const editorPanel = document.createElement("div");
editorPanel.className = "editor-panel";
const editorContainer = document.createElement("div");
editorContainer.style.flex = "1";
editorContainer.style.overflow = "hidden";
editorPanel.append(editorContainer);

const visualPanel = document.createElement("div");
visualPanel.className = "visual-panel";

// Single WebGL canvas
const webglCanvas = document.createElement("canvas");
webglCanvas.style.width = "100%";
webglCanvas.style.height = "100%";
visualPanel.append(webglCanvas);

main.append(editorPanel, visualPanel);
const transportContainer = document.createElement("div");
app.append(header, main, transportContainer);

// ---- Three.js Scene Init ----
const _sceneCtx = initScene(webglCanvas);

function resizeAll(): void {
  const rect = visualPanel.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    resizeScene(rect.width, rect.height);
  }
}
window.addEventListener("resize", resizeAll);

// ---- Audio Callbacks ----
setOnBeat((beat) => {
  _currentBeat = beat;
  sceneOnBeat(beat);
  if (beat % 4 === 0) {
    triggerNote("kick", 0.2, 1.0);
  }
});

setOnNote((note) => {
  let type: NoteEntityType = "synth";
  let pitch = 0.5;
  let velocity = 0.8;

  if (note.includes("+")) {
    type = "pad";
    pitch = 0.6;
  } else if (note.match(/[01]/)) {
    type = "bass";
    pitch = 0.3;
  } else if (note.includes("x") || note.includes("X")) {
    type = "hat";
    pitch = 0.8;
    velocity = 0.6;
  }

  triggerNote(type, pitch, velocity);
});

// ---- Apply & Play ----
function applyAndPlay(): void {
  currentCommands = lastParseResult.commands;
  applyCommands(currentCommands);
}

// ---- Transport ----
const transport = createTransportBar(transportContainer, applyAndPlay);

// ---- Editor ----
const initialCode = loadSavedCode() ?? PRESETS[0].code;
let editorRef: ReturnType<typeof createEditor> | null = null;

const editor = createEditor(editorContainer, initialCode, {
  onParse(result: ParseResult) {
    lastParseResult = result;
    saveCode(editorRef ? editorRef.state.doc.toString() : initialCode);
    if (getIsPlaying()) {
      currentCommands = result.commands;
      applyCommands(currentCommands);
    }
  },
  async onEval() {
    applyAndPlay();
    if (!getIsPlaying()) await start();
    transport.updateState();
    transport.updateBpmDisplay();
  },
  onStop() {
    stop();
    transport.updateState();
  },
  onKeystroke() {
    // Keystroke visual handled by ambient particles in scene
  },
});
editorRef = editor;

// ---- Preset Switcher ----
presetSelect.addEventListener("change", () => {
  const preset = PRESETS.find((p) => p.name === presetSelect.value);
  if (preset) {
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: preset.code } });
  }
});

// ---- Animation Loop ----
function animate(): void {
  const { fft } = getAudioData();
  renderScene(fft);
  requestAnimationFrame(animate);
}

// ---- Help Panel ----
const helpPanel = createHelpPanel(app);
helpBtn.addEventListener("click", () => helpPanel.toggle());

// ---- Boot ----
resizeAll();
requestAnimationFrame(animate);
