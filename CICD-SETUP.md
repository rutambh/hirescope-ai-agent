# Master CI/CD & Development Blueprint for React Native (Expo)

This document is the ultimate checklist and reference manual for setting up, building, and automating releases for React Native (Expo) apps. It contains the exact guidelines, troubleshooting fixes, and templates for a **$0 Automated GitHub Actions CI/CD pipeline**.

---

## 📋 PART 1 — NEW APP CHECKLIST & RULES

When starting a brand new app, you (or any AI agent) must verify and configure these items before writing any code:

### 🔴 MUST ASK FIRST (Before Any Code)
- [ ] **App Name** — Exact name as it will appear on Play Store and device (used in `app.json`, `AndroidManifest.xml`).
- [ ] **Package Name** — Must follow `com.rutambh.[appname]` format. Once uploaded to the Play Store, it can **never** be changed.
- [ ] **App Icon** — Must be consistent across all fields (Expo Go icon, Android adaptive foreground, and Splash screen).
- [ ] **Android & iOS Match** — App Name, Icon, and Package Name must be identical:
  ```json
  {
    "expo": {
      "name": "Safe Arrival",
      "icon": "./assets/icon.png",
      "android": { "package": "com.rutambh.safearrival" },
      "ios": { "bundleIdentifier": "com.rutambh.safearrival" }
    }
  }
  ```

### 🟡 CONFIGURE AT START
- [ ] **Remove default Expo Splash logo**: Call `SplashScreen.hideAsync()` immediately after assets load.
- [ ] **Expo Notifications**: Must use the plugin in `app.json` with a transparent background white icon to prevent release crashes:
  ```json
  "plugins": [
    ["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#ffffff" }]
  ]
  ```
- [ ] **UPI / Payment Config**: Verify the UPI ID from start (`rutambh@upi`) and keep it in a single configuration file:
  ```js
  // constants/config.js
  export const APP_CONFIG = {
    upiId: 'rutambh@upi',
    merchantName: 'Rutambh',
    appName: 'Safe Arrival',
  };
  ```

---

## 🛠️ PART 2 — SETUP PHILOSOPHY

* **Local Testing**: Run `npx expo start` and scan with **Expo Go** on your physical device. No cables, no Android Studio needed.
* **Release Builds**: Generated locally or on CI/CD using the Android SDK command-line tools.
* **EAS Cloud Builds**: **Bypassed completely** to avoid subscription fees and build queues.

---

## 🚀 PART 3 — AUTOMATED GITHUB ACTIONS CI/CD ($0 Cost)

This pipeline automatically increments version numbers, commits them back to your repository, generates the native code, signs the app, and uploads the `.aab` to the Google Play Store on every push to `main`.

### Step 1: Create the Version Bumping Script
Create this script in your project at `scripts/bump-version.js`. It runs locally or in CI before building:

```javascript
// scripts/bump-version.js
const fs = require('fs');
const path = require('path');
const appJsonPath = path.join(__dirname, '../app.json');

if (!fs.existsSync(appJsonPath)) {
  console.error('app.json not found!');
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 1. Increment Android versionCode
if (appJson.expo && appJson.expo.android && typeof appJson.expo.android.versionCode === 'number') {
  appJson.expo.android.versionCode += 1;
} else {
  if (!appJson.expo) appJson.expo = {};
  if (!appJson.expo.android) appJson.expo.android = {};
  appJson.expo.android.versionCode = 1;
}

// 2. Increment App version patch (e.g. 1.0.1 -> 1.0.2)
if (appJson.expo && typeof appJson.expo.version === 'string') {
  const versionParts = appJson.expo.version.split('.');
  if (versionParts.length === 3) {
    versionParts[2] = String(Number(versionParts[2]) + 1);
    appJson.expo.version = versionParts.join('.');
  }
} else {
  if (!appJson.expo) appJson.expo = {};
  appJson.expo.version = '1.0.0';
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`Updated to Version: ${appJson.expo.version}, Code: ${appJson.expo.android.versionCode}`);
```

### Step 2: Add scripts to `package.json`
Add this script to test builds locally or run them manually:
```json
"scripts": {
  "build:local": "node scripts/bump-version.js && npx expo prebuild --platform android --no-install && cd android && gradlew bundleRelease"
}
```

### Step 3: Create the GitHub Actions Workflow File
Create the folder `.github/workflows/` and add the file `release.yml`:

