# Live Synth — 愿望放大结果

> 原始愿望：打造一个超酷的 Live Coding 音乐合成器 Web App

## Wish DAG (分解树)

```
ROOT: Live Coding Music Synthesizer Web App
├── W1: Audio Engine (Tone.js + Web Audio)
│   ├── W1.1: 🍃 DSL→Synth 指令解析器 (text → ToneCommand[])
│   ├── W1.2: 🍃 合成器池管理 (polysynth, fm, am, membrane, metal, noise)
│   ├── W1.3: 🍃 Loop 引擎 (Transport + Sequence, 实时热替换 pattern)
│   ├── W1.4: 🍃 效果链 (reverb, delay, distortion, chorus, filter)
│   └── W1.5: 🍃 音阶/和弦系统 (scale quantize, chord progressions)
│
├── W2: Code Editor (CodeMirror 6)
│   ├── W2.1: 🍃 暗色主题编辑器 (cyberpunk syntax highlighting)
│   ├── W2.2: 🍃 自定义语法高亮 (synth DSL language support)
│   ├── W2.3: 🍃 实时解析反馈 (valid/invalid 行标记, inline hints)
│   └── W2.4: 🍃 快捷键系统 (Ctrl+Enter=eval, Ctrl+.=stop, Ctrl+/=mute line)
│
├── W3: Visual Engine (Canvas/WebGL)
│   ├── W3.1: 🍃 波形可视化 (oscilloscope + FFT spectrum)
│   ├── W3.2: 🍃 粒子系统 (typing = particles, beat = burst)
│   ├── W3.3: 🍃 节拍光效 (beat-synced glow, flash on downbeat)
│   └── W3.4: 🍃 背景动画 (matrix rain / grid pulse / cyber grid)
│
├── W4: App Shell & Integration
│   ├── W4.1: 🍃 布局 (editor left, visualizer right, controls bottom)
│   ├── W4.2: 🍃 Transport 控制条 (play/stop/bpm/volume)
│   └── W4.3: 🍃 预设系统 (内置 demo snippets, localStorage 保存)
│
└── W5: Build & Deploy
    ├── W5.1: 🍃 Vite + TypeScript 配置
    └── W5.2: 🍃 PWA manifest (可离线使用)
```

🍃 = leaf wish (可直接执行)

## DSL 设计草案

```
// 节奏 + 音符
bpm 128
scale minor C4

// 定义 pattern（loop 自动播放）
synth saw
  C4 . E4 . G4 . B4 .
  C5 . . . G4 . . .

// 叠加 bass
bass triangle
  C2 . . C2 . . C2 C2

// 鼓机
kick x . . x . . x .
hat . x . x . x . x
snare . . x . . . x .

// 效果器
fx reverb 0.6
fx delay 0.3 0.5
fx distortion 0.2

// 实时改任何一行 → 立即生效（下一个 loop 起点同步）
```

## 技术栈

| Layer | Tech | Why |
|-------|------|-----|
| Audio | Tone.js (Web Audio) | 成熟的合成器/效果器/调度 |
| Editor | CodeMirror 6 | 现代、可扩展、支持自定义语言 |
| Visual | Canvas 2D + WebGL | 波形用 Canvas，粒子用 WebGL |
| Build | Vite | 秒级 HMR，零配置 |
| Language | TypeScript | 类型安全 |

## 核心体验

**像黑客一样用键盘控制音乐。每一个字符的改变都能听到。**
