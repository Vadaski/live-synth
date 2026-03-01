import { chord as buildChord } from "./scales.js";
import type { DrumStep, PatternStep } from "./types.js";

const NOTE_RE = /^[A-G][#b]?-?\d+$/;
const NAMED_CHORD_RE =
  /^([A-G][#b]?)(maj13|maj11|maj9|maj7|min11|min9|min7|min6|dom7|dim7|aug7|add11|add9|7sus4|sus2|sus4|major|minor|dim|aug)(?::(\d+))?$/;
const DEFAULT_VELOCITY = 100;

function parseRepeat(raw: string): { token: string; count: number } {
  const m = /^(.*)\*(\d+)$/.exec(raw);
  return m ? { token: m[1], count: Math.max(1, Number(m[2])) } : { token: raw, count: 1 };
}
function cloneStep(step: PatternStep, count: number): PatternStep[] {
  return Array.from({ length: count }, () => ({ ...step, notes: [...step.notes] }));
}
function clampVelocity(raw?: string): number {
  const value = Number(raw ?? DEFAULT_VELOCITY);
  return Math.max(1, Math.min(127, Number.isFinite(value) ? Math.round(value) : DEFAULT_VELOCITY));
}

function parsePatternToken(raw: string): PatternStep[] | null {
  const { token, count } = parseRepeat(raw);
  if (token === ".")
    return cloneStep({ kind: "rest", notes: [], velocity: DEFAULT_VELOCITY }, count);
  if (token === "~")
    return cloneStep({ kind: "tie", notes: [], velocity: DEFAULT_VELOCITY }, count);
  const bracketChord = /^\[([^\]]+)\](?::(\d+))?$/.exec(token);
  if (bracketChord) {
    const notes = bracketChord[1].trim().split(/\s+/);
    if (!notes.length || notes.some((n) => !NOTE_RE.test(n))) return null;
    return cloneStep({ kind: "chord", notes, velocity: clampVelocity(bracketChord[2]) }, count);
  }
  const named = NAMED_CHORD_RE.exec(token);
  if (named) {
    const notes = buildChord(`${named[1]}4`, named[2]);
    return cloneStep({ kind: "chord", notes, velocity: clampVelocity(named[3]) }, count);
  }
  const note = /^([A-G][#b]?-?\d+)(?::(\d+))?$/.exec(token);
  if (!note) return null;
  return cloneStep({ kind: "note", notes: [note[1]], velocity: clampVelocity(note[2]) }, count);
}

export function parsePattern(tokens: string[]): PatternStep[] | null {
  const out: PatternStep[] = [];
  for (const t of tokens) {
    const p = parsePatternToken(t);
    if (!p) return null;
    out.push(...p);
  }
  return out.length ? out : null;
}

export function parseDrumPattern(tokens: string[]): DrumStep[] | null {
  const out: DrumStep[] = [];
  for (const raw of tokens) {
    const { token, count } = parseRepeat(raw);
    if (token !== "x" && token !== "." && token !== "~") return null;
    for (let i = 0; i < count; i++) out.push(token);
  }
  return out.length ? out : null;
}

export function parseFxOptions(tokens: string[]): {
  params: number[];
  opts: Record<string, number | string | boolean>;
} {
  const params: number[] = [];
  const opts: Record<string, number | string | boolean> = {};
  for (const tk of tokens) {
    const [key, rv] = tk.split("=");
    if (rv === undefined) {
      const n = Number(tk);
      if (Number.isFinite(n)) params.push(n);
    } else {
      const n = Number(rv);
      opts[key] = Number.isFinite(n) ? n : rv === "true" ? true : rv === "false" ? false : rv;
    }
  }
  return { params, opts };
}
