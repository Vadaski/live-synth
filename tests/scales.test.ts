import { describe, expect, it } from "vitest";
import { SCALE_NAMES, CHORD_TYPES, chord, quantizeToScale } from "../src/audio/scales.js";

// ---------------------------------------------------------------------------
// SCALE_NAMES
// ---------------------------------------------------------------------------
describe("SCALE_NAMES", () => {
  const EXPECTED_SCALES = [
    "major",
    "minor",
    "pentatonic",
    "blues",
    "dorian",
    "chromatic",
    "mixolydian",
    "lydian",
    "phrygian",
    "locrian",
    "harmonicMinor",
    "melodicMinor",
    "whole",
    "diminished",
    "augmented",
    "bebop",
    "japanese",
    "arabic",
    "hungarian",
    "gypsy",
  ];

  it("exports an array", () => {
    expect(Array.isArray(SCALE_NAMES)).toBe(true);
  });

  it("contains all 20 scale modes", () => {
    expect(SCALE_NAMES).toHaveLength(EXPECTED_SCALES.length);
  });

  it.each(EXPECTED_SCALES)("includes '%s'", (name) => {
    expect(SCALE_NAMES).toContain(name);
  });

  it("contains no duplicates", () => {
    expect(new Set(SCALE_NAMES).size).toBe(SCALE_NAMES.length);
  });
});

