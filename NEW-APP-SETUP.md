# 🚀 New App Setup Guide — React Native (Expo) + GitHub Actions CI/CD

> **Reference**: See `CICD-SETUP.md` for full technical details. This guide is your **step-by-step pre-flight checklist** to avoid every problem encountered building Tithi Mitra from scratch.

---

## 🧠 PHILOSOPHY

| Principle | Decision |
|---|---|
| **Local Testing** | `npx expo start` → Expo Go on physical device |
| **Release Builds** | GitHub Actions CI on Ubuntu runner (FREE) |
| **EAS Cloud Builds** | ❌ Bypassed — costs money, has build queues |
| **App Signing** | Local `.jks` keystore → base64 encoded → GitHub Secret |
| **Deployment** | Automated push to Play Store internal track on every `main` push |

---

## 📦 TECH STACK

### Core
| Layer | Technology | Why |
|---|---|---|
| Framework | **React Native + Expo SDK 56** | Managed workflow, fast iteration |
| Language | **TypeScript** | Type safety, fewer runtime bugs |
| Routing | **Expo Router v4** (file-based) | Clean, convention-based navigation |
| State | **Zustand** | Lightweight, no boilerplate |
| Styling | **StyleSheet API** (React Native built-in) | No extra deps, native perf |

### Backend / Services
| Layer | Technology | Why |
|---|---|---|
| Auth & DB | **Firebase (Firestore + Auth)** | Free tier generous, realtime, no server |
| Notifications | **expo-notifications** | Deep OS integration |
| Storage | **AsyncStorage** | Local persistence |

### Build & Release
| Layer | Technology | Why |
|---|---|---|
| CI/CD | **GitHub Actions** | $0 cost, 2000 min/month free |
| Android Build | **Gradle (bundleRelease)** | Direct AAB generation, no EAS |
| Store Upload | **r0adkll/upload-google-play@v1** | Automated Play Store submission |
| Versioning | **Custom Node.js script** | Auto-increment on every CI run |

---

## ✅ PHASE 1 — BEFORE WRITING ANY CODE

### 1.1 Decide These First (Cannot Change Later!)

- [ ] **App Name** — Exact name on Play Store and device home screen
- [ ] **Package Name** — Format: `com.rutambh.[appname]` (e.g., `com.rutambh.safearrival`)
  > ⚠️ **CRITICAL**: Once uploaded to Play Store, the package name can **NEVER** be changed. A wrong name = a dead app.

- [ ] **Key Alias** — Format: `rutambh-[appname]` (e.g., `rutambh-safearrival`)
  > ⚠️ **CRITICAL**: Consistent with keystore. Mismatch = cannot update app ever again.

### 1.2 Generate the Keystore (Do This First)

```powershell
# Run in PowerShell from anywhere
keytool -genkeypair -v `
  -keystore C:\rutambh\keystores\rutambh-[appname].jks `
  -alias rutambh-[appname] `
  -keyalg RSA -keysize 2048 -validity 10000
```

**Store the `.jks` in `C:\rutambh\keystores\` — NEVER commit to Git.**

Then encode it for GitHub Secrets:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\rutambh\keystores\rutambh-[appname].jks")) | Out-File keystore_base64.txt
```

---

## 🛠️ PHASE 2 — PROJECT INITIALIZATION

### 2.1 Create the Expo Project

```bash
npx create-expo-app@latest [app-folder-name] --template blank-typescript
cd [app-folder-name]
```

### 2.2 Set Up `app.json` Correctly (From Day 1)

This is the most critical config file. Set it up completely before any build:

```json
{
  "expo": {
    "name": "[App Display Name]",
    "slug": "[app-slug]",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "[appslug]",
    "userInterfaceStyle": "automatic",
    "android": {
      "package": "com.rutambh.[appname]",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "backgroundColor": "#FFFFFF"
      }
    },
    "ios": {
      "bundleIdentifier": "com.rutambh.[appname]",
      "supportsTablet": true
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#090D1A",
          "android": {
            "image": "./assets/images/transparent.png",
            "imageWidth": 1
          }
        }
      ],
      "expo-font",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "[your-eas-project-id]"
      }
    },
    "owner": "rutambh"
  }
}
```

### 2.3 Required Asset Files (Create Before First Build)

| File | Purpose | Notes |
|---|---|---|
| `assets/images/icon.png` | App icon (Expo Go + iOS) | 1024×1024 px |
| `assets/images/android-icon-foreground.png` | Android adaptive icon foreground | 1024×1024 px |
| `assets/images/android-icon-background.png` | Android adaptive icon background | 1024×1024 px |
| `assets/images/notification-icon.png` | Android notification icon | Must be **white on transparent** |
| `assets/images/transparent.png` | Splash screen placeholder | 1×1 px transparent PNG |
| `assets/images/favicon.png` | Web favicon | 32×32 px |

