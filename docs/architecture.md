# Architecture

## Folder Structure (actual, current)

```
├── app/                            # Expo Router screens
│   ├── (tabs)/                     # Bottom tab navigator
│   │   ├── _layout.tsx             # Tab bar config (Search, History, Settings)
│   │   ├── index.tsx               # Search screen (5 filter form)
│   │   ├── history.tsx             # Search history list + active research cards
│   │   └── settings.tsx            # Theme, AI model, domain limits, battery, about
│   ├── _layout.tsx                 # Root layout — global BackgroundScraper mount
│   ├── results.tsx                 # Consolidated results display
│   └── research-details.tsx        # Deep-dive view of scraping metadata
├── src/
│   ├── components/                 # Reusable UI widgets
│   │   ├── BackgroundScraper.tsx   # Hidden WebView manager (mounted globally)
│   │   ├── ConfidenceCard.tsx      # Data confidence display (high/medium/low/minimal)
│   │   ├── ExperienceSlider.tsx    # Custom horizontal slider (1–30 years)
│   │   ├── FilterDropdown.tsx      # Searchable dropdown (country picker)
│   │   ├── HistoryCard.tsx         # History list item with progress + cancel
│   │   ├── ProgressBar.tsx         # Animated progress ring
│   │   ├── ProsConsCard.tsx        # Pros/Cons themed list
│   │   ├── RatingStars.tsx         # Star rating display
│   │   ├── SalaryCard.tsx          # Salary range + hike display
│   │   └── SalaryInput.tsx         # Currency-aware numeric input
│   ├── constants/
│   │   ├── config.ts               # All app-wide config in one place
│   │   ├── countries.ts            # Country → currency/format mapping (8 countries)
│   │   └── theme.ts                # Color palette, spacing, radius, shadows, typography
│   ├── hooks/
│   │   ├── useAIModel.ts           # On-device GGUF model download/run via llama.rn
│   │   ├── useDomainScraper.ts     # WebView URL discovery + page scraping orchestrator
│   │   ├── useNotification.ts      # Local notification helper
│   │   └── useScraper.ts           # Main orchestrator (ties domain scraping + AI together)
│   ├── store/                      # Zustand state stores
│   │   ├── aiModelStore.ts         # AI model download/install status (persisted)
│   │   ├── appStore.ts             # Theme selection + domain limit (persisted)
│   │   ├── historyStore.ts         # Search history records (persisted, max 20)
│   │   └── searchStore.ts          # Active search state + viewer state (not persisted)
│   ├── types/
│   │   └── index.ts                # All TypeScript type definitions
│   ├── ui/                         # (empty — reserved for future shared UI primitives)
│   └── utils/
│       ├── aiEnhancer.ts           # Builds AI prompt + parses AI response for enhancement
│       ├── currency.ts             # Currency formatting helpers
│       ├── dataExtractor.ts        # Regex-based extraction of ratings, salaries, pros/cons
│       ├── logger.ts               # Tagged console logger with log levels
│       ├── merger.ts               # Summary Engine — merges all records into FinalResults
│       ├── outlierDetection.ts     # Median-based outlier removal (2x threshold)
│       ├── themeEngine.ts          # Keyword→theme clustering for pros/cons
│       └── urlExtractor.ts         # (stub — URL extraction moved inline to useDomainScraper)
├── assets/images/                  # App icons, splash, notification icon
├── scripts/bump-version.js         # Auto-increment versionCode + version on build
├── whatsnew/whatsnew-en-US          # Play Store release notes
├── .github/workflows/release.yml   # CI/CD pipeline
├── app.json                        # Expo config (package name, icons, plugins)
├── package.json                    # Dependencies and scripts
└── tsconfig.json                   # TypeScript config
```

## State Management

**Zustand** with selective persistence via `zustand/middleware` + `AsyncStorage`.

| Store | Persisted | Purpose |
|---|---|---|
| `appStore` | ✅ | Theme preference (`light`/`dark`/`system`), max domains setting |
| `historyStore` | ✅ | Search history records (max 20, FIFO eviction) |
| `aiModelStore` | ✅ | AI model download state, resume URI, installed version |
| `searchStore` | ❌ | Active search progress, viewer state for results screen |

**Why Zustand**: Lightweight, no boilerplate, easy persistence integration. No Redux overhead needed for this app's scope.

## Data Pipeline

The scraping pipeline has three layers:

### Layer 1: URL Discovery + Page Scraping (`useDomainScraper`)
1. Builds search queries from templates in `config.ts` × search engines (DuckDuckGo, Google, Brave, Bing, Yahoo)
2. Loads each search engine URL in a hidden WebView
3. Extracts result URLs from the rendered DOM via injected JavaScript
4. Scrapes each discovered URL by loading it in a WebView and extracting page text
5. Stores each page's raw text as a `RawDataPoint`

### Layer 2: Deterministic Extraction + Merging (`merger.ts`, `dataExtractor.ts`, `themeEngine.ts`)
1. `dataExtractor` uses regex patterns to pull ratings (X/5), salaries (LPA, yearly, monthly formats), pros/cons sections, and review snippets from raw text
2. `outlierDetection` removes salary values > 2× or < 0.5× the median
3. `themeEngine` clusters raw pro/con strings into canonical themes (e.g., "Work Culture", "Low Compensation") by keyword matching
4. `merger` aggregates all structured records into one `FinalResults` object

### Layer 3: Optional AI Enhancement (`useAIModel`, `aiEnhancer`)
1. If an on-device GGUF model is installed, a structured prompt is built with all scraped data
2. The model runs locally via `llama.rn`
3. The AI's narrative summary is appended to `FinalResults.aiEnhancedSummary`

### Layer 4: Orchestration (`useScraper`)
- Ties everything together: starts domain scraping, waits for completion or timeout, runs merger, optionally runs AI enhancement, fires notification, saves to history

## Module Boundaries

- **Screens** (`app/`) only read from stores and call hook actions. They never contain business logic.
- **Hooks** (`src/hooks/`) own the orchestration logic. They call utilities and update stores.
- **Utils** (`src/utils/`) are pure functions with no side effects (except `logger`).
- **Stores** (`src/store/`) are Zustand slices — thin state containers with setters.
- **Components** (`src/components/`) are presentational. They receive data via props and emit callbacks.

## Known Tech Debt

1. **`src/ui/` is empty** — was reserved for shared UI primitives but never populated. Components currently define their own styles inline.
2. **`urlExtractor.ts` is a stub** (3 lines, empty export) — URL extraction was moved inline into `useDomainScraper.ts`.
3. **No EngineCard component** — the PRD specified an `EngineCard.tsx` for the settings screen, but the settings screen currently handles engine display inline.
4. **No separate searching screen** — the PRD specified a `searching.tsx` progress screen, but background research is shown via pinned cards on the History tab instead.
5. **Stitch redesign folder** — `stitch_career_lens_redesign/` contains UI design exploration artifacts from a Stitch MCP session. Not referenced by any code.