```yaml
# .github/workflows/release.yml
name: Build and Release to Play Store (Free)

on:
  push:
    branches:
      - main # Trigger build on push to main branch

permissions:
  contents: write # Allows GITHUB_TOKEN to commit the version bump back to Git

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
          git push

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

          console.log("Applying build.gradle signing configuration modifications...");

          // 1. Insert release block inside signingConfigs right before debug {
          content = content.replace('debug {', `release {
                      storeFile file("rutambhapps.jks")
                      storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                      keyAlias System.getenv("ANDROID_KEY_ALIAS")
                      keyPassword System.getenv("ANDROID_KEY_PASSWORD")
                  }
                  debug {`);

          // 2. Force buildTypes.release to use release signing config
          content = content.replace(/release\s*\{([^}]*?)signingConfig\s*signingConfigs\.debug/, 'release {$1signingConfig signingConfigs.release');

          fs.writeFileSync(file, content);
          
          // Strict Verification check
          const updatedContent = fs.readFileSync(file, 'utf8');
          if (!updatedContent.includes("rutambhapps.jks") || 
              !updatedContent.includes("signingConfig signingConfigs.release") || 
              updatedContent.includes("MYAPP_RELEASE_STORE_FILE")) {
              console.error("Error: Verification failed! build.gradle signing configuration was not correctly set up.");
              process.exit(1);
          }
          console.log("Verified and modified build.gradle signing configuration successfully.");
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
          packageName: com.rutambh.tithimitra # <-- CHANGE THIS per app!
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal # Options: "internal", "alpha", "beta", "production"
          whatsNewDirectory: whatsnew/
```

### Step 4: Configure GitHub Secrets (One-Time per Repo)
Go to your GitHub repo **Settings > Secrets and variables > Actions > New repository secret** and add:

1. **`ANDROID_KEYSTORE_BASE64`**: Paste the string generated by running this in **PowerShell**:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("YOUR_KEYSTORE_FILE.jks")) | Out-File -FilePath keystore_base64.txt
   ```
2. **`ANDROID_KEYSTORE_PASSWORD`**: Use `86c101e05c9694d5144428d5e5a431dd`
3. **`ANDROID_KEY_ALIAS`**: Use your key alias (e.g., `rutambh-[appname]` where `[appname]` is the name of your app)
4. **`ANDROID_KEY_PASSWORD`**: Use `a9cc51dae1ce85c318c827f27b1fc042`
5. **`GOOGLE_SERVICE_ACCOUNT_JSON`**: The Google Service Account Key JSON content. 
   *(Note: You can reuse the exact same Google Cloud Project / Service Account for all your apps. Simply invite the Service Account email to the new app under **Users and permissions** in the Play Console).*

---

## 🚧 PART 4 — HURDLES RESOLVED & TROUBLESHOOTING

Keep these solutions in mind to avoid repeating previous configuration hurdles:

### 1. `Permission to repo denied to github-actions[bot]. Error 403`
* **Hurdle**: The default `GITHUB_TOKEN` does not have write access to push the version bump back to your repository.
* **Fix**: Ensure the `permissions: { contents: write }` block is placed at the top of the workflow file. Also, if needed, go to **Settings > Actions > General > Workflow permissions** in GitHub and select **"Read and write permissions"**.

### 2. Infinite Build Trigger Loop
* **Hurdle**: Pushing the version bump from CI triggers another workflow run.
* **Fix**: Use `[skip ci]` in the commit message: `git commit -m "chore: bump version [skip ci]"`. GitHub Actions ignores commits containing this tag.

### 3. Google Play Upload Action Failure: `Unexpected input(s) 'serviceAccountJsonPlain'`
* **Hurdle**: The parameter name in the `r0adkll/upload-google-play` action must be `serviceAccountJsonPlainText` when pasting raw JSON text.
* **Fix**: Ensure you use `serviceAccountJsonPlainText: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}`.

### 4. Git Push Rejected: `remote contains work that you do not have locally`
* **Hurdle**: Pulling/Pushing local updates fails because the CI runner successfully pushed a version bump first.
* **Fix**: Run `git pull --rebase` locally before pushing your changes.

### 5. Automated Release Notes Setup
* **Hurdle**: No release notes are visible on the Play Store track.
* **Fix**: Create a folder `whatsnew` with a file `whatsnew-en-US`. Write your release note text inside (max 500 chars). In the workflow, set `whatsNewDirectory: whatsnew/`.

### 6. Build Gradle Signing Configuration Verification Failure
* **Hurdle**: The `configure-signing.js` script fails in CI with: `Error: Verification failed! build.gradle signing configuration was not correctly set up.`.
* **Fix**: This is caused by nested braces within the `buildTypes` block in the freshly generated `build.gradle` file. The non-greedy regex `buildTypes\s*\{([\s\S]*?)\}` stops parsing at the first closing brace (which belongs to `debug { ... }`), completely skipping the `release { ... }` block where the signing config change is needed. The fix is to target the `release` block directly with a regex that matches `release {` followed by characters excluding a closing brace (`[^}]*?`), and then replacing the signing config:
  ```javascript
  content = content.replace(/release\s*\{([^}]*?)signingConfig\s*signingConfigs\.debug/, 'release {$1signingConfig signingConfigs.release');
  ```

---

## 🔑 PART 5 — KEYSTORE RULES & REFERENCE
* **Location**: Store your `.jks` file in a secure backup folder. **Never** save it inside the app repository or commit it to GitHub.
* **Consistent Alias**: Keep your key alias mapped clearly, like `rutambh-[appname]`.
* **Play Store Requirement**: If you lose the `.jks` file or change the alias/key, you will never be able to update the app on the Play Store again.

### Quick Commands:
* **Generate Keystore**:
  ```bash
  keytool -genkeypair -v -keystore C:\rutambh\keystores\rutambhapps.jks -alias rutambh-[appname] -keyalg RSA -keysize 2048 -validity 10000
  ```
* **Local Release Build Clean & Build**:
  ```bash
  cd android && ./gradlew clean && ./gradlew bundleRelease
  ```
* **Test Local Release APK**:
  ```bash
  ./gradlew assembleRelease
  adb install app/build/outputs/apk/release/app-release.apk
  adb logcat | findstr /I "FATAL AndroidRuntime"
  ```
