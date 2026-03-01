# Live Synth 使用手册

> 用代码写音乐 -- 在浏览器里实时编曲、合成、表演。

Live Synth 是一个基于文本 DSL (Domain-Specific Language) 的实时音乐合成器。你在左侧编辑器里写代码，右侧会渲染 3D 可视化，底部是 transport 控制面板。写完按 `Ctrl+Enter`，音乐就响了。

---

## 目录

1. [30 秒快速上手](#30-秒快速上手)
2. [DSL 命令参考](#dsl-命令参考)
3. [Pattern 语法](#pattern-语法)
4. [命名和弦参考](#命名和弦参考)
5. [音阶参考](#音阶参考)
6. [键盘快捷键](#键盘快捷键)
7. [预设说明](#预设说明)
8. [做出好听音乐的技巧](#做出好听音乐的技巧)

---

## 30 秒快速上手

打开 Live Synth，编辑器里已经有一段示例代码。直接按 **Ctrl+Enter**（Mac 上是 **Cmd+Enter**），你会听到声音。

如果你想从零开始，试试这段：

```
bpm 120
scale minor C4
synth saw
  C4 . E4 . G4 . B4 .
kick x . . x . . x .
hat . x . x . x . x
fx reverb 3 0.6
```

就这么简单：
- `bpm 120` -- 设定速度 120 拍/分钟
- `scale minor C4` -- C 小调
- `synth saw` -- 用 saw 波形的合成器
- 下一行是音符 pattern，`.` 是休止符
- `kick` 和 `hat` 是鼓
- `fx reverb` 加混响效果

按 **Ctrl+Enter** 播放，按 **Ctrl+.** 停止。就这样，你已经会用了！

---

## DSL 命令参考

每一行是一个命令。`//` 开头的是注释，会被忽略。

### bpm -- 设定速度

```
bpm <数值>
```

设定每分钟节拍数，范围 20-300。

```
bpm 90     // 慢速 ambient
bpm 120    // 标准速度
bpm 138    // acid techno
bpm 170    // drum & bass
```

### scale -- 设定调式

```
scale <调式> <根音>
```

根音格式：音名 + 八度数字，比如 `C4`、`A3`、`F#4`。

```
scale minor C4        // C 小调
scale major G4        // G 大调
scale pentatonic D4   // D 五声音阶
scale dorian E3       // E Dorian 调式
scale blues A3        // A 布鲁斯音阶
```

全部可用调式见 [音阶参考](#音阶参考)。

### synth -- 合成器声部

```
synth [波形] <pattern>
```

播放旋律音符。波形可选，默认 `saw`。

```
synth saw
  C4 . E4 . G4 . B4 .

synth triangle
  . . . D5 . . . A4

synth fm
  D4 . D#4 . F4 . F#4 .
```

pattern 可以写在同一行，也可以写在下一行（缩进）。

### bass -- 低音声部

```
bass [波形] <pattern>
```

专为低音设计的声部，带有低通滤波器包络，音色更厚实。默认波形 `saw`。

```
bass sine
  C2 . . C2 . . C2 C2

bass triangle
  F2 . . C2 . . D2 .

bass saw
  A1 . . A1 A1 . . A1
```

### pad -- 铺底声部

```
pad [波形] <pattern>
```

长音符持续发声的声部，使用 DuoSynth（双振荡器），音色温暖宽厚。默认波形 `fat`。适合铺底和弦。

```
pad fat
  [C4 E4 G4] . . . [F4 A4 C5] . . .
```

### lead -- 主音声部

```
lead [波形] <pattern>
```

适合做旋律 solo 的声部，带滤波器包络，音色明亮有穿透力。默认波形 `saw`。

```
lead square
  C5 E5 G5 C6 G5 E5 C5 .
```

### 波形一览

所有声部命令（synth / bass / pad / lead）都可以指定波形：

| 波形 | 说明 |
|------|------|
| `saw` | 锯齿波 -- 明亮、丰富的泛音，经典合成器音色 |
| `square` | 方波 -- 中空感，Chiptune 味道 |
| `triangle` | 三角波 -- 柔和温暖 |
| `sine` | 正弦波 -- 纯净无泛音 |
| `fm` | FM 合成 -- 金属感、钟声 |
| `am` | AM 合成 -- 颤音效果 |
| `fat` | Fat 锯齿 -- 多个去谐锯齿波叠加，更肥厚 |
| `pwm` | 脉冲宽度调制 -- 有运动感的音色 |
| `pulse` | 脉冲波 -- 类似方波但音色不同 |

### arp -- 琶音器

```
arp <模式> <速率> [波形] <pattern>
```

把和弦按指定模式自动分解成琶音播放。

- **模式**：`up`（上行）、`down`（下行）、`updown`（上下交替）、`random`（随机）
- **速率**：Tone.js 时值，如 `16n`（十六分音符）、`8n`（八分音符）
- **波形**：可选，默认 `saw`

```
arp up 16n
  C4 E4 G4 B4

arp updown 8n triangle
  D4 F4 A4 C5

arp random 16n
  A3 C4 E4 G4
```

### drum / 鼓组命令

两种写法都行：

```
drum <鼓名> <pattern>
<鼓名> <pattern>
```

鼓的 pattern 只用三个符号：
- `x` -- 敲击
- `.` -- 静音
- `~` -- 延续

```
kick x . . x . . x .
snare . . . . x . . .
hat x x x x x x x x
clap . . . . x . . .
```

#### 可用鼓组

| 鼓名 | 说明 | 合成方式 |
|------|------|----------|
| `kick` | 底鼓 | MembraneSynth -- 膜振动合成 |
| `snare` | 军鼓 | NoiseSynth (pink noise) |
| `hat` | 踩镲 | NoiseSynth (white noise)，短衰减 |
| `clap` | 拍手 | NoiseSynth (white noise) |
| `tom` | 通鼓 | MembraneSynth |
| `rim` | 边击 | MetalSynth |
| `shaker` | 沙锤 | NoiseSynth (brown noise) |
| `crash` | 吊镲 | MetalSynth -- 金属合成，长衰减 |

### fx -- 效果器

```
fx <效果名> [参数1] [参数2] ... [key=value ...]
```

参数可以按位置传，也可以用 `key=value` 格式指定名称。

```
fx reverb 3 0.6             // 位置参数: decay=3, preDelay=0.6
fx reverb decay=3 wet=0.5   // 命名参数
fx delay 0.25 0.35          // delayTime=0.25, feedback=0.35
```

可以叠加多个效果，它们会串联在一起：

```
fx chorus 2.2 2.8 0.6
fx reverb 4.5 0.65
fx delay 0.25 0.35
```

#### 全部效果器详解

**reverb -- 混响**
```
fx reverb [decay] [preDelay] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| decay | 2 | 混响衰减时间（秒） |
| preDelay | 0.01 | 预延迟（秒） |
| wet | 0.35 | 干湿比 0-1 |

**delay -- 延迟**
```
fx delay [delayTime] [feedback] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| delayTime | 0.25 | 延迟时间（秒） |
| feedback | 0.35 | 回授量 0-1 |
| wet | 0.25 | 干湿比 |

**pingpong -- 乒乓延迟**
```
fx pingpong [delayTime] [feedback] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| delayTime | 0.25 | 延迟时间（秒） |
| feedback | 0.3 | 回授量 |
| wet | 0.25 | 干湿比 |

声音在左右声道间来回弹跳。

**distortion -- 失真**
```
fx distortion [distortion] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| distortion | 0.35 | 失真量 0-1 |
| wet | 0.4 | 干湿比 |

**chorus -- 合唱**
```
fx chorus [frequency] [delayTime] [depth] [spread] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| frequency | 2.5 | LFO 频率（Hz） |
| delayTime | 2.5 | 延迟时间（ms） |
| depth | 0.7 | 调制深度 0-1 |
| spread | 180 | 立体声展宽角度 |
| wet | 0.35 | 干湿比 |

**filter -- 自动滤波器**
```
fx filter [frequency] [baseFrequency] [octaves] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| frequency | 1 | LFO 频率（Hz） |
| baseFrequency | 200 | 基础截止频率（Hz） |
| octaves | 3 | 扫频八度范围 |
| wet | 0.4 | 干湿比 |

**phaser -- 移相器**
```
fx phaser [frequency] [octaves] [baseFrequency] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| frequency | 0.4 | LFO 频率（Hz） |
| octaves | 3 | 扫频范围 |
| baseFrequency | 250 | 基础频率（Hz） |
| wet | 0.4 | 干湿比 |

**tremolo -- 颤音**
```
fx tremolo [frequency] [depth] [spread] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| frequency | 8 | LFO 频率（Hz） |
| depth | 0.75 | 调制深度 0-1 |
| spread | 0 | 立体声展宽 |
| wet | 0.4 | 干湿比 |

**bitcrusher -- 位深压碎**
```
fx bitcrusher [bits] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| bits | 4 | 位深，数字越小越 Lo-Fi |
| wet | 0.4 | 干湿比 |

**compressor -- 压缩器**
```
fx compressor [threshold] [ratio] [attack] [release] [knee]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| threshold | -18 | 阈值（dB） |
| ratio | 4 | 压缩比 |
| attack | 0.003 | 启动时间（秒） |
| release | 0.2 | 释放时间（秒） |
| knee | 30 | 拐点平滑度（dB） |

**eq -- 三段均衡**
```
fx eq [low] [mid] [high] [lowFrequency] [highFrequency]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| low | 0 | 低频增益（dB） |
| mid | 0 | 中频增益（dB） |
| high | 0 | 高频增益（dB） |
| lowFrequency | 400 | 低中频分界点（Hz） |
| highFrequency | 2500 | 中高频分界点（Hz） |

**autowah -- 自动哇音**
```
fx autowah [baseFrequency] [octaves] [sensitivity] [Q] [gain] [follower]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| baseFrequency | 100 | 基础频率（Hz） |
| octaves | 6 | 扫频范围 |
| sensitivity | 0 | 灵敏度 |
| Q | 2 | 共振峰值 |
| gain | 2 | 增益 |
| follower | 0.2 | 包络跟随速度（秒） |

**pitchshift -- 移调**
```
fx pitchshift [pitch] [windowSize] [delayTime] [feedback] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| pitch | 0 | 移调半音数（正数升调，负数降调） |
| windowSize | 0.1 | 窗口大小 |
| delayTime | 0 | 延迟时间 |
| feedback | 0 | 回授量 |
| wet | 0.4 | 干湿比 |

**freeverb -- Freeverb 混响**
```
fx freeverb [roomSize] [dampening] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| roomSize | 0.7 | 房间大小 0-1 |
| dampening | 2500 | 阻尼频率（Hz），越低越暗 |
| wet | 0.4 | 干湿比 |

**vibrato -- 颤音（音高）**
```
fx vibrato [frequency] [depth] [maxDelay] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| frequency | 5 | 颤音频率（Hz） |
| depth | 0.1 | 颤音深度 0-1 |
| maxDelay | 0.005 | 最大延迟（秒） |
| wet | 0.35 | 干湿比 |

支持 `type=` 参数指定 LFO 波形（默认 sine）。

**stereowidener -- 立体声展宽**
```
fx stereowidener [width] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| width | 0.6 | 展宽量 0-1 |
| wet | 1 | 干湿比 |

**chebyshev -- Chebyshev 波形整形**
```
fx chebyshev [order] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| order | 50 | 阶数，越高泛音越丰富 |
| wet | 0.35 | 干湿比 |

**jcreverb -- JC 混响**
```
fx jcreverb [roomSize] [wet]
```
| 参数 | 默认值 | 说明 |
|------|--------|------|
| roomSize | 0.4 | 房间大小 0-1 |
| wet | 0.35 | 干湿比 |

### vol -- 音量控制

```
vol <声部ID> <dB值>
```

调整某个声部的音量。声部 ID 对应内部缓存 key。

```
vol synth -6
vol bass -10
```

### swing -- 摇摆感

```
swing <数值>
```

设定 swing 量，范围 0-1。0 是完全直拍，越大越 funky。

```
swing 0.3    // 轻微 swing
swing 0.6    // 明显 swing
```

### oct -- 八度偏移

```
oct <数值>
```

整体偏移八度，范围 -4 到 4。

```
oct 1     // 所有音符升一个八度
oct -1    // 所有音符降一个八度
```

---

## Pattern 语法

Pattern 是音乐的核心。每个 token 用空格分隔，按顺序播放。

### 单音符

格式：`音名[#/b]八度[:力度]`

```
C4          // C4，默认力度 100
E4:80       // E4，力度 80
F#3         // 升 F3
Bb4:127     // 降 B4，最大力度
```

- 音名：`A` 到 `G`
- 升降号：`#`（升半音）或 `b`（降半音）
- 八度：整数，通常 0-8，负数也行
- 力度：1-127，可选，默认 100

### 休止符

```
.    // 一拍静音
```

### 延音符

```
~    // 延续上一个音符，不重新触发
```

### 方括号和弦

用 `[` 和 `]` 包裹多个音符，同时发声：

```
[C4 E4 G4]          // C 大三和弦
[D3 F3 A3]:90       // D 小三和弦，力度 90
[C4 E4 G4 B4]       // Cmaj7
```

### 命名和弦

直接用和弦名，省去手写每个音符：

```
Cmajor      // C 大三和弦 (C4 E4 G4)
Dminor      // D 小三和弦
Emaj7       // E 大七和弦
Amin7       // A 小七和弦
F#dim       // 升 F 减三和弦
Gsus4       // G 挂四和弦
```

命名和弦默认在第 4 八度。支持力度修饰：

```
Cmajor:80   // C 大三和弦，力度 80
Amin7:110   // A 小七和弦，力度 110
```

全部可用和弦见 [命名和弦参考](#命名和弦参考)。

### 重复

在任何 token 后加 `*N` 来重复：

```
C4*4        // C4 重复 4 次
.*8         // 8 拍静音
~*2         // 延续 2 拍
[C4 E4]*2   // 和弦重复 2 次
x*4         // 鼓击 4 次（drum pattern 里）
```

### 组合示例

```
synth saw
  C4 . E4 . G4 . B4 .

// 用和弦铺底
pad fat
  [C4 E4 G4]*2 . . [F4 A4 C5]*2 . .

// 加鼓
kick x . . x*2 . x .
hat .*2 x .*2 x . x
snare . . . . x . . .

// 用命名和弦更简洁
synth triangle
  Cmajor . . . Fmajor . . .
```

---

## 命名和弦参考

所有命名和弦根音默认在第 4 八度。可以用任何音名（含升降号）作为根音。

### 三和弦

| 和弦名 | 音程 | C 上的音 |
|--------|------|----------|
| `major` | 0-4-7 | C E G |
| `minor` | 0-3-7 | C Eb G |
| `dim` | 0-3-6 | C Eb Gb |
| `aug` | 0-4-8 | C E G# |
| `sus2` | 0-2-7 | C D G |
| `sus4` | 0-5-7 | C F G |

### 七和弦

| 和弦名 | 音程 | C 上的音 |
|--------|------|----------|
| `maj7` | 0-4-7-11 | C E G B |
| `min7` | 0-3-7-10 | C Eb G Bb |
| `dom7` | 0-4-7-10 | C E G Bb |
| `dim7` | 0-3-6-9 | C Eb Gb A |
| `aug7` | 0-4-8-10 | C E G# Bb |
| `7sus4` | 0-5-7-10 | C F G Bb |
| `min6` | 0-3-7-9 | C Eb G A |

### 九和弦及以上

| 和弦名 | 音程 | 说明 |
|--------|------|------|
| `add9` | 0-4-7-14 | 大三 + 九度 |
| `add11` | 0-4-7-17 | 大三 + 十一度 |
| `maj9` | 0-4-7-11-14 | 大七 + 九度 |
| `min9` | 0-3-7-10-14 | 小七 + 九度 |
| `maj11` | 0-4-7-11-14-17 | 大七 + 九度 + 十一度 |
| `min11` | 0-3-7-10-14-17 | 小七 + 九度 + 十一度 |
| `maj13` | 0-4-7-11-14-17-21 | 大十三和弦 |

### 用法示例

```
// 以下写法等价
synth saw Cmajor
synth saw [C4 E4 G4]

// 和弦进行
pad fat
  Cmajor . Amin7 . Fmajor . Gsus4 .

// 带力度
synth triangle
  Cmaj7:90 . Dmin7:80 . Emaj7:100 .
```

---

## 音阶参考

`scale` 命令支持以下 19 种调式：

### 常用调式

| 调式名 | 音程 | 特点 |
|--------|------|------|
| `major` | 0-2-4-5-7-9-11 | 大调，明亮欢快 |
| `minor` | 0-2-3-5-7-8-10 | 自然小调，忧郁深沉 |
| `pentatonic` | 0-2-4-7-9 | 五声音阶，怎么弹都好听 |
| `blues` | 0-3-5-6-7-10 | 布鲁斯，加了蓝调音 |

### 教会调式

| 调式名 | 音程 | 特点 |
|--------|------|------|
| `dorian` | 0-2-3-5-7-9-10 | 小调但第六音升高，爵士/放克 |
| `mixolydian` | 0-2-4-5-7-9-10 | 大调但七音降低，摇滚/布鲁斯 |
| `lydian` | 0-2-4-6-7-9-11 | 大调但四音升高，梦幻飘逸 |
| `phrygian` | 0-1-3-5-7-8-10 | 小调但二音降低，西班牙/弗拉明戈 |
| `locrian` | 0-1-3-5-6-8-10 | 最暗的调式，不稳定 |

### 小调变体

| 调式名 | 音程 | 特点 |
|--------|------|------|
| `harmonicMinor` | 0-2-3-5-7-8-11 | 和声小调，异域感 |
| `melodicMinor` | 0-2-3-5-7-9-11 | 旋律小调，爵士常用 |

### 对称与特殊音阶

| 调式名 | 音程 | 特点 |
|--------|------|------|
| `chromatic` | 所有 12 个半音 | 半音阶，完全自由 |
| `whole` | 0-2-4-6-8-10 | 全音阶，梦幻模糊 |
| `diminished` | 0-2-3-5-6-8-9-11 | 减音阶，紧张悬疑 |
| `augmented` | 0-3-4-7-8-11 | 增音阶，对称结构 |

### 特色音阶

| 调式名 | 音程 | 特点 |
|--------|------|------|
| `bebop` | 0-2-4-5-7-8-9-11 | Bebop 音阶，爵士即兴 |
| `japanese` | 0-1-5-7-8 | 日本音阶（都节），东方韵味 |
| `arabic` | 0-1-4-5-7-8-11 | 阿拉伯音阶，中东风情 |
| `hungarian` | 0-2-3-6-7-8-11 | 匈牙利音阶，吉普赛风 |
| `gypsy` | 0-1-4-5-7-8-10 | 吉普赛音阶，神秘热烈 |

---

## 键盘快捷键

### 播放控制

| 快捷键 | Mac | 功能 |
|--------|-----|------|
| `Ctrl+Enter` | `Cmd+Enter` | 播放/刷新 -- 应用当前代码并开始播放 |
| `Ctrl+.` | `Cmd+.` | 停止播放 |
| `Ctrl+Space` | `Cmd+Space` | 播放/停止切换 |
| `Ctrl+Up` | `Cmd+Up` | BPM +1 |
| `Ctrl+Down` | `Cmd+Down` | BPM -1 |
| `Alt+T` | `Alt+T` | Tap Tempo -- 连续点击设定速度 |

### 预设切换

| 快捷键 | 功能 |
|--------|------|
| `Alt+1` | 加载第 1 个预设 (Cyberpunk Ambient) |
| `Alt+2` | 加载第 2 个预设 (Acid Techno) |
| `Alt+3` | 加载第 3 个预设 (Lo-Fi Chill) |
| `Alt+4` | 加载第 4 个预设 (Drum Machine) |
| `Alt+5` | 加载第 5 个预设 (Empty Canvas) |

### 可视化模式

| 快捷键 | 模式 |
|--------|------|
| `Alt+V` | Void -- 虚空 |
| `Alt+F` | Field -- 力场网格 |
| `Alt+D` | Drift -- 星群漂移 |
| `Alt+P` | Pulse -- 矩阵脉冲 |

### 编辑器

| 快捷键 | Mac | 功能 |
|--------|-----|------|
| `Ctrl+/` | `Cmd+/` | 切换行注释 |
| `Ctrl+D` | `Cmd+D` | 复制当前行到下一行 |
| `Ctrl+Shift+Up` | `Cmd+Shift+Up` | 向上移动行 |
| `Ctrl+Shift+Down` | `Cmd+Shift+Down` | 向下移动行 |
| `Tab` | `Tab` | 接受自动补全建议 |
| `Ctrl+Z` | `Cmd+Z` | 撤销 |
| `Ctrl+Shift+Z` | `Cmd+Shift+Z` | 重做 |

---

## 预设说明

Live Synth 内置 12 个预设，覆盖多种电子音乐风格。

### Cyberpunk Ambient
```
bpm 90 / scale minor C4
```
慢速赛博朋克氛围。双 synth 层叠（saw + triangle），triangle bass 提供稳定低频，配合 reverb 和 delay 营造深邃空间感。

### Acid Techno
```
bpm 138 / scale minor A3
```
经典 acid techno。saw synth 做主旋律，square 做高音点缀。加 distortion 和 auto filter 扫频出那种标志性的 303 酸味。

### Lo-Fi Chill
```
bpm 75 / scale pentatonic D4
```
低保真放松风。五声音阶怎么弹都不会错。triangle + sine 的柔和音色，chorus 加一点微妙的摇晃感。

### Drum Machine
```
bpm 120
```
纯鼓机节奏。kick/snare/hat/clap 四件套，适合练习 drum pattern 编写或当做节奏底层使用。

### Empty Canvas
```
bpm 120 / scale minor C4
```
空白画布，只有一个最简的 synth pattern。适合从零开始创作。

### Synthwave Sunset
```
bpm 98 / scale minor F4
```
复古合成波。saw + AM synth 双层旋律，chorus + reverb + delay 三重效果堆叠出 80 年代质感。

### Industrial
```
bpm 128 / scale chromatic D3
```
工业噪音。FM synth 在半音阶上制造不和谐，高失真，密集的鼓机节奏。

### Minimal Techno
```
bpm 126 / scale dorian E3
```
极简 Techno。只用 sine synth 和 saw bass，配合 delay 和 filter 扫频。少就是多。

### Ambient Space
```
bpm 70 / scale major G4
```
太空氛围。triangle + FM synth 在大调上缓慢流淌，大混响（decay 8 秒），长 delay。

### DnB Roller
```
bpm 170 / scale minor F3
```
Drum & Bass。高速节奏下 square synth 和 FM bass 的配合，碎拍 + 轻度失真。

### Chiptune
```
bpm 148 / scale major C4
```
8-bit 游戏音乐。全部使用 square 波形，快速音阶跑动，short delay 增加空间。

### Jazz Lounge
```
bpm 92 / scale dorian G3
```
爵士酒廊。AM synth 的温暖音色在 Dorian 调式上演奏，chorus + reverb 营造亲密的俱乐部氛围。

---

## 做出好听音乐的技巧

### 1. 从预设开始改

不要对着空白屏幕发呆。加载一个预设，然后：
- 换几个音符
- 改 bpm
- 换个 scale
- 加减效果器

这比从零开始容易得多。

### 2. 少即是多

不要一上来就写满所有声部。先写一条旋律 + 鼓，听听感觉对不对，再慢慢加。三个声部 + 两个效果往往比十个声部塞满要好听。

### 3. 用休止符创造节奏

`.` 休止符是你最好的朋友。音符之间的留白比音符本身更重要。对比以下两种写法：

```
// 密密麻麻，没有呼吸感
synth saw C4 D4 E4 F4 G4 A4 B4 C5

// 有呼吸感
synth saw C4 . E4 . G4 . . .
```

### 4. 低音不要太复杂

Bass line 保持简洁，根音为主，偶尔加一两个经过音就够了：

```
// 好的 bass line
bass sine C2 . . C2 . . G1 .

// 太复杂了
bass sine C2 D2 E2 F2 G2 A2 B2 C3
```

### 5. 效果器的干湿比很重要

`wet` 参数控制效果的混入量。过多的混响或延迟会让声音糊成一团：

```
// 适度
fx reverb 3 wet=0.35
fx delay 0.25 wet=0.2

// 过量 -- 会糊
fx reverb 8 wet=0.9
fx delay 0.5 wet=0.8
```

### 6. BPM 决定风格

| BPM 范围 | 典型风格 |
|----------|----------|
| 60-80 | Ambient, Lo-Fi, Downtempo |
| 80-100 | Hip-Hop, Synthwave, R&B |
| 100-120 | House, Pop |
| 120-140 | Techno, Trance |
| 140-160 | Chiptune, Hardcore |
| 160-180 | Drum & Bass, Jungle |

### 7. 善用重复符号

`*N` 可以让 pattern 更简洁：

```
// 这两行效果一样
hat x x x x x x x x
hat x*8

// 这两行也一样
kick x . . . x . . .
kick x .*3 x .*3
```

### 8. 试试不同的调式

同样的旋律在不同调式下感觉完全不同：

```
// 明亮欢快
scale major C4

// 忧郁深沉
scale minor C4

// 五声音阶，东方韵味
scale pentatonic C4

// 神秘异域
scale arabic C4

// 爵士放克
scale dorian C4
```

### 9. 鼓组层次感

把不同鼓组件错开，形成节奏层次：

```
kick  x . . . x . . .    // 底鼓打 1 和 5
snare . . . . x . . .    // 军鼓打 5（反拍）
hat   . x . x . x . x    // 踩镲打偶数拍
clap  . . . . x . . .    // 拍手加强反拍
```

### 10. 实时修改

Live Synth 的编辑是实时的 -- 在播放状态下修改代码，音乐会自动更新。大胆尝试，随时调整！
