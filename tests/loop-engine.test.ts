import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — all mock variables must be created before vi.mock() factories
// run (Vitest hoists vi.mock() above all imports).
// ---------------------------------------------------------------------------
const {
  mockTransport,
  mockDraw,
  MockSequence,
  MockPattern,
  MockLoop,
  mockToneStart,
  mockToneGetTransport,
  mockToneGetDraw,
  mockToneTime,
  mockApplyEffects,
  mockApplyTrackEffects,
  mockDisposeAllTrackEffects,
  mockGetVoiceSynth,
  mockGetDrumSynth,
  mockSetVoiceVolume,
  mockDisposeAll,
  mockSetVoiceEnvelope,
  mockSetVoiceFilter,
  mockQuantizeToScale,
} = vi.hoisted(() => {
  // A minimal synth stub that supports both triggerAttackRelease and triggerAttack
  function makeSynthStub() {
    return {
      triggerAttackRelease: vi.fn(),
      triggerAttack: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
    };
  }

  // A BPM param stub with a settable .value
  let _bpm = 120;
  const bpmParam = {
    get value() {
      return _bpm;
    },
    set value(v: number) {
      _bpm = v;
    },
  };

  // Transport stub — tracks swing, bpm, start/stop calls
  const mockTransport = {
    bpm: bpmParam,
    swing: 0,
    swingSubdivision: "8n",
    start: vi.fn(),
    stop: vi.fn(),
    _beatTracker: undefined as unknown,
  };

  // Draw stub — immediately invokes the scheduled callback
  const mockDraw = {
    schedule: vi.fn((cb: () => void) => cb()),
  };

  // Stores the last Sequence callback so tests can invoke it
  const MockSequence = vi.fn().mockImplementation((callback, _events, _subdiv) => ({
    _callback: callback,
    loop: false,
    start: vi.fn(),
    dispose: vi.fn(),
  }));

  // Pattern stub — stores callback
  const MockPattern = vi.fn().mockImplementation((callback, _notes, _mode) => ({
    _callback: callback,
    interval: "16n",
    start: vi.fn(),
    dispose: vi.fn(),
  }));

  // Loop stub (used for beat tracker)
  const MockLoop = vi.fn().mockImplementation((callback, _interval) => ({
    _callback: callback,
    start: vi.fn(),
    dispose: vi.fn(),
  }));

  const mockToneStart = vi.fn().mockResolvedValue(undefined);
  const mockToneGetTransport = vi.fn(() => mockTransport);
  const mockToneGetDraw = vi.fn(() => mockDraw);
  // Tone.Time — returns an object whose toSeconds() gives a predictable value
  const mockToneTime = vi.fn(() => ({ toSeconds: vi.fn(() => 0.25) }));

  // Effects stubs
  const mockApplyEffects = vi.fn();
  const mockApplyTrackEffects = vi.fn();
  const mockDisposeAllTrackEffects = vi.fn();

  // Synth pool stubs — getVoiceSynth returns a fresh synth each call
  const mockGetVoiceSynth = vi.fn(() => ({
    synth: makeSynthStub(),
    channel: {},
  }));
  const mockGetDrumSynth = vi.fn(() => ({
    synth: {
      triggerAttackRelease: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
    },
    channel: {},
  }));
  const mockSetVoiceVolume = vi.fn();
  const mockDisposeAll = vi.fn();
  const mockSetVoiceEnvelope = vi.fn();
  const mockSetVoiceFilter = vi.fn();

  // Scales stub — identity by default
  const mockQuantizeToScale = vi.fn((note: string) => note);

  return {
    mockTransport,
    mockDraw,
    MockSequence,
    MockPattern,
    MockLoop,
    mockToneStart,
    mockToneGetTransport,
    mockToneGetDraw,
    mockToneTime,
    mockApplyEffects,
    mockApplyTrackEffects,
    mockDisposeAllTrackEffects,
    mockGetVoiceSynth,
    mockGetDrumSynth,
    mockSetVoiceVolume,
    mockDisposeAll,
    mockSetVoiceEnvelope,
    mockSetVoiceFilter,
    mockQuantizeToScale,
  };
});

// ---------------------------------------------------------------------------
// Module mocks — declared before any module imports
// ---------------------------------------------------------------------------
vi.mock("tone", () => ({
  Sequence: MockSequence,
  Pattern: MockPattern,
  Loop: MockLoop,
  start: mockToneStart,
  getTransport: mockToneGetTransport,
  getDraw: mockToneGetDraw,
  Time: mockToneTime,
}));

vi.mock("../src/audio/effects.js", () => ({
  applyEffects: mockApplyEffects,
  applyTrackEffects: mockApplyTrackEffects,
  disposeAllTrackEffects: mockDisposeAllTrackEffects,
}));

vi.mock("../src/audio/synth-pool.js", () => ({
  getVoiceSynth: mockGetVoiceSynth,
  getDrumSynth: mockGetDrumSynth,
  setVoiceVolume: mockSetVoiceVolume,
  disposeAll: mockDisposeAll,
  setVoiceEnvelope: mockSetVoiceEnvelope,
  setVoiceFilter: mockSetVoiceFilter,
}));

