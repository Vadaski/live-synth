import {
  copyLineDown,
  defaultKeymap,
  history,
  historyKeymap,
  moveLineDown,
  moveLineUp,
  toggleComment,
} from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { EditorState, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutter,
  highlightActiveLine,
  highlightActiveLineGutter,
  hoverTooltip,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import type { DecorationSet, Tooltip } from "@codemirror/view";
import { parse } from "../audio/parser.js";
import type { ParseResult } from "../audio/parser.js";
import {
  DSL_AUTOCOMPLETE,
  DSL_DRUMS,
  DSL_EFFECTS,
  DSL_HELP,
  DSL_SCALES,
  DSL_WAVEFORMS,
  synthDSL,
} from "./language.js";
import { cyberpunkHighlight, cyberpunkTheme } from "./theme.js";

export interface EditorCallbacks {
  onParse: (result: ParseResult) => void;
  onEval: () => void;
  onStop: () => void;
  onKeystroke: () => void;
}
type ParseLineState = { valid: number[]; errors: number[] };
type LineState = {
  valid: Set<number>;
  errors: Set<number>;
  playing: number | null;
  decorations: DecorationSet;
};

const setParseLineState = StateEffect.define<ParseLineState>();
const setPlayingLineState = StateEffect.define<number | null>();
const WAVEFORM_SET = new Set<string>(DSL_WAVEFORMS);
const EFFECT_SET = new Set<string>(DSL_EFFECTS);
const SCALE_SET = new Set<string>(DSL_SCALES);
const DRUM_SET = new Set<string>(DSL_DRUMS);

function buildDecorations(
  doc: EditorState["doc"],
  valid: Set<number>,
  errors: Set<number>,
  playing: number | null,
): DecorationSet {
  const b = new RangeSetBuilder<Decoration>();
  for (let line = 1; line <= doc.lines; line++) {
    const at = doc.line(line).from;
    if (errors.has(line)) b.add(at, at, Decoration.line({ class: "cm-error-line" }));
    else if (valid.has(line)) b.add(at, at, Decoration.line({ class: "cm-valid-line" }));
    if (playing === line) b.add(at, at, Decoration.line({ class: "cm-playing-line" }));
  }
  return b.finish();
}

const lineStateField = StateField.define<LineState>({
  create(state) {
    return {
      valid: new Set<number>(),
      errors: new Set<number>(),
      playing: null,
      decorations: buildDecorations(state.doc, new Set<number>(), new Set<number>(), null),
    };
  },
  update(value, tr) {
    let valid = value.valid;
    let errors = value.errors;
    let playing = value.playing;
    let dirty = tr.docChanged;
    for (const effect of tr.effects) {
      if (effect.is(setParseLineState)) {
        valid = new Set(effect.value.valid);
        errors = new Set(effect.value.errors);
        dirty = true;
      }
      if (effect.is(setPlayingLineState)) {
        playing = effect.value;
        dirty = true;
      }
    }
    if (!dirty) return value;
    if (playing !== null && (playing < 1 || playing > tr.state.doc.lines)) playing = null;
    return {
      valid,
      errors,
      playing,
      decorations: buildDecorations(tr.state.doc, valid, errors, playing),
    };
  },
  provide: (field) => EditorView.decorations.from(field, (v) => v.decorations),
});

class LineStateMarker extends GutterMarker {
  constructor(
    private readonly icon: string,
    private readonly className: string,
  ) {
    super();
  }
  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = `cm-line-state-marker ${this.className}`;
    el.textContent = this.icon;
    return el;
  }
}

