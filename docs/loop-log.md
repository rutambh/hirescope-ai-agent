# Loop Log

Cross-iteration memory for the universal work loop. Each entry: timestamp, task, result, what was learned.

---

## 2026-07-10 — Session 2

### Task: Settings — add spacing between AI tile and Visual Theme tile
- **Result:** PASS — Added `marginBottom: Spacing.md` to `aiCard` style. Gap was 0px before; now matches the 16px inter-section gap used between other glassCards.
- **Learned:** AI card had no bottom margin and Visual Theme card had no top margin — they sat flush. Always check both sides of a gap.

### Task: AI download prompt — improve button styling and enhance message
- **Result:** PASS — Rewrote title to "Unlock AI-Powered Insights", enhanced body copy, added 3 feature chips (100% Private, On-Device, No Internet), made Download button show size inline, increased button height to 48, rounded to Radius.lg.
- **Learned:** Feature chips with colored backgrounds give users quick scannable value props without reading long paragraphs.

### Task: AI download prompt — redirect to Settings on Download click
- **Result:** PASS — Changed `handleDownload` to call `router.push('/(tabs)/settings')` instead of `aiModel.downloadModel()`. Removed unused `useAIModel` import.
- **Learned:** Prompt is now a "learn more" entry point — user decides to download on the Settings page where they see full controls.

### Task: Show download progress notification during AI model download
- **Result:** PASS — Created `useAiDownloadNotification.ts` hook that subscribes to Zustand store. Shows/updates a persistent notification with progress percentage and bytes while downloading, cancels on completion/error, and shows a one-shot "ready" or "failed" notification. Mounted in root `_layout.tsx`.
- **Learned:** Using a stable `identifier` with `Notifications.scheduleNotificationAsync` allows updating the same notification in-place. Throttling is handled by the Zustand store's existing 300ms throttle on `setProgress`.

---

## 2026-07-10 — Session 1

### Task: In-depth Code Review
- **Result:** PASS
- **Findings:** 6 bugs found (1 MAJOR, 5 MINOR). Architecture is sound — clean separation of concerns with Zustand stores, dedicated hooks, and utility modules.
- **Learned:** Model config hardcoded "~350 MB" in delete alert instead of using `APP_CONFIG`. HistoryCard had unused imports and hardcoded light-mode border color.

### Task: Fix settings.tsx delete alert hardcoded ~350MB
- **Result:** PASS — Changed to use `APP_CONFIG.modelExpectedSizeMb` dynamically.
- **Learned:** Always reference config constants for display values, never hardcode.

### Task: Fix HistoryCard unused imports + hardcoded border
- **Result:** PASS — Removed unused `Image` import, `COVER_IMAGES` array, and replaced hardcoded `rgba(255,255,255,0.05)` with `c.border`.
- **Learned:** Check for dead code and theme-inconsistent hardcoded colors.

### Task: Fix settings.tsx unused Switch import
- **Result:** PASS — Removed unused `Switch` from import.

### Task: Fix results.tsx type-unsafe router cast
- **Result:** PASS — Changed `(router as any).push(...)` to `router.push(... as any)`.

### Task: Research smaller AI models (<300MB)
- **Result:** PASS — Selected Qwen2.5-0.5B-Instruct (q4_k_m, ~300MB). Previous model was Qwen2.5-1.5B at 1000MB (3x too large).
- **Learned:** Qwen2.5-0.5B is sufficient for structured extraction and short-form generation on mobile. q4_k_m is the best size-quality tradeoff.

### Task: Update config to use smaller model
- **Result:** PASS — Updated download URL, expected size (300MB), model version (3.0), and validation thresholds.

### Task: Implement first-load AI download prompt
- **Result:** PASS — Created `AiDownloadPrompt.tsx` component with Later/Download buttons. Added `promptDismissed` flag to `aiModelStore`. Shows only on first launch when model is not installed.
- **Learned:** Use persisted Zustand state for one-time prompts instead of AsyncStorage directly.