vi.mock("../src/audio/scales.js", () => ({
  quantizeToScale: mockQuantizeToScale,
}));

// ---------------------------------------------------------------------------
// Imports — AFTER vi.mock() calls
// ---------------------------------------------------------------------------
import type { Command, PatternStep } from "../src/audio/types.js";
import {
  applyCommands,
  dispose,
  getBpm,
  getIsPlaying,
  setBpm,
  setOnBeat,
  setOnNote,
  start,
  stop,
} from "../src/audio/loop-engine.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function noteStep(note: string, velocity = 100): PatternStep {
  return { kind: "note", notes: [note], velocity };
}

function restStep(): PatternStep {
  return { kind: "rest", notes: [], velocity: 100 };
}

function tieStep(): PatternStep {
  return { kind: "tie", notes: [], velocity: 100 };
}

function chordStep(notes: string[], velocity = 100): PatternStep {
  return { kind: "chord", notes, velocity };
}

// Retrieve the last callback passed to Tone.Sequence constructor
function lastSequenceCallback(): (time: number, value: unknown) => void {
  const calls = MockSequence.mock.calls;
  if (!calls.length) throw new Error("MockSequence was never called");
  return calls[calls.length - 1][0] as (time: number, value: unknown) => void;
}

// Retrieve the last callback passed to Tone.Pattern constructor
function lastPatternCallback(): (time: number, value: unknown) => void {
  const calls = MockPattern.mock.calls;
  if (!calls.length) throw new Error("MockPattern was never called");
  return calls[calls.length - 1][0] as (time: number, value: unknown) => void;
}

