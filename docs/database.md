# Database

## No Backend

HireScope has **no backend server, no cloud database, and no remote data store**. This is a deliberate architectural decision — the app is 100% local by design (see `docs/overview.md` → Core Constraints).

## Local Storage

All persistent data lives on the device via **AsyncStorage** (key-value store), managed through Zustand middleware.

### Store Schemas

#### `appStore` (key: `hirescope-app-store`)

| Field | Type | Default | Purpose |
|---|---|---|---|
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | User's theme preference |
| `maxDomainsToScrape` | `number` | `50` | Max domains per search (user-adjustable in Settings) |

#### `historyStore` (key: `hirescope-history-store`)

| Field | Type | Purpose |
|---|---|---|
| `searches` | `SearchRecord[]` | Array of past search results (max 20, FIFO eviction) |

Each `SearchRecord` contains:
- `id` — UUID
- `timestamp` — ISO date string
- `filters` — the search filters used (`SearchFilters`)
- `results` — full `FinalResults` object (ratings, salaries, pros/cons, confidence, etc.)

#### `aiModelStore` (key: `hirescope-ai-model-store`)

| Field | Type | Default | Purpose |
|---|---|---|---|
| `status` | `AIModelStatus` | `'not_installed'` | Current model state |
| `downloadedBytes` | `number` | `0` | Download progress |
| `totalBytes` | `number` | `0` | Total file size |
| `installedVersion` | `string \| null` | `null` | Installed model version |
| `resumeUri` | `string \| null` | `null` | Resumable download URI |

**Persisted fields** (via `partialize`): `status`, `installedVersion`, `resumeUri`, `downloadedBytes`, `totalBytes`.
Transient fields (`speedBytesPerSec`, `errorMessage`) are not persisted.

#### `searchStore` (not persisted)

Holds the active search state (phase, progress, raw data points, scraper URL) and viewer state (filters + final results for the results screen). Reset on app restart.

## Data Types

All type definitions live in [`src/types/index.ts`](../src/types/index.ts):

- `SearchFilters` — company, role, experience, salary, currency info (country hardcoded to India)
- `RawDataPoint` — one scraped page's raw text + metadata
- `StructuredRecord` — extracted rating, salaries, pros, cons, snippets from one page
- `ThemeFrequency` — canonical theme label + occurrence count
- `FinalResults` — aggregated results with confidence score
- `SearchRecord` — filters + results for history storage
- `AIModelStatus` / `AIModelInfo` — model lifecycle types
