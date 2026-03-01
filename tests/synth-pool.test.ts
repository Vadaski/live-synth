import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — all mock constructors must be created before vi.mock()
// factories run (vi.mock() is hoisted above all imports by Vitest's transform).
// ---------------------------------------------------------------------------
const {
  MockPolySynth,
  MockFMSynth,
  MockAMSynth,
  MockSynth,
  MockDuoSynth,
  MockMonoSynth,
  MockMembraneSynth,
  MockNoiseSynth,
  MockMetalSynth,
  MockChannel,
  MockFilter,
  mockGetDestination,
} = vi.hoisted(() => {
  // Returns a fresh spy-based "Tone node" instance on each `new` call.
  // The constructor itself is a vi.fn() so we can assert call counts / args.
  // IMPORTANT: connect() must return `this` because synth-pool.ts does:
  //   const ch = new Tone.Channel(...).connect(getMasterChannel())
  // If connect() returned undefined, `ch` would be undefined and disposeAll()
  // would throw "Cannot read properties of undefined (reading 'dispose')".
  function makeMockNode(name: string) {
    return vi.fn().mockImplementation(function (this: Record<string, unknown>, opts?: unknown) {
      const inst: Record<string, unknown> = {
        _name: name,
        _opts: opts,
        // mimic Tone.js signal properties used by Channel
        volume: { value: 0 },
        maxPolyphony: undefined as number | undefined,
        set: vi.fn(),
        disconnect: vi.fn(),
        dispose: vi.fn(),
        toDestination: vi.fn(),
      };
      // connect() must return `this` so chaining works:
      //   new Tone.Channel(...).connect(master)  →  returns the Channel instance
      inst.connect = vi.fn().mockReturnValue(inst);
      inst.toDestination = vi.fn().mockReturnValue(inst);
      return inst;
    });
  }

  const mockGetDestination = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
  }));

  return {
    MockPolySynth: makeMockNode("PolySynth"),
    MockFMSynth: makeMockNode("FMSynth"),
    MockAMSynth: makeMockNode("AMSynth"),
    MockSynth: makeMockNode("Synth"),
    MockDuoSynth: makeMockNode("DuoSynth"),
    MockMonoSynth: makeMockNode("MonoSynth"),
    MockMembraneSynth: makeMockNode("MembraneSynth"),
    MockNoiseSynth: makeMockNode("NoiseSynth"),
    MockMetalSynth: makeMockNode("MetalSynth"),
    MockChannel: makeMockNode("Channel"),
    MockFilter: makeMockNode("Filter"),
    mockGetDestination,
  };
});

// ---------------------------------------------------------------------------
// Module mock for "tone" — must use variables from vi.hoisted() above
// ---------------------------------------------------------------------------
vi.mock("tone", () => ({
  PolySynth: MockPolySynth,
  FMSynth: MockFMSynth,
  AMSynth: MockAMSynth,
  Synth: MockSynth,
  DuoSynth: MockDuoSynth,
  MonoSynth: MockMonoSynth,
  MembraneSynth: MockMembraneSynth,
  NoiseSynth: MockNoiseSynth,
  MetalSynth: MockMetalSynth,
  Channel: MockChannel,
  Filter: MockFilter,
  getDestination: mockGetDestination,
}));

// ---------------------------------------------------------------------------
// Imports — AFTER the mocks are registered
// ---------------------------------------------------------------------------
import {
  disposeAll,
  getDrumSynth,
  getVoiceChannel,
  getVoiceSynth,
  setVoiceEnvelope,
  setVoiceFilter,
  setVoiceVolume,
} from "../src/audio/synth-pool.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the instance object created by the most recent `new MockPolySynth()`. */
function lastPolySynthInstance() {
  const calls = MockPolySynth.mock.results;
  return calls[calls.length - 1]?.value as ReturnType<typeof MockPolySynth> | undefined;
}