> ⚠️ **notification-icon.png MUST be white on transparent background.** A colored icon causes a white square in notification tray and can crash release builds.

---

## 🗂️ PHASE 3 — FOLDER STRUCTURE

Set up this structure from day 1 to avoid refactoring later:

```
├── src/
│   ├── components/      # Reusable UI components
│   ├── constants/
│   │   └── config.ts    # ← ALL magic strings live here (UPI ID, URLs, keys)
│   ├── hooks/           # Custom React hooks
│   ├── store/           # Zustand stores
│   ├── utils/           # Pure utility functions
│   └── types/           # TypeScript type definitions
├── app/                 # Expo Router screens (file-based routing)
│   ├── (tabs)/
│   │   └── _layout.tsx
│   ├── _layout.tsx
│   └── index.tsx
├── assets/
│   └── images/          # All image assets
├── scripts/
│   └── bump-version.js  # ← Auto-versioning for CI/CD
├── whatsnew/
│   └── whatsnew-en-US   # ← Play Store release notes (max 500 chars)
├── .github/
│   └── workflows/
│       └── release.yml  # ← CI/CD pipeline
├── app.json
├── eas.json
└── package.json
```

### The `constants/config.ts` Rule

Put ALL app-wide config in one place. Never scatter magic strings:

```typescript
// src/constants/config.ts
export const APP_CONFIG = {
  upiId: 'rutambh@upi',
  merchantName: 'Rutambh',
  appName: '[App Name]',
  supportEmail: 'rutambh@gmail.com',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.rutambh.[appname]',
} as const;
```

---

## 🔄 PHASE 4 — CI/CD PIPELINE SETUP

> ⚠️ **Read this section top-to-bottom. Every item here was a real failure in Tithi Mitra.**

### 4.1 Create the Version Bump Script

File: `scripts/bump-version.js`

```javascript
const fs = require('fs');
const path = require('path');
const appJsonPath = path.join(__dirname, '../app.json');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Increment Android versionCode
appJson.expo.android.versionCode = (appJson.expo.android.versionCode || 0) + 1;

// Increment patch version (1.0.0 → 1.0.1)
const parts = appJson.expo.version.split('.');
parts[2] = String(Number(parts[2]) + 1);
appJson.expo.version = parts.join('.');

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`Version: ${appJson.expo.version}, Code: ${appJson.expo.android.versionCode}`);
```

### 4.2 Create the GitHub Actions Workflow

File: `.github/workflows/release.yml`

