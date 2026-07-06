# GitHub Actions CI/CD Issues & Troubleshooting Log

This is an append-only log of CI/CD problems hit and how they were solved.

---

### Issue 1: Permission Denied (403) on Version Bump Push
- **Symptom**: CI pipeline fails at the step "Commit and Push Version Bump" with:
  ```
  remote: Permission to [repo] denied to github-actions[bot].
  fatal: unable to access: The requested URL returned error: 403
  ```
- **Cause**: The default `GITHUB_TOKEN` is read-only on fresh repositories or default configurations.
- **Fix**:
  1. Add `permissions: contents: write` at the top of the workflow file (under `release:` job or globally).
  2. Go to **GitHub Repo Settings > Actions > General > Workflow permissions**, select **"Read and write permissions"**, and click Save.

---

### Issue 2: Infinite Build Trigger Loop
- **Symptom**: CI pushes a version bump to the `main` branch, which triggers another CI run, resulting in an infinite loop of builds and commits.
- **Cause**: The version bump commit triggers the `push` event on `main` branch.
- **Fix**: Add `[skip ci]` in the version bump commit message:
  ```bash
  git commit -m "chore: bump version [skip ci]"
  ```
  GitHub Actions automatically skips triggering workflows when the commit message contains `[skip ci]`.

---

### Issue 3: Google Play Action Failure `Unexpected input(s) 'serviceAccountJsonPlain'`
- **Symptom**: Upload to Google Play Store fails immediately.
- **Cause**: Typo in the input key for `r0adkll/upload-google-play` action.
- **Fix**: Ensure the parameter name is `serviceAccountJsonPlainText` (when passing raw JSON text from secrets) rather than `serviceAccountJsonPlain`.
  ```yaml
  serviceAccountJsonPlainText: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
  ```

---

### Issue 4: Local Git Push Rejected (Non-fast-forward)
- **Symptom**: Local push is rejected with:
  ```
  ! [rejected] main -> main (non-fast-forward)
  error: failed to push some refs
  ```
- **Cause**: The CI runner successfully built, bumped the version, and pushed a commit back to the repo, putting the remote history ahead of the local workspace.
- **Fix**: Run `git pull --rebase` locally to fetch and replay your local commits on top of the CI version bump commit, then push again.

---

### Issue 5: `build.gradle` Signing Config Verification Failure in CI
- **Symptom**: The `configure-signing.js` script fails in CI with:
  ```
  Error: Verification failed! build.gradle signing configuration was not correctly set up.
  ```
- **Cause**: Standard regex replacements like `buildTypes\s*\{([\s\S]*?)\}` are greedy and stop at the first closing brace (which belongs to the nested `debug { ... }` block), completely skipping `release { ... }` where signing configuration is required.
- **Fix**: Target the `release` block specifically by matching non-closing braces:
  ```javascript
  content = content.replace(/release\s*\{([^}]*?)signingConfig\s*signingConfigs\.debug/, 'release {$1signingConfig signingConfigs.release');
  ```

---

### Issue 6: Notification Icon Shows as White Box on Android
- **Symptom**: App notifications display a blank white square in the status bar instead of the custom app icon.
- **Cause**: Android requires notification icons to be pure white silhouettes on transparent backgrounds. Colored or solid background icons are automatically flattened to a white box by the OS.
- **Fix**: Create `assets/images/notification-icon.png` as a white silhouette on a transparent background, and register it in `app.json` plugins under `expo-notifications`.

---

### Issue 7: Android Build Fails with Missing Drawable Resource `splashscreen_logo`
- **Symptom**: Gradle bundleRelease fails with:
  ```
  error: file not found: android/app/src/main/res/drawable/splashscreen_logo.png
  ```
- **Cause**: A 1x1 transparent PNG (`transparent.png`) was used in `app.json` splash config to disable the default Expo logo flash, but gradle failed to compile because the resource files weren't fully generated.
- **Fix**: Always ensure a valid (even minimal) transparent image exists at `assets/images/transparent.png`, and verify `npx expo prebuild --platform android` creates the correct resource drawables before triggering compile.
