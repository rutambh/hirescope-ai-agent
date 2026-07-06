# MASTER PROMPT — Universal AI Development Protocol

This document is the complete set of rules for working on this project. Read it fully before doing anything. If any instruction below conflicts with something the human says in chat, the human's direct message always wins — but if you think the human is asking you to skip a safety rule (like Rule 9, secrets), stop and ask them to confirm instead of just doing it.

Save this exact file as `docs/masterprompt.md` in the project. Do not edit the rules in this document on your own. The only time you touch this file again is Section 13, and only when told to.

---

## 0. How to read this document

Do not try to hold all of this in your head at once. Read one numbered section at a time. Finish thinking about one section before moving to the next one.

Quality first, speed second, always. Nobody is in a hurry. Taking longer to do something correctly is always better than doing it fast and wrong.

---

## 1. First step — figure out what kind of project this is

Check the project folder.

- If `docs/idea/idea.md` exists and the rest of the project is empty (or nearly empty) → this is a **NEW PROJECT**. Go to Section 2.
- If the project already has real code and files in it → this is an **EXISTING PROJECT**. Go to Section 3.
- If you are not sure which one this is, stop and ask the human directly. Do not guess.

---

## 2. NEW PROJECT — step by step

Do these steps in order. Do not skip ahead.

**Step 1.** Look for `docs/idea/idea.md`. This file is written only by the human, never by you. If it does not exist, stop and ask the human to write it. Do not create it yourself. Do not continue without it.

**Step 2.** Read `docs/idea/idea.md` fully, start to finish.

**Step 3.** Write down every question you have — anything unclear, missing, or that could be built more than one way. Ask all of these questions to the human in one message.

**Step 4.** Stop completely and wait for the human's real reply. Do not start building anything while you wait. Do not guess an answer and continue. Wait.

**Step 5.** Once the human answers, write back in plain language what you now understand the project to be. Ask the human to confirm this is correct before you create a single file.

**Step 6.** Once confirmed, create the full documentation set described in Section 5, using real answers where you have them (not placeholders).

**Step 7.** Show the human your proposed folder structure and architecture (this goes in `docs/architecture.md`) before writing any code. Wait for approval. This is the one time a brand-new structure gets proposed — after this, nothing exists yet to accidentally break, so this step is quick and low-risk.

**Step 8.** Once approved, set up the local development environment yourself, automatically (see Section 10). Do not ask the human to run setup commands themselves.

**Step 9.** Build the project one phase at a time, in this exact order:
1. Folder structure
2. Environment setup
3. UI foundation (theme, light/dark/system mode, base widgets)
4. Backend / database (if any)
5. CI/CD pipeline
6. Polish and remaining features

Do not start phase 2 until phase 1 is finished and explained to the human. Do not start phase 3 until phase 2 is finished. And so on.

**Step 10.** After finishing each phase, update every documentation file that phase affected. Do this immediately, don't wait to be asked.

---

## 3. EXISTING PROJECT — step by step

**Step 1.** Read the whole folder structure, top to bottom.

**Step 2.** Then read every single file in the project, one at a time. Do not skip files. Do not sample a few and assume the rest. Note what each file is for as you go.

**Step 3.** Look for any documentation that already exists anywhere in the repo — old README files, notes, comments that explain design decisions, anything like that.

**Step 4.** Create the full documentation set described in Section 5, describing the project **as it actually is right now** — not how you think it should be.

**Step 5.** Take everything you found in Step 3, merge the useful content into the new documentation set, then delete the old scattered files. Only delete after the merge is done and you're confident nothing was lost.

**Step 6.** From this point on, for ordinary work (bug fixes, new features): follow the structure exactly as it already exists. Do not reorganize, rename, or move anything unless the human explicitly asks for that.

**Step 7.** A full structure redesign (moving files, renaming folders, changing how the project is organized) is a separate, high-risk task. Only do this if the human explicitly asks for it, and:
- Do it **last**, after everything else about the project is stable and documented.
- Before touching anything, write out a full migration plan: exactly what moves where, and what does **not** change. Show this to the human and wait for explicit approval.
- Never combine a redesign with a feature or bug fix in the same pass.

**Step 8.** Stack rules:
- If this project is already Flutter, apply all the same UI, environment, and CI/CD rules as a new project (Sections 8, 9, 10, 11).
- If this project uses a different stack (React Native, etc.), **do not migrate it to Flutter**. Leave the stack exactly as it is. Only apply the documentation and process rules (Sections 5, 6, 7).

---

## 4. Flutter-only rule for new projects

Every new project from this point forward is built in Flutter. No other framework is used for new projects, no exceptions, even if a different tool seems easier for a specific feature.

---

## 5. Documentation set — what exists, why, and exactly what goes in each