```yaml
name: Build and Release to Play Store (Free)

on:
  push:
    branches:
      - main

permissions:
  contents: write    # ← REQUIRED: allows bot to push version bump back to repo

jobs:
  release:
    name: Build & Submit Android App
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Setup Java (JDK 17)
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Install Dependencies
        run: npm ci

      - name: Auto-increment Version in app.json
        run: node scripts/bump-version.js

      - name: Commit and Push Version Bump
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add app.json
          git commit -m "chore: bump version [skip ci]" || echo "No changes to commit"
          git push     # ← [skip ci] in message prevents infinite loop

      - name: Generate Native Android Project
        run: npx expo prebuild --platform android --no-install

      - name: Decode Keystore
        run: |
          echo '${{ secrets.ANDROID_KEYSTORE_BASE64 }}' | base64 --decode > android/app/rutambhapps.jks

      - name: Configure signing in build.gradle
        run: |
          cat << 'EOF' > configure-signing.js
          const fs = require('fs');
          const file = 'android/app/build.gradle';
          let content = fs.readFileSync(file, 'utf8');

          // Insert release signingConfig before debug block
          content = content.replace('debug {', `release {
                      storeFile file("rutambhapps.jks")
                      storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                      keyAlias System.getenv("ANDROID_KEY_ALIAS")
                      keyPassword System.getenv("ANDROID_KEY_PASSWORD")
                  }
                  debug {`);

          // Switch buildTypes.release to use release signing (not debug)
          // NOTE: Uses [^}]*? to avoid matching closing brace of nested blocks
          content = content.replace(
            /release\s*\{([^}]*?)signingConfig\s*signingConfigs\.debug/,
            'release {$1signingConfig signingConfigs.release'
          );

          fs.writeFileSync(file, content);

          // Strict verification — fail the build if signing wasn't applied
          const updated = fs.readFileSync(file, 'utf8');
          if (!updated.includes("rutambhapps.jks") ||
              !updated.includes("signingConfig signingConfigs.release")) {
            console.error("FATAL: build.gradle signing config was NOT applied correctly!");
            process.exit(1);
          }
          console.log("build.gradle signing configured successfully.");
          EOF
          node configure-signing.js

      - name: Build and Sign Android App Bundle (AAB)
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          cd android
          chmod +x gradlew
          ./gradlew bundleRelease

      - name: Upload to Google Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
          packageName: com.rutambh.[appname]         # ← CHANGE THIS per app!
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal
          whatsNewDirectory: whatsnew/
```

### 4.3 Configure GitHub Secrets (One-Time Per Repo)

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value | How to Get It |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64 of `.jks` file | PowerShell command above |
| `ANDROID_KEYSTORE_PASSWORD` | Your keystore password | Set when generating keystore |
| `ANDROID_KEY_ALIAS` | `rutambh-[appname]` | Set when generating keystore |
| `ANDROID_KEY_PASSWORD` | Your key password | Set when generating keystore |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contents of service account JSON | Google Cloud Console (reuse across apps!) |

> 💡 **REUSE THE GOOGLE SERVICE ACCOUNT**: You don't create a new one per app. Go to **Play Console → Users and permissions** and add the existing service account email to each new app.

### 4.4 Play Store — First-Time Setup (Manual, One-Time)

The CI/CD pipeline ONLY works after you manually upload the **very first AAB**:

1. Build locally: `npm run build:local` (or run workflow, download artifact)
2. Go to Play Console → Create New App
3. Upload AAB manually to **Internal Testing** track
4. Fill in store listing (title, description, screenshots)
5. Set Content Rating and Target Audience
6. Submit for first review
7. After approval → CI/CD handles all future releases automatically

### 4.5 Release Notes Setup

Create `whatsnew/whatsnew-en-US` (plain text, max 500 characters):

```
Initial release with core features.
```

Update this file with each meaningful release before pushing to `main`.

---

## ⚙️ PHASE 5 — PACKAGE.JSON SCRIPTS

Add these to `package.json` for convenience:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build:local": "node scripts/bump-version.js && npx expo prebuild --platform android --no-install && cd android && gradlew bundleRelease",
    "prebuild": "npx expo prebuild --platform android --no-install",
    "lint": "eslint . --ext .ts,.tsx"
  }
}
```

---

## 🚧 PHASE 6 — KNOWN PITFALLS (HARD-LEARNED)

> These are real failures encountered building Tithi Mitra. Avoid them from day 1.

---

### ❌ PITFALL 1: `Permission denied (403)` — Bot Can't Push Version Bump

**What happens**: CI fails at the "Commit and Push Version Bump" step with error:
```
remote: Permission to [repo] denied to github-actions[bot].
fatal: unable to access: The requested URL returned error: 403
```

**Why**: `GITHUB_TOKEN` defaults to read-only.

**Fix** — Two things needed:
1. Add `permissions: contents: write` at the top of `release.yml` (see workflow above)
2. Go to **GitHub Repo → Settings → Actions → General → Workflow permissions** → Select **"Read and write permissions"**

---

### ❌ PITFALL 2: Infinite Build Loop

**What happens**: CI pushes version bump → triggers another CI run → infinite loop.

**Fix**: Add `[skip ci]` in the commit message:
```bash
git commit -m "chore: bump version [skip ci]"
```
GitHub Actions ignores any push with `[skip ci]` in the message.

---

### ❌ PITFALL 3: `Unexpected input(s) 'serviceAccountJsonPlain'`

**What happens**: Play Store upload step fails with an input name error.

**Why**: Common mistake of using wrong parameter name.

**Fix**: Use the exact correct parameter name:
```yaml
# ✅ CORRECT
serviceAccountJsonPlainText: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}

# ❌ WRONG (will fail)
serviceAccountJsonPlain: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
```

---

### ❌ PITFALL 4: Git Pull Rejected After CI Pushes

**What happens**: After CI runs and pushes a version bump, your local `git push` is rejected:
```
! [rejected] main -> main (non-fast-forward)
error: failed to push some refs
```

**Why**: CI committed to `main` while you were working locally.

**Fix**: Always run before pushing:
```bash
git pull --rebase
git push
```

---

### ❌ PITFALL 5: `build.gradle` Signing Config Verification Failure

**What happens**: The `configure-signing.js` script exits with:
```
FATAL: build.gradle signing config was NOT applied correctly!
```

**Why**: The regex targeting `buildTypes.release` was using a greedy match that stopped at the first `}` (inside `debug {}`) and never reached `release {}`.

**Fix**: Use `[^}]*?` instead of `[\s\S]*?` to avoid matching across closing braces:
```javascript
// ✅ CORRECT — stops at first closing brace
content = content.replace(
  /release\s*\{([^}]*?)signingConfig\s*signingConfigs\.debug/,
  'release {$1signingConfig signingConfigs.release'
);

