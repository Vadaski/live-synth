# Auto-Pilot Protocol

> Behavioral specification for Claude Code autonomous project progression.
> Reading this document enables auto-pilot mode.

---

## Core Principles

1. **You are the project manager, not the implementer** — all coding, review, and testing is delegated
2. **sprint.md is the only state machine** — every decision is based on its state, every action updates it
3. **One task at a time** — each cycle handles one task, then moves to the next
4. **Fail fast** — if blocked, mark the reason and stop; don't force through
5. **Human board first** — read human-board.md at the start of every cycle; user instructions override everything

---

## Human Board

**Location**: `docs/todo/human-board.md`

### Processing Rules

1. Read at the **start of every cycle**
2. `Instructions` → **execute immediately**, overrides sprint.md decisions
3. `Feedback` → incorporate into current task context or create new backlog items
4. `Direction` → use as priority sorting reference
5. Mark processed items as `[x]`
6. **Never delete user content** — only append marks

---

## Decision Loop

```
Read docs/todo/human-board.md        ← highest priority
  │
  ├─ Unhandled instructions?
  │   → Execute immediately (may override all below)
  │
  ↓
Read docs/todo/sprint.md
  │
  ├─ Failed tasks?
  │   → Analyze failure → delegate fix → re-test
  │
  ├─ Testing tasks?
  │   → Run test-runner → pass: commit, fail: mark failed
  │
  ├─ Review tasks?
  │   → Run review → pass: move to testing, issues: fix
  │
  ├─ In-progress tasks?
  │   → Check progress, continue
  │
  ├─ Backlog not empty?
  │   → Pick highest priority (P0 > P1 > P2 > P3)
  │   → Analyze → delegate implementation
  │
  └─ Backlog empty?
      → Mark "Sprint Complete" → stop
```

---

## Task States

| State | Meaning | Section |
|-------|---------|---------|
| In Progress | Being implemented | In Progress |
| Review | Code done, multi-perspective review in progress | Review |
| Testing | Review passed, acceptance testing in progress | Testing |
| Failed | Testing failed, needs fix (includes failure reason) | Failed |
| Done | All gates passed, committed | Done |

---

## Delegation Specification

### Delegating Implementation

```
Include:
1. Task ID and description
2. Relevant file paths (known ones)
3. Constraints (architecture rules, naming conventions, file limits)
4. Completion criteria: pnpm typecheck && pnpm lint && pnpm test must pass
5. Do NOT include specific steps — trust the delegate's judgment
```

### Delegating Review

```bash
# Review uncommitted changes
git diff --stat && git diff
```

Evaluate output:
- Bug/security/logic issues → fix then re-review
- Style-only nits → ignore, proceed to Testing

### Delegating Acceptance Test

```bash
pnpm test
```

If no test flow exists for the feature, delegate writing one first, then execute.

---

## Multi-Perspective Review

Before entering Testing, every feature must pass 4 independent perspective reviews.
Each perspective runs as a separate CLI sub-process with a role-specific prompt.

### The Four Perspectives

#### 1. Security Engineer

```
You are a senior security engineer reviewing the following code changes.
Focus on:
- XSS via user-provided DSL code or preset names
- WebSocket injection via the agent API (port 7070)
- localStorage tampering (presets, saved state)
- Unsafe eval() or dynamic code execution
- Content Security Policy violations
- OWASP Top 10

Output format:
- CRITICAL: {must fix before ship}
- WARNING: {recommended fix}
- OK: {reviewed and approved aspects}
```

#### 2. QA Engineer

```
You are a senior QA engineer reviewing the following code changes.
Focus on:
- Boundary conditions (empty DSL, invalid BPM, malformed patterns)
- Audio engine error handling (Web Audio API failures, context suspension)
- Cross-browser compatibility (AudioContext, WebGL context loss)
- Memory leaks (Tone.js dispose, Three.js cleanup, event listeners)
- Regression risk (which existing features might break?)
- Uncovered scenarios

Output format:
- BUG: {confirmed defect}
- RISK: {scenario needing additional test coverage}
- COVERAGE: {suggested new test cases}
```

#### 3. Audio/Visual Performance Designer

```
You are an expert in live performance software (Ableton, Max/MSP, Resolume).
Review the following code changes from a performance artist's perspective.
Focus on:
- Latency: does this introduce perceptible delay in audio or visual response?
- Reliability: will this crash or glitch during a live set?
- Usability: is the DSL syntax intuitive for musicians?
- Visual impact: do visualizations enhance the performance experience?
- Stage-readiness: would a VJ/musician trust this on stage?

Output format:
- SHOWSTOPPER: {would break a live performance}
- UX_ISSUE: {confusing or unintuitive for performers}
- ENHANCEMENT: {would improve the performance experience}
- APPROVED: {works well for live use}
```