// Retrieve nth callback (0-indexed) passed to Tone.Loop constructor
function lastLoopCallback(): (time: number) => void {
  const calls = MockLoop.mock.calls;
  if (!calls.length) throw new Error("MockLoop was never called");
  return calls[calls.length - 1][0] as (time: number) => void;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("loop-engine", () => {
  beforeEach(() => {
    // Use resetAllMocks to also clear mockReturnValueOnce queues from prior tests.
    // This prevents leaked unconsumed return values from polluting subsequent tests.
    // NOTE: resetAllMocks clears implementations too, so we re-set them all below.
    vi.resetAllMocks();

    // Reset transport state
    mockTransport.swing = 0;
    mockTransport._beatTracker = undefined;

    // Re-wire tone module fns
    mockToneGetTransport.mockReturnValue(mockTransport);
    mockToneGetDraw.mockReturnValue(mockDraw);
    mockDraw.schedule.mockImplementation((cb: () => void) => cb());
    mockToneStart.mockResolvedValue(undefined);
    mockToneTime.mockReturnValue({ toSeconds: vi.fn(() => 0.25) });

    // Scales
    mockQuantizeToScale.mockImplementation((note: string) => note);

    // Synth pool
    mockGetVoiceSynth.mockImplementation(() => ({
      synth: {
        triggerAttackRelease: vi.fn(),
        triggerAttack: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        dispose: vi.fn(),
      },
      channel: {},
    }));
    mockGetDrumSynth.mockImplementation(() => ({
      synth: {
        triggerAttackRelease: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        dispose: vi.fn(),
      },
      channel: {},
    }));

    // Tone constructors
    MockSequence.mockImplementation((callback, _events, _subdiv) => ({
      _callback: callback,
      loop: false,
      start: vi.fn(),
      dispose: vi.fn(),
    }));
    MockPattern.mockImplementation((callback, _notes, _mode) => ({
      _callback: callback,
      interval: "16n",
      start: vi.fn(),
      dispose: vi.fn(),
    }));
    MockLoop.mockImplementation((callback, _interval) => ({
      _callback: callback,
      start: vi.fn(),
      dispose: vi.fn(),
    }));
  });

  afterEach(() => {
    stop();
  });

  // -------------------------------------------------------------------------
  // applyCommands — bpm
  // -------------------------------------------------------------------------
  describe("applyCommands() — bpm command", () => {
    it("sets transport bpm to the specified value", () => {
      applyCommands([{ type: "bpm", value: 140 }]);
      expect(mockTransport.bpm.value).toBe(140);
    });

    it("processes bpm when combined with other commands", () => {
      applyCommands([
        { type: "bpm", value: 90 },
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
      ]);
      expect(mockTransport.bpm.value).toBe(90);
    });

    it("uses the last bpm when multiple bpm commands appear", () => {
      applyCommands([
        { type: "bpm", value: 80 },
        { type: "bpm", value: 160 },
      ]);
      expect(mockTransport.bpm.value).toBe(160);
    });
  });

  // -------------------------------------------------------------------------
  // applyCommands — scale
  // -------------------------------------------------------------------------
  describe("applyCommands() — scale command", () => {
    // NOTE: currentScale is module-level state that persists between applyCommands
    // calls. The "no scale" test must run first (before any test sets currentScale)
    // to avoid false positives from state leakage.

    it("does not call quantizeToScale when no scale command has been given yet", () => {
      // This test intentionally runs first within this describe block.
      // At this point no prior test in this describe has set currentScale.
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4")] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("C4"), index: 0 });
      expect(mockQuantizeToScale).not.toHaveBeenCalled();
    });

    it("quantizes notes via quantizeToScale when scale is set and the callback fires", () => {
      applyCommands([
        { type: "scale", mode: "minor", root: "C4" },
        { type: "synth", waveform: "saw", pattern: [noteStep("D4")] },
      ]);
      const cb = lastSequenceCallback();
      // Fire the callback — this triggers mapNotes → quantizeToScale
      cb(0, { step: noteStep("D4"), index: 0 });
      expect(mockQuantizeToScale).toHaveBeenCalledWith("D4", "C4", "minor");
    });
  });

  // -------------------------------------------------------------------------
  // applyCommands — oct
  // -------------------------------------------------------------------------
  describe("applyCommands() — oct command", () => {
    it("shifts the note by the specified number of octaves in the callback", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([
        { type: "oct", value: 2 },
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
      ]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("C4"), index: 0 });

      // C4 + 2 octaves = C6
      expect(synth.triggerAttackRelease).toHaveBeenCalledWith(
        "C6",
        expect.any(Number),
        0,
        expect.any(Number),
      );
    });

    it("resets octave to 0 between consecutive applyCommands calls", () => {
      // First call sets oct to 3
      applyCommands([{ type: "oct", value: 3 }]);

      // Second call — no oct command, octave must revert to 0
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4")] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("C4"), index: 0 });

      // C4 + 0 octaves = C4
      const callArgs = (synth.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toBe("C4");
    });

    it("negative octave shifts note down", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([
        { type: "oct", value: -1 },
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
      ]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("C4"), index: 0 });

      expect(synth.triggerAttackRelease).toHaveBeenCalledWith(
        "C3",
        expect.any(Number),
        0,
        expect.any(Number),
      );
    });
  });

  // -------------------------------------------------------------------------
  // applyCommands — swing
  // -------------------------------------------------------------------------
  describe("applyCommands() — swing command", () => {
    it("sets transport swing to the command value", () => {
      applyCommands([{ type: "swing", value: 0.6 }]);
      expect(mockTransport.swing).toBe(0.6);
    });

    it("clamps swing to 0 when value is negative", () => {
      applyCommands([{ type: "swing", value: -0.5 }]);
      expect(mockTransport.swing).toBe(0);
    });

    it("clamps swing to 1 when value exceeds 1", () => {
      applyCommands([{ type: "swing", value: 1.8 }]);
      expect(mockTransport.swing).toBe(1);
    });

    it("sets swingSubdivision to 8n", () => {
      applyCommands([{ type: "swing", value: 0.5 }]);
      expect(mockTransport.swingSubdivision).toBe("8n");
    });

    it("defaults swing to 0 when no swing command is given", () => {
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4")] }]);
      expect(mockTransport.swing).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // applyCommands — vol
  // -------------------------------------------------------------------------
  describe("applyCommands() — vol command", () => {
    it("applies custom volume to a voice via setVoiceVolume", () => {
      applyCommands([
        { type: "vol", voice: "synth1", value: -15 },
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
      ]);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("synth1", -15);
    });

    it("uses the default synth volume (-10 dB) when no vol command matches", () => {
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4")] }]);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("synth1", -10);
    });

    it("uses default volumes for each voice type", () => {
      applyCommands([
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
        { type: "bass", waveform: "sine", pattern: [noteStep("C2")] },
        { type: "pad", waveform: "fat", pattern: [noteStep("C4")] },
        { type: "lead", waveform: "square", pattern: [noteStep("C5")] },
      ]);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("synth1", -10);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("bass1", -8);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("pad1", -12);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("lead1", -8);
    });

    it("does not throw when vol command has no matching voice", () => {
      expect(() =>
        applyCommands([{ type: "vol", voice: "synth99", value: -20 }]),
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Voice scheduling — synth / bass / pad / lead
  // -------------------------------------------------------------------------
  describe("voice scheduling — synth/bass/pad/lead", () => {
    it("creates a Tone.Sequence for a synth command", () => {
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4"), restStep()] }]);
      expect(MockSequence).toHaveBeenCalledTimes(1);
    });

    it("starts the sequence at position 0 and sets loop=true", () => {
      const seqStub = { loop: false, start: vi.fn(), dispose: vi.fn() };
      MockSequence.mockImplementationOnce(() => seqStub);
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4")] }]);
      expect(seqStub.start).toHaveBeenCalledWith(0);
      expect(seqStub.loop).toBe(true);
    });

    it("assigns incremented voice ids: synth1, synth2 for two synth commands", () => {
      applyCommands([
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
        { type: "synth", waveform: "saw", pattern: [noteStep("E4")] },
      ]);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("synth1", -10);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("synth2", -10);
    });

    it("assigns correct role to bass voice (calls getVoiceSynth in callback)", () => {
      applyCommands([{ type: "bass", waveform: "sine", pattern: [noteStep("C2")] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("C2"), index: 0 });
      expect(mockGetVoiceSynth).toHaveBeenCalledWith("bass1", "sine", "bass");
    });

    it("assigns correct role to pad voice", () => {
      applyCommands([{ type: "pad", waveform: "fat", pattern: [noteStep("C4")] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("C4"), index: 0 });
      expect(mockGetVoiceSynth).toHaveBeenCalledWith("pad1", "fat", "pad");
    });

    it("assigns correct role to lead voice", () => {
      applyCommands([{ type: "lead", waveform: "square", pattern: [noteStep("G5")] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("G5"), index: 0 });
      expect(mockGetVoiceSynth).toHaveBeenCalledWith("lead1", "square", "lead");
    });

    it("creates separate sequences for separate voice types", () => {
      applyCommands([
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
        { type: "bass", waveform: "sine", pattern: [noteStep("C2")] },
      ]);
      expect(MockSequence).toHaveBeenCalledTimes(2);
    });

    it("skips rest steps — does not trigger playback", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "synth", waveform: "saw", pattern: [restStep()] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: restStep(), index: 0 });

      expect(synth.triggerAttackRelease).not.toHaveBeenCalled();
    });

    it("skips tie steps — does not trigger playback", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "synth", waveform: "saw", pattern: [tieStep()] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: tieStep(), index: 0 });

      expect(synth.triggerAttackRelease).not.toHaveBeenCalled();
    });

    it("triggers note playback for a note step", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("E4", 100)] }]);
      const cb = lastSequenceCallback();
      cb(0.1, { step: noteStep("E4", 100), index: 0 });

      expect(synth.triggerAttackRelease).toHaveBeenCalled();
      const call = (synth.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe("E4");
    });

    it("plays a chord (array of notes) for a chord step", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "synth", waveform: "saw", pattern: [chordStep(["C4", "E4", "G4"])] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: chordStep(["C4", "E4", "G4"]), index: 0 });

      expect(synth.triggerAttackRelease).toHaveBeenCalled();
      const call = (synth.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(Array.isArray(call[0])).toBe(true);
      expect(call[0]).toEqual(["C4", "E4", "G4"]);
    });

    it("disposes existing sequences before creating new ones", () => {
      const disposeA = vi.fn();
      MockSequence.mockImplementationOnce(() => ({ loop: false, start: vi.fn(), dispose: disposeA }));
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4")] }]);

      MockSequence.mockImplementationOnce(() => ({
        loop: false,
        start: vi.fn(),
        dispose: vi.fn(),
      }));
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("E4")] }]);

      expect(disposeA).toHaveBeenCalled();
    });

    it("passes waveform through to getVoiceSynth", () => {
      applyCommands([{ type: "synth", waveform: "fm", pattern: [noteStep("C4")] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("C4"), index: 0 });
      expect(mockGetVoiceSynth).toHaveBeenCalledWith("synth1", "fm", "synth");
    });

    it("normalizes unknown waveform to 'saw'", () => {
      applyCommands([{ type: "synth", waveform: "weird", pattern: [noteStep("C4")] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("C4"), index: 0 });
      expect(mockGetVoiceSynth).toHaveBeenCalledWith("synth1", "saw", "synth");
    });

    it("counts independent id counters per voice type", () => {
      applyCommands([
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
        { type: "synth", waveform: "saw", pattern: [noteStep("E4")] },
        { type: "bass", waveform: "sine", pattern: [noteStep("C2")] },
        { type: "lead", waveform: "square", pattern: [noteStep("G5")] },
      ]);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("synth1", -10);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("synth2", -10);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("bass1", -8);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("lead1", -8);
    });

    it("extends note duration for tied steps", () => {
      // A note followed by a tie means duration spans 2 steps
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([
        { type: "synth", waveform: "saw", pattern: [noteStep("C4"), tieStep()] },
      ]);
      const cb = lastSequenceCallback();
      // Fire for the first note (index=0, which has a tie at index=1)
      cb(0, { step: noteStep("C4"), index: 0 });

      const call = (synth.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls[0];
      // Second arg is duration: Tone.Time("8n").toSeconds() * 2 (tieSteps=2)
      expect(call[1]).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Arp scheduling
  // -------------------------------------------------------------------------
  describe("arp scheduling", () => {
    it("creates a Tone.Pattern for an arp command with notes", () => {
      applyCommands([
        {
          type: "arp",
          mode: "up",
          rate: "16n",
          waveform: "triangle",
          pattern: [noteStep("C4"), noteStep("E4"), noteStep("G4")],
        },
      ]);
      expect(MockPattern).toHaveBeenCalledTimes(1);
    });

    it("does not create a pattern when the arp has only rests", () => {
      applyCommands([
        {
          type: "arp",
          mode: "up",
          rate: "16n",
          waveform: "triangle",
          pattern: [restStep(), restStep()],
        },
      ]);
      expect(MockPattern).not.toHaveBeenCalled();
    });

    it("sets pattern interval to the specified rate", () => {
      const patStub = { interval: "", start: vi.fn(), dispose: vi.fn() };
      MockPattern.mockImplementationOnce(() => patStub);
      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("C4")] },
      ]);
      expect(patStub.interval).toBe("16n");
    });

    it("starts the pattern at position 0", () => {
      const patStub = { interval: "", start: vi.fn(), dispose: vi.fn() };
      MockPattern.mockImplementationOnce(() => patStub);
      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("C4")] },
      ]);
      expect(patStub.start).toHaveBeenCalledWith(0);
    });

    it("maps arp mode 'up' to Tone 'up'", () => {
      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("C4")] },
      ]);
      expect(MockPattern.mock.calls[0][2]).toBe("up");
    });

    it("maps arp mode 'down' to Tone 'down'", () => {
      applyCommands([
        {
          type: "arp",
          mode: "down",
          rate: "16n",
          waveform: "triangle",
          pattern: [noteStep("C4")],
        },
      ]);
      expect(MockPattern.mock.calls[0][2]).toBe("down");
    });

    it("maps arp mode 'updown' to Tone 'upDown'", () => {
      applyCommands([
        {
          type: "arp",
          mode: "updown",
          rate: "16n",
          waveform: "triangle",
          pattern: [noteStep("C4")],
        },
      ]);
      expect(MockPattern.mock.calls[0][2]).toBe("upDown");
    });

    it("maps arp mode 'random' to Tone 'random'", () => {
      applyCommands([
        {
          type: "arp",
          mode: "random",
          rate: "16n",
          waveform: "triangle",
          pattern: [noteStep("C4")],
        },
      ]);
      expect(MockPattern.mock.calls[0][2]).toBe("random");
    });

    it("calls setVoiceVolume with default arp dB (-9) when no vol override", () => {
      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("C4")] },
      ]);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("arp1", -9);
    });

    it("applies custom volume to arp when vol command matches arp1", () => {
      applyCommands([
        { type: "vol", voice: "arp1", value: -5 },
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("C4")] },
      ]);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("arp1", -5);
    });

    it("triggers a note through the arp playback callback", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("G4")] },
      ]);
      const cb = lastPatternCallback();
      cb(0.2, { note: "G4", velocity: 100 });

      expect(synth.triggerAttackRelease).toHaveBeenCalled();
    });

    it("increments arp id counter: arp1, arp2 for two arp commands", () => {
      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("C4")] },
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("E4")] },
      ]);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("arp1", -9);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("arp2", -9);
    });

    it("uses the arp waveform when looking up the voice synth", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "square", pattern: [noteStep("C4")] },
      ]);
      const cb = lastPatternCallback();
      cb(0, { note: "C4", velocity: 100 });

      expect(mockGetVoiceSynth).toHaveBeenCalledWith("arp1", "square", "arp");
    });
  });

  // -------------------------------------------------------------------------
  // Drum scheduling
  // -------------------------------------------------------------------------
  describe("drum scheduling", () => {
    it("creates a Tone.Sequence for a kick drum command", () => {
      applyCommands([{ type: "drum", name: "kick", pattern: ["x", ".", "x", "."] }]);
      expect(MockSequence).toHaveBeenCalledTimes(1);
      expect(mockGetDrumSynth).toHaveBeenCalledWith("kick");
    });

    it("creates sequences for all supported drum names", () => {
      const drums = ["kick", "snare", "hat", "clap", "tom", "rim", "shaker", "crash"] as const;
      applyCommands(drums.map((d) => ({ type: "drum" as const, name: d, pattern: ["x", "."] as ("x" | "." | "~")[] })));
      expect(MockSequence).toHaveBeenCalledTimes(drums.length);
    });

    it("ignores drum commands with unknown names", () => {
      applyCommands([{ type: "drum", name: "cowbell", pattern: ["x", "."] } as Command]);
      expect(MockSequence).not.toHaveBeenCalled();
      expect(mockGetDrumSynth).not.toHaveBeenCalled();
    });

    it("starts the drum sequence at position 0", () => {
      const seqStub = { loop: false, start: vi.fn(), dispose: vi.fn() };
      MockSequence.mockImplementationOnce(() => seqStub);
      applyCommands([{ type: "drum", name: "snare", pattern: ["x", "."] }]);
      expect(seqStub.start).toHaveBeenCalledWith(0);
    });

    it("sets loop=true on the drum sequence", () => {
      const seqStub = { loop: false, start: vi.fn(), dispose: vi.fn() };
      MockSequence.mockImplementationOnce(() => seqStub);
      applyCommands([{ type: "drum", name: "hat", pattern: ["x", "."] }]);
      expect(seqStub.loop).toBe(true);
    });

    it("invokes triggerAttackRelease for kick on 'x' steps", () => {
      const synth = { triggerAttackRelease: vi.fn() };
      mockGetDrumSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "drum", name: "kick", pattern: ["x"] }]);
      const cb = lastSequenceCallback();
      cb(0, "x");

      expect(synth.triggerAttackRelease).toHaveBeenCalledWith("C1", "16n", 0, 1);
    });

    it("invokes triggerAttackRelease for tom on 'x' steps", () => {
      const synth = { triggerAttackRelease: vi.fn() };
      mockGetDrumSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "drum", name: "tom", pattern: ["x"] }]);
      const cb = lastSequenceCallback();
      cb(0, "x");

      expect(synth.triggerAttackRelease).toHaveBeenCalledWith("G1", "16n", 0, 0.9);
    });

    it("invokes triggerAttackRelease for snare on 'x' steps (non-pitched path)", () => {
      const synth = { triggerAttackRelease: vi.fn() };
      mockGetDrumSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "drum", name: "snare", pattern: ["x"] }]);
      const cb = lastSequenceCallback();
      cb(0, "x");

      expect(synth.triggerAttackRelease).toHaveBeenCalledWith("16n", 0, 0.85);
    });

    it("does NOT call triggerAttackRelease for '.' steps", () => {
      const synth = { triggerAttackRelease: vi.fn() };
      mockGetDrumSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "drum", name: "kick", pattern: ["."] }]);
      const cb = lastSequenceCallback();
      cb(0, ".");

      expect(synth.triggerAttackRelease).not.toHaveBeenCalled();
    });

    it("does NOT call triggerAttackRelease when synth has no triggerAttackRelease method", () => {
      const synth = { connect: vi.fn(), disconnect: vi.fn(), dispose: vi.fn() };
      mockGetDrumSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "drum", name: "hat", pattern: ["x"] }]);
      const cb = lastSequenceCallback();
      // Should not throw
      expect(() => cb(0, "x")).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // start() / stop() / getIsPlaying()
  // -------------------------------------------------------------------------
  describe("start() / stop() / getIsPlaying()", () => {
    it("getIsPlaying() returns false initially", () => {
      expect(getIsPlaying()).toBe(false);
    });

    it("start() sets isPlaying to true", async () => {
      await start();
      expect(getIsPlaying()).toBe(true);
    });

    it("start() calls Tone.start() and transport.start()", async () => {
      await start();
      expect(mockToneStart).toHaveBeenCalledTimes(1);
      expect(mockTransport.start).toHaveBeenCalledTimes(1);
    });

    it("start() is idempotent — second call is a no-op when already playing", async () => {
      await start();
      vi.clearAllMocks();
      await start();
      // After clearAllMocks, neither should be called again
      expect(mockToneStart).not.toHaveBeenCalled();
    });

    it("stop() sets isPlaying to false", async () => {
      await start();
      stop();
      expect(getIsPlaying()).toBe(false);
    });

    it("stop() calls transport.stop()", async () => {
      await start();
      vi.clearAllMocks();
      stop();
      expect(mockTransport.stop).toHaveBeenCalledTimes(1);
    });

    it("stop() disposes scheduled sequences", () => {
      const disposeSeq = vi.fn();
      MockSequence.mockImplementationOnce(() => ({ loop: false, start: vi.fn(), dispose: disposeSeq }));
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4")] }]);
      stop();
      expect(disposeSeq).toHaveBeenCalled();
    });

    it("after stop(), start() can be called again", async () => {
      await start();
      stop();
      vi.clearAllMocks();
      await start();
      expect(getIsPlaying()).toBe(true);
      expect(mockToneStart).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // setOnBeat() callback
  // -------------------------------------------------------------------------
  describe("setOnBeat()", () => {
    it("registers a callback that is invoked by the beat tracker loop", () => {
      const onBeat = vi.fn();
      setOnBeat(onBeat);

      applyCommands([]);
      const loopCb = lastLoopCallback();
      loopCb(0);

      expect(onBeat).toHaveBeenCalledWith(0);
    });

    it("increments the beat counter on each loop invocation", () => {
      const beats: number[] = [];
      setOnBeat((b) => beats.push(b));

      applyCommands([]);
      const loopCb = lastLoopCallback();
      for (let i = 0; i < 3; i++) loopCb(i);
      expect(beats).toEqual([0, 1, 2]);
    });

    it("wraps beat counter back to 0 after 16 beats", () => {
      const beats: number[] = [];
      setOnBeat((b) => beats.push(b));

      applyCommands([]);
      const loopCb = lastLoopCallback();
      for (let i = 0; i < 17; i++) loopCb(i);
      // After 16 beats (0..15), the 17th invocation should give beat 0
      expect(beats[16]).toBe(0);
    });

    it("Loop is started at position 0", () => {
      applyCommands([]);
      const lastLoopStub = MockLoop.mock.results[MockLoop.mock.results.length - 1]?.value as
        | { start: ReturnType<typeof vi.fn> }
        | undefined;
      expect(lastLoopStub?.start).toHaveBeenCalledWith(0);
    });

    it("does not create a second beat tracker when _beatTracker is already set", () => {
      // First applyCommands creates the tracker
      applyCommands([]);
      const callsAfterFirst = MockLoop.mock.calls.length;

      // Simulate that transport now has a beat tracker (mimicking how loop-engine persists it)
      // The tracker is stored on the transport object via _beatTracker
      // We simulate this by checking that a second applyCommands does NOT create a new Loop
      // Only works if transport._beatTracker is truthy — set it to mimic the real behavior
      mockTransport._beatTracker = MockLoop.mock.results[0]?.value;

      applyCommands([]);
      // No new Loop calls — still the same count
      expect(MockLoop.mock.calls.length).toBe(callsAfterFirst);
    });
  });

  // -------------------------------------------------------------------------
  // setOnNote() callback
  // -------------------------------------------------------------------------
  describe("setOnNote()", () => {
    it("is invoked with the note string when a voice note fires", () => {
      const onNote = vi.fn();
      setOnNote(onNote);

      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("A4")] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: noteStep("A4"), index: 0 });

      expect(onNote).toHaveBeenCalledWith("A4");
    });

    it("is called with the note string for arp playback", () => {
      const onNote = vi.fn();
      setOnNote(onNote);

      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("D5")] },
      ]);
      const cb = lastPatternCallback();
      cb(0.1, { note: "D5", velocity: 100 });

      expect(onNote).toHaveBeenCalledWith("D5");
    });

    it("is NOT called for rest steps", () => {
      const onNote = vi.fn();
      setOnNote(onNote);

      applyCommands([{ type: "synth", waveform: "saw", pattern: [restStep()] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: restStep(), index: 0 });

      expect(onNote).not.toHaveBeenCalled();
    });

    it("is NOT called for tie steps", () => {
      const onNote = vi.fn();
      setOnNote(onNote);

      applyCommands([{ type: "synth", waveform: "saw", pattern: [tieStep()] }]);
      const cb = lastSequenceCallback();
      cb(0, { step: tieStep(), index: 0 });

      expect(onNote).not.toHaveBeenCalled();
    });

    it("is called with chord notes joined by '+'", () => {
      const onNote = vi.fn();
      setOnNote(onNote);

      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([
        { type: "synth", waveform: "saw", pattern: [chordStep(["C4", "E4", "G4"])] },
      ]);
      const cb = lastSequenceCallback();
      cb(0, { step: chordStep(["C4", "E4", "G4"]), index: 0 });

      expect(onNote).toHaveBeenCalledWith("C4+E4+G4");
    });
  });

  // -------------------------------------------------------------------------
  // env command routing
  // -------------------------------------------------------------------------
  describe("env command routing", () => {
    it("calls setVoiceEnvelope with target and params", () => {
      applyCommands([
        { type: "env", target: "synth1", params: { attack: 0.01, release: 1.0 } },
      ]);
      expect(mockSetVoiceEnvelope).toHaveBeenCalledWith("synth1", { attack: 0.01, release: 1.0 });
    });

    it("calls setVoiceEnvelope for every env command in the list", () => {
      applyCommands([
        { type: "env", target: "synth1", params: { attack: 0.01 } },
        { type: "env", target: "bass1", params: { decay: 0.5 } },
      ]);
      expect(mockSetVoiceEnvelope).toHaveBeenCalledTimes(2);
      expect(mockSetVoiceEnvelope).toHaveBeenCalledWith("synth1", { attack: 0.01 });
      expect(mockSetVoiceEnvelope).toHaveBeenCalledWith("bass1", { decay: 0.5 });
    });

    it("passes all four ADSR params correctly", () => {
      const params = { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.0 };
      applyCommands([{ type: "env", target: "lead1", params }]);
      expect(mockSetVoiceEnvelope).toHaveBeenCalledWith("lead1", params);
    });
  });

  // -------------------------------------------------------------------------
  // filter command routing
  // -------------------------------------------------------------------------
  describe("filter command routing", () => {
    it("calls setVoiceFilter with the correct arguments for lowpass", () => {
      applyCommands([
        { type: "filter", target: "synth1", filterType: "lowpass", frequency: 800, Q: 2 },
      ]);
      expect(mockSetVoiceFilter).toHaveBeenCalledWith("synth1", "lowpass", 800, 2);
    });

    it("calls setVoiceFilter for every filter command", () => {
      applyCommands([
        { type: "filter", target: "synth1", filterType: "lowpass", frequency: 800, Q: 1 },
        { type: "filter", target: "bass1", filterType: "highpass", frequency: 200, Q: 4 },
      ]);
      expect(mockSetVoiceFilter).toHaveBeenCalledTimes(2);
    });

    it("routes highpass filter correctly", () => {
      applyCommands([
        { type: "filter", target: "lead1", filterType: "highpass", frequency: 2000, Q: 4 },
      ]);
      expect(mockSetVoiceFilter).toHaveBeenCalledWith("lead1", "highpass", 2000, 4);
    });

    it("routes bandpass filter correctly", () => {
      applyCommands([
        { type: "filter", target: "pad1", filterType: "bandpass", frequency: 1000, Q: 2 },
      ]);
      expect(mockSetVoiceFilter).toHaveBeenCalledWith("pad1", "bandpass", 1000, 2);
    });
  });

  // -------------------------------------------------------------------------
  // Effects integration
  // -------------------------------------------------------------------------
  describe("effects integration", () => {
    it("calls disposeAllTrackEffects on each applyCommands invocation", () => {
      applyCommands([]);
      expect(mockDisposeAllTrackEffects).toHaveBeenCalledTimes(1);
    });

    it("calls applyEffects with the full command list", () => {
      const cmds: Command[] = [{ type: "bpm", value: 120 }];
      applyCommands(cmds);
      expect(mockApplyEffects).toHaveBeenCalledWith(cmds);
    });

    it("calls applyTrackEffects for each scheduled voice id", () => {
      applyCommands([
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
        { type: "bass", waveform: "sine", pattern: [noteStep("C2")] },
      ]);
      expect(mockApplyTrackEffects).toHaveBeenCalledWith("synth1", expect.any(Array));
      expect(mockApplyTrackEffects).toHaveBeenCalledWith("bass1", expect.any(Array));
    });

    it("does not call applyTrackEffects when there are no voice commands", () => {
      applyCommands([{ type: "bpm", value: 120 }]);
      expect(mockApplyTrackEffects).not.toHaveBeenCalled();
    });

    it("also calls applyTrackEffects for arp voices", () => {
      applyCommands([
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("C4")] },
      ]);
      expect(mockApplyTrackEffects).toHaveBeenCalledWith("arp1", expect.any(Array));
    });
  });

  // -------------------------------------------------------------------------
  // getBpm() / setBpm()
  // -------------------------------------------------------------------------
  describe("getBpm() / setBpm()", () => {
    it("getBpm() returns the current transport bpm value", () => {
      mockTransport.bpm.value = 130;
      expect(getBpm()).toBe(130);
    });

    it("setBpm() updates the transport bpm value", () => {
      setBpm(175);
      expect(mockTransport.bpm.value).toBe(175);
    });
  });

  // -------------------------------------------------------------------------
  // dispose()
  // -------------------------------------------------------------------------
  describe("dispose()", () => {
    it("calls disposeAll() to release synth pool resources", () => {
      dispose();
      expect(mockDisposeAll).toHaveBeenCalled();
    });

    it("resets isPlaying to false", async () => {
      await start();
      dispose();
      expect(getIsPlaying()).toBe(false);
    });

    it("calls transport.stop()", () => {
      vi.clearAllMocks();
      dispose();
      expect(mockTransport.stop).toHaveBeenCalled();
    });

    it("disposes any scheduled sequences", () => {
      const disposeSeq = vi.fn();
      MockSequence.mockImplementationOnce(() => ({ loop: false, start: vi.fn(), dispose: disposeSeq }));
      applyCommands([{ type: "synth", waveform: "saw", pattern: [noteStep("C4")] }]);
      dispose();
      expect(disposeSeq).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // applyCommands — edge / mixed cases
  // -------------------------------------------------------------------------
  describe("applyCommands() — edge cases", () => {
    it("handles an empty command array without throwing", () => {
      expect(() => applyCommands([])).not.toThrow();
    });

    it("applies scale quantization to chord notes in the callback", () => {
      const synth = { triggerAttackRelease: vi.fn(), triggerAttack: vi.fn() };
      mockGetVoiceSynth.mockReturnValueOnce({ synth, channel: {} });

      applyCommands([
        { type: "scale", mode: "major", root: "G4" },
        { type: "synth", waveform: "saw", pattern: [chordStep(["C4", "E4", "G4"])] },
      ]);
      const cb = lastSequenceCallback();
      cb(0, { step: chordStep(["C4", "E4", "G4"]), index: 0 });

      expect(mockQuantizeToScale).toHaveBeenCalledWith("C4", "G4", "major");
      expect(mockQuantizeToScale).toHaveBeenCalledWith("E4", "G4", "major");
      expect(mockQuantizeToScale).toHaveBeenCalledWith("G4", "G4", "major");
    });

    it("multiple voice types do not share id counters", () => {
      applyCommands([
        { type: "synth", waveform: "saw", pattern: [noteStep("C4")] },
        { type: "bass", waveform: "sine", pattern: [noteStep("C2")] },
        { type: "pad", waveform: "fat", pattern: [noteStep("G3")] },
        { type: "arp", mode: "up", rate: "16n", waveform: "triangle", pattern: [noteStep("C4")] },
      ]);
      // Each role starts at 1
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("synth1", -10);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("bass1", -8);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("pad1", -12);
      expect(mockSetVoiceVolume).toHaveBeenCalledWith("arp1", -9);
    });

    it("processes bpm, scale, swing, oct all in a single command set", () => {
      expect(() =>
        applyCommands([
          { type: "bpm", value: 120 },
          { type: "scale", mode: "dorian", root: "D4" },
          { type: "swing", value: 0.3 },
          { type: "oct", value: 1 },
        ]),
      ).not.toThrow();
      expect(mockTransport.bpm.value).toBe(120);
      expect(mockTransport.swing).toBe(0.3);
    });
  });
});