const markValid = new LineStateMarker("✓", "cm-line-state-valid");
const markError = new LineStateMarker("✗", "cm-line-state-error");
const markPlaying = new LineStateMarker("♪", "cm-line-state-playing");
const lineStateGutter = gutter({
  class: "cm-line-state-gutter",
  initialSpacer: () => markPlaying,
  markers(view) {
    const info = view.state.field(lineStateField);
    const b = new RangeSetBuilder<GutterMarker>();
    for (let line = 1; line <= view.state.doc.lines; line++) {
      const marker =
        info.playing === line
          ? markPlaying
          : info.errors.has(line)
            ? markError
            : info.valid.has(line)
              ? markValid
              : null;
      if (marker) {
        const at = view.state.doc.line(line).from;
        b.add(at, at, marker);
      }
    }
    return b.finish();
  },
});

function classifyLineState(state: EditorState, result: ParseResult): ParseLineState {
  const errors = result.errors.map((e) => e.line + 1);
  const errorSet = new Set(errors);
  const valid: number[] = [];
  for (let line = 1; line <= state.doc.lines; line++) {
    const text = state.doc.line(line).text.trim();
    if (text && !text.startsWith("//") && !errorSet.has(line)) valid.push(line);
  }
  return { valid, errors };
}

function explainWord(word: string): string | null {
  if (DSL_HELP[word]) return DSL_HELP[word];
  if (WAVEFORM_SET.has(word)) return `${word} waveform.`;
  if (EFFECT_SET.has(word)) return `${word} effect.`;
  if (SCALE_SET.has(word)) return `${word} scale mode.`;
  if (DRUM_SET.has(word)) return `${word} drum lane pattern.`;
  return null;
}

