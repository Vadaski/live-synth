import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() ensures these variables are available when vi.mock() factories
// execute (vi.mock is hoisted above imports by Vitest's transform).
// ---------------------------------------------------------------------------
const {
  MockReverb,
  MockFeedbackDelay,
  MockPingPongDelay,
  MockDistortion,
  MockChorus,
  MockAutoFilter,
  MockPhaser,
  MockTremolo,
  MockBitCrusher,
  MockCompressor,
  MockEQ3,
  MockAutoWah,
  MockPitchShift,
  MockFreeverb,
  MockVibrato,
  MockStereoWidener,
  MockChebyshev,
  MockJCReverb,
  MockGain,
  MockChannel,
  mockGetMasterChannel,
  mockGetVoiceChannel,
} = vi.hoisted(() => {
  // Build a factory that returns a fresh spy each call while still letting
  // us track calls on the constructor itself.
  function makeMockNode(name: string) {
    return vi.fn().mockImplementation((opts?: Record<string, unknown> | number) => ({
      _name: name,
      _opts: opts,
      wet: { value: 0 },
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
      start: vi.fn(),
      toDestination: vi.fn().mockReturnThis(),
    }));
  }

  const mockGetMasterChannel = vi.fn(() => ({
    dispose: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  }));

  const mockGetVoiceChannel = vi.fn(() => null as unknown as ReturnType<typeof mockGetMasterChannel> | null);

  return {
    MockReverb: makeMockNode("Reverb"),
    MockFeedbackDelay: makeMockNode("FeedbackDelay"),
    MockPingPongDelay: makeMockNode("PingPongDelay"),
    MockDistortion: makeMockNode("Distortion"),
    MockChorus: makeMockNode("Chorus"),
    MockAutoFilter: makeMockNode("AutoFilter"),
    MockPhaser: makeMockNode("Phaser"),
    MockTremolo: makeMockNode("Tremolo"),
    MockBitCrusher: makeMockNode("BitCrusher"),
    MockCompressor: makeMockNode("Compressor"),
    MockEQ3: makeMockNode("EQ3"),
    MockAutoWah: makeMockNode("AutoWah"),
    MockPitchShift: makeMockNode("PitchShift"),
    MockFreeverb: makeMockNode("Freeverb"),
    MockVibrato: makeMockNode("Vibrato"),
    MockStereoWidener: makeMockNode("StereoWidener"),
    MockChebyshev: makeMockNode("Chebyshev"),
    MockJCReverb: makeMockNode("JCReverb"),
    MockGain: makeMockNode("Gain"),
    MockChannel: makeMockNode("Channel"),
    mockGetMasterChannel,
    mockGetVoiceChannel,
  };
});

// ---------------------------------------------------------------------------
// Module mocks — use variables from vi.hoisted() above
// ---------------------------------------------------------------------------
vi.mock("tone", () => ({
  Reverb: MockReverb,
  FeedbackDelay: MockFeedbackDelay,
  PingPongDelay: MockPingPongDelay,
  Distortion: MockDistortion,
  Chorus: MockChorus,
  AutoFilter: MockAutoFilter,
  Phaser: MockPhaser,
  Tremolo: MockTremolo,
  BitCrusher: MockBitCrusher,
  Compressor: MockCompressor,
  EQ3: MockEQ3,
  AutoWah: MockAutoWah,
  PitchShift: MockPitchShift,
  Freeverb: MockFreeverb,
  Vibrato: MockVibrato,
  StereoWidener: MockStereoWidener,
  Chebyshev: MockChebyshev,
  JCReverb: MockJCReverb,
  Gain: MockGain,
  Channel: MockChannel,
  getDestination: vi.fn(() => ({
    dispose: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  })),
}));

vi.mock("../src/audio/synth-pool.js", () => ({
  getMasterChannel: mockGetMasterChannel,
  getVoiceChannel: mockGetVoiceChannel,
}));

// ---------------------------------------------------------------------------
// Imports — after mocks are registered
// ---------------------------------------------------------------------------
import { type FxCommand, createEffect, n } from "../src/audio/fx-factory.js";
import {
  applyEffects,
  applyTrackEffects,
  disposeAllTrackEffects,
  disposeEffects,
  disposeTrackEffects,
} from "../src/audio/effects.js";
import type { Command } from "../src/audio/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fxCmd(
  name: string,
  params: number[] = [],
  options?: Record<string, number | string | boolean>,
): FxCommand {
  return { type: "fx", name, params, options } as FxCommand;
}

