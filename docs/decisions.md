# Architecture Decisions

Append-only log. Never rewrite or delete old entries.

---

### 2026-07-06 — Initial decision log (retroactive, created from project audit)

#### Decision: 100% local architecture, no backend
**Why**: Zero infrastructure cost, maximum privacy, no data leaves the device. The app's value prop is "free forever" — a backend would introduce costs and maintenance.
**Alternatives considered**: Firebase Firestore (used in other rutambh apps), Supabase. Both rejected because HireScope doesn't need cloud sync or multi-device access.

#### Decision: WebView-based scraping via `react-native-webview`
**Why**: Public websites render dynamic content that requires a real browser environment. WebViews let us execute JavaScript on actual pages, handle cookies/JS-rendered content, and extract data — all without any API keys or server-side proxy.
**Alternatives considered**: Server-side scraping proxy (rejected — requires backend infrastructure), direct HTTP fetch (rejected — most salary/review sites require JS rendering).

#### Decision: Zustand for state management
**Why**: Lightweight, no boilerplate, first-class persistence middleware. The app has only 4 stores with simple shapes — Redux would be over-engineered.
**Alternatives considered**: Redux Toolkit (too heavy for this scope), React Context (no built-in persistence, prop drilling issues at scale).

#### Decision: Deterministic extraction pipeline (regex/heuristic) as primary, AI as optional enhancement
**Why**: AI models are large (~350 MB GGUF download), slow on lower-end devices, and not available by default. The app must deliver useful results without any AI model installed. The regex pipeline (`dataExtractor.ts` + `themeEngine.ts` + `merger.ts`) handles extraction deterministically.
**Alternatives considered**: AI-only extraction (rejected — download requirement would block first use), cloud AI APIs (rejected — contradicts zero-cost, zero-backend philosophy).

#### Decision: On-device GGUF model via `llama.rn` (optional)
**Why**: Users who want richer narrative summaries can download a small model (Qwen 2.5 0.5B, ~350 MB). Runs entirely on-device — no API key, no cloud, no cost. This is strictly an enhancement layer on top of the deterministic pipeline.
**Alternatives considered**: TensorFlow Lite (less flexible for text generation), ONNX Runtime (less mature for LLM inference on mobile).

#### Decision: No separate searching/progress screen — background research via History tab
**Why**: The original PRD specified a `searching.tsx` screen, but the current implementation pins active research cards to the top of the History tab with real-time progress bars and cancel buttons. This approach lets the user start a search and immediately navigate elsewhere — the research runs globally in the background (WebView is mounted in root `_layout.tsx`).
**Alternatives considered**: Dedicated searching screen (PRD original design — would block navigation during research).

#### Decision: React Native + Expo (not Flutter) for this project
**Why**: This project was started before the Flutter-only rule. It uses Expo SDK 54, react-native-webview, and llama.rn — all mature React Native libraries. Per masterprompt Section 3 Step 8: existing non-Flutter projects are not migrated.

#### Decision: GitHub Actions CI/CD with direct Gradle builds (no EAS)
**Why**: $0 cost — GitHub Actions free tier (2000 min/month) is sufficient. EAS cloud builds cost money and have queue delays. The pipeline uses `expo prebuild` + `gradlew bundleRelease` + `r0adkll/upload-google-play` for automated Play Store submission.
**Alternatives considered**: EAS Build (rejected — subscription cost), local-only builds (rejected — no automation).

---

### 2026-07-07 — Re-enabling AI settings, restart triggers, and Results Confidence rendering

#### Decision: Rendering ConfidenceCard on the Results screen
**Why**: The results page displayed the heuristic metrics but lacked the high-level metadata (domains scraped, elapsed time) and optional on-device AI natural summaries. Rendering `ConfidenceCard` directly on the Results screen bridges this display gap.

#### Decision: DevSettings-based reloading for local model activation
**Why**: Once the 350 MB GGUF model completes download and integrity checks, the on-device inference context needs to be initialized. Standard React Native `DevSettings.reload()` provides a safe reload mechanism for development builds without introducing additional native update libraries.

#### Decision: Diagnostics logging for AsyncStorage History Store
**Why**: Hydration timing and AsyncStorage serialization are difficult to trace silently in local-only environments. Injecting hydration logs (`onRehydrateStorage`) and transaction hooks lets developers trace reads/writes reactively.

#### Decision: Settings screen cleanup (Removing Logout/Donate, adding native Sharing)
**Why**: The application operates in a completely serverless, zero-login context, making a "Logout" button obsolete and confusing for users. The "Donate" section was removed to clean up visual space on Settings. Additionally, replaced simple URL opening with native React Native `Share` capabilities to allow users to share the app with a friendly summary message alongside the Play Store URL.


