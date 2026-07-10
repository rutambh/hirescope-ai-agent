# Universal Looping Protocol

Agent-agnostic instructions for running an autonomous work loop on **any** codebase, with **any** coding agent (OpenCode, Claude Code, Cursor, Aider, Windsurf, etc). The agent identifies the project itself in Phase 0 — nothing here is project-specific.

---

## 📝 TASKS — edit only this section

- [x] In depth Code Reivew
- [x] Fix bugs 
- [x] See if we can use any other AI for this, which would be more efficient
make sure that its below 300MB
- [x] Only on first lend, Prompt user to download the AI , Two buttons, 
Later and Download 
When click on Download > It should automatically start downloading of AI 
Later > Close the popup

---

## PHASE 0 — Identify the project (once, at the start of every session)

1. Read, in this order, whichever of these exist: `AGENTS.md`, `CLAUDE.md`, `docs/INDEX.md`, `README.md`.
2. Detect the stack from whatever manifest is actually present — don't assume:
   - `pubspec.yaml` → Flutter/Dart
   - `package.json` → Node/React/React Native
   - `requirements.txt` / `pyproject.toml` → Python
   - `go.mod` → Go · `Cargo.toml` → Rust · `pom.xml`/`build.gradle` → JVM
3. Find the **real** test, build, and lint commands — from `package.json` scripts, a `Makefile`, CI config (`.github/workflows/*.yml`), or the docs from step 1. Never invent a command. If none is discoverable, ask.
4. Check for a supervisor/escalation file (e.g. `docs/supervisor/project-brief.md`). If it exists, read it fully — it may hold context from a previous failed loop.
5. Output a **Project Identification Summary** before doing anything else: project name, stack, test command, build command, current git branch, escalation file found (y/n). If this is wrong, stop — don't proceed on a misidentified project.

## PHASE 1 — Find the next task

Check in order, use the first that has content:
1. The unchecked items in this file's **TASKS** section, top to bottom
2. A task explicitly given this session
3. `docs/backlog.md` or `TODO.md`
4. Failing tests / build errors (run the suite; failures become the task list)
5. Open lint errors

If none exist and nothing was assigned, **stop and ask** — never invent work.

## PHASE 2 — The loop

1. **Pick** the single smallest independently-verifiable task.
2. **State the plan** in 1–3 sentences before touching any file.
3. **Implement** the change.
4. **Verify** with the real command from Phase 0 — never assume success.
5. **On pass:** commit with a clear message → check off the item in the TASKS section (if it came from there) → update the log (Phase 3) → back to step 1.
6. **On fail:** diagnose and retry (attempt #2 for this task).
7. **On a second consecutive failure on the same task:** stop looping on it, write an escalation note (Phase 4), move to the next independent task, or halt if nothing else is safe.
8. **Exit the loop** when: the queue is empty, a max iteration count is hit (default **10** unless told otherwise), or an escalation fires.

## PHASE 3 — Cross-iteration memory

Maintain `docs/loop-log.md` (or the project's existing Lessons Learned file). Each entry: timestamp, task, result, what was learned. Before starting a task, check if it was already tried and failed — don't silently repeat a dead approach.

## PHASE 4 — Escalation format

When halting on a task, append to the supervisor file: what was tried, why each attempt failed, current code state (working / partially broken / reverted), and the specific decision needed from a human.

## Hard rules

- Never invent a test/build command — discover it or ask.
- Never mark a task done without real verification.
- Never exceed the iteration cap without a checkpoint summary to the human.
- Never touch files outside task scope without saying so first.
- If Phase 0 identification feels uncertain, stop and ask rather than guess.

---

## Wiring this into different agents

**OpenCode**
- *Manual/repeatable:* save this file as `.opencode/command/loop.md` with frontmatter (`description`, `agent: build`), then run `/loop` each cycle.
- *Always-on:* paste this content into your project's `AGENTS.md` (or add it via `instructions` in `opencode.json`) so every session follows it automatically without invoking a command.
- *Unattended automation:* OpenCode can run non-interactively for scripting (check `opencode --help` for the exact flag on your installed version — it's varied across releases). Wrap that in a bash `while` loop that re-invokes it each round and checks `docs/loop-log.md` / the escalation file as the stop signal, since each invocation is a fresh context.

**Claude Code** — drop the same content into `CLAUDE.md`, or save as `.claude/commands/loop.md`.

**Cursor** — save as a rule under `.cursor/rules/loop.md`.

**Aider / others** — pass it via whatever "read this file as context" flag the tool supports (e.g. Aider's `--read`).

The protocol body never changes — only *where you put it* changes per agent.