// ❌ WRONG — matches across closing braces, breaks nested blocks
content = content.replace(
  /buildTypes\s*\{([\s\S]*?)\}/,
  ...
);
```

---

### ❌ PITFALL 6: Splash Screen Shows Default Expo Logo

**What happens**: A white screen with Expo logo flashes briefly on launch.

**Why**: `expo-splash-screen` default config includes the Expo logo.

**Fix in `app.json`**: Use a 1×1 transparent PNG as the splash image to suppress the logo:
```json
["expo-splash-screen", {
  "backgroundColor": "#090D1A",
  "android": {
    "image": "./assets/images/transparent.png",
    "imageWidth": 1
  }
}]
```
And call `SplashScreen.hideAsync()` in your root layout after fonts/assets are loaded.

---

### ❌ PITFALL 7: Notification Icon Shows as White Square

**What happens**: On Android, the notification tray shows a white box instead of your icon.

**Why**: Android notification icons MUST be white on transparent background (silhouette-only). Colored icons are automatically flattened to white.

**Fix**: Create `notification-icon.png` as a **white silhouette on a transparent background**.

---

### ❌ PITFALL 8: Missing `drawable/splashscreen_logo` Resource Error

**What happens**: Gradle build fails with:
```
error: file not found: android/app/src/main/res/drawable/splashscreen_logo.png
```

**Why**: `expo-splash-screen` plugin generates references to `splashscreen_logo` in XML, but the file isn't generated because a 1×1 transparent image is used.

**Fix**: Ensure a valid (even minimal) image exists at the referenced path, OR keep the transparent PNG approach and ensure Expo SDK generates the proper drawables via `prebuild`.

---

### ❌ PITFALL 9: versionCode Must Always Increase

**What happens**: Play Store rejects AAB upload:
```
APK specifies a version code that has already been used.
```

**Why**: Play Store requires every upload to have a strictly increasing `versionCode`.

**Fix**: Never manually edit `versionCode` in `app.json` if CI is bumping it automatically. Let the script manage it. Check current value before any manual build.

---

### ❌ PITFALL 10: Losing the Keystore

**What happens**: You delete or lose the `.jks` file.

**Why this is catastrophic**: You can NEVER update an app on the Play Store with a different signing key. The app must be abandoned.

**Fix**: Back up `C:\rutambh\keystores\` to Google Drive, iCloud, or any secure location. Do this immediately after generating.

---

## 🔑 KEYSTORE QUICK REFERENCE

| Field | Format | Example |
|---|---|---|
| Keystore path | `C:\rutambh\keystores\rutambh-[appname].jks` | `C:\rutambh\keystores\rutambh-safearrival.jks` |
| Key Alias | `rutambh-[appname]` | `rutambh-safearrival` |
| Package Name | `com.rutambh.[appname]` | `com.rutambh.safearrival` |
| GitHub Secret | `ANDROID_KEY_ALIAS` → `rutambh-[appname]` | `rutambh-safearrival` |

---

## 📋 FINAL PRE-PUSH CHECKLIST

Before your first push to `main` (which triggers CI/CD), verify:

- [ ] `app.json` has correct `name`, `package`, `bundleIdentifier`, `versionCode: 1`, `version: "1.0.0"`
- [ ] All 5 GitHub Secrets are set (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `GOOGLE_SERVICE_ACCOUNT_JSON`)
- [ ] `scripts/bump-version.js` exists
- [ ] `.github/workflows/release.yml` exists with `permissions: contents: write`
- [ ] GitHub repo Settings → Actions → General → **"Read and write permissions"** is enabled
- [ ] `whatsnew/whatsnew-en-US` exists with release notes
- [ ] Service Account email has been added to the new app in Play Console
- [ ] First AAB has been uploaded manually (one-time)
- [ ] Keystore `.jks` is backed up in `C:\rutambh\keystores\`
- [ ] Notification icon is white-on-transparent
- [ ] Splash screen uses `transparent.png` to suppress default Expo logo

---

## 🔗 REFERENCES

- Full CI/CD technical details → [`CICD-SETUP.md`](./CICD-SETUP.md)
- Expo SDK 56 docs → https://docs.expo.dev/versions/v56.0.0/
- Expo Router docs → https://expo.github.io/router/docs
- Play Console → https://play.google.com/console
- GitHub Actions docs → https://docs.github.com/en/actions
