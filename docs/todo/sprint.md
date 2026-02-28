# Sprint Board

> Last updated: 2026-02-28 by Claude Code
>
> **Rules**:
> - Single source of truth for all agent work status
> - Only Claude Code moves task states
> - Task ID: `LS-{3-digit number}`
> - Priority: P0(blocking) / P1(important) / P2(routine) / P3(optimization)
>
> **State flow**:
> ```
> Backlog → In Progress → Review → Testing → Done
>                ↑                     │
>                └──── Failed ←────────┘
> ```

---

## In Progress
| ID | Task | Owner | Started | Notes |
|----|------|-------|---------|-------|
| — | — | — | — | — |

## Failed
| ID | Task | Fail Count | Reason | Last Failed |
|----|------|-----------|--------|-------------|
| — | — | — | — | — |

## Review (Multi-Perspective)
| ID | Task | Implementer | Security | QA | Domain | Architect |
|----|------|------------|----------|-----|--------|-----------|
| — | — | — | — | — | — | — |

## Testing
| ID | Task | Test Flow | MUST Rate | SHOULD Rate |
|----|------|----------|-----------|-------------|
| — | — | — | — | — |

## Done
| ID | Task | Completed | Verification |
|----|------|-----------|-------------|
| LS-002 | Unit tests: DSL parser | 2026-02-28 | 39/39 tests pass, typecheck + lint clean, security + architect review passed |
| LS-018 | Abstract math visual engine | 2026-02-28 | Gemini CLI + review fixes: GPU memory leak fixed, FFT NaN safeguards added, chroma clamped. Build passes. |

## Backlog

### P0 — Blocking
| ID | Task | Description |
|----|------|-------------|
| LS-001 | Initial git commit | Commit all existing live-synth source to git with proper history |

### P1 — Important
| ID | Task | Description |
|----|------|-------------|
| LS-003 | Unit tests: loop engine | Write Vitest tests for `src/audio/loop-engine.ts` — scheduling, pattern playback, voice management |
| LS-004 | Unit tests: scales & chords | Write Vitest tests for `src/audio/scales.ts` — scale quantization, chord helpers |
| LS-005 | Unit tests: effects chain | Write Vitest tests for `src/audio/effects.ts` — effects creation, parameter validation |
| LS-006 | Unit tests: synth pool | Write Vitest tests for `src/audio/synth-pool.ts` — instance management, hot-swap, cleanup |
| LS-007 | Transport bar redesign | Tighten layout, group related controls, make it look like real hardware controller |
| LS-008 | Beat indicator enlargement | Make beat LEDs larger, more visible from distance, physical LED feeling |
| LS-009 | Visual panel wow factor | Superseded by LS-018 (abstract math visuals) — review if more polish needed |
| LS-010 | Editor text contrast | Improve code readability, crisp typography, better syntax highlighting contrast |
| LS-011 | Preset selector redesign | Replace default HTML select with custom styled dropdown matching the aesthetic |

### P2 — Routine
| ID | Task | Description |
|----|------|-------------|
| LS-012 | PWA support | Add service worker, manifest.json, offline capability |
| LS-013 | Unit tests: editor setup | Write Vitest tests for `src/editor/` — CodeMirror integration, language definition |
| LS-014 | Unit tests: presets | Write Vitest tests for `src/app/presets.ts` — save/load/localStorage |
| LS-015 | Unit tests: agent API | Write Vitest tests for `src/api/` — protocol, WebSocket server, DSL generator |

### P3 — Optimization
| ID | Task | Description |
|----|------|-------------|
| LS-016 | Performance audit | Profile 60fps target, identify bottlenecks in render loop, optimize Three.js scene |
| LS-017 | Accessibility | Keyboard navigation, ARIA labels, reduced-motion support |