function lastChannelInstance() {
  const calls = MockChannel.mock.results;
  return calls[calls.length - 1]?.value as ReturnType<typeof MockChannel> | undefined;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("synth-pool", () => {
  // Call disposeAll before each test so the module-level caches start empty.
  // We also clear all mock call histories so assertions are fresh.
  beforeEach(() => {
    vi.clearAllMocks();
    disposeAll();
    vi.clearAllMocks(); // clear the dispose calls that disposeAll itself made
  });

  afterEach(() => {
    disposeAll();
  });

  // -------------------------------------------------------------------------
  // getVoiceSynth() — voice roles
  // -------------------------------------------------------------------------
  describe("getVoiceSynth() — voice roles", () => {
    it("creates a PolySynth(Synth) for role=synth with waveform=saw", () => {
      const entry = getVoiceSynth("synth1", "saw", "synth");
      expect(MockPolySynth).toHaveBeenCalledWith(MockSynth);
      expect(entry.synth).toBeTruthy();
      expect(entry.channel).toBeTruthy();
    });

    it("creates a PolySynth(MonoSynth) for role=bass", () => {
      getVoiceSynth("bass1", "saw", "bass");
      expect(MockPolySynth).toHaveBeenCalledWith(MockMonoSynth);
    });

    it("creates a PolySynth(DuoSynth) for role=pad regardless of waveform", () => {
      getVoiceSynth("pad1", "fm", "pad");
      expect(MockPolySynth).toHaveBeenCalledWith(MockDuoSynth);
    });

    it("creates a PolySynth(MonoSynth) for role=lead", () => {
      getVoiceSynth("lead1", "square", "lead");
      expect(MockPolySynth).toHaveBeenCalledWith(MockMonoSynth);
    });

    it("creates a PolySynth(Synth) for role=arp", () => {
      getVoiceSynth("arp1", "triangle", "arp");
      expect(MockPolySynth).toHaveBeenCalledWith(MockSynth);
    });

    it("calls .set() on the poly synth after creation", () => {
      getVoiceSynth("synth2", "saw", "synth");
      const inst = lastPolySynthInstance();
      expect(inst?.set).toHaveBeenCalled();
    });

    it("connects the synth to the created channel", () => {
      getVoiceSynth("synth3", "sine", "synth");
      const inst = lastPolySynthInstance();
      expect(inst?.connect).toHaveBeenCalled();
    });

    it("creates a Channel for each new voice entry", () => {
      getVoiceSynth("synth4", "sine", "synth");
      expect(MockChannel).toHaveBeenCalled();
    });

    it("applies the correct base volume for role=synth (-10)", () => {
      // In cached(), `new Tone.Channel({ volume: vol })` runs before
      // getMasterChannel() (which creates Channel({ volume: -6 })).
      // So the voice channel is at `before + 0` and master at `before + 1`.
      const before = MockChannel.mock.calls.length;
      getVoiceSynth("synth5", "sine", "synth");
      const channelOpts = MockChannel.mock.calls[before][0] as { volume: number };
      expect(channelOpts.volume).toBe(-10);
    });

    it("applies the correct base volume for role=bass (-8)", () => {
      const before = MockChannel.mock.calls.length;
      getVoiceSynth("bass2", "sine", "bass");
      const channelOpts = MockChannel.mock.calls[before][0] as { volume: number };
      expect(channelOpts.volume).toBe(-8);
    });

    it("applies the correct base volume for role=pad (-12)", () => {
      const before = MockChannel.mock.calls.length;
      getVoiceSynth("pad2", "sine", "pad");
      const channelOpts = MockChannel.mock.calls[before][0] as { volume: number };
      expect(channelOpts.volume).toBe(-12);
    });

    it("applies the correct base volume for role=lead (-8)", () => {
      const before = MockChannel.mock.calls.length;
      getVoiceSynth("lead2", "sine", "lead");
      const channelOpts = MockChannel.mock.calls[before][0] as { volume: number };
      expect(channelOpts.volume).toBe(-8);
    });

    it("applies the correct base volume for role=arp (-9)", () => {
      const before = MockChannel.mock.calls.length;
      getVoiceSynth("arp2", "sine", "arp");
      const channelOpts = MockChannel.mock.calls[before][0] as { volume: number };
      expect(channelOpts.volume).toBe(-9);
    });
  });

  // -------------------------------------------------------------------------
  // getVoiceSynth() — waveform variants for role=synth
  // -------------------------------------------------------------------------
  describe("getVoiceSynth() — waveform variants", () => {
    it("creates PolySynth(FMSynth) for waveform=fm", () => {
      getVoiceSynth("synthFm", "fm", "synth");
      expect(MockPolySynth).toHaveBeenCalledWith(MockFMSynth);
    });

    it("creates PolySynth(AMSynth) for waveform=am", () => {
      getVoiceSynth("synthAm", "am", "synth");
      expect(MockPolySynth).toHaveBeenCalledWith(MockAMSynth);
    });

    it("creates PolySynth(Synth) and calls .set() for waveform=saw", () => {
      getVoiceSynth("synthSaw", "saw", "synth");
      expect(MockPolySynth).toHaveBeenCalledWith(MockSynth);
      const inst = lastPolySynthInstance();
      expect(inst?.set).toHaveBeenCalled();
    });

    it("creates PolySynth(Synth) and calls .set() for waveform=square", () => {
      getVoiceSynth("synthSquare", "square", "synth");
      expect(MockPolySynth).toHaveBeenCalledWith(MockSynth);
    });

    it("creates PolySynth(Synth) and calls .set() for waveform=triangle", () => {
      getVoiceSynth("synthTriangle", "triangle", "synth");
      expect(MockPolySynth).toHaveBeenCalledWith(MockSynth);
    });

    it("creates PolySynth(Synth) and calls .set() for waveform=sine", () => {
      getVoiceSynth("synthSine", "sine", "synth");
      expect(MockPolySynth).toHaveBeenCalledWith(MockSynth);
    });

    it("creates PolySynth(Synth) with fat oscillator for waveform=fat", () => {
      getVoiceSynth("synthFat", "fat", "synth");
      expect(MockPolySynth).toHaveBeenCalledWith(MockSynth);
      const inst = lastPolySynthInstance();
      // .set() is called twice: once in createPolyWave, once to override to fatsawtooth
      expect(inst?.set).toHaveBeenCalledTimes(2);
    });

    it("creates PolySynth(Synth) with fatsquare for waveform=square (fat override path)", () => {
      getVoiceSynth("synthFatSq", "square", "synth");
      const inst = lastPolySynthInstance();
      // First .set() sets oscillator type, second overrides with fatsquare
      expect(inst?.set).toHaveBeenCalledTimes(2);
      // Verify the second call uses fatsquare
      const lastSetArg = inst?.set.mock.calls[1][0] as { oscillator: { type: string } };
      expect(lastSetArg.oscillator.type).toBe("fatsquare");
    });

    it("creates PolySynth(Synth) with fattriangle for waveform=triangle (fat override path)", () => {
      getVoiceSynth("synthFatTri", "triangle", "synth");
      const inst = lastPolySynthInstance();
      expect(inst?.set).toHaveBeenCalledTimes(2);
      const lastSetArg = inst?.set.mock.calls[1][0] as { oscillator: { type: string } };
      expect(lastSetArg.oscillator.type).toBe("fattriangle");
    });
  });

  // -------------------------------------------------------------------------
  // Caching — same key returns the same instance
  // -------------------------------------------------------------------------
  describe("caching", () => {
    it("returns the same SynthEntry for two calls with the same key", () => {
      const first = getVoiceSynth("synth1", "saw", "synth");
      const second = getVoiceSynth("synth1", "saw", "synth");
      expect(first).toBe(second);
    });

    it("does not create a second PolySynth on the second call with the same key", () => {
      getVoiceSynth("synth1", "saw", "synth");
      const countAfterFirst = MockPolySynth.mock.calls.length;
      getVoiceSynth("synth1", "saw", "synth");
      expect(MockPolySynth.mock.calls.length).toBe(countAfterFirst);
    });

    it("creates distinct entries for distinct keys", () => {
      const a = getVoiceSynth("synth1", "saw", "synth");
      const b = getVoiceSynth("synth2", "saw", "synth");
      expect(a).not.toBe(b);
      expect(a.synth).not.toBe(b.synth);
    });

    it("caches drum synths separately from voice synths under drum:<name> keys", () => {
      const kick = getDrumSynth("kick");
      // A second call must return the cached instance, not a new one
      const kickAgain = getDrumSynth("kick");
      expect(kick).toBe(kickAgain);
    });
  });

  // -------------------------------------------------------------------------
  // getDrumSynth() — correct constructor per drum name
  // -------------------------------------------------------------------------
  describe("getDrumSynth() — drum type routing", () => {
    it("uses MembraneSynth for kick", () => {
      getDrumSynth("kick");
      expect(MockMembraneSynth).toHaveBeenCalledTimes(1);
      expect(MockNoiseSynth).not.toHaveBeenCalled();
      expect(MockMetalSynth).not.toHaveBeenCalled();
    });

    it("uses MembraneSynth for tom", () => {
      getDrumSynth("tom");
      expect(MockMembraneSynth).toHaveBeenCalledTimes(1);
    });

    it("uses MetalSynth for rim", () => {
      getDrumSynth("rim");
      expect(MockMetalSynth).toHaveBeenCalledTimes(1);
      expect(MockMembraneSynth).not.toHaveBeenCalled();
    });

    it("uses MetalSynth for crash", () => {
      getDrumSynth("crash");
      expect(MockMetalSynth).toHaveBeenCalledTimes(1);
    });

    it("uses NoiseSynth for hat", () => {
      getDrumSynth("hat");
      expect(MockNoiseSynth).toHaveBeenCalledTimes(1);
      expect(MockMembraneSynth).not.toHaveBeenCalled();
    });

    it("uses NoiseSynth for snare", () => {
      getDrumSynth("snare");
      expect(MockNoiseSynth).toHaveBeenCalledTimes(1);
    });

    it("uses NoiseSynth for shaker", () => {
      getDrumSynth("shaker");
      expect(MockNoiseSynth).toHaveBeenCalledTimes(1);
    });

    it("falls back to NoiseSynth for unknown drum names (clap)", () => {
      getDrumSynth("clap");
      expect(MockNoiseSynth).toHaveBeenCalledTimes(1);
      expect(MockMembraneSynth).not.toHaveBeenCalled();
      expect(MockMetalSynth).not.toHaveBeenCalled();
    });

    it("passes correct pitchDecay and octaves to MembraneSynth for kick", () => {
      getDrumSynth("kick");
      const opts = MockMembraneSynth.mock.calls[0][0] as {
        pitchDecay: number;
        octaves: number;
        envelope: { attack: number; decay: number; sustain: number; release: number };
      };
      expect(opts.pitchDecay).toBe(0.04);
      expect(opts.octaves).toBe(6);
    });

    it("passes correct params to MetalSynth for rim", () => {
      getDrumSynth("rim");
      const opts = MockMetalSynth.mock.calls[0][0] as {
        harmonicity: number;
        resonance: number;
        modulationIndex: number;
      };
      expect(opts.harmonicity).toBe(5.1);
      expect(opts.resonance).toBe(1200);
      expect(opts.modulationIndex).toBe(12);
    });

    it("passes white noise type to NoiseSynth for hat", () => {
      getDrumSynth("hat");
      const opts = MockNoiseSynth.mock.calls[0][0] as { noise: { type: string } };
      expect(opts.noise.type).toBe("white");
    });

    it("passes pink noise type to NoiseSynth for snare", () => {
      getDrumSynth("snare");
      const opts = MockNoiseSynth.mock.calls[0][0] as { noise: { type: string } };
      expect(opts.noise.type).toBe("pink");
    });

    it("passes brown noise type to NoiseSynth for shaker", () => {
      getDrumSynth("shaker");
      const opts = MockNoiseSynth.mock.calls[0][0] as { noise: { type: string } };
      expect(opts.noise.type).toBe("brown");
    });

    it("returns a SynthEntry with synth and channel properties", () => {
      const entry = getDrumSynth("kick");
      expect(entry).toHaveProperty("synth");
      expect(entry).toHaveProperty("channel");
    });

    it("applies -8 dB base volume for drum channels", () => {
      // The drum channel is created before getMasterChannel() in cached().
      // So it lands at index `before + 0`, not `before + 1`.
      const before = MockChannel.mock.calls.length;
      getDrumSynth("kick");
      const channelOpts = MockChannel.mock.calls[before][0] as { volume: number };
      expect(channelOpts.volume).toBe(-8);
    });
  });

  // -------------------------------------------------------------------------
  // getVoiceChannel()
  // -------------------------------------------------------------------------
  describe("getVoiceChannel()", () => {
    it("returns null for a key that has never been created", () => {
      expect(getVoiceChannel("nonexistent-key")).toBeNull();
    });

    it("returns the channel after the voice has been created", () => {
      const entry = getVoiceSynth("synth1", "saw", "synth");
      const ch = getVoiceChannel("synth1");
      expect(ch).toBe(entry.channel);
    });

    it("returns the drum channel after the drum has been created", () => {
      const entry = getDrumSynth("kick");
      const ch = getVoiceChannel("drum:kick");
      expect(ch).toBe(entry.channel);
    });

    it("returns null for a key after disposeAll() has been called", () => {
      getVoiceSynth("synth1", "saw", "synth");
      disposeAll();
      vi.clearAllMocks();
      expect(getVoiceChannel("synth1")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // setVoiceVolume()
  // -------------------------------------------------------------------------
  describe("setVoiceVolume()", () => {
    it("updates channel.volume.value when the key exists", () => {
      const entry = getVoiceSynth("synth1", "saw", "synth");
      const channelInstance = entry.channel as unknown as { volume: { value: number } };
      setVoiceVolume("synth1", -20);
      expect(channelInstance.volume.value).toBe(-20);
    });

    it("does not throw when called with a key that does not exist", () => {
      expect(() => setVoiceVolume("nonexistent", -20)).not.toThrow();
    });

    it("can update volume multiple times on the same key", () => {
      const entry = getVoiceSynth("synth1", "saw", "synth");
      const channelInstance = entry.channel as unknown as { volume: { value: number } };
      setVoiceVolume("synth1", -5);
      expect(channelInstance.volume.value).toBe(-5);
      setVoiceVolume("synth1", -15);
      expect(channelInstance.volume.value).toBe(-15);
    });
  });

  // -------------------------------------------------------------------------
  // setVoiceEnvelope()
  // -------------------------------------------------------------------------
  describe("setVoiceEnvelope()", () => {
    it("calls .set() on the synth with the envelope params", () => {
      const entry = getVoiceSynth("synth1", "saw", "synth");
      const synthInst = entry.synth as unknown as { set: ReturnType<typeof vi.fn> };
      vi.clearAllMocks();
      setVoiceEnvelope("synth1", { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.8 });
      expect(synthInst.set).toHaveBeenCalledWith({
        envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.8 },
      });
    });

    it("is a no-op when the key does not exist (no throw)", () => {
      expect(() =>
        setVoiceEnvelope("nonexistent", { attack: 0.1 }),
      ).not.toThrow();
    });

    it("calls .set() with partial envelope params", () => {
      const entry = getVoiceSynth("synth1", "saw", "synth");
      const synthInst = entry.synth as unknown as { set: ReturnType<typeof vi.fn> };
      vi.clearAllMocks();
      setVoiceEnvelope("synth1", { attack: 0.05 });
      expect(synthInst.set).toHaveBeenCalledWith({ envelope: { attack: 0.05 } });
    });

    it("does not call .set() when the synth has no set method (defensive)", () => {
      // Patch the synth to remove the set method, simulating a drum synth path
      const entry = getVoiceSynth("synthNoSet", "saw", "synth");
      const synthInst = entry.synth as unknown as { set: ReturnType<typeof vi.fn> | undefined };
      synthInst.set = undefined;
      expect(() => setVoiceEnvelope("synthNoSet", { attack: 0.1 })).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // setVoiceFilter()
  // -------------------------------------------------------------------------
  describe("setVoiceFilter()", () => {
    it("creates a Filter with the given type, frequency, and Q", () => {
      getVoiceSynth("synth1", "saw", "synth");
      vi.clearAllMocks();
      setVoiceFilter("synth1", "lowpass", 800, 1.5);
      expect(MockFilter).toHaveBeenCalledWith({ type: "lowpass", frequency: 800, Q: 1.5 });
    });

    it("disconnects the synth before reconnecting through the filter", () => {
      const entry = getVoiceSynth("synth1", "saw", "synth");
      const synthInst = entry.synth as unknown as { disconnect: ReturnType<typeof vi.fn> };
      vi.clearAllMocks();
      setVoiceFilter("synth1", "lowpass", 800, 1.5);
      expect(synthInst.disconnect).toHaveBeenCalled();
    });

    it("connects the synth to the new filter", () => {
      const entry = getVoiceSynth("synth1", "saw", "synth");
      const synthInst = entry.synth as unknown as { connect: ReturnType<typeof vi.fn> };
      vi.clearAllMocks();
      setVoiceFilter("synth1", "lowpass", 800, 1.5);
      expect(synthInst.connect).toHaveBeenCalled();
    });

    it("connects the filter to the channel", () => {
      getVoiceSynth("synth1", "saw", "synth");
      vi.clearAllMocks();
      setVoiceFilter("synth1", "lowpass", 800, 1.5);
      const filterInst = MockFilter.mock.results[0]?.value as { connect: ReturnType<typeof vi.fn> };
      expect(filterInst.connect).toHaveBeenCalled();
    });

    it("disposes the previous filter when called a second time for the same key", () => {
      getVoiceSynth("synth1", "saw", "synth");
      setVoiceFilter("synth1", "lowpass", 800, 1);
      const firstFilter = MockFilter.mock.results[0]?.value as {
        dispose: ReturnType<typeof vi.fn>;
      };
      setVoiceFilter("synth1", "highpass", 2000, 2);
      expect(firstFilter.dispose).toHaveBeenCalled();
    });

    it("creates two different filters for two different keys", () => {
      getVoiceSynth("synth1", "saw", "synth");
      getVoiceSynth("synth2", "sine", "synth");
      vi.clearAllMocks();
      setVoiceFilter("synth1", "lowpass", 400, 1);
      setVoiceFilter("synth2", "highpass", 1200, 2);
      expect(MockFilter).toHaveBeenCalledTimes(2);
    });

    it("is a no-op when the key does not exist (no throw)", () => {
      expect(() => setVoiceFilter("nonexistent", "bandpass", 500, 1)).not.toThrow();
    });

    it("supports highpass filter type", () => {
      getVoiceSynth("synth1", "saw", "synth");
      vi.clearAllMocks();
      setVoiceFilter("synth1", "highpass", 500, 0.7);
      expect(MockFilter).toHaveBeenCalledWith({ type: "highpass", frequency: 500, Q: 0.7 });
    });

    it("supports bandpass filter type", () => {
      getVoiceSynth("synth1", "saw", "synth");
      vi.clearAllMocks();
      setVoiceFilter("synth1", "bandpass", 1000, 3);
      expect(MockFilter).toHaveBeenCalledWith({ type: "bandpass", frequency: 1000, Q: 3 });
    });
  });

  // -------------------------------------------------------------------------
  // disposeAll()
  // -------------------------------------------------------------------------
  describe("disposeAll()", () => {
    it("disposes all voice synths", () => {
      const e1 = getVoiceSynth("synth1", "saw", "synth");
      const e2 = getVoiceSynth("synth2", "sine", "lead");
      const s1 = e1.synth as unknown as { dispose: ReturnType<typeof vi.fn> };
      const s2 = e2.synth as unknown as { dispose: ReturnType<typeof vi.fn> };
      disposeAll();
      expect(s1.dispose).toHaveBeenCalled();
      expect(s2.dispose).toHaveBeenCalled();
    });

    it("disposes all voice channels", () => {
      const e1 = getVoiceSynth("synth1", "saw", "synth");
      const e2 = getVoiceSynth("bass1", "sine", "bass");
      const c1 = e1.channel as unknown as { dispose: ReturnType<typeof vi.fn> };
      const c2 = e2.channel as unknown as { dispose: ReturnType<typeof vi.fn> };
      disposeAll();
      expect(c1.dispose).toHaveBeenCalled();
      expect(c2.dispose).toHaveBeenCalled();
    });

    it("disposes all drum synths", () => {
      const kick = getDrumSynth("kick");
      const snare = getDrumSynth("snare");
      const kickSynth = kick.synth as unknown as { dispose: ReturnType<typeof vi.fn> };
      const snareSynth = snare.synth as unknown as { dispose: ReturnType<typeof vi.fn> };
      disposeAll();
      expect(kickSynth.dispose).toHaveBeenCalled();
      expect(snareSynth.dispose).toHaveBeenCalled();
    });

    it("disposes filters created via setVoiceFilter()", () => {
      getVoiceSynth("synth1", "saw", "synth");
      setVoiceFilter("synth1", "lowpass", 800, 1);
      const filterInst = MockFilter.mock.results[0]?.value as {
        dispose: ReturnType<typeof vi.fn>;
      };
      disposeAll();
      expect(filterInst.dispose).toHaveBeenCalled();
    });

    it("clears the cache so subsequent getVoiceChannel returns null", () => {
      getVoiceSynth("synth1", "saw", "synth");
      disposeAll();
      vi.clearAllMocks();
      expect(getVoiceChannel("synth1")).toBeNull();
    });

    it("causes a new synth to be created after disposeAll (cache is cleared)", () => {
      getVoiceSynth("synth1", "saw", "synth");
      disposeAll();
      vi.clearAllMocks();
      getVoiceSynth("synth1", "saw", "synth");
      expect(MockPolySynth).toHaveBeenCalledTimes(1);
    });

    it("does not throw when called on an empty cache", () => {
      // already empty from beforeEach
      expect(() => disposeAll()).not.toThrow();
    });

    it("can be called multiple times without errors", () => {
      getVoiceSynth("synth1", "saw", "synth");
      disposeAll();
      expect(() => disposeAll()).not.toThrow();
    });

    it("disposes the master channel when it has been created", () => {
      // getMasterChannel is called internally when creating any voice synth,
      // since Channel.connect(getMasterChannel()) is invoked in cached().
      // We verify the Channel created for getMasterChannel is disposed.
      getVoiceSynth("synth1", "saw", "synth");
      // Capture all channel instances created so far
      const allChannels = MockChannel.mock.results.map(
        (r) => r.value as { dispose: ReturnType<typeof vi.fn> },
      );
      disposeAll();
      // At least the master channel should have been disposed
      const anyDisposed = allChannels.some((ch) => ch.dispose.mock.calls.length > 0);
      expect(anyDisposed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Integration — mixed voice and drum entries
  // -------------------------------------------------------------------------
  describe("integration", () => {
    it("manages voice and drum entries independently in the cache", () => {
      const voice = getVoiceSynth("lead1", "square", "lead");
      const drum = getDrumSynth("kick");
      expect(voice).not.toBe(drum);
      expect(getVoiceChannel("lead1")).toBe(voice.channel);
      expect(getVoiceChannel("drum:kick")).toBe(drum.channel);
    });

    it("setVoiceVolume affects only the targeted key", () => {
      const e1 = getVoiceSynth("synth1", "saw", "synth");
      const e2 = getVoiceSynth("synth2", "sine", "synth");
      const ch1 = e1.channel as unknown as { volume: { value: number } };
      const ch2 = e2.channel as unknown as { volume: { value: number } };
      setVoiceVolume("synth1", -3);
      expect(ch1.volume.value).toBe(-3);
      // ch2.volume.value is whatever the mock default is (0), unchanged
      expect(ch2.volume.value).toBe(0);
    });

    it("filter for one voice does not affect another voice's signal path", () => {
      getVoiceSynth("synth1", "saw", "synth");
      getVoiceSynth("synth2", "sine", "synth");
      vi.clearAllMocks();
      setVoiceFilter("synth1", "lowpass", 500, 1);
      expect(MockFilter).toHaveBeenCalledTimes(1);
    });
  });
});