const commandTooltip = hoverTooltip((view, pos): Tooltip | null => {
  const line = view.state.doc.lineAt(pos);
  let from = pos;
  let to = pos;
  while (from > line.from && /[A-Za-z#0-9]/.test(view.state.doc.sliceString(from - 1, from)))
    from--;
  while (to < line.to && /[A-Za-z#0-9]/.test(view.state.doc.sliceString(to, to + 1))) to++;
  if (from === to) return null;
  const help = explainWord(view.state.doc.sliceString(from, to).toLowerCase());
  if (!help) return null;
  return {
    pos: from,
    end: to,
    above: true,
    create() {
      const dom = document.createElement("div");
      dom.className = "cm-command-tooltip";
      dom.textContent = help;
      return { dom };
    },
  };
});

export function setEditorPlayingLine(view: EditorView, line: number | null): void {
  const normalized = line !== null && line >= 1 && line <= view.state.doc.lines ? line : null;
  view.dispatch({ effects: setPlayingLineState.of(normalized) });
}

export function createEditor(
  parent: HTMLElement,
  initialCode: string,
  callbacks: EditorCallbacks,
): EditorView {
  parent.textContent = "";
  parent.style.display = "flex";
  parent.style.flexDirection = "column";
  parent.style.minHeight = "0";
  const mount = document.createElement("div");
  mount.style.flex = "1";
  mount.style.minHeight = "0";
  const status = document.createElement("div");
  status.style.cssText =
    "padding:4px 10px;font-size:11px;color:#8f8eb3;background:#0b0b14;border-top:1px solid rgba(189,147,249,0.18);font-family:'JetBrains Mono',monospace;";
  parent.append(mount, status);

  const autocomplete = {
    from: 0,
    to: 0,
    items: [] as string[],
    box: null as HTMLDivElement | null,
  };
  let parseTimer: ReturnType<typeof setTimeout> | null = null;
  const setCounts = (state: EditorState): void => {
    status.textContent = `${state.doc.lines} lines  ${state.doc.length} chars`;
  };
  const closeAutocomplete = (): void => {
    autocomplete.box?.remove();
    autocomplete.box = null;
    autocomplete.items = [];
  };
  const applyAutocomplete = (view: EditorView): boolean => {
    const [item] = autocomplete.items;
    if (!item) return false;
    view.dispatch({
      changes: { from: autocomplete.from, to: autocomplete.to, insert: item },
      selection: { anchor: autocomplete.from + item.length },
    });
    closeAutocomplete();
    return true;
  };
  const updateAutocomplete = (view: EditorView): void => {
    const sel = view.state.selection.main;
    if (!sel.empty || !view.hasFocus) {
      closeAutocomplete();
      return;
    }
    const line = view.state.doc.lineAt(sel.head);
    const before = line.text.slice(0, sel.head - line.from);
    const match = before.match(/[A-Za-z][A-Za-z#0-9_-]*$/);
    if (!match) {
      closeAutocomplete();
      return;
    }
    const prefix = match[0].toLowerCase();
    autocomplete.from = sel.head - match[0].length;
    autocomplete.to = sel.head;
    autocomplete.items = DSL_AUTOCOMPLETE.filter(
      (s) => s.toLowerCase().startsWith(prefix) && s.toLowerCase() !== prefix,
    ).slice(0, 6);
    if (!autocomplete.items.length) {
      closeAutocomplete();
      return;
    }
    const coords = view.coordsAtPos(sel.head);
    if (!coords) {
      closeAutocomplete();
      return;
    }
    const root = view.dom.getBoundingClientRect();
    if (!autocomplete.box) {
      autocomplete.box = document.createElement("div");
      autocomplete.box.className = "cm-autocomplete-tooltip";
      view.dom.append(autocomplete.box);
    }
    autocomplete.box.style.left = `${coords.left - root.left}px`;
    autocomplete.box.style.top = `${coords.bottom - root.top + 4}px`;
    autocomplete.box.textContent = "";
    for (const [index, item] of autocomplete.items.entries()) {
      const row = document.createElement("div");
      row.className = `cm-autocomplete-item${index === 0 ? " is-active" : ""}`;
      row.textContent = item;
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        autocomplete.items = [item];
        applyAutocomplete(view);
      });
      autocomplete.box.append(row);
    }
  };

  const parseAndDecorate = (view: EditorView): void => {
    const result = parse(view.state.doc.toString());
    callbacks.onParse(result);
    view.dispatch({ effects: setParseLineState.of(classifyLineState(view.state, result)) });
  };

  const state = EditorState.create({
    doc: initialCode,
    extensions: [
      lineNumbers(),
      lineStateGutter,
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      keymap.of([
        {
          key: "Ctrl-Enter",
          mac: "Cmd-Enter",
          run: (view) => {
            callbacks.onEval();
            const first = view.state.field(lineStateField).valid.values().next().value as
              | number
              | undefined;
            setEditorPlayingLine(view, first ?? null);
            return true;
          },
        },
        {
          key: "Ctrl-.",
          mac: "Cmd-.",
          run: (view) => {
            callbacks.onStop();
            setEditorPlayingLine(view, null);
            return true;
          },
        },
        { key: "Ctrl-/", mac: "Cmd-/", run: toggleComment },
        { key: "Ctrl-d", mac: "Cmd-d", run: copyLineDown },
        { key: "Ctrl-Shift-ArrowUp", mac: "Cmd-Shift-ArrowUp", run: moveLineUp },
        { key: "Ctrl-Shift-ArrowDown", mac: "Cmd-Shift-ArrowDown", run: moveLineDown },
        { key: "Tab", run: applyAutocomplete },
      ]),
      synthDSL,
      bracketMatching(),
      commandTooltip,
      lineStateField,
      cyberpunkTheme,
      cyberpunkHighlight,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          callbacks.onKeystroke();
          setCounts(update.state);
          if (parseTimer) clearTimeout(parseTimer);
          parseTimer = setTimeout(() => parseAndDecorate(update.view), 100);
        }
        if (
          update.docChanged ||
          update.selectionSet ||
          update.focusChanged ||
          update.viewportChanged
        )
          updateAutocomplete(update.view);
      }),
    ],
  });

  const view = new EditorView({ state, parent: mount });
  setCounts(view.state);
  parseAndDecorate(view);
  return view;
}