type MockNode = {
  _name: string;
  _opts: unknown;
  wet: { value: number };
  dispose: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// n() — parameter extraction helper
// ---------------------------------------------------------------------------
describe("n() — positional and key=value extraction", () => {
  it("returns the positional param when no matching option key exists", () => {
    const cmd = fxCmd("reverb", [1.5, 0.02, 0.5]);
    expect(n(cmd, "decay", 0, 2)).toBe(1.5);
    expect(n(cmd, "preDelay", 1, 0.01)).toBe(0.02);
    expect(n(cmd, "wet", 2, 0.35)).toBe(0.5);
  });

  it("prefers the named option over the positional param", () => {
    const cmd = fxCmd("reverb", [1.5], { decay: 3.0 });
    expect(n(cmd, "decay", 0, 2)).toBe(3.0);
  });

  it("returns the fallback when neither option nor positional param exists", () => {
    const cmd = fxCmd("reverb", []);
    expect(n(cmd, "decay", 0, 9.9)).toBe(9.9);
  });

  it("returns the fallback when the positional value is NaN", () => {
    const cmd = fxCmd("reverb", [Number.NaN]);
    expect(n(cmd, "decay", 0, 2)).toBe(2);
  });

  it("ignores a non-numeric option value and falls through to positional", () => {
    const cmd = fxCmd("reverb", [1.5], { decay: "fast" as unknown as number });
    // "fast" is not a finite number → falls to positional 1.5
    expect(n(cmd, "decay", 0, 2)).toBe(1.5);
  });

  it("treats zero as a valid value (not falsy)", () => {
    const cmd = fxCmd("compressor", [-24, 0]);
    expect(n(cmd, "threshold", 0, -18)).toBe(-24);
    expect(n(cmd, "ratio", 1, 4)).toBe(0);
  });

  it("handles negative numbers correctly", () => {
    const cmd = fxCmd("compressor", [-30]);
    expect(n(cmd, "threshold", 0, -18)).toBe(-30);
  });

  it("uses named option value of 0 correctly (not fallback)", () => {
    const cmd = fxCmd("eq", [], { low: 0, mid: 0 });
    expect(n(cmd, "low", 0, 99)).toBe(0);
  });

  it("ignores Infinity in positional params and returns fallback", () => {
    const cmd = fxCmd("reverb", [Infinity]);
    expect(n(cmd, "decay", 0, 2)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// createEffect() — all 18 named effects + fallback
// ---------------------------------------------------------------------------
describe("createEffect()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- reverb ---
  it("creates Reverb with default params", () => {
    createEffect(fxCmd("reverb"));
    expect(MockReverb).toHaveBeenCalledWith({ decay: 2, preDelay: 0.01, wet: 0.35 });
  });

  it("creates Reverb with positional params", () => {
    createEffect(fxCmd("reverb", [3, 0.05, 0.6]));
    expect(MockReverb).toHaveBeenCalledWith({ decay: 3, preDelay: 0.05, wet: 0.6 });
  });

  it("creates Reverb with named options overriding positional", () => {
    createEffect(fxCmd("reverb", [3], { decay: 1.5, wet: 0.9 }));
    expect(MockReverb).toHaveBeenCalledWith({ decay: 1.5, preDelay: 0.01, wet: 0.9 });
  });

  // --- delay ---
  it("creates FeedbackDelay with defaults", () => {
    createEffect(fxCmd("delay"));
    expect(MockFeedbackDelay).toHaveBeenCalledWith({ delayTime: 0.25, feedback: 0.35, wet: 0.25 });
  });

  it("creates FeedbackDelay with custom params", () => {
    createEffect(fxCmd("delay", [0.5, 0.6, 0.3]));
    expect(MockFeedbackDelay).toHaveBeenCalledWith({ delayTime: 0.5, feedback: 0.6, wet: 0.3 });
  });

  it("creates FeedbackDelay with named delayTime option", () => {
    createEffect(fxCmd("delay", [], { delayTime: 0.125 }));
    expect(MockFeedbackDelay).toHaveBeenCalledWith(
      expect.objectContaining({ delayTime: 0.125 }),
    );
  });

  // --- pingpong ---
  it("creates PingPongDelay with defaults", () => {
    createEffect(fxCmd("pingpong"));
    expect(MockPingPongDelay).toHaveBeenCalledWith({
      delayTime: 0.25,
      feedback: 0.3,
      wet: 0.25,
    });
  });

  // --- distortion ---
  it("creates Distortion with defaults", () => {
    createEffect(fxCmd("distortion"));
    expect(MockDistortion).toHaveBeenCalledWith({
      distortion: 0.35,
      wet: 0.4,
      oversample: "2x",
    });
  });

  it("creates Distortion with custom distortion amount", () => {
    createEffect(fxCmd("distortion", [0.8, 0.7]));
    expect(MockDistortion).toHaveBeenCalledWith({ distortion: 0.8, wet: 0.7, oversample: "2x" });
  });

  // --- chorus ---
  it("creates Chorus with defaults and calls start()", () => {
    const node = createEffect(fxCmd("chorus")) as MockNode;
    expect(MockChorus).toHaveBeenCalledWith({
      frequency: 2.5,
      delayTime: 2.5,
      depth: 0.7,
      spread: 180,
      wet: 0.35,
    });
    expect(node.start).toHaveBeenCalled();
  });

  it("creates Chorus with custom params", () => {
    createEffect(fxCmd("chorus", [4, 5, 0.9, 90, 0.5]));
    expect(MockChorus).toHaveBeenCalledWith({
      frequency: 4,
      delayTime: 5,
      depth: 0.9,
      spread: 90,
      wet: 0.5,
    });
  });

  // --- filter (AutoFilter) ---
  it("creates AutoFilter with defaults and calls start()", () => {
    const node = createEffect(fxCmd("filter")) as MockNode;
    expect(MockAutoFilter).toHaveBeenCalledWith({
      frequency: 1,
      baseFrequency: 200,
      octaves: 3,
      wet: 0.4,
    });
    expect(node.start).toHaveBeenCalled();
  });

  // --- phaser ---
  it("creates Phaser with defaults", () => {
    createEffect(fxCmd("phaser"));
    expect(MockPhaser).toHaveBeenCalledWith({
      frequency: 0.4,
      octaves: 3,
      baseFrequency: 250,
      wet: 0.4,
    });
  });

  it("creates Phaser with named options", () => {
    createEffect(fxCmd("phaser", [], { frequency: 2, octaves: 5 }));
    expect(MockPhaser).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: 2, octaves: 5 }),
    );
  });

  // --- tremolo ---
  it("creates Tremolo with defaults and calls start()", () => {
    const node = createEffect(fxCmd("tremolo")) as MockNode;
    expect(MockTremolo).toHaveBeenCalledWith({
      frequency: 8,
      depth: 0.75,
      spread: 0,
      wet: 0.4,
    });
    expect(node.start).toHaveBeenCalled();
  });

  // --- bitcrusher (scalar + setWet) ---
  it("creates BitCrusher with default bits (4) and sets wet to 0.4", () => {
    const node = createEffect(fxCmd("bitcrusher")) as MockNode;
    expect(MockBitCrusher).toHaveBeenCalledWith(4);
    expect(node.wet.value).toBe(0.4);
  });

  it("creates BitCrusher with custom bits", () => {
    createEffect(fxCmd("bitcrusher", [8]));
    expect(MockBitCrusher).toHaveBeenCalledWith(8);
  });

  it("creates BitCrusher with custom wet via positional param index 1", () => {
    const node = createEffect(fxCmd("bitcrusher", [6, 0.7])) as MockNode;
    expect(node.wet.value).toBe(0.7);
  });

  // --- compressor ---
  it("creates Compressor with defaults", () => {
    createEffect(fxCmd("compressor"));
    expect(MockCompressor).toHaveBeenCalledWith({
      threshold: -18,
      ratio: 4,
      attack: 0.003,
      release: 0.2,
      knee: 30,
    });
  });

  it("creates Compressor with all custom params", () => {
    createEffect(fxCmd("compressor", [-24, 8, 0.01, 0.5, 10]));
    expect(MockCompressor).toHaveBeenCalledWith({
      threshold: -24,
      ratio: 8,
      attack: 0.01,
      release: 0.5,
      knee: 10,
    });
  });

  // --- eq ---
  it("creates EQ3 with defaults", () => {
    createEffect(fxCmd("eq"));
    expect(MockEQ3).toHaveBeenCalledWith({
      low: 0,
      mid: 0,
      high: 0,
      lowFrequency: 400,
      highFrequency: 2500,
    });
  });

  it("creates EQ3 with custom frequency bands", () => {
    createEffect(fxCmd("eq", [3, -2, 1, 300, 3000]));
    expect(MockEQ3).toHaveBeenCalledWith({
      low: 3,
      mid: -2,
      high: 1,
      lowFrequency: 300,
      highFrequency: 3000,
    });
  });

  // --- autowah ---
  it("creates AutoWah with defaults", () => {
    createEffect(fxCmd("autowah"));
    expect(MockAutoWah).toHaveBeenCalledWith({
      baseFrequency: 100,
      octaves: 6,
      sensitivity: 0,
      Q: 2,
      gain: 2,
      follower: 0.2,
    });
  });

  // --- pitchshift ---
  it("creates PitchShift with defaults", () => {
    createEffect(fxCmd("pitchshift"));
    expect(MockPitchShift).toHaveBeenCalledWith({
      pitch: 0,
      windowSize: 0.1,
      delayTime: 0,
      feedback: 0,
      wet: 0.4,
    });
  });

  it("creates PitchShift with custom pitch", () => {
    createEffect(fxCmd("pitchshift", [7]));
    expect(MockPitchShift).toHaveBeenCalledWith(expect.objectContaining({ pitch: 7 }));
  });

  // --- freeverb ---
  it("creates Freeverb with defaults", () => {
    createEffect(fxCmd("freeverb"));
    expect(MockFreeverb).toHaveBeenCalledWith({ roomSize: 0.7, dampening: 2500, wet: 0.4 });
  });

  // --- vibrato ---
  it("creates Vibrato with defaults", () => {
    createEffect(fxCmd("vibrato"));
    expect(MockVibrato).toHaveBeenCalledWith({
      frequency: 5,
      depth: 0.1,
      maxDelay: 0.005,
      type: "sine",
      wet: 0.35,
    });
  });

  it("creates Vibrato with a custom type option", () => {
    createEffect(fxCmd("vibrato", [], { type: "triangle" }));
    expect(MockVibrato).toHaveBeenCalledWith(expect.objectContaining({ type: "triangle" }));
  });

  it("creates Vibrato with default type 'sine' when no type option set", () => {
    createEffect(fxCmd("vibrato", []));
    expect(MockVibrato).toHaveBeenCalledWith(expect.objectContaining({ type: "sine" }));
  });

  // --- stereowidener (scalar + setWet) ---
  it("creates StereoWidener with default width (0.6) and wet (1)", () => {
    const node = createEffect(fxCmd("stereowidener")) as MockNode;
    expect(MockStereoWidener).toHaveBeenCalledWith(0.6);
    expect(node.wet.value).toBe(1);
  });

  it("creates StereoWidener with custom width", () => {
    createEffect(fxCmd("stereowidener", [0.9]));
    expect(MockStereoWidener).toHaveBeenCalledWith(0.9);
  });

  it("creates StereoWidener with custom wet via positional param index 1", () => {
    const node = createEffect(fxCmd("stereowidener", [0.9, 0.5])) as MockNode;
    expect(node.wet.value).toBe(0.5);
  });

  // --- chebyshev (scalar + setWet) ---
  it("creates Chebyshev with default order (50) and wet (0.35)", () => {
    const node = createEffect(fxCmd("chebyshev")) as MockNode;
    expect(MockChebyshev).toHaveBeenCalledWith(50);
    expect(node.wet.value).toBe(0.35);
  });

  it("creates Chebyshev with custom order", () => {
    createEffect(fxCmd("chebyshev", [100]));
    expect(MockChebyshev).toHaveBeenCalledWith(100);
  });

  // --- jcreverb (scalar + setWet) ---
  it("creates JCReverb with default roomSize (0.4) and wet (0.35)", () => {
    const node = createEffect(fxCmd("jcreverb")) as MockNode;
    expect(MockJCReverb).toHaveBeenCalledWith(0.4);
    expect(node.wet.value).toBe(0.35);
  });

  it("creates JCReverb with custom roomSize from positional param", () => {
    createEffect(fxCmd("jcreverb", [0.8]));
    expect(MockJCReverb).toHaveBeenCalledWith(0.8);
  });

  it("creates JCReverb with custom roomSize from named option", () => {
    createEffect(fxCmd("jcreverb", [], { roomSize: 0.9 }));
    expect(MockJCReverb).toHaveBeenCalledWith(0.9);
  });

  // --- unknown / fallback ---
  it("falls back to Gain(1) for an unknown effect name", () => {
    createEffect(fxCmd("unknownfx"));
    expect(MockGain).toHaveBeenCalledWith(1);
  });

  it("creates exactly one node per createEffect call", () => {
    createEffect(fxCmd("reverb"));
    expect(MockReverb).toHaveBeenCalledTimes(1);
  });

  it("returns an object (node) for every supported effect name", () => {
    const names = [
      "reverb", "delay", "pingpong", "distortion", "chorus", "filter",
      "phaser", "tremolo", "bitcrusher", "compressor", "eq", "autowah",
      "pitchshift", "freeverb", "vibrato", "stereowidener", "chebyshev", "jcreverb",
    ];
    for (const name of names) {
      const node = createEffect(fxCmd(name));
      expect(node).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// setWet — internal path verified through scalar-arg effects
// ---------------------------------------------------------------------------
describe("setWet internal path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is a no-op and does not throw when the node has no wet property", () => {
    MockBitCrusher.mockImplementationOnce(() => ({
      // no 'wet' property
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    }));
    expect(() => createEffect(fxCmd("bitcrusher"))).not.toThrow();
  });

  it("sets wet.value correctly on a node that has the wet property", () => {
    const node = createEffect(fxCmd("chebyshev", [50, 0.6])) as MockNode;
    expect(node.wet.value).toBe(0.6);
  });
});

// ---------------------------------------------------------------------------
// applyEffects() — master effects chain
// ---------------------------------------------------------------------------
describe("applyEffects()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMasterChannel.mockReturnValue({
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    });
  });

  it("disconnects source and reconnects directly when there are no fx commands", () => {
    const master = mockGetMasterChannel();
    applyEffects([{ type: "bpm", value: 120 }]);
    expect(master.disconnect).toHaveBeenCalled();
    expect(master.connect).toHaveBeenCalled();
  });

  it("ignores non-fx command types", () => {
    const master = mockGetMasterChannel();
    applyEffects([
      { type: "bpm", value: 120 },
      { type: "scale", mode: "minor", root: "C4" },
    ] as Command[]);
    expect(MockReverb).not.toHaveBeenCalled();
    expect(master.connect).toHaveBeenCalled();
  });

  it("applies an untargeted fx to the master chain", () => {
    applyEffects([fxCmd("reverb") as unknown as Command]);
    expect(MockReverb).toHaveBeenCalledTimes(1);
  });

  it("ignores fx commands with a target (those belong to track chains)", () => {
    const targeted = { ...fxCmd("delay"), target: "synth1" };
    applyEffects([
      fxCmd("reverb") as unknown as Command,
      targeted as unknown as Command,
    ]);
    expect(MockReverb).toHaveBeenCalledTimes(1);
    expect(MockFeedbackDelay).not.toHaveBeenCalled();
  });

  it("applies multiple untargeted fx in order", () => {
    applyEffects([
      fxCmd("reverb") as unknown as Command,
      fxCmd("delay") as unknown as Command,
      fxCmd("distortion") as unknown as Command,
    ]);
    expect(MockReverb).toHaveBeenCalledTimes(1);
    expect(MockFeedbackDelay).toHaveBeenCalledTimes(1);
    expect(MockDistortion).toHaveBeenCalledTimes(1);
  });

  it("replaces the existing master chain on a second applyEffects call", () => {
    applyEffects([fxCmd("reverb") as unknown as Command]);
    vi.clearAllMocks();
    mockGetMasterChannel.mockReturnValue({
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    });
    applyEffects([fxCmd("delay") as unknown as Command]);
    expect(MockFeedbackDelay).toHaveBeenCalledTimes(1);
    expect(MockReverb).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// applyTrackEffects() — per-voice chain
// ---------------------------------------------------------------------------
describe("applyTrackEffects()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMasterChannel.mockReturnValue({
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    });
    mockGetVoiceChannel.mockReturnValue(null);
  });

  it("is a no-op when the voice channel does not exist (getVoiceChannel returns null)", () => {
    mockGetVoiceChannel.mockReturnValue(null);
    const targeted = { ...fxCmd("reverb"), target: "synth1" };
    applyTrackEffects("synth1", [targeted as unknown as Command]);
    expect(MockReverb).not.toHaveBeenCalled();
  });

  it("builds the chain when the channel exists and targeted fx are present", () => {
    const voiceChannel = { dispose: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };
    mockGetVoiceChannel.mockReturnValue(voiceChannel as unknown as ReturnType<typeof mockGetMasterChannel>);
    const cmd = { ...fxCmd("reverb"), target: "synth1" };
    applyTrackEffects("synth1", [cmd as unknown as Command]);
    expect(MockReverb).toHaveBeenCalledTimes(1);
    expect(voiceChannel.disconnect).toHaveBeenCalled();
    expect(voiceChannel.connect).toHaveBeenCalled();
  });

  it("only picks up fx commands whose target matches the voice key", () => {
    const voiceChannel = { dispose: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };
    mockGetVoiceChannel.mockReturnValue(voiceChannel as unknown as ReturnType<typeof mockGetMasterChannel>);
    const forSynth1 = { ...fxCmd("reverb"), target: "synth1" };
    const forSynth2 = { ...fxCmd("delay"), target: "synth2" };
    applyTrackEffects("synth1", [
      forSynth1 as unknown as Command,
      forSynth2 as unknown as Command,
    ]);
    expect(MockReverb).toHaveBeenCalledTimes(1);
    expect(MockFeedbackDelay).not.toHaveBeenCalled();
  });

  it("calls disposeTrackEffects (reconnects directly) when no targeted fx remain", () => {
    const voiceChannel = { dispose: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };
    mockGetVoiceChannel.mockReturnValue(voiceChannel as unknown as ReturnType<typeof mockGetMasterChannel>);

    // First: establish a chain
    const cmd = { ...fxCmd("delay"), target: "synth5" };
    applyTrackEffects("synth5", [cmd as unknown as Command]);

    vi.clearAllMocks();
    mockGetVoiceChannel.mockReturnValue(voiceChannel as unknown as ReturnType<typeof mockGetMasterChannel>);
    mockGetMasterChannel.mockReturnValue({
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    });

    // Second: no targeted fx → should dispose chain and reconnect directly
    applyTrackEffects("synth5", [{ type: "bpm", value: 120 } as Command]);
    expect(voiceChannel.connect).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// disposeTrackEffects()
// ---------------------------------------------------------------------------
describe("disposeTrackEffects()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMasterChannel.mockReturnValue({
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    });
  });

  it("is a no-op and does not throw for an unknown voice key", () => {
    expect(() => disposeTrackEffects("no-such-voice")).not.toThrow();
  });

  it("reconnects the channel directly to master after disposing the chain", () => {
    const voiceChannel = { dispose: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };
    mockGetVoiceChannel.mockReturnValue(voiceChannel as unknown as ReturnType<typeof mockGetMasterChannel>);

    const cmd = { ...fxCmd("reverb"), target: "synth6" };
    applyTrackEffects("synth6", [cmd as unknown as Command]);

    vi.clearAllMocks();
    mockGetVoiceChannel.mockReturnValue(voiceChannel as unknown as ReturnType<typeof mockGetMasterChannel>);
    mockGetMasterChannel.mockReturnValue({
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    });

    disposeTrackEffects("synth6");
    expect(voiceChannel.disconnect).toHaveBeenCalled();
    expect(voiceChannel.connect).toHaveBeenCalled();
  });

  it("does not reconnect when the channel no longer exists", () => {
    const voiceChannel = { dispose: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };
    mockGetVoiceChannel.mockReturnValue(voiceChannel as unknown as ReturnType<typeof mockGetMasterChannel>);
    const cmd = { ...fxCmd("reverb"), target: "synth7" };
    applyTrackEffects("synth7", [cmd as unknown as Command]);

    vi.clearAllMocks();
    // Channel gone by the time we dispose
    mockGetVoiceChannel.mockReturnValue(null);

    expect(() => disposeTrackEffects("synth7")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// disposeEffects() / disposeAllTrackEffects()
// ---------------------------------------------------------------------------
describe("disposeEffects()", () => {
  it("does not throw when called with no active effects", () => {
    vi.clearAllMocks();
    expect(() => disposeEffects()).not.toThrow();
  });

  it("does not throw when called after all track effects are cleared", () => {
    vi.clearAllMocks();
    expect(() => disposeAllTrackEffects()).not.toThrow();
  });

  it("can be called multiple times without errors", () => {
    vi.clearAllMocks();
    expect(() => {
      disposeEffects();
      disposeEffects();
    }).not.toThrow();
  });
});
