import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const C = {
  bg: "transparent",
  fg: "#D4CFC7",
  dim: "#5A5650",
  keyword: "#E8A634",
  note: "#F0E6D3",
  waveType: "#8BA4B8",
  effect: "#9B8EC4",
  scale: "#8BAA8B",
  drum: "#D4845C",
  number: "#C9B87A",
  selection: "rgba(232, 166, 52, 0.15)",
  gutter: "transparent",
  gutterBorder: "transparent",
  scrollbarThumb: "rgba(255, 255, 255, 0.06)",
};

export const cyberpunkTheme = EditorView.theme(
  {
    "&": {
      color: C.fg,
      backgroundColor: C.bg,
      fontFamily: "'Berkeley Mono', 'IBM Plex Mono', 'JetBrains Mono', monospace",
      fontSize: "15px",
      lineHeight: "1.7",
      letterSpacing: "0.02em",
    },
    ".cm-scroller": {
      backgroundColor: "transparent",
      scrollbarWidth: "thin",
      scrollbarColor: `${C.scrollbarThumb} transparent`,
    },
    ".cm-scroller::-webkit-scrollbar": { width: "8px", height: "8px" },
    ".cm-scroller::-webkit-scrollbar-track": { background: "transparent" },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: C.scrollbarThumb,
      borderRadius: "4px",
    },
    ".cm-content": { caretColor: C.keyword, padding: "16px 0" },
    ".cm-cursor": {
      borderLeftColor: C.keyword,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: C.selection,
    },
    ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.03)" },
    ".cm-line": {
      padding: "0 16px",
      borderLeft: "2px solid transparent",
      transition: "background-color 120ms ease",
    },
    ".cm-gutters": {
      backgroundColor: C.gutter,
      color: "#3D3A35",
      borderRight: `1px solid ${C.gutterBorder}`,
      paddingRight: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement": { color: "#3D3A35", paddingRight: "8px" },
    ".cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-activeLineGutter .cm-gutterElement": { color: "#7A766E" },
    ".cm-matchingBracket": {
      color: C.fg,
      outline: "1px solid rgba(232, 166, 52, 0.4)",
      backgroundColor: "rgba(232, 166, 52, 0.08)",
    },
    ".cm-error-line": {
      borderLeftColor: "#C45C5C",
      backgroundColor: "rgba(196, 92, 92, 0.06)",
    },
    ".cm-valid-line": { borderLeftColor: "#6BA368" },
    ".cm-playing-line": {
      backgroundColor: "rgba(232, 166, 52, 0.06)",
      animation: "cm-line-pulse 1.2s ease-in-out infinite",
    },
    ".cm-line-state-gutter .cm-gutterElement": {
      width: "1.2em",
      padding: "0 4px",
      textAlign: "center",
    },
    ".cm-line-state-marker": { fontSize: "11px", opacity: "0.9" },
    ".cm-line-state-valid": { color: "#6BA368" },
    ".cm-line-state-error": { color: "#C45C5C" },
    ".cm-line-state-playing": { color: C.keyword },
    ".cm-command-tooltip": {
      color: C.fg,
      background: "rgba(22, 22, 24, 0.95)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "6px",
      padding: "8px 12px",
      fontSize: "12px",
      maxWidth: "320px",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(12px)",
    },
    ".cm-autocomplete-tooltip": {
      position: "absolute",
      zIndex: "40",
      background: "rgba(22, 22, 24, 0.95)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "6px",
      minWidth: "140px",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
      overflow: "hidden",
      backdropFilter: "blur(12px)",
    },
    ".cm-autocomplete-item": { padding: "6px 12px", fontSize: "13px", color: C.fg },
    ".cm-autocomplete-item.is-active": {
      backgroundColor: "rgba(232, 166, 52, 0.12)",
      color: C.note,
    },
    "@keyframes cm-line-pulse": {
      "0%, 100%": { backgroundColor: "rgba(232, 166, 52, 0.04)" },
      "50%": { backgroundColor: "rgba(232, 166, 52, 0.08)" },
    },
  },
  { dark: true },
);

export const cyberpunkHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: C.keyword, fontWeight: "700" },
    { tag: tags.typeName, color: C.waveType },
    { tag: tags.string, color: C.scale },
    { tag: tags.atom, color: C.number, fontWeight: "600" },
    { tag: tags.number, color: C.number },
    { tag: tags.function(tags.variableName), color: C.effect, fontWeight: "600" },
    { tag: tags.function(tags.propertyName), color: C.effect, fontWeight: "600" },
    { tag: tags.className, color: C.scale, fontWeight: "700" },
    { tag: tags.comment, color: C.dim, fontStyle: "italic" },
    { tag: tags.punctuation, color: "#5A5650" },
    { tag: tags.operator, color: C.drum, fontWeight: "600" },
    { tag: tags.name, color: C.note },
  ]),
);