Quick reference first, deep explanation of every file below it. Read the deep explanation for a file the first time you write to it — don't just go by the one-line summary.

| File | Purpose | Who writes it | Updates |
|---|---|---|---|
| `README.md` | Human-friendly project page | You | On real changes |
| `AGENTS.md` | Thin master instruction file, points to `docs/INDEX.md` | You | Rarely |
| `CLAUDE.md` | One line (`@AGENTS.md`) plus Claude-only notes if needed | You | Rarely |
| `docs/INDEX.md` | Navigation hub — lists every doc, in reading order | You | When docs are added/removed |
| `docs/idea/idea.md` | Original raw idea (new projects only) | **Human only** | Never — permanent |
| `docs/overview.md` | What the project is, status, constraints, what it does NOT do | You | On real changes |
| `docs/architecture.md` | Folder structure, state management, module boundaries, why | You | On real changes |
| `docs/environment.md` | Local dev environment setup steps and versions | You | When environment changes |
| `docs/ui.md` | Theme, colors, light/dark/system rules, UI libraries used | You | On real changes |
| `docs/database.md` | Schema/backend details, or states clearly there is none | You | On real changes |
| `docs/cicd/cicd.md` | Paths and secret **names** only — never actual values | You | On real changes |
| `docs/cicd/secrets/` | Gitignored folder — human pastes real secret values here | Human | — |
| `docs/cicd/githubactionsissues.md` | Log of CI/CD problems hit and how they were solved | You | Append-only |
| `docs/decisions.md` | Log of why things were built a certain way | You | Append-only |
| `docs/supervisor/project-brief.md` | Condensed cross-department summary for AI-to-AI handoffs | You | Auto, on real changes |
| `docs/supervisor/bug-improvements.md` | Log of fix attempts on hard bugs | You | Append, only when told |
| `docs/masterprompt.md` | This document, plus a Lessons Learned log at the bottom | You | Only when told (Section 13) |

If the project genuinely needs a documentation file not listed here (for example, localization rules, or a very unusual accessibility requirement), create it inside `docs/`, and add it to `docs/INDEX.md`. Do not create extra doc files just to have them — only when there's a real, ongoing need for one.

### Deep explanation of each file

**`README.md`** — for humans, not for you to reason from. One paragraph describing what the project is, current status (in dev / testing / live), setup and run instructions, and one line pointing to `AGENTS.md` and `docs/`. Never put architecture, styling rules, or internal decisions here — that's what makes it readable to an outside visitor instead of overwhelming them.

**`AGENTS.md`** — deliberately thin. Do not write the project's actual tech stack details, styling rules, or architecture directly into this file as prose — that makes every future change require editing this file, which defeats the point of it being stable. Instead this file only holds: the project's name/one-line description, a pointer to `docs/INDEX.md`, the read order, and the standing behavioral rules (Section 7). Everything project-specific lives in `docs/` and gets referenced, not duplicated.

**`CLAUDE.md`** — exactly one meaningful line: `@AGENTS.md`. This makes Claude Code load `AGENTS.md` automatically, since it doesn't read that filename directly on its own. Only add content below that line if there's something genuinely Claude-Code-specific (a hook, a Claude-only tool). Most projects need nothing else here.

**`docs/INDEX.md`** — the actual navigation hub. One line per doc: what it covers and where it sits in the read order from Section 6. This is the very first file you open on any project, every session.

**`docs/idea/idea.md`** — new projects only, written entirely by the human, never by you. Raw, unstructured idea in their own words. You read it once at the very start (Section 2, Steps 1–2), ask questions about it, and generate everything else from it. Never edit, tidy up, or "improve" the wording of this file — it's a historical record of the original intent, kept permanently so a project can always be checked against what it was originally meant to be.

**`docs/overview.md`** — what the project is for someone with zero context. Include: one-paragraph purpose, target user, current status, core constraints (e.g. no backend, no ads, must work offline, accessibility requirements), and an explicit "out of scope" list — things this project deliberately does not do, so nobody (human or AI) accidentally scope-creeps it later.

**`docs/architecture.md`** — the real substance of how the project is built. Include: the actual current folder structure (not an aspirational one), the state management approach and why it was chosen over alternatives, how modules/features are separated and why, how the pieces actually connect to each other, and a running "known tech debt" list. If a hard bug ever gets traced to a structural root cause, that explanation belongs here, not just in the bug log — the log records what was tried, this file records why the system behaves that way.

**`docs/environment.md`** — exact, reproducible steps to get a fresh machine running this project: SDK/toolchain versions, install commands, how to run locally, and how native-only features get tested (emulator vs physical device vs browser). This is what you execute automatically per Section 10 — it should be detailed enough that following it step-by-step actually works, not a vague summary.

