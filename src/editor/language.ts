import { StreamLanguage } from "@codemirror/language";

export const DSL_KEYWORDS = ["bpm", "scale", "synth", "bass", "pad", "lead", "arp", "fx", "vol", "swing", "oct"] as const;
export const DSL_DRUMS = ["kick", "snare", "hat", "clap", "tom", "rim", "shaker", "crash"] as const;
export const DSL_WAVEFORMS = ["saw", "square", "triangle", "sine", "fm", "am", "fat", "pwm", "pulse"] as const;
export const DSL_SCALES = [
  "minor", "major", "pentatonic", "chromatic", "blues", "dorian", "mixolydian", "lydian", "phrygian", "locrian", "harmonicminor", "melodicminor",
] as const;
export const DSL_EFFECTS = [
  "reverb", "delay", "distortion", "chorus", "filter", "phaser", "tremolo", "bitcrusher", "pingpong", "compressor", "eq", "autowah", "pitchshift", "freeverb", "vibrato",
] as const;

export const DSL_HELP: Record<string, string> = {
  bpm: "Set tempo in beats per minute, e.g. bpm 128.",
  scale: "Choose tonal center and mode, e.g. scale minor C4.",
  synth: "Select synth voice and waveform for the next note pattern line.",
  bass: "Select bass voice and waveform for the next note pattern line.",
  pad: "Alias command for a sustained chord-style synth voice.",
  lead: "Alias command for lead-style melodic synth voice.",
  arp: "Alias command for arpeggiated pattern voice.",
  fx: "Apply an effect and optional numeric parameters.",
  vol: "Set volume level for a voice or bus.",
  swing: "Set groove swing amount.",
  oct: "Shift octave for subsequent note patterns.",
};

const KEYWORD_SET = new Set<string>(DSL_KEYWORDS);
const DRUM_SET = new Set<string>(DSL_DRUMS);
const WAVEFORM_SET = new Set<string>(DSL_WAVEFORMS);
const SCALE_SET = new Set<string>(DSL_SCALES);
const EFFECT_SET = new Set<string>(DSL_EFFECTS);

const NOTE_RE = /^[A-G](?:#|b)?[0-9]$/;
const NOTE_TOKEN_RE = /^[A-G](?:#|b)?[0-9](?=$|[\s\],~:*])/;
const HIT_RE = /^x(?=$|[\s\],~:*])/i;
const REST_RE = /^\.(?=$|[\s\],~:*])/;

function buildNotes(): string[] {
  const tones = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
  const notes: string[] = [];
  for (let oct = 0; oct <= 9; oct++) {
    for (const tone of tones) notes.push(`${tone}${oct}`);
  }
  return notes;
}

export const DSL_NOTES = buildNotes();
export const DSL_AUTOCOMPLETE = Array.from(
  new Set<string>([
    ...DSL_KEYWORDS,
    ...DSL_DRUMS,
    ...DSL_WAVEFORMS,
    ...DSL_SCALES,
    ...DSL_EFFECTS,
    ...DSL_NOTES,
    "x",
    ".",
    "~",
  ]),
);

export const synthDSL = StreamLanguage.define({
  token(stream) {
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.eatSpace()) return null;

    if (stream.match(/^\[/) || stream.match(/^\]/)) return "bracket";
    if (stream.match(/^~/)) return "operator";
    if (stream.match(/^:\d{1,3}/) || stream.match(/^\*\d+/) || stream.match(/^[+-]?\d+(?:\.\d+)?/)) return "number";
    if (stream.match(NOTE_TOKEN_RE)) return "string";
    if (stream.match(HIT_RE)) return "atom";
    if (stream.match(REST_RE)) return "punctuation";

    if (stream.match(/^[A-Za-z][A-Za-z0-9_-]*/)) {
      const raw = stream.current();
      const word = raw.toLowerCase();
      if (KEYWORD_SET.has(word) || DRUM_SET.has(word)) return "keyword";
      if (WAVEFORM_SET.has(word)) return "typeName";
      if (SCALE_SET.has(word)) return "className";
      if (EFFECT_SET.has(word)) return "function";
      if (NOTE_RE.test(raw)) return "string";
      return "variableName";
    }

    stream.next();
    return null;
  },
});
