# HireScope (Career Lens App)

**HireScope** is a premium, 100% local, zero-server React Native Expo mobile application designed to help job seekers compile detailed salary ranges, employee reviews, company ratings, and expected hike percentages before interviews. By leveraging hidden background WebViews, HireScope queries public search engines and crawls target domain pages in parallel, compiling and merging unstructured data points locally on the device with optional on-device AI enhancement.

Current Status: **In development / active releases on Play Store (internal track)**.

---

## 📖 Developer Documentation

All detailed project specifications, architectural decisions, and setup details are kept in the `docs/` folder:

- **Universal AI Agent Instructions**: See [`AGENTS.md`](./AGENTS.md)
- **Documentation Hub**: See [`docs/INDEX.md`](./docs/INDEX.md)
- **Architecture & Modules**: See [`docs/architecture.md`](./docs/architecture.md)
- **CI/CD Pipeline Details**: See [`docs/cicd/cicd.md`](./docs/cicd/cicd.md)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x
- Java OpenJDK 17 (for Android builds)

### Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Metro bundler:
   ```bash
   npm run start
   ```

3. Scan the generated QR code with **Expo Go** on a physical Android device.

For detailed local tool setup instructions, please refer to [`docs/environment.md`](./docs/environment.md).