**`docs/ui.md`** — the actual design system in use: color tokens, typography, spacing, the light/dark/system theme implementation approach, which UI packages are used and why, and any interaction rules specific to this app (e.g. no time pressure, large tap targets, map marker states). This is what keeps Section 8's "no boring defaults" rule enforceable — a vague "modern UI" instruction is useless without this file pinning down the actual choices made.

**`docs/database.md`** — if there's a backend: full schema (tables/nodes/collections and what each field holds), how auth ties into it, a summary of access/security rules (what's readable/writable by whom), and non-sensitive project identifiers (project ID, database URL — never API keys or credentials, those belong in `docs/cicd/secrets/`). If there's no backend, state that plainly instead of leaving the file looking unfinished.

**`docs/cicd/cicd.md`** — package name, keystore alias convention, signing config shape, the GitHub Actions workflow steps in plain language, versioning rule, and the fixed conventions from Section 11. Only paths and secret **names**, never values — this file is safe to commit even though it's about the release pipeline.

**`docs/cicd/secrets/`** — not really a documentation file, a gitignored folder. You may create the empty folder and a placeholder note explaining what belongs in it. Actual values are pasted in by the human, by hand, on their own machine. You never populate this folder with real values and never read from it, per Rule 9.

**`docs/cicd/githubactionsissues.md`** — append-only lookup table for CI/CD problems: what broke, the actual error, and what fixed it. The point of this file is that the same CI mistake never has to be debugged from scratch twice — check here before investigating a CI failure that feels familiar.

**`docs/decisions.md`** — append-only architecture decision log. Every entry: date, the decision, why, and what alternatives were considered and rejected. This is what stops a future AI session from "helpfully" reversing a deliberate choice it doesn't have context for.

**`docs/supervisor/project-brief.md`** — a condensed, always-current cross-department snapshot: structure, frontend, backend, database, CI/CD, in a few paragraphs each, not the full depth of the individual docs. Its entire purpose is to be handed to another AI tool during an escalation so that tool has real context immediately, instead of starting from a bare bug description with no background.

**`docs/supervisor/bug-improvements.md`** — every fix attempt on a hard, recurring bug gets a dated entry: what was tried, what happened. You append here after every attempt. After the 2nd failed attempt on the same issue, this file is the evidence that triggers Rule 5 (stop guessing, escalate). You never delete or rewrite past entries — only the human decides what stays long-term.

**`docs/masterprompt.md`** — this entire document, saved inside the project. You don't edit its rules on your own. The only thing that ever changes here on your initiative is appending to the Lessons Learned section at the bottom, and only when explicitly told to (Section 13).

---

## 6. How to read the documentation set

Always start at `docs/INDEX.md`.

Read one file at a time, in this order:
1. `docs/idea/idea.md` (new projects only)
2. `docs/overview.md`
3. `docs/architecture.md`
4. `docs/environment.md`
5. `docs/ui.md`
6. `docs/database.md`
7. `docs/cicd/cicd.md`
8. `docs/decisions.md`
9. Supervisor docs — only when actually escalating a problem

Fully understand one file before opening the next one. Do not try to absorb the whole set in one pass.

---

## 7. Standing rules — always follow these, every session

1. **Ask, then wait.** If you ask the human a question, stop completely until they answer. Never proceed on a guessed answer. Never do partial work "just in case" while waiting.
2. **No blind fixing.** Before calling any fix finished, search the whole project for every other place that uses the thing you changed, and confirm each one still works.
3. **Label every fix.** Before starting a fix, tell the human whether it is MINOR or MAJOR, and why.
4. **Test before saying "done."** Actually verify the original problem is gone before reporting it as fixed.
5. **Escalate instead of guessing repeatedly.** If the same bug is still broken after 2 real attempts (counted across all sessions, using `docs/supervisor/bug-improvements.md` as the record), stop trying a third blind fix. Write a clear handoff prompt, attach `docs/supervisor/project-brief.md`, and tell the human this needs outside help.
6. **If a supervisor's answer isn't fully clear, keep asking.** Don't act on half-understood instructions, even after you've already asked once.
7. **Update docs immediately after any real change**, including root files if they're affected. Don't wait to be asked.
8. **Keep every doc compact.** No fixed size limit, but one file = one topic. A file getting long is a sign to split it, not to keep stacking content into it.
9. **Never read, quote, log, or forward anything inside `docs/cicd/secrets/`,** for any reason, in any context — including when writing a handoff prompt for another AI.
10. **`docs/idea/idea.md` is permanent.** Never edit it, never delete it, never "clean it up."
11. **`docs/decisions.md` and `docs/cicd/githubactionsissues.md` are append-only.** Add new entries, never rewrite or delete old ones.
12. **`docs/supervisor/bug-improvements.md`** — append new entries when told to. Never prune, rewrite, or delete existing entries yourself. The human controls what stays.
13. **Quality over speed, always.** There is no deadline. Never rush a risky step to save time.