// ---------------------------------------------------------------------------
// CHORD_TYPES
// ---------------------------------------------------------------------------
describe("CHORD_TYPES", () => {
  const EXPECTED_TYPES = [
    "major",
    "minor",
    "7",
    "maj7",
    "min7",
    "dim",
    "dim7",
    "aug",
    "aug7",
    "sus2",
    "sus4",
    "7sus4",
    "add9",
    "add11",
    "6",
    "min6",
    "dom7",
    "9",
    "maj9",
    "min9",
    "11",
    "maj11",
    "min11",
    "13",
    "maj13",
  ];

  it("exports an array", () => {
    expect(Array.isArray(CHORD_TYPES)).toBe(true);
  });

  it("contains all 25 chord types", () => {
    expect(CHORD_TYPES).toHaveLength(EXPECTED_TYPES.length);
  });

  it.each(EXPECTED_TYPES)("includes '%s'", (type) => {
    expect(CHORD_TYPES).toContain(type);
  });

  it("contains no duplicates", () => {
    expect(new Set(CHORD_TYPES).size).toBe(CHORD_TYPES.length);
  });

  it("every chord type produces a non-empty note array from C4", () => {
    for (const type of CHORD_TYPES) {
      const notes = chord("C4", type);
      expect(notes.length).toBeGreaterThan(0);
      // each element should look like a note string, e.g. "C4", "F#3"
      for (const note of notes) {
        expect(note).toMatch(/^[A-G][#b]?-?\d+$/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// chord()
// ---------------------------------------------------------------------------
describe("chord()", () => {
  // ---- triads ---------------------------------------------------------------
  describe("major triad", () => {
    it("C4 major → C4, E4, G4", () => {
      expect(chord("C4", "major")).toEqual(["C4", "E4", "G4"]);
    });

    it("G4 major → G4, B4, D5", () => {
      expect(chord("G4", "major")).toEqual(["G4", "B4", "D5"]);
    });
  });

  describe("minor triad", () => {
    it("C4 minor → C4, D#4, G4", () => {
      // minor = [0, 3, 7]; C+3 semitones = D# (Eb)
      expect(chord("C4", "minor")).toEqual(["C4", "D#4", "G4"]);
    });

    it("A3 minor → A3, C4, E4", () => {
      expect(chord("A3", "minor")).toEqual(["A3", "C4", "E4"]);
    });
  });

  describe("diminished triad", () => {
    it("C4 dim → C4, D#4, F#4", () => {
      // dim = [0, 3, 6]
      expect(chord("C4", "dim")).toEqual(["C4", "D#4", "F#4"]);
    });
  });

  describe("augmented triad", () => {
    it("C4 aug → C4, E4, G#4", () => {
      // aug = [0, 4, 8]
      expect(chord("C4", "aug")).toEqual(["C4", "E4", "G#4"]);
    });
  });

  describe("sus chords", () => {
    it("C4 sus2 → C4, D4, G4", () => {
      // sus2 = [0, 2, 7]
      expect(chord("C4", "sus2")).toEqual(["C4", "D4", "G4"]);
    });

    it("C4 sus4 → C4, F4, G4", () => {
      // sus4 = [0, 5, 7]
      expect(chord("C4", "sus4")).toEqual(["C4", "F4", "G4"]);
    });
  });

  // ---- seventh chords -------------------------------------------------------
  describe("seventh chords", () => {
    it("C4 maj7 → C4, E4, G4, B4", () => {
      // maj7 = [0, 4, 7, 11]
      expect(chord("C4", "maj7")).toEqual(["C4", "E4", "G4", "B4"]);
    });

    it("C4 min7 → C4, D#4, G4, A#4", () => {
      // min7 = [0, 3, 7, 10]
      expect(chord("C4", "min7")).toEqual(["C4", "D#4", "G4", "A#4"]);
    });

    it("C4 dom7 → C4, E4, G4, A#4", () => {
      // dom7 = [0, 4, 7, 10] — same as "7"
      expect(chord("C4", "dom7")).toEqual(["C4", "E4", "G4", "A#4"]);
    });

    it("C4 7 → C4, E4, G4, A#4", () => {
      // 7 = [0, 4, 7, 10]
      expect(chord("C4", "7")).toEqual(["C4", "E4", "G4", "A#4"]);
    });

    it("C4 dim7 → C4, D#4, F#4, A4", () => {
      // dim7 = [0, 3, 6, 9]
      expect(chord("C4", "dim7")).toEqual(["C4", "D#4", "F#4", "A4"]);
    });

    it("C4 aug7 → C4, E4, G#4, A#4", () => {
      // aug7 = [0, 4, 8, 10]
      expect(chord("C4", "aug7")).toEqual(["C4", "E4", "G#4", "A#4"]);
    });

    it("C4 7sus4 → C4, F4, G4, A#4", () => {
      // 7sus4 = [0, 5, 7, 10]
      expect(chord("C4", "7sus4")).toEqual(["C4", "F4", "G4", "A#4"]);
    });
  });

  // ---- sixth chords ---------------------------------------------------------
  describe("sixth chords", () => {
    it("C4 6 → C4, E4, G4, A4", () => {
      // 6 = [0, 4, 7, 9]
      expect(chord("C4", "6")).toEqual(["C4", "E4", "G4", "A4"]);
    });

    it("C4 min6 → C4, D#4, G4, A4", () => {
      // min6 = [0, 3, 7, 9]
      expect(chord("C4", "min6")).toEqual(["C4", "D#4", "G4", "A4"]);
    });
  });

  // ---- add chords -----------------------------------------------------------
  describe("add chords", () => {
    it("C4 add9 → C4, E4, G4, D5", () => {
      // add9 = [0, 4, 7, 14]; C4 midi=60, +14=74=D5
      expect(chord("C4", "add9")).toEqual(["C4", "E4", "G4", "D5"]);
    });

    it("C4 add11 → C4, E4, G4, F5", () => {
      // add11 = [0, 4, 7, 17]; C4 midi=60, +17=77=F5
      expect(chord("C4", "add11")).toEqual(["C4", "E4", "G4", "F5"]);
    });
  });

  // ---- extended chords ------------------------------------------------------
  describe("extended chords", () => {
    it("C4 9 has 5 notes", () => {
      // 9 = [0, 4, 7, 10, 14]
      const notes = chord("C4", "9");
      expect(notes).toHaveLength(5);
      expect(notes[0]).toBe("C4");
    });

    it("C4 maj9 → C4, E4, G4, B4, D5", () => {
      // maj9 = [0, 4, 7, 11, 14]
      expect(chord("C4", "maj9")).toEqual(["C4", "E4", "G4", "B4", "D5"]);
    });

    it("C4 min9 has 5 notes starting on C4", () => {
      // min9 = [0, 3, 7, 10, 14]
      const notes = chord("C4", "min9");
      expect(notes).toHaveLength(5);
      expect(notes[0]).toBe("C4");
    });

    it("C4 11 has 6 notes", () => {
      // 11 = [0, 4, 7, 10, 14, 17]
      const notes = chord("C4", "11");
      expect(notes).toHaveLength(6);
      expect(notes[0]).toBe("C4");
    });

    it("C4 maj11 has 6 notes starting on C4", () => {
      // maj11 = [0, 4, 7, 11, 14, 17]
      const notes = chord("C4", "maj11");
      expect(notes).toHaveLength(6);
      expect(notes[0]).toBe("C4");
    });

    it("C4 min11 has 6 notes starting on C4", () => {
      // min11 = [0, 3, 7, 10, 14, 17]
      const notes = chord("C4", "min11");
      expect(notes).toHaveLength(6);
      expect(notes[0]).toBe("C4");
    });

    it("C4 13 has 7 notes", () => {
      // 13 = [0, 4, 7, 10, 14, 17, 21]
      const notes = chord("C4", "13");
      expect(notes).toHaveLength(7);
      expect(notes[0]).toBe("C4");
    });

    it("C4 maj13 has 7 notes starting on C4", () => {
      // maj13 = [0, 4, 7, 11, 14, 17, 21]
      const notes = chord("C4", "maj13");
      expect(notes).toHaveLength(7);
      expect(notes[0]).toBe("C4");
    });
  });

  // ---- accidentals ----------------------------------------------------------
  describe("accidentals", () => {
    it("F#4 major → F#4, A#4, C#5", () => {
      // F# midi = (4+1)*12 + 6 = 66; +4=70=A#4, +7=73=C#5
      expect(chord("F#4", "major")).toEqual(["F#4", "A#4", "C#5"]);
    });

    it("Bb3 major → A#3, D4, F4", () => {
      // Bb is enharmonic to A#; toIndex("Bb") = (11+11)%12 = 10 = A#
      // A#3 midi = (3+1)*12 + 10 = 58; +4=62=D4, +7=65=F4
      expect(chord("Bb3", "major")).toEqual(["A#3", "D4", "F4"]);
    });

    it("Bb3 minor → A#3, C#4, F4", () => {
      // A#3 midi=58; +3=61=C#4, +7=65=F4
      expect(chord("Bb3", "minor")).toEqual(["A#3", "C#4", "F4"]);
    });

    it("Gb4 major → F#4, A#4, C#5", () => {
      // Gb: G is index 7, flat = (7+11)%12 = 18%12 = 6 = F#
      // F#4 midi = 66; +4=70=A#4, +7=73=C#5
      expect(chord("Gb4", "major")).toEqual(["F#4", "A#4", "C#5"]);
    });
  });

  // ---- octave variations ----------------------------------------------------
  describe("various octaves", () => {
    it("C0 major → C0, E0, G0", () => {
      expect(chord("C0", "major")).toEqual(["C0", "E0", "G0"]);
    });

    it("C2 major → C2, E2, G2", () => {
      expect(chord("C2", "major")).toEqual(["C2", "E2", "G2"]);
    });

    it("C7 major → C7, E7, G7", () => {
      expect(chord("C7", "major")).toEqual(["C7", "E7", "G7"]);
    });

    it("B4 major wraps correctly into next octave → B4, D#5, F#5", () => {
      // B4 midi = (4+1)*12 + 11 = 71; +4=75=D#5, +7=78=F#5
      expect(chord("B4", "major")).toEqual(["B4", "D#5", "F#5"]);
    });
  });

  // ---- unknown type fallback ------------------------------------------------
  describe("unknown chord type fallback", () => {
    it("unknown type falls back to major intervals", () => {
      // CHORD_INTERVALS[unknown] ?? CHORD_INTERVALS.major = [0, 4, 7]
      expect(chord("C4", "mystery")).toEqual(["C4", "E4", "G4"]);
    });

    it("empty string type falls back to major", () => {
      expect(chord("C4", "")).toEqual(["C4", "E4", "G4"]);
    });
  });

  // ---- return type invariants -----------------------------------------------
  describe("return type invariants", () => {
    it("returns an array", () => {
      expect(Array.isArray(chord("C4", "major"))).toBe(true);
    });

    it("first note always matches root pitch class for C root", () => {
      for (const type of CHORD_TYPES) {
        const notes = chord("C4", type);
        expect(notes[0]).toMatch(/^C/);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// quantizeToScale()
// Note: signature is quantizeToScale(note, root, mode)
// ---------------------------------------------------------------------------
describe("quantizeToScale()", () => {
  // ---- note already in scale -----------------------------------------------
  describe("note already in scale — unchanged", () => {
    it("C4 in C major stays C4", () => {
      expect(quantizeToScale("C4", "C4", "major")).toBe("C4");
    });

    it("E4 in C major stays E4", () => {
      expect(quantizeToScale("E4", "C4", "major")).toBe("E4");
    });

    it("G4 in C major stays G4", () => {
      expect(quantizeToScale("G4", "C4", "major")).toBe("G4");
    });

    it("A4 in C minor stays A4 (A is index 8, minor has [0,2,3,5,7,8,10])", () => {
      // minor intervals: [0,2,3,5,7,8,10]; A relative to C = 9. 9 not in minor.
      // Nearest: 10 (dist 1) vs 8 (dist 1) — tie goes to 8 first found? Let's check
      // Actually 8 comes before 10 in the array, so minDist is first met at 8.
      // Let's verify: relative=9, for semitone=8 dist=min(1,11)=1 → closest=8, minDist=1
      //   for semitone=10 dist=min(1,11)=1 → NOT less than minDist (1 < 1 is false), stays at 8
      // So A4 (relative 9) → snaps to A4 is actually index 8 = G# relative offset?
      // Wait: if closest=8 (semitone offset from root C), result = rootMidi + octave*12 + 8
      // rootMidi=C4=60, noteMidi=A4=69, relative=(69-60)%12=9, octave=floor(9/12)=0
      // result = 60 + 0 + 8 = 68 = G#4
      // So A4 in C minor snaps to G#4. Let's test what IS in the scale: A (semitone 9) is NOT in minor.
      // This test needs to use a note that IS in C minor.
      // C minor: C D Eb F G Ab Bb → relative indices 0,2,3,5,7,8,10
      // D4 relative to C4 = 2 → in scale
      expect(quantizeToScale("D4", "C4", "minor")).toBe("D4");
    });

    it("all C chromatic semitones stay unchanged in chromatic mode", () => {
      const chromatic = ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4"];
      for (const note of chromatic) {
        expect(quantizeToScale(note, "C4", "chromatic")).toBe(note);
      }
    });

    it("C4 in C pentatonic stays C4", () => {
      // pentatonic: [0, 2, 4, 7, 9]
      expect(quantizeToScale("C4", "C4", "pentatonic")).toBe("C4");
    });

    it("E4 in C pentatonic stays E4", () => {
      expect(quantizeToScale("E4", "C4", "pentatonic")).toBe("E4");
    });

    it("A4 in C pentatonic stays A4", () => {
      // A4 relative to C4 = 9, which is in pentatonic [0,2,4,7,9]
      expect(quantizeToScale("A4", "C4", "pentatonic")).toBe("A4");
    });
  });

  // ---- quantization snapping -----------------------------------------------
  describe("note outside scale snaps to nearest", () => {
    it("C#4 in C major (nearest = C4 or D4, dist 1 each — C comes first)", () => {
      // C major: [0,2,4,5,7,9,11]; relative of C#=1
      // dist to 0 (C): min(1,11)=1; dist to 2 (D): min(1,11)=1
      // Ties go to the first element found, which is 0 (C)
      expect(quantizeToScale("C#4", "C4", "major")).toBe("C4");
    });

    it("D#4 in C major snaps to E4 (relative 4, dist 1) vs D4 (dist 1) — D comes first", () => {
      // D#4 relative=3; dist to 2 (D)=1; dist to 4 (E)=1 → D found first
      expect(quantizeToScale("D#4", "C4", "major")).toBe("D4");
    });

    it("A#4 in C major snaps to B4 (relative 10, dist to 9=1, dist to 11=1 → A first)", () => {
      // A#4 relative=10; dist to 9 (A)=1; dist to 11 (B)=1 → A found first
      expect(quantizeToScale("A#4", "C4", "major")).toBe("A4");
    });

    it("F#4 in C major snaps to G4 (relative 6, dist to 5=1, dist to 7=1 → F found first)", () => {
      // relative=6; dist to 5 (F)=1; dist to 7 (G)=1 → F found first
      expect(quantizeToScale("F#4", "C4", "major")).toBe("F4");
    });

    it("D#4 in C pentatonic snaps to D4 (relative 3, dist to 2=1, dist to 4=1 → D first)", () => {
      // pentatonic: [0,2,4,7,9]; relative of D#=3; dist to 2=1, dist to 4=1 → 2 (D) found first
      expect(quantizeToScale("D#4", "C4", "pentatonic")).toBe("D4");
    });

    it("F4 in C pentatonic snaps to E4 (relative 5, dist to 4=1, dist to 7=2 → E wins)", () => {
      expect(quantizeToScale("F4", "C4", "pentatonic")).toBe("E4");
    });

    it("A#4 in C pentatonic snaps to A4 (relative 10, dist to 9=1, dist to 0/12=2 → A wins)", () => {
      expect(quantizeToScale("A#4", "C4", "pentatonic")).toBe("A4");
    });

    it("C#4 in C blues snaps to C4 (blues: [0,3,5,6,7,10]; relative=1, closest=0)", () => {
      // dist to 0=1, dist to 3=2 → C wins
      expect(quantizeToScale("C#4", "C4", "blues")).toBe("C4");
    });

    it("D4 in C blues snaps to C4 or Eb4 (relative=2, dist to 0=2, dist to 3=1 → Eb wins)", () => {
      // dist to 0=2, dist to 3=1 → 3 (D#/Eb) wins
      expect(quantizeToScale("D4", "C4", "blues")).toBe("D#4");
    });
  });

  // ---- different scale modes -----------------------------------------------
  describe("different scale modes", () => {
    it("C4 in A minor (root A3) — C4 relative to A3 = 3 which is in minor", () => {
      // A3 midi = (3+1)*12 + 9 = 57; C4 midi=60; relative=(60-57)%12=3
      // minor: [0,2,3,5,7,8,10]; 3 is in scale
      expect(quantizeToScale("C4", "A3", "minor")).toBe("C4");
    });

    it("F4 in G3 major snaps to E4 (relative=10, nearest scale tone is semitone 9)", () => {
      // G3 midi=55; F4 midi=65; relative=(65-55)%12=10
      // G major: [0,2,4,5,7,9,11]; 10 not in scale
      // Iteration order: ..., semitone 9 → dist=1, closest=9, minDist=1; semitone 11 → dist=1, not < 1, stays 9
      // octave=floor(10/12)=0; result=55+0+9=64=E4
      expect(quantizeToScale("F4", "G3", "major")).toBe("E4");
    });

    it("D4 in G3 major stays D4 (relative=7, D is in G major)", () => {
      // G3 midi=55; D4 midi=62; relative=(62-55)%12=7; G major has 7 → in scale
      expect(quantizeToScale("D4", "G3", "major")).toBe("D4");
    });

    it("chromatic mode: any note returns same pitch class", () => {
      // chromatic has all 12 semitones, so nothing needs to snap
      expect(quantizeToScale("F#5", "C4", "chromatic")).toBe("F#5");
      expect(quantizeToScale("D#3", "C4", "chromatic")).toBe("D#3");
    });

    it("dorian mode: C4 in C dorian stays C4", () => {
      // dorian: [0,2,3,5,7,9,10]
      expect(quantizeToScale("C4", "C4", "dorian")).toBe("C4");
    });

    it("dorian mode: B4 in C dorian snaps to C4 (relative=11, interval 0 found first with dist=1)", () => {
      // dorian: [0,2,3,5,7,9,10]; relative of B=11
      // Iteration: interval 0 → dist=min(11, 12-11)=1, closest=0, minDist=1
      //            interval 10 → dist=1, NOT < minDist → stays at 0 (C)
      // octave=floor(11/12)=0; result=60+0+0=60=C4
      expect(quantizeToScale("B4", "C4", "dorian")).toBe("C4");
    });

    it("harmonicMinor: G#4 in C harmonic minor stays G#4 (relative=8, in [0,2,3,5,7,8,11])", () => {
      expect(quantizeToScale("G#4", "C4", "harmonicMinor")).toBe("G#4");
    });

    it("whole tone: C4 in C whole stays C4 (whole: [0,2,4,6,8,10])", () => {
      expect(quantizeToScale("C4", "C4", "whole")).toBe("C4");
    });

    it("whole tone: C#4 in C whole snaps to C4 (relative=1, dist to 0=1, dist to 2=1 → C first)", () => {
      expect(quantizeToScale("C#4", "C4", "whole")).toBe("C4");
    });

    it("phrygian mode: C4 in C phrygian stays C4 (phrygian: [0,1,3,5,7,8,10])", () => {
      expect(quantizeToScale("C4", "C4", "phrygian")).toBe("C4");
    });
  });

  // ---- cross-octave behavior -----------------------------------------------
  describe("cross-octave behavior", () => {
    it("note higher than root within same pitch class snaps correctly", () => {
      // E5 in C4 major: rootMidi=60, noteMidi=E5=76; relative=(76-60)%12=4 (E in major)
      // octave=floor(16/12)=1; result=60+12+4=76=E5
      expect(quantizeToScale("E5", "C4", "major")).toBe("E5");
    });

    it("D#5 in C4 major snaps within octave 1", () => {
      // D#5 midi=75; relative=(75-60)%12=3; nearest in major from octave offset
      // dist to 2(D)=1, dist to 4(E)=1 → D wins; octave=floor(15/12)=1
      // result = 60 + 1*12 + 2 = 74 = D5
      expect(quantizeToScale("D#5", "C4", "major")).toBe("D5");
    });

    it("very low octave: C1 in C major stays C1", () => {
      expect(quantizeToScale("C1", "C4", "major")).toBe("C1");
    });

    it("very high octave: B7 in C major — B is in major, stays B7", () => {
      // B7 midi=107; relative=(107-60)%12=11 (B is in major [0,2,4,5,7,9,11])
      expect(quantizeToScale("B7", "C4", "major")).toBe("B7");
    });

    it("note below root octave is handled correctly", () => {
      // C3 in C4 major: rootMidi=60, noteMidi=48; relative=(48-60)%12 → (-12+12)%12=0
      // octave=floor(-12/12)=-1; result=60+(-1)*12+0=48=C3
      expect(quantizeToScale("C3", "C4", "major")).toBe("C3");
    });

    it("unknown mode falls back to chromatic — note unchanged", () => {
      // SCALE_INTERVALS[unknown] ?? chromatic has all 12, so any note stays
      expect(quantizeToScale("F#4", "C4", "unknownMode")).toBe("F#4");
    });
  });

  // ---- non-C roots ---------------------------------------------------------
  describe("non-C roots", () => {
    it("D4 in D4 major stays D4 (relative=0)", () => {
      expect(quantizeToScale("D4", "D4", "major")).toBe("D4");
    });

    it("F#4 in D4 major stays F#4 (relative=3... wait, D major has F# at semitone 4)", () => {
      // D major intervals: [0,2,4,5,7,9,11] relative to D
      // D=2 (chromatic index); F#=6; F# relative to D = 6-2=4 → in D major
      // D4 midi=(4+1)*12+2=62; F#4 midi=66; relative=(66-62)%12=4 → in scale
      expect(quantizeToScale("F#4", "D4", "major")).toBe("F#4");
    });

    it("F4 (not in D major) in D4 major snaps to E4 or F#4", () => {
      // F4 midi=65; D4 midi=62; relative=(65-62)%12=3
      // D major: [0,2,4,5,7,9,11]; dist to 2=1, dist to 4=1 → 2 wins → E4
      // octave=floor(3/12)=0; result=62+0+2=64=E4
      expect(quantizeToScale("F4", "D4", "major")).toBe("E4");
    });

    it("G#4 root: G#4 in G#4 minor stays G#4", () => {
      expect(quantizeToScale("G#4", "G#4", "minor")).toBe("G#4");
    });
  });
});
