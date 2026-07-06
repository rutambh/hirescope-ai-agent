# CI/CD

Paths and secret **names** only. Never write real secret values into this file.

## Package Identity

| Field | Value |
|---|---|
| App Name | HireScope |
| Package Name | `com.rutambh.hirescope` |
| Key Alias | `rutambh-hirescope` |
| Keystore File | `rutambh-hirescope.jks` (decoded into `android/app/` during CI) |
| Keystore Location (local) | `C:\rutambh\keystores\rutambh-hirescope.jks` |

## GitHub Repository

Owner: `rutambh` / Repo: `career_lens_app`

## Secrets (names only)

These are configured in **GitHub Repo → Settings → Secrets and variables → Actions**:

| Secret Name | What it holds |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded `.jks` keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore decryption password |
| `ANDROID_KEY_ALIAS` | Certificate alias (`rutambh-hirescope`) |
| `ANDROID_KEY_PASSWORD` | Certificate password |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Play service account JSON (reusable across apps) |

## Pipeline Overview

Trigger: push to `main` branch.

```
1. Checkout → setup Node 20 + Zulu JDK 17
2. npm ci
3. Auto-increment version (scripts/bump-version.js)
4. Commit + push version bump with [skip ci]
5. expo prebuild --platform android
6. Decode keystore from secret
7. Inject signing config into build.gradle (configure-signing.js)
8. gradlew bundleRelease → signed AAB
9. Upload AAB to Play Store internal track (r0adkll/upload-google-play@v1)
```

Workflow file: [`.github/workflows/release.yml`](../.github/workflows/release.yml)

## Versioning

- `scripts/bump-version.js` auto-increments:
  - `expo.version` patch segment (e.g., `1.0.7` → `1.0.8`)
  - `expo.android.versionCode` integer (e.g., `8` → `9`)
- The commit message includes `[skip ci]` to prevent an infinite build loop
- Current: version `1.0.7`, versionCode `8`

## Signing Config Injection

The CI pipeline dynamically injects release signing into the Expo-generated `build.gradle`:
1. Inserts a `release {}` block in `signingConfigs` before `debug {}`
2. Changes `buildTypes.release` to reference `signingConfigs.release` instead of `signingConfigs.debug`
3. Verifies the injection succeeded (fails the build if not)

## Release Notes

`whatsnew/whatsnew-en-US` — plain text, max 500 characters. Update before pushing to `main` for meaningful releases.

## First-Time Play Store Setup (manual, one-time)

1. Build locally: `npm run build:local`
2. Create app in Play Console
3. Manually upload first AAB to Internal Testing track
4. Complete store listing, content rating, target audience
5. Add service account email under Users and Permissions
6. After first review passes → CI/CD handles all future releases

## Fixed Conventions (all rutambh apps)

| Convention | Value |
|---|---|
| Keystore master file | `rutambhapps.jks` (or per-app: `rutambh-[appname].jks`) |
| Key alias pattern | `rutambh-[appname]` |
| Package pattern | `com.rutambh.[appname]` |
| Pipeline | GitHub Actions → signed AAB → Play Store |
| Google Service Account | Reused across all apps (add email to each app in Play Console) |