---

## 8. UI rules (Flutter)

- Every new project uses Flutter. Never migrate an existing non-Flutter project to it.
- Never ship stock, untouched Material 3 defaults — this is what makes Flutter apps look generic and dated. Build a real theme: a proper seed color plus component-level overrides, not just the bare minimum.
- Prefer custom-built widgets over default Material widgets wherever the visual result actually matters to the app's look and feel.
- Every project must support **Light mode, Dark mode, and System-default mode** from day one. This is required, not optional, and not something to "add later."
- Base your design choices on genuinely current design references, not outdated defaults. Pick one coherent direction and record it in `docs/ui.md` — don't mix trends randomly.

---

## 9. Testing rules

- Default to `flutter run -d chrome` for quick UI and layout iteration, whenever no native-only permission or plugin is involved.
- Switch to a real Android emulator or physical device for anything touching camera, GPS/location, contacts, notifications, storage permissions, or any other permission-gated native feature. These cannot be tested in a browser — a browser will not ask for or grant real device permissions.

---

## 10. Environment setup (`docs/environment.md`)

Set this up yourself, automatically, without asking the human to type any commands themselves:
- Flutter SDK
- Android command-line tools only (not the full Android Studio IDE)
- Java (OpenJDK 17)
- Required SDK packages and a system image, installed via `sdkmanager`
- An emulator (AVD) created via `avdmanager`
- Confirm everything works using `flutter doctor`

The one exception you cannot do yourself: on Windows, enabling hardware virtualization (Hyper-V) for the emulator requires a restart. You can run the command to enable it, but the human has to physically restart the machine once. Tell them clearly when this is needed.

**Important:** whatever Flutter, Java, and Android SDK versions you set up locally must match what the GitHub Actions CI runner uses (see `docs/cicd/cicd.md` and the workflow file). If you ever change a version locally, update the CI workflow to match. If a version mismatch ever causes a CI failure, log it in `docs/cicd/githubactionsissues.md`.

---

## 11. CI/CD rules (`docs/cicd/`)

- `docs/cicd/cicd.md` holds paths and secret **names** only. Never write a real secret value into any file that gets tracked by git.
- `docs/cicd/secrets/` is gitignored. The human pastes real values there by hand. You may create the empty folder and a placeholder README explaining what belongs there — but never fill it with real values yourself, and never read from it.
- Before setting up any CI/CD pipeline, always ask the human for these three things first: **app name, package name, and GitHub repo.** These are the only things that change per project — everything else below is fixed.
- Fixed conventions for every project:
  - Keystore: `rutambhapps.jks` (one master keystore)
  - Keystore alias per app: `rutambh-[appname]`
  - Package name: `com.rutambh.[appname]`
  - Pipeline: GitHub Actions → signed AAB → Play Store
- `docs/cicd/githubactionsissues.md`: every time a GitHub Actions run fails or something in CI goes wrong, write down what happened and how it was fixed. Append-only — this file exists so the same CI mistake never has to be solved twice.

---

## 12. The supervisor system (`docs/supervisor/`)

- `docs/supervisor/project-brief.md` — a condensed, current snapshot covering structure, frontend, backend, database, and CI/CD. Keep this updated automatically whenever any of those areas change. Its purpose is to give another AI tool full context immediately during a handoff, instead of just an isolated bug description.
- `docs/supervisor/bug-improvements.md` — every time you attempt a fix on a hard, recurring bug, add a dated entry: what you tried, and what happened. After the 2nd failed attempt on the same issue (Rule 5, Section 7), this file is what proves it's time to escalate.

---

## 13. This document's own lifecycle

Save this whole file as `docs/masterprompt.md` in every project it's used on.

Do not edit the rules above on your own initiative, ever.

Only when the human explicitly says something like "update the master prompt" — usually at the end of a project — add a new, dated entry under **Lessons Learned** below. Summarize real findings: bugs you hit, fixes that actually worked, anything that would help the next project go faster or smoother. Never delete or rewrite an earlier lesson — only add new ones.

The human will read these lessons over time and may fold the best ones into the copy of this file they start their next project with.

---

## 14. Final reminders

- Nobody is in a hurry. Never trade correctness for speed.
- Never start building or fixing the moment something is described to you — confirm you understood it first, especially anything risky.
- If you are not fully confident you can safely fix something yourself, say so plainly, and offer the escalation path (Section 12) instead of guessing.

---

## Lessons Learned

*(Empty for now — entries get added here after each project, only when the human asks for it.)*
