# AGENTS.md

This file is read automatically at the start of every AI session (Cursor, Copilot, Codex, Gemini CLI, Windsurf, and Claude Code via CLAUDE.md's `@AGENTS.md` import). Keep this file thin — it holds behavior rules only. Project specifics live in `docs/`.

## Project
- Name: HireScope
- One line: Premium, 100% local React Native Expo mobile app to compile salary ranges, ratings, and employee pros/cons.
- Stack: React Native (Expo SDK 54) + TypeScript + Zustand (Existing project — do NOT migrate to Flutter).

Full details: `docs/INDEX.md` → start there before touching anything. Full rulebook: `docs/masterprompt.md`.

## Read order
Read one doc at a time, in this order: `docs/idea/idea.md` (new projects only) → `docs/overview.md` → `docs/architecture.md` → `docs/environment.md` → `docs/ui.md` → `docs/database.md` → `docs/cicd/cicd.md` → `docs/decisions.md` → supervisor docs (only when escalating). Do not try to absorb the whole set at once.

## Standing rules — always follow
1. **Ask, then wait.** If you ask a question, stop completely until you get a real answer. Never proceed on a guess.
2. **No blind fixing.** Before calling a fix done, search the whole project for every other place that uses the changed function/file/component and confirm each still works.
3. **Label every fix** MINOR or MAJOR before starting it, and say why.
4. **Test before saying "done."** Verify the actual symptom is gone, don't just assume.
5. **Escalate after 2 failed attempts on the same bug** (tracked in `docs/supervisor/bug-improvements.md`, cumulative across sessions). Don't try a 3rd blind fix — write a handoff prompt, attach `docs/supervisor/project-brief.md`, tell the human it needs outside help.
6. **If a supervisor's answer isn't fully clear, keep asking** until it is. Don't act on a half-understood instruction.
7. **Update every affected doc immediately after any real change** — including this file if the rules themselves need to change. Don't wait to be asked.
8. **Keep docs compact.** No size limit, but one file = one topic. Getting long is a signal to split, not to keep stacking.
9. **Never read, quote, log, or forward anything in `docs/cicd/secrets/`**, for any reason, in any context.
10. **`docs/idea/idea.md` is permanent** (new projects). Never edit it, never delete it.
11. **`docs/decisions.md` and `docs/cicd/githubactionsissues.md` are append-only.** Never rewrite or delete old entries.
12. **`docs/supervisor/bug-improvements.md`** — append when told to. Never prune or delete entries yourself.
13. **Structure redesign is high-risk.** Only if explicitly asked, only after a written migration plan is approved, and only after everything else is stable. New files always follow the existing structure — no exceptions without asking first.
14. **Flutter-only for new projects.** Never migrate an existing non-Flutter project to Flutter.
15. **Light, Dark, and System theme modes are mandatory** on every project from day one.
16. **Testing:** browser/`flutter run -d chrome` for pure UI iteration; real emulator/device for anything touching camera, GPS, contacts, notifications, or any permission-gated native feature.
17. **Quality over speed, always.** No deadline pressure justifies a rushed, risky change.

## Existing project note
If this is an existing project: audit the whole structure and every file first, merge any scattered docs found into this structure and delete the originals only after confirming nothing was lost, then follow the existing structure for all new work going forward.
