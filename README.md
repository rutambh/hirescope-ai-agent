# HireScope (Career Lens App)

**HireScope** is a premium, 100% local, zero-server React Native Expo mobile application designed to help job seekers compile detailed salary ranges, employee reviews, company ratings, and expected hike percentages before interviews. 

By leveraging hidden background WebViews, HireScope queries public AI chatbots and crawls domain search results (such as Glassdoor, Payscale, and professional forums) in parallel, merging unstructured data points locally on the device.

---

## 🚀 Key Features

* **Parallel Local Scrape Coordinator**: Offloads research requests to parallel, hidden `react-native-webview` instances running locally on the device.
* **Dual-Mode Synthesis Fallback**: Features a local regex-based heuristic parsing engine that extracts ratings and salary data directly from unstructured scraped web text if AI engines are rate-limited, blocked, or offline.
* **Deep Regional Filtering**: Narrow searches down by **Country**, **State**, and **District** (custom cascading selections tailored for India, US, UK, Canada, UAE, Australia, Germany, and Singapore).
* **Multi-Word Search Precision**: Automatically refines multi-word job role inputs (e.g., `QA Automation` is queried as `+QA +Automation`) to ensure search engines return pages containing all keywords.
* **Global Background Execution**: Scraper WebViews are mounted in the app's root layout, allowing research tasks to execute globally in the background even if the user navigates back to the main menu.
* **Unified History & Search Tracking**: Pins active background research cards to the top of the History list with real-time progress bars and cancellation triggers. History records are sorted in descending order (most recent first).
* **Dynamic Theme Engines**: Seamlessly transitions container panels, text labels, input fields, dropdown selection overlays, and modals between **Light Mode**, **Dark Mode**, and **System Default** settings.
* **Android Settings Intent Hooks**: Direct buttons in Settings to launch native Android settings pages for **Battery Optimization** (`IGNORE_BATTERY_OPTIMIZATION_SETTINGS`) and **Background Activity** (`APPLICATION_DETAILS_SETTINGS`).
* **Zero External Dependencies**: Operates with no central backend database, preserving maximum privacy and ensuring zero runtime operating costs.

---

## 🛠️ Architecture & Tech Stack

* **Framework**: React Native with Expo SDK 54.0.8 (using `expo-router` for file-based Stack/Tab layouts).
* **State Management**: Zustand with persistent storage (`AsyncStorage`) for caching search history, enabled engines, and theme configurations.
* **Automation & Scraping**: `react-native-webview` with optimized JavaScript injection blocks:
  * Custom elements filtering to bypass file uploads and resolve React inputs natively.
  * Welcome dialog clickers to auto-dismiss cookies and start-up overlays.
* **Local Notifications**: `expo-notifications` alerts the user immediately when background research is compiled.
* **Outlier Detection**: Calculates median salaries and removes entries more than 2x out of the median range before compiling min/max ranges and hike statistics.

---

## 📂 Project Structure

```
├── app/                       # Expo Router application screens
│   ├── (tabs)/                # Bottom tabs (Search, History)
│   │   ├── _layout.tsx        # Dynamic tab bar configuration
│   │   ├── index.tsx          # Search form filter screen
│   │   └── history.tsx        # Active tracking and search records list
│   ├── _layout.tsx            # Global layout wrapper & background WebView mount
│   ├── settings.tsx           # Themes, permissions, and support screen
│   └── results.tsx            # Consolidated salaries, ratings, and pros/cons
├── src/
│   ├── components/            # Reusable UI widgets (ProgressBar, Dropdowns, cards)
│   ├── constants/             # Country structures, config limits, and locations
│   ├── hooks/                 # Scraper hook coordination, AI WebView controllers
│   ├── store/                 # Zustand state managers (engine, history, search)
│   ├── types/                 # Typings for search filters and raw/parsed data
│   └── utils/                 # Prompts, parsers, and outlier calculations
├── AIConfig.json              # Main developer search configuration
├── app.json                   # Expo package assets and icon configs
└── tsconfig.json              # TypeScript compilation setup
```

---

## ⚙️ AI Engine Configuration (`AIConfig.json`)

Developers can easily configure, add, or disable AI engines, change search URL selectors, and update crawling parameters at the project root ([AIConfig.json](file:///c:/Users/ULTRON/Documents/Hire_Scope/AIConfig.json)). The app synchronizes configuration parameters on every mount:

```json
{
  "totalDomainsToGo": 50,
  "maxAiEnginesCount": 20,
  "maxNonAiDomainsCount": 30,
  "engines": [
    {
      "id": "perplexity",
      "name": "Perplexity AI",
      "enabled": true,
      "url": "https://www.perplexity.ai",
      "inputSelector": "textarea[placeholder]"
    },
    ...
  ]
}
```

---

## 💻 Development Workflow

### Prerequisites
Install Node dependencies:
```bash
npm install
```

### Start Development Server
Run the local Metro bundler:
```bash
npm run start
# or
npx expo start
```

### Compile & Type Checks
Verify that the codebase compiles cleanly with zero type errors:
```bash
npx tsc --noEmit
```

### Native Android Prebuild
Scaffold the native `./android` scaffolding directory to check asset compatibility and native package linkages:
```bash
npm run prebuild
# or
npx expo prebuild --platform android --no-install
```

### Local Production Builds
Build the release bundle for local testing:
```bash
npm run build:local
```

---

## ✈️ CI/CD Deployment

The repository includes a GitHub Actions release pipeline (`.github/workflows/release.yml`) that triggers automated builds on push to the `main` branch. 

### Secrets to Configure
Under **Settings > Secrets and variables > Actions**, add the following repository secrets:
1. `ANDROID_KEYSTORE_BASE64`: Base64 encoded keystore file.
2. `ANDROID_KEYSTORE_PASSWORD`: Keystore decryption password.
3. `ANDROID_KEY_ALIAS`: Keystore certificate alias.
4. `ANDROID_KEY_PASSWORD`: Certificate password.
5. `GOOGLE_SERVICE_ACCOUNT_JSON`: Service account JSON credential with play store upload access.

---

## 🤝 UI/UX Design System & Theme Engine

HireScope uses a premium, harmonious design system that adapts dynamically to the user's theme selection:
* **Backgrounds & Containers**: Deep navy hues (`#090D1A`, `#121829`) in Dark Mode and crisp white/slate-50 backgrounds in Light Mode.
* **Safe Areas & Status Bar**: Header bar components integrate with `react-native-safe-area-context` to match status bar background colors, resolving theme-based high contrast.
* **Typography**: Clean hierarchy with responsive fonts using Google-inspired Outfit or Inter layouts.
* **Components**: Custom sliders, dropdown selections, input cards, progress rings, and dialog windows automatically toggle border colors, backdrop highlights, and fonts.
