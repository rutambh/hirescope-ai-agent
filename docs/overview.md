# Overview

## What HireScope Is

HireScope is a fully local, zero-server Android app that helps job seekers research company salaries, employee ratings, and sentiment before interviews. The user enters 4 filters (company, role, experience, current salary) — country is hardcoded to India, and the app silently scrapes up to 50 web domains in the background using hidden WebViews, extracts structured data with regex/heuristic parsing, optionally enhances results with an on-device AI model, then delivers consolidated salary ranges, hike percentages, ratings, and pros/cons.

## Target User

Job seekers and professionals preparing for salary negotiations or interview research — primarily in India, US, UK, Canada, UAE, Australia, Germany, and Singapore.

## Current Status

**In development / active releases on Play Store (internal track)**. Version 1.0.7, versionCode 8.

## Core Constraints

- **100% local**. No backend server. No cloud database. Ever.
- **No API keys**. AI enhancement uses an optional on-device GGUF model (Qwen 2.5 0.5B), not cloud AI APIs.
- **Internet only**. The only permission is INTERNET — no camera, contacts, GPS, microphone, storage permissions.
- **₹0 forever**. No subscription, no in-app purchases, no ads. Scales to any number of users with zero infrastructure cost.
- **Privacy first**. Nothing leaves the device except the search query to public websites.
- **AsyncStorage only**. No cloud sync. Data lives on the device.
- **Local notifications only**. Uses `expo-notifications` — no FCM, no push server.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Routing | Expo Router (file-based, tabs + stack) |
| State | Zustand (with AsyncStorage persistence) |
| Styling | React Native StyleSheet API |
| Scraping | `react-native-webview` with JS injection |
| AI (optional) | `llama.rn` for on-device GGUF model inference |
| Notifications | `expo-notifications` (local only) |
| Build & Release | GitHub Actions → signed AAB → Play Store |

## Out of Scope (deliberately NOT done)

- No user accounts or login
- No data sent to any server owned by us
- No analytics or tracking
- No ads or in-app purchases
- No camera, microphone, location, or contact access
- No comparison between two companies (future V2)
- No interview question tracking (future V2)
- No cloud AI API calls (Gemini, Claude, OpenAI)
- No iOS builds (Android only for now)
