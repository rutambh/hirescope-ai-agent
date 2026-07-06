# Project Brief — HireScope

This document is a condensed summary of the project architecture and setup, intended for AI-to-AI handoffs or supervisor escalation context.

## Structure & Architecture

HireScope (Career Lens App) is an existing React Native / Expo application built with TypeScript.
It utilizes a **100% local, zero-server architecture**. No backend database or external APIs are used.

- **Routing**: Expo Router (file-based navigation, tabbed screen structure with stack details).
- **State Management**: Zustand stores with AsyncStorage persistence (`appStore` for settings, `historyStore` for past searches, `aiModelStore` for on-device AI downloads).
- **Scraping Engine**: Runs hidden `react-native-webview` instances globally in the background (mounted in root `_layout.tsx`) to scrape search engines and target domain pages without needing user focus.
- **Extraction Pipeline**: Multi-phase pipeline:
  - Phase 1: Search engine scraping (URL discovery) and target page crawling.
  - Phase 2: Heuristic/regex extraction of ratings, salaries, pros, cons, and review snippets.
  - Phase 3 (Optional): Local on-device LLM inference using a downloaded GGUF model via `llama.rn` to write a cohesive narrative summary.

## Frontend & UI

The UI is built with React Native's built-in `StyleSheet` API following a custom modern dark/light design system.
- Colors: Dark mode (`DarkColors`) uses deep blue/gray backgrounds (`#051424`); light mode (`LightColors`) uses slate/gray shades (`#f9f9f9`).
- Features: Light, Dark, and System theme synchronization, custom Sliders, search overlays, progress rings, and styled Cards.

## Backend & Database

- **Backend**: None (₹0 infrastructure cost, high privacy).
- **Database**: AsyncStorage (local key-value storage) used via Zustand middleware.

## CI/CD Pipeline

- **Platform**: GitHub Actions (`.github/workflows/release.yml`) running on Ubuntu runners.
- **Versioning**: Node script auto-increments version and versionCode, then commits back with `[skip ci]`.
- **Builds**: Gradle builds signed Android App Bundle (AAB).
- **Store Submission**: Automatically pushes successful builds to the Google Play Store's internal track (`r0adkll/upload-google-play`).
- **Keys/Signing**: Certificate parameters stored in GitHub Secrets. Keystore base64-decoded at runtime.
