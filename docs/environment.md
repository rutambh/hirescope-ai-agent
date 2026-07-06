# Environment

Exact steps to get a fresh Windows machine running this project.

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20.x LTS | Runtime for Metro bundler and build scripts |
| npm | (bundled with Node) | Package manager |
| Java (OpenJDK) | 17 | Android Gradle builds (CI uses Zulu JDK 17) |
| Git | Any recent | Version control |

## Setup Steps

### 1. Install Node.js

Download and install Node.js 20 LTS from https://nodejs.org. Verify:
```bash
node --version   # should show v20.x.x
npm --version
```

### 2. Install project dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run start
# or
npx expo start
```

Scan the QR code with **Expo Go** on a physical Android device for quick iteration.

### 4. TypeScript check

Verify the codebase compiles cleanly:
```bash
npx tsc --noEmit
```

### 5. Native Android prebuild

Generate the native `./android` directory to verify asset compatibility:
```bash
npm run prebuild
# or
npx expo prebuild --platform android --no-install
```

### 6. Local production build

Build a signed release AAB for local testing (requires JDK 17 and a keystore):
```bash
npm run build:local
```

This runs: `bump-version.js` → `expo prebuild` → `gradlew bundleRelease`.

## Testing

| Scenario | Method |
|---|---|
| UI layout, styling, navigation | Expo Go on physical device via `npx expo start` |
| Background WebView scraping | Physical Android device (WebView requires real network) |
| Local notifications | Physical Android device |
| Release build verification | `npm run build:local` → install APK via `adb install` |

**Note**: This app cannot be tested in a browser or iOS simulator — it relies heavily on `react-native-webview` and Android-specific intents.

## CI Environment (must match)

The GitHub Actions runner uses:
- **Node.js 20** (`actions/setup-node@v4`)
- **Zulu JDK 17** (`actions/setup-java@v4`)
- **Ubuntu latest** runner

If you change a local SDK version, update `.github/workflows/release.yml` to match.
