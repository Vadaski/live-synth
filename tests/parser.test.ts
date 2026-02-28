import { describe, expect, it } from "vitest";
import { parse } from "../src/audio/parser.js";

describe("parse", () => {
  describe("bpm", () => {
    it("parses valid bpm", () => {
      const r = parse("bpm 120");
      expect(r.commands).toEqual([{ type: "bpm", value: 120 }]);
      expect(r.errors).toEqual([]);
    });
    it("accepts boundary values 20 and 300", () => {
      expect(parse("bpm 20").commands[0]).toEqual({ type: "bpm", value: 20 });
      expect(parse("bpm 300").commands[0]).toEqual({ type: "bpm", value: 300 });
    });
    it("rejects out-of-range and invalid values", () => {
      expect(parse("bpm 999").errors).toHaveLength(1);
      expect(parse("bpm abc").errors).toHaveLength(1);
      expect(parse("bpm").errors).toHaveLength(1);
    });
  });

  describe("scale", () => {
    it("parses valid scale", () => {
      const r = parse("scale minor C4");
      expect(r.commands).toEqual([{ type: "scale", mode: "minor", root: "C4" }]);
    });
    it("accepts all SCALE_NAMES", () => {
      for (const name of ["major", "pentatonic", "blues", "dorian", "chromatic", "japanese"]) {
        expect(parse(`scale ${name} A3`).commands).toHaveLength(1);
      }
    });
    it("rejects unknown scale or invalid root", () => {
      expect(parse("scale unknown C4").errors[0].message).toContain("Unknown scale");
      expect(parse("scale minor XYZ").errors[0].message).toContain("Invalid root");
    });
  });

  describe("voice commands", () => {
    it("parses synth with waveform", () => {
      const r = parse("synth saw C4 . E4 .");
      expect(r.commands).toHaveLength(1);
      const cmd = r.commands[0] as { type: string; waveform: string; pattern: unknown[] };
      expect(cmd.type).toBe("synth");
      expect(cmd.waveform).toBe("saw");
      expect(cmd.pattern).toHaveLength(4);
    });
    it("defaults synth waveform to saw", () => {
      const cmd = parse("synth C4 . E4 .").commands[0] as { waveform: string };
      expect(cmd.waveform).toBe("saw");
    });
    it("defaults pad waveform to fat", () => {
      const cmd = parse("pad C4 .").commands[0] as { waveform: string };
      expect(cmd.waveform).toBe("fat");
    });
    it("parses multi-line pattern", () => {
      const r = parse("synth saw\n  C4 . E4 .");
      expect(r.commands).toHaveLength(1);
      expect(r.errors).toEqual([]);
    });
    it("errors on missing pattern (last line)", () => {
      const r = parse("synth saw");
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0].message).toContain("Missing pattern");
    });
    it("accepts all waveforms", () => {
      for (const w of ["saw", "square", "triangle", "sine", "fm", "am", "fat", "pwm", "pulse"]) {
        expect(parse(`synth ${w} C4 .`).commands).toHaveLength(1);
      }
    });
  });

  describe("pattern parsing", () => {
    it("parses notes with accidentals and negative octave", () => {
      const r = parse("synth saw A#3 Gb-1");
      expect(r.commands).toHaveLength(1);
    });
    it("parses chords", () => {
      const r = parse("synth saw [C4 E4 G4]");
      const pat = (r.commands[0] as { pattern: Array<{ kind: string; notes: string[] }> }).pattern;
      expect(pat[0].kind).toBe("chord");
      expect(pat[0].notes).toEqual(["C4", "E4", "G4"]);
    });
    it("parses rests and ties", () => {
      const r = parse("synth saw C4 . ~ .");
      const kinds = (r.commands[0] as { pattern: Array<{ kind: string }> }).pattern.map(
        (s) => s.kind,
      );
      expect(kinds).toEqual(["note", "rest", "tie", "rest"]);
    });
    it("parses velocity", () => {
      const r = parse("synth saw C4:80");
      const pat = (r.commands[0] as { pattern: Array<{ velocity: number }> }).pattern;
      expect(pat[0].velocity).toBe(80);
    });
    it("parses repeats", () => {
      const r = parse("synth saw C4*4 .*3");
      const pat = (r.commands[0] as { pattern: unknown[] }).pattern;
      expect(pat).toHaveLength(7);
    });
  });

  describe("arp", () => {
    it("parses valid arp", () => {
      const r = parse("arp up 16n C4 E4 G4");
      const cmd = r.commands[0] as { type: string; mode: string; rate: string; pattern: unknown[] };
      expect(cmd).toMatchObject({ type: "arp", mode: "up", rate: "16n" });
      expect(cmd.pattern).toHaveLength(3);
    });
    it("parses arp with waveform", () => {
      const cmd = parse("arp down 8n square C4 E4").commands[0] as { waveform: string };
      expect(cmd.waveform).toBe("square");
    });
    it("rejects invalid mode", () => {
      expect(parse("arp sideways 16n C4").errors[0].message).toContain("Invalid arp mode");
    });
  });

  describe("drum", () => {
    it("parses direct drum (kick)", () => {
      const r = parse("kick x . x . x . x .");
      expect(r.commands[0]).toEqual({
        type: "drum",
        name: "kick",
        pattern: ["x", ".", "x", ".", "x", ".", "x", "."],
      });
    });
    it("parses named drum", () => {
      const r = parse("drum snare x . . x");
      expect(r.commands[0]).toEqual({ type: "drum", name: "snare", pattern: ["x", ".", ".", "x"] });
    });
    it("accepts all drum names", () => {
      for (const d of ["kick", "snare", "hat", "clap", "tom", "rim", "shaker", "crash"]) {
        expect(parse(`${d} x .`).commands).toHaveLength(1);
      }
    });
    it("rejects invalid drum step", () => {
      expect(parse("kick x . a .").errors).toHaveLength(1);
    });
  });

  describe("fx", () => {
    it("parses fx with param", () => {
      const r = parse("fx reverb 0.5");
      expect(r.commands[0]).toMatchObject({ type: "fx", name: "reverb", params: [0.5] });
    });
    it("parses fx with key=value options", () => {
      const cmd = parse("fx delay 0.3 time=0.25 feedback=0.5").commands[0] as {
        options: Record<string, unknown>;
      };
      expect(cmd.options).toEqual({ time: 0.25, feedback: 0.5 });
    });
    it("parses boolean options", () => {
      const cmd = parse("fx distortion 0.5 wet=true").commands[0] as {
        options: Record<string, unknown>;
      };
      expect(cmd.options?.wet).toBe(true);
    });
    it("rejects unknown effect", () => {
      expect(parse("fx warp 0.5").errors[0].message).toContain("Unknown effect");
    });
  });

  describe("vol", () => {
    it("parses valid vol", () => {
      expect(parse("vol synth -10").commands[0]).toEqual({
        type: "vol",
        voice: "synth",
        value: -10,
      });
    });
    it("errors on missing args", () => {
      expect(parse("vol").errors).toHaveLength(1);
    });
  });

  describe("swing", () => {
    it("parses valid swing", () => {
      expect(parse("swing 0.5").commands[0]).toEqual({ type: "swing", value: 0.5 });
    });
    it("rejects out-of-range values", () => {
      expect(parse("swing 1.5").errors).toHaveLength(1);
      expect(parse("swing -0.1").errors).toHaveLength(1);
    });
  });

  describe("oct", () => {
    it("parses valid oct", () => {
      expect(parse("oct 2").commands[0]).toEqual({ type: "oct", value: 2 });
    });
    it("accepts boundary values", () => {
      expect(parse("oct -4").commands).toHaveLength(1);
      expect(parse("oct 4").commands).toHaveLength(1);
    });
    it("rejects out-of-range and non-integer", () => {
      expect(parse("oct 5").errors).toHaveLength(1);
      expect(parse("oct 1.5").errors).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("returns empty for empty input", () => {
      expect(parse("")).toEqual({ commands: [], errors: [] });
    });
    it("ignores comment lines", () => {
      expect(parse("// comment\nbpm 120").commands).toHaveLength(1);
    });
    it("collects commands and errors together", () => {
      const r = parse("bpm 120\nbpm 999");
      expect(r.commands).toHaveLength(1);
      expect(r.errors).toHaveLength(1);
    });
    it("errors on unknown command", () => {
      expect(parse("foobar 123").errors[0].message).toContain("Unknown command");
    });
  });
});