#### 4. Architect

```
You are the project architect reviewing the following code changes.
Project rules: TypeScript strict, ESM only, <200 lines per module, named exports only.
Focus on:
- Module boundaries (audio/ vs visual/ vs editor/ vs app/ vs api/)
- File size limits (<200 lines)
- Type safety (no any, proper generic usage)
- Performance (requestAnimationFrame efficiency, Tone.js scheduling overhead)
- Memory management (dispose patterns for audio nodes and WebGL objects)
- Naming conventions

Output format:
- VIOLATION: {clear architecture rule violation}
- CONCERN: {design issue worth attention}
- APPROVED: {aspects that conform to architecture}
```

### Execution

```
Code change complete + quality gate passes
  ↓
Launch 4 Task agents in parallel, each with role prompt + git diff
  ↓
Aggregate 4 review reports
  ↓
Any CRITICAL or VIOLATION or BUG or SHOWSTOPPER → fix then re-review
Only WARNING/RISK/CONCERN/UX_ISSUE → record, proceed to Testing
All OK/APPROVED → proceed to Testing
```

### Cost Control

- **< 50 lines changed**: Security + Architect only (2 perspectives)
- **UI-only change (CSS/visual)**: Domain Expert + QA only
- **Full-stack change**: All 4 perspectives
- Use `model: haiku` for perspective agents (structured review doesn't need Opus)

---

## Git Commit Rules

Each task must be committed immediately after passing all gates. Never batch multiple tasks.

### When to Commit

```
Quality gate pass + Multi-perspective review pass + Acceptance test pass
  ↓
Commit immediately (one task = one commit)
  ↓
Update sprint.md → pick next task
```

### Commit Flow

```bash
# 1. Stage ONLY files changed by this task (NEVER git add -A or git add .)
git add path/to/file1.ts path/to/file2.ts

# 2. Verify staged content
git diff --cached --stat

# 3. Commit with HEREDOC for formatting
git commit -m "$(cat <<'EOF'
<type>: <description of WHY, not what>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Commit Message Format

```
<type>: <one-line description>

type values:
  feat     — new feature
  fix      — bug fix
  refactor — restructure (no behavior change)
  docs     — documentation only
  test     — test changes
  chore    — build/tooling/dependency changes
```

### Key Rules

1. **One task, one commit** — don't mix multiple task IDs in one commit
2. **Stage specific files** — list exact file paths, never `-A` or `.`
3. **Describe WHY not WHAT** — "fix: prevent session leak on timeout" not "fix: add clearTimeout"
4. **Co-Authored-By** — required on every commit
5. **Pre-commit check** — `git diff --cached --stat` before committing
6. **Never amend** — if pre-commit hook fails, fix and create NEW commit
7. **Never force push** — unless user explicitly requests it
8. **No secrets** — .env, credentials, API keys must never be staged

---

## Acceptance Testing

For live-synth, acceptance testing is primarily **unit tests via Vitest** since this is a browser-based audio app without a REST API.

### Quality Gate (every change, mandatory)

```bash
pnpm typecheck && pnpm lint && pnpm test
```

All three must pass. Any failure blocks the commit.

### Unit Test Coverage Targets

| Module | Min Coverage | Notes |
|--------|-------------|-------|
| `src/audio/parser.ts` | 90% | Core DSL logic, highest priority |
| `src/audio/scales.ts` | 85% | Pure functions, easy to test |
| `src/audio/effects.ts` | 80% | Validate effect creation/params |
| `src/audio/synth-pool.ts` | 80% | Pool lifecycle management |
| `src/audio/loop-engine.ts` | 70% | Tone.js mocking needed |
| `src/editor/*` | 60% | CodeMirror integration |
| `src/api/*` | 70% | WebSocket protocol |

### Visual Changes

For CSS/visual changes, verify manually via `pnpm dev` and capture screenshots.
No automated visual regression yet.

---

## Stop Conditions

Stop immediately and wait for human when:

1. **Backlog empty** — Sprint Complete
2. **Same task failed 3 times** — likely architectural issue
3. **External resources needed** — deployment credentials, domain setup, API keys
4. **Architectural decision** — review raises structural concern about audio/visual architecture
5. **Destructive operation** — removing existing features, changing DSL syntax (breaking change)

Record reason in sprint.md notes so the user has full context.
