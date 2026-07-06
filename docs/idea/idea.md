# 📋 Job Research App — Full Product Requirements Document
> Version 1.0 | Built on Expo SDK 56 + React Native + TypeScript

---

## 1. APP OVERVIEW

### 1.1 What This App Does
A fully local, zero-server Android app that helps job seekers and professionals research company salaries, ratings, and employee sentiment before attending an interview. The user enters 5 filters, the app spends up to 15 minutes silently scraping 50 domains and querying public AI engines in the background, then delivers a clean consolidated result with ratings, salary expectations, percentage hike, and pros/cons.

### 1.2 Core Philosophy
| Principle | Decision |
|---|---|
| Architecture | 100% local. No backend. No server. Ever. |
| Data Privacy | Nothing leaves the phone except the search query to public websites |
| Permissions | Internet only. Nothing else. No location, no camera, no contacts |
| Cost | ₹0 forever. Scales to crores of users with zero infrastructure |
| AI Usage | Public no-login AI engines via WebView only. No API keys |
| Storage | AsyncStorage only. Local device. No cloud sync |
| Notifications | Local expo-notifications. No FCM. No push server |

### 1.3 Package Details
| Field | Value |
|---|---|
| App Name | HireScope (or chosen name) |
| Package | `com.rutambh.hirescope` |
| Key Alias | `rutambh-hirescope` |
| Min Android | API 26 (Android 8.0) |
| Orientation | Portrait only |

---

## 2. TECH STACK

Follows the same stack as `NEW-APP-SETUP.md` with no deviations.

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 56 |
| Language | TypeScript |
| Routing | Expo Router v4 (file-based) |
| State | Zustand |
| Styling | StyleSheet API (React Native built-in) |
| Local Storage | AsyncStorage |
| Notifications | expo-notifications (local only) |
| WebView | react-native-webview |
| Build & Release | GitHub Actions (same workflow as existing apps) |

---

## 3. PERMISSIONS

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- That is ALL. Nothing else. -->
```

No location. No camera. No microphone. No contacts. No storage read/write. Internet only.

---

## 4. SCREENS

### 4.1 Screen List
```
app/
├── index.tsx              → Search Screen (Home)
├── searching.tsx          → Progress Screen (background scraping)
├── results.tsx            → Results Screen
├── history.tsx            → Past Searches Screen
└── settings.tsx           → AI Engine Manager Screen
```

---

## 5. SEARCH SCREEN (`index.tsx`)

### 5.1 The 5 Filters

#### Filter 1 — Country
- Type: Dropdown / Searchable Picker
- User can search within dropdown
- On selection: auto-sets currency for salary field
- Required field

**Country → Currency Mapping (key ones):**
```
India          → INR (₹)  → format: X LPA
United States  → USD ($)  → format: $X,XXX/year
United Kingdom → GBP (£)  → format: £XX,XXX/year
UAE            → AED      → format: AED XX,XXX/month
Canada         → CAD ($)  → format: $XX,XXX/year
Australia      → AUD ($)  → format: $XX,XXX/year
Germany        → EUR (€)  → format: €XX,XXX/year
Singapore      → SGD ($)  → format: $XX,XXX/year
[all other countries follow ISO 4217 currency codes]
```

#### Filter 2 — Company Name
- Type: Free text input
- Placeholder: "e.g. Google, Deloitte, Infosys"
- No dropdown, no autocomplete (avoids loading all company names)
- Min 2 characters
- Required field

#### Filter 3 — Role
- Type: Free text input
- Placeholder: "e.g. SDE 2, Product Manager, Data Analyst"
- No dropdown, no autocomplete
- Min 2 characters
- Required field

#### Filter 4 — Experience
- Type: Horizontal slider
- Range: 1 to 30 years
- Step: 1 year
- Shows selected value above slider: "8 Years"
- Required field

#### Filter 5 — Current Salary
- Type: Numeric input
- Currency symbol auto-prefixed based on country selected
- For India: shows "₹" prefix and "LPA" suffix
- For others: shows relevant currency symbol
- Placeholder shows format: "e.g. 12" (for India LPA)
- Required field

### 5.2 Search Button
- Label: "Start Research"
- Disabled until all 5 filters are filled
- On tap: validates inputs → navigates to Searching Screen

### 5.3 Bottom Navigation
```
[🔍 Search]  [📋 History]  [⚙️ Settings]
```

---

## 6. SEARCHING SCREEN (`searching.tsx`)

### 6.1 UI Layout
```
┌─────────────────────────────────────┐
│                                     │
│   🔍 Researching                    │
│   Google · SDE 2 · India            │
│                                     │
│   ████████████░░░░░░░░  58%         │
│                                     │
│   Estimated time remaining: 6 min   │
│                                     │
│   ─────────────────────────────     │
│                                     │
│   💡 You can minimize this app.     │
│      We'll notify you when          │
│      your results are ready.        │
│                                     │
│   ─────────────────────────────     │
│                                     │
│         [ Cancel Search ]           │
│                                     │
└─────────────────────────────────────┘
```

### 6.2 Progress Bar Behavior
- Smooth animated fill (not jumpy)
- Progress is estimated, not exact
- Based on time elapsed vs 15 minute window
- Never shows which website is being visited (clean UX)

### 6.3 Estimated Time Display
```
0-2 min   → "Estimated time remaining: ~13 min"
2-5 min   → "Estimated time remaining: ~9 min"
5-10 min  → "Estimated time remaining: ~5 min"
10-13 min → "Estimated time remaining: ~2 min"
13-15 min → "Finalizing results..."
```

### 6.4 Cancel Search
- Shows confirmation dialog: "Cancel this search? You will lose all progress."
- Confirm → kills all WebViews → goes back to Search Screen
- Dismiss → continues searching

### 6.5 Background Behavior
- User can press home button or switch apps
- Scraping continues in background
- No battery drain warning needed (15 min is short)
- App does NOT need to stay in foreground

---

## 7. SCRAPING ARCHITECTURE

### 7.1 Two Instance System

```
PHASE 1 — COLLECTION (0 to 10 minutes)
────────────────────────────────────────────────────────
Instance 1: AI Engine WebView
  → Opens one AI engine at a time
  → Injects PROMPT 1
  → Waits for response (max 30 sec per engine)
  → Stores raw text response locally
  → Marks engine as WORKING or BLOCKED
  → Moves to next engine

Instance 2: Domain Scraping WebView
  → Searches DuckDuckGo first for URLs
  → Falls back to Bing if DuckDuckGo fails
  → Collects up to 50 domain pages
  → Extracts raw text, ratings, salary mentions
  → Stores all raw text locally

Both instances run simultaneously.
Each opens one WebView at a time internally.

PHASE 2 — SUMMARIZATION (10 to 15 minutes)
────────────────────────────────────────────────────────
At 10 minute mark OR when both instances finish 
(whichever comes first):
  → Stop all active WebViews
  → Merge ALL raw collected text into one data blob
  → Open AI engines one by one with PROMPT 2
  → Each engine receives the full data blob
  → Collect structured responses
  → Parse and merge final results
  → Fire notification
  → Navigate to Results Screen
```

### 7.2 URL Discovery (Instance 2 — Step 1)

Search queries sent to DuckDuckGo (hidden WebView):

```
Query 1: "[Company] [Role] [Country] salary reviews [current year]"
Query 2: "[Company] [Country] employee reviews [Role]"
Query 3: "[Company] [Country] [Role] glassdoor"
Query 4: "[Company] [Country] [Role] salary"

Country enforcement in query:
  ALWAYS append country name explicitly
  For India: also append "India INR"
  For USA: also append "United States USD"

Example for Deloitte Manager India:
  "Deloitte Manager India salary reviews 2024"
  "Deloitte India employee reviews Manager"
  "Deloitte India Manager glassdoor"
  "Deloitte India Manager salary INR"
```

Extract all URLs from search result pages. Prioritize URLs that contain the company name and country signal.

### 7.3 Domain Scraping Rules

```
Target:      50 unique domain pages
Fallback 1:  25 unique domain pages (if 50 not found in time)
Fallback 2:  5 unique domain pages (minimum viable)
Failure:     If even 5 not found → "No data found" screen

What counts as a "domain page":
  One unique URL = one domain page
  Same base domain but different URL path counts as separate
  Example: glassdoor.com/reviews/p1 and glassdoor.com/salaries 
           count as 2 pages
```

### 7.4 What to Extract From Each Domain Page

```
From every page extract:
  - Any number followed by /5 or "out of 5" → Rating candidate
  - Any number followed by currency symbol or LPA/K → Salary candidate
  - Text under headers: "Pros", "Positives", "What's good", "Likes"
  - Text under headers: "Cons", "Negatives", "What's bad", "Dislikes"
  - Any sentence containing the role keyword
  - Any sentence containing the country keyword + salary keyword

Country enforcement during scraping:
  - If page URL contains another country's signal → skip page
  - If salary on page is in wrong currency → discard that salary
  - Example: Deloitte India search → skip URLs with "/us/" or "/uk/"
```

### 7.5 Timeout Rules

```
Per AI engine:      30 seconds max, then mark TIMED_OUT
Per domain page:    20 seconds max, then skip
Phase 1 total:      10 minutes hard cap
Phase 2 total:      5 minutes hard cap
Total hard cap:     15 minutes absolute maximum

After 15 minutes: Merge whatever data exists and show results.
Never show empty results if any data was collected.
```

---

## 8. AI ENGINE SYSTEM

### 8.1 Engine List (Initial)

```typescript
// src/constants/aiEngines.ts

export const AI_ENGINES = [
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai',
    inputSelector: 'textarea[placeholder]',
    enabled: true,
    hasWebSearch: true,
  },
  {
    id: 'duckduckgo_ai',
    name: 'DuckDuckGo AI Chat',
    url: 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat',
    inputSelector: 'textarea',
    enabled: true,
    hasWebSearch: true,
  },
  {
    id: 'you_com',
    name: 'You.com',
    url: 'https://you.com',
    inputSelector: 'input[type="text"]',
    enabled: true,
    hasWebSearch: true,
  },
  {
    id: 'phind',
    name: 'Phind',
    url: 'https://www.phind.com',
    inputSelector: 'textarea',
    enabled: true,
    hasWebSearch: true,
  },
  {
    id: 'komo',
    name: 'Komo AI',
    url: 'https://komo.ai',
    inputSelector: 'input, textarea',
    enabled: true,
    hasWebSearch: true,
  },
  {
    id: 'bing_copilot',
    name: 'Bing Copilot',
    url: 'https://www.bing.com/chat',
    inputSelector: 'textarea',
    enabled: true,
    hasWebSearch: true,
  },
  {
    id: 'huggingchat',
    name: 'HuggingChat',
    url: 'https://huggingface.co/chat',
    inputSelector: 'textarea',
    enabled: true,
    hasWebSearch: false,
  },
  {
    id: 'meta_ai',
    name: 'Meta AI',
    url: 'https://www.meta.ai',
    inputSelector: 'textarea',
    enabled: true,
    hasWebSearch: true,
  },
]
```

### 8.2 Engine Health Tracking

Each engine has a health status stored in AsyncStorage:

```typescript
type EngineStatus = 'WORKING' | 'BLOCKED' | 'CAPTCHA' | 'TIMED_OUT' | 'UNKNOWN'

type EngineHealth = {
  id: string
  name: string
  url: string
  enabled: boolean          // User toggle in Settings
  hasWebSearch: boolean
  lastStatus: EngineStatus
  lastChecked: string       // ISO date string
  successCount: number      // Total successful queries ever
  failureCount: number      // Total failures ever
  consecutiveFails: number  // Resets to 0 on any success
}
```

**Status Logic:**
```
WORKING     → Engine responded with parseable text
BLOCKED     → Response contains "bot", "automated", "access denied", 
              or HTTP 403 equivalent
CAPTCHA     → WebView shows image challenge or "verify you are human"
TIMED_OUT   → No response within 30 seconds
UNKNOWN     → Never tried yet (initial state)
```

**Auto-disable rule:**
```
If consecutiveFails >= 3 → auto-disable engine
User sees warning in Settings: "Perplexity disabled after 3 failures"
User can manually re-enable anytime
```

### 8.3 Settings Screen — Engine Manager (`settings.tsx`)

```
┌─────────────────────────────────────────┐
│  ⚙️ AI Engine Manager                   │
│                                         │
│  These AI engines are used to gather    │
│  company research data. Toggle them     │
│  on or off based on performance.        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟢 Perplexity AI          [ON]  │   │
│  │    Last: Working · 2hr ago      │   │
│  │    Success: 14  Failures: 1     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔴 DuckDuckGo AI         [OFF] │   │
│  │    Last: Blocked · 1hr ago      │   │
│  │    Auto-disabled (3 fails)      │   │
│  │    [Re-enable]                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟡 Bing Copilot           [ON]  │   │
│  │    Last: Timed Out · 3hr ago    │   │
│  │    Success: 8  Failures: 2      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [+ Add Custom AI Engine]               │
│                                         │
└─────────────────────────────────────────┘
```

### 8.4 Add Custom AI Engine Flow
- Tap "+ Add Custom AI Engine"
- Fields: Name, URL
- App attempts a test query on save
- If successful → added as WORKING
- If failed → added as UNKNOWN with warning

---

## 9. PROMPT SYSTEM

### 9.1 PROMPT 1 — Discovery Prompt (Phase 1)

Sent to each AI engine individually. Dynamic values injected from filters.

```
You are a salary and company review research assistant.
Reply in plain text only.
Do not use markdown.
Do not use bullet points.
Do not use tables.
Do not use bold text.
Do not use asterisks.
Do not use dashes as list items.
Do not use any formatting characters whatsoever.
Use only plain sentences and line breaks.
Every section must start with its exact label word as shown below.

I need employee review and salary data for this specific search.
Be extremely specific to the exact location stated below.
Do not include data from any other country or region under any circumstances.

SEARCH DETAILS:
Company: [COMPANY_NAME]
Country: [COUNTRY_NAME] — Search ONLY [COUNTRY_NAME] operations. 
         NOT global data. NOT USA data unless USA is specified. 
         NOT UK data unless UK is specified.
         NOT any other country's data.
Role: [ROLE]
Years of Experience: [EXPERIENCE] years
Current Salary: [CURRENT_SALARY] [CURRENCY_NAME]

Search recent sources including job review platforms, salary 
aggregators, professional forums, and employee review sites 
specific to [COUNTRY_NAME].
Only include data where the reviewer is based in [COUNTRY_NAME] 
or the salary is quoted in [CURRENCY_CODE].
Completely reject and ignore any salary data not in [CURRENCY_CODE].
Completely reject and ignore any reviews not from [COUNTRY_NAME].

Answer the following five sections in order.
If you cannot find real data for any section write NOTFOUND 
on that line and nothing else for that section.

RATING
Write one number between 1.0 and 5.0 only.
This must be the overall employee rating for [COMPANY_NAME] 
in [COUNTRY_NAME] specifically for people in [ROLE] type roles.
Base this on actual review platforms only.
Do not guess or estimate if you have no data.
Example of correct format: 3.8

SALARY MINIMUM
Write one number only in [CURRENCY_CODE].
This is the realistic minimum salary for [ROLE] at [COMPANY_NAME] 
in [COUNTRY_NAME] with [EXPERIENCE] years of experience.
Write in [SALARY_FORMAT] format only.
Do not write currency symbols, just the number.
Example of correct format: 22

SALARY MAXIMUM
Write one number only in [CURRENCY_CODE].
This is the realistic maximum salary for [ROLE] at [COMPANY_NAME] 
in [COUNTRY_NAME] with [EXPERIENCE] years of experience.
Write in [SALARY_FORMAT] format only.
Do not write currency symbols, just the number.
Example of correct format: 31

POSITIVES
Write exactly three positive things that actual employees 
in [COUNTRY_NAME] say about working as [ROLE] at [COMPANY_NAME].
If you cannot find three, write what you can find.
Each positive must start on a new line with the word POSITIVE 
followed by a colon and a single space.
Base this only on real employee reviews from [COUNTRY_NAME].
Do not invent or assume anything.
Example of correct format:
POSITIVE: Good learning opportunities and structured training 
programs are mentioned consistently by multiple employees
POSITIVE: Work life balance is reasonable compared to other 
similar companies operating in [COUNTRY_NAME]
POSITIVE: The brand recognition is strong and valued by 
employees for future career opportunities

NEGATIVES
Write exactly three negative things that actual employees 
in [COUNTRY_NAME] say about working as [ROLE] at [COMPANY_NAME].
If you cannot find three, write what you can find.
Each negative must start on a new line with the word NEGATIVE 
followed by a colon and a single space.
Base this only on real employee reviews from [COUNTRY_NAME].
Do not invent or assume anything.
Example of correct format:
NEGATIVE: Salary hikes are consistently below industry average 
according to reviews from employees in [COUNTRY_NAME]
NEGATIVE: Work pressure during deadlines is extremely high 
with frequent requirements to work beyond regular hours
NEGATIVE: Internal promotions are slow and heavily dependent 
on manager relationships rather than measurable performance
```

### 9.2 PROMPT 2 — Summarization Prompt (Phase 2)

Sent after Phase 1 completes. Full raw data blob attached.

```
You are a data analysis and summarization assistant.
Reply in plain text only.
Do not use markdown.
Do not use bullet points.
Do not use tables.
Do not use bold text.
Do not use asterisks.
Do not use dashes as list items.
Do not use any formatting characters whatsoever.
Use only plain sentences and line breaks.
Every section must start with its exact label word as shown below.

Below is raw data collected from multiple AI research engines 
and website scraping about a specific job search.
Some data may contradict other data.
Some data may be incomplete.
Some data may be from wrong countries despite instructions.
Your job is to analyze everything, apply the rules below, 
and produce one accurate consolidated final answer.

SEARCH CONTEXT:
Company: [COMPANY_NAME]
Country: [COUNTRY_NAME] — [COUNTRY_NAME] operations ONLY
Role: [ROLE]
Years of Experience: [EXPERIENCE] years
Current Salary: [CURRENT_SALARY] [CURRENCY_NAME]
Expected salary must be in [CURRENCY_CODE] only in [SALARY_FORMAT] format

ANALYSIS RULES — APPLY ALL OF THESE:
Rule 1: Completely ignore and discard any salary figures 
        not in [CURRENCY_CODE].
Rule 2: Completely ignore reviews clearly from other countries.
Rule 3: For salary ranges, calculate the median of all valid 
        figures found. Do not use simple average.
Rule 4: If any salary figure is more than 2 times higher than 
        the median of all other salary figures, discard it as 
        an outlier before calculating final range.
Rule 5: For ratings, calculate the simple average of all 
        numeric ratings found in the data. Round to one decimal.
Rule 6: For positives and negatives, identify themes that 
        appear in multiple sources. Prioritize themes mentioned 
        by more sources over themes mentioned by fewer sources.
Rule 7: All hike percentages must be calculated using the 
        exact formula provided below. Do not estimate.
Rule 8: Prioritize any data that explicitly mentions [COUNTRY_NAME] 
        or uses [CURRENCY_CODE] over generic global data.

RAW COLLECTED DATA BEGINS:
════════════════════════════════════════
[ALL_RAW_DATA_FROM_PHASE_1_INSERTED_HERE]
════════════════════════════════════════
RAW COLLECTED DATA ENDS.

Now produce a consolidated summary using exactly these sections:

FINAL RATING
Write one number between 1.0 and 5.0 only.
Calculate the average of all valid ratings found in the raw data.
If no ratings found write NOTFOUND.
Example: 3.7

FINAL SALARY MINIMUM
Write one number only in [SALARY_FORMAT] format.
This is the consolidated minimum after removing outliers.
If no salary data found write NOTFOUND.
Example: 21

FINAL SALARY MAXIMUM
Write one number only in [SALARY_FORMAT] format.
This is the consolidated maximum after removing outliers.
If no salary data found write NOTFOUND.
Example: 30

HIKE MINIMUM PERCENTAGE
Calculate using this exact formula:
((FINAL SALARY MINIMUM - [CURRENT_SALARY_NUMBER]) 
divided by [CURRENT_SALARY_NUMBER]) multiplied by 100.
Round to nearest whole number.
If result is negative write 0.
If FINAL SALARY MINIMUM is NOTFOUND write NOTFOUND.
Example: 17

HIKE MAXIMUM PERCENTAGE
Calculate using this exact formula:
((FINAL SALARY MAXIMUM - [CURRENT_SALARY_NUMBER]) 
divided by [CURRENT_SALARY_NUMBER]) multiplied by 100.
Round to nearest whole number.
If result is negative write 0.
If FINAL SALARY MAXIMUM is NOTFOUND write NOTFOUND.
Example: 67

DATA SOURCES COUNT
Write one number representing the total count of separate 
data points or sources found in the raw data above.
Count each engine response as 1 and each scraped page as 1.
Example: 34

FINAL POSITIVES
Write exactly five consolidated positive themes.
Each must start on a new line with POSITIVE followed by colon 
and a single space.
Each must be one clear plain text sentence summarizing what 
multiple sources consistently reported.
If fewer than five themes found, write as many as you found.
Example:
POSITIVE: Learning and development opportunities are consistently 
praised across multiple employee reviews from [COUNTRY_NAME]

FINAL NEGATIVES
Write exactly five consolidated negative themes.
Each must start on a new line with NEGATIVE followed by colon 
and a single space.
Each must be one clear plain text sentence summarizing what 
multiple sources consistently reported.
If fewer than five themes found, write as many as you found.
Example:
NEGATIVE: Below-market salary increments are the most commonly 
cited complaint across reviews from employees in [COUNTRY_NAME]
```

### 9.3 Template Variable Reference

```typescript
// All variables injected dynamically from user's 5 filters

[COMPANY_NAME]         → User's typed company name
[COUNTRY_NAME]         → Selected country full name
[ROLE]                 → User's typed role
[EXPERIENCE]           → Slider value (number)
[CURRENT_SALARY]       → User's salary input (number)
[CURRENT_SALARY_NUMBER]→ Same as above, pure number for math
[CURRENCY_NAME]        → Full name e.g. "Indian Rupees"
[CURRENCY_CODE]        → ISO code e.g. "INR"
[SALARY_FORMAT]        → e.g. "LPA" for India, "per year" for US
[ALL_RAW_DATA...]      → Concatenated string of all Phase 1 results
```

---

## 10. RESPONSE PARSING

### 10.1 Parser Logic

```typescript
function parseEngineResponse(rawText: string) {
  const result = {
    rating: null,
    salaryMin: null,
    salaryMax: null,
    hikeMin: null,
    hikeMax: null,
    sourcesCount: null,
    positives: [],
    negatives: [],
  }

  // Extract RATING
  const ratingMatch = rawText.match(/^RATING\s*\n([\d.]+|NOTFOUND)/m)
  if (ratingMatch && ratingMatch[1] !== 'NOTFOUND') {
    result.rating = parseFloat(ratingMatch[1])
  }

  // Extract SALARY MINIMUM
  const salMinMatch = rawText.match(/^SALARY MINIMUM\s*\n([\d.]+|NOTFOUND)/m)
  if (salMinMatch && salMinMatch[1] !== 'NOTFOUND') {
    result.salaryMin = parseFloat(salMinMatch[1])
  }

  // Extract SALARY MAXIMUM
  const salMaxMatch = rawText.match(/^SALARY MAXIMUM\s*\n([\d.]+|NOTFOUND)/m)
  if (salMaxMatch && salMaxMatch[1] !== 'NOTFOUND') {
    result.salaryMax = parseFloat(salMaxMatch[1])
  }

  // Extract POSITIVES — look for POSITIVE: prefix
  const positiveMatches = rawText.match(/^POSITIVE:\s*(.+)$/mg)
  if (positiveMatches) {
    result.positives = positiveMatches.map(p => p.replace(/^POSITIVE:\s*/, '').trim())
  }

  // Extract NEGATIVES — look for NEGATIVE: prefix
  const negativeMatches = rawText.match(/^NEGATIVE:\s*(.+)$/mg)
  if (negativeMatches) {
    result.negatives = negativeMatches.map(n => n.replace(/^NEGATIVE:\s*/, '').trim())
  }

  return result
}
```

### 10.2 Outlier Detection

```typescript
function removeOutliers(values: number[]): number[] {
  if (values.length < 3) return values
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  // Remove any value more than 2x the median
  return values.filter(v => v <= median * 2 && v >= median * 0.5)
}
```

### 10.3 Final Merge Logic

```typescript
function mergeAllResults(phase1Results: ParsedResult[], phase2Results: ParsedResult[]) {
  // Phase 2 results take priority (they are the summarized output)
  // Phase 1 results used only if Phase 2 is incomplete

  const ratings = [...phase1Results, ...phase2Results]
    .map(r => r.rating)
    .filter(Boolean)

  const salaryMins = removeOutliers(
    phase2Results.map(r => r.salaryMin).filter(Boolean)
  )
  const salaryMaxs = removeOutliers(
    phase2Results.map(r => r.salaryMax).filter(Boolean)
  )

  const allPositives = phase2Results.flatMap(r => r.positives)
  const allNegatives = phase2Results.flatMap(r => r.negatives)

  return {
    finalRating: average(ratings),
    finalSalaryMin: median(salaryMins),
    finalSalaryMax: median(salaryMaxs),
    finalPositives: deduplicateThemes(allPositives).slice(0, 5),
    finalNegatives: deduplicateThemes(allNegatives).slice(0, 5),
    confidenceScore: calculateConfidence(phase1Results, phase2Results),
  }
}
```

---

## 11. RESULTS SCREEN (`results.tsx`)

### 11.1 Layout

```
┌───────────────────────────────────────────────┐
│  ← Back          Google · SDE 2 · India       │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │          OVERALL RATING                 │  │
│  │                                         │  │
│  │         ★ ★ ★ ★ ☆   3.8 / 5           │  │
│  │    Based on 34 sources across           │  │
│  │    6 AI engines + 28 domains            │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │          EXPECTED SALARY                │  │
│  │                                         │  │
│  │      ₹ 21 LPA  —  ₹ 30 LPA            │  │
│  │                                         │  │
│  │   Your current salary: ₹ 12 LPA        │  │
│  │                                         │  │
│  │   Expected Hike: +75% to +150%         │  │
│  │   ₹ 12 LPA → ₹ 21-30 LPA range        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ✅ PROS                                │  │
│  │                                         │  │
│  │  • Strong learning culture with         │  │
│  │    structured training programs         │  │
│  │                                         │  │
│  │  • Brand name valued highly for         │  │
│  │    future career growth in India        │  │
│  │                                         │  │
│  │  • Good work-life balance compared      │  │
│  │    to similar companies in India        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ❌ CONS                                │  │
│  │                                         │  │
│  │  • Salary hikes below industry          │  │
│  │    average per Indian employee reviews  │  │
│  │                                         │  │
│  │  • High work pressure during            │  │
│  │    project deadlines                    │  │
│  │                                         │  │
│  │  • Promotions are slow and manager      │  │
│  │    dependent                            │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ℹ️  DATA CONFIDENCE                    │  │
│  │                                         │  │
│  │  🟢 High — 34 sources found            │  │
│  │  6 AI engines responded                 │  │
│  │  28 domains scraped                     │  │
│  │  Search completed in 11 min 42 sec      │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  [🔍 New Search]    [💾 Saved to History]     │
└───────────────────────────────────────────────┘
```

### 11.2 Confidence Score Logic

```
🟢 High    → 25+ total sources
🟡 Medium  → 10-24 total sources
🔴 Low     → 5-9 total sources
⚫ Minimal → Less than 5 (show warning: "Limited data found")
```

### 11.3 No Data Screen

```
┌─────────────────────────────────────────┐
│                                         │
│          😔 No Data Found               │
│                                         │
│  We searched for [Company] [Role]       │
│  in [Country] but could not find        │
│  enough information.                    │
│                                         │
│  This may happen for very new           │
│  companies, niche roles, or companies   │
│  with limited online presence.          │
│                                         │
│  [ Try Different Filters ]              │
│                                         │
└─────────────────────────────────────────┘
```

---

## 12. NOTIFICATION SYSTEM

### 12.1 Search Complete Notification

```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Research Complete ✅',
    body: `${company} · ${role} · ${country} results are ready`,
    data: { searchId: 'uuid', screen: 'results' },
  },
  trigger: null, // fire immediately
})
```

### 12.2 Notification Tap Behavior
- Opens directly to Results Screen for that search
- If app is open: navigate to results directly
- If app is closed: open app and navigate to results

---

## 13. HISTORY SCREEN (`history.tsx`)

### 13.1 What is Stored (AsyncStorage)

```typescript
type SearchHistory = {
  id: string              // UUID
  timestamp: string       // ISO date
  company: string
  role: string
  country: string
  experience: number
  currentSalary: number
  currency: string
  results: FinalResults   // Full results object
  sourcesFound: number
  timeElapsed: number     // seconds
}
```

### 13.2 History Card Layout

```
┌─────────────────────────────────────────┐
│  Google · SDE 2 · India                 │
│  Searched: 2 days ago                   │
│                                         │
│  ★ 3.8  |  ₹21-30 LPA  |  +75-150%    │
│                                         │
│  [View Results]         [🗑 Delete]     │
└─────────────────────────────────────────┘
```

### 13.3 History Rules
- Store last 20 searches only
- Oldest auto-deleted when 21st search is saved
- Tap "View Results" shows saved results without re-scraping
- User can manually delete any history item

---

## 14. DATA MODELS

```typescript
// src/types/index.ts

export type EngineStatus = 'WORKING' | 'BLOCKED' | 'CAPTCHA' | 'TIMED_OUT' | 'UNKNOWN'

export type AIEngine = {
  id: string
  name: string
  url: string
  inputSelector: string
  enabled: boolean
  hasWebSearch: boolean
  lastStatus: EngineStatus
  lastChecked: string | null
  successCount: number
  failureCount: number
  consecutiveFails: number
}

export type SearchFilters = {
  country: string
  countryCode: string
  company: string
  role: string
  experience: number
  currentSalary: number
  currency: string
  currencyCode: string
  salaryFormat: string
}

export type RawDataPoint = {
  source: string          // engine id or domain URL
  sourceType: 'ai' | 'scrape'
  rawText: string
  timestamp: string
  success: boolean
}

export type ParsedResult = {
  source: string
  rating: number | null
  salaryMin: number | null
  salaryMax: number | null
  positives: string[]
  negatives: string[]
}

export type FinalResults = {
  rating: number | null
  salaryMin: number | null
  salaryMax: number | null
  hikeMinPercent: number | null
  hikeMaxPercent: number | null
  positives: string[]
  negatives: string[]
  sourcesCount: number
  aiEnginesResponded: number
  domainsScraped: number
  confidence: 'high' | 'medium' | 'low' | 'minimal'
  timeElapsedSeconds: number
}

export type SearchRecord = {
  id: string
  timestamp: string
  filters: SearchFilters
  results: FinalResults
}
```

---

## 15. ZUSTAND STORE

```typescript
// src/store/searchStore.ts

type SearchStore = {
  // Current search state
  filters: SearchFilters | null
  phase: 'idle' | 'phase1' | 'phase2' | 'complete' | 'error'
  progressPercent: number
  estimatedSecondsRemaining: number
  rawDataPoints: RawDataPoint[]
  finalResults: FinalResults | null

  // Actions
  setFilters: (filters: SearchFilters) => void
  startSearch: () => void
  addRawDataPoint: (point: RawDataPoint) => void
  setPhase: (phase: SearchStore['phase']) => void
  setProgress: (percent: number) => void
  setFinalResults: (results: FinalResults) => void
  cancelSearch: () => void
  reset: () => void
}

// src/store/engineStore.ts

type EngineStore = {
  engines: AIEngine[]
  updateEngineStatus: (id: string, status: EngineStatus) => void
  toggleEngine: (id: string) => void
  addEngine: (engine: Partial<AIEngine>) => void
  removeEngine: (id: string) => void
}

// src/store/historyStore.ts

type HistoryStore = {
  searches: SearchRecord[]
  addSearch: (record: SearchRecord) => void
  deleteSearch: (id: string) => void
  clearAll: () => void
}
```

---

## 16. FOLDER STRUCTURE

```
├── src/
│   ├── components/
│   │   ├── FilterDropdown.tsx
│   │   ├── ExperienceSlider.tsx
│   │   ├── SalaryInput.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── RatingStars.tsx
│   │   ├── SalaryCard.tsx
│   │   ├── ProsConsCard.tsx
│   │   ├── ConfidenceCard.tsx
│   │   ├── EngineCard.tsx
│   │   └── HistoryCard.tsx
│   ├── constants/
│   │   ├── config.ts           ← App-wide config
│   │   ├── countries.ts        ← Country → currency mapping
│   │   └── aiEngines.ts        ← Initial engine list
│   ├── hooks/
│   │   ├── useScraper.ts       ← Orchestrates both instances
│   │   ├── useAIEngine.ts      ← Manages AI engine WebViews
│   │   ├── useDomainScraper.ts ← Manages domain scraping WebViews
│   │   └── useNotification.ts  ← Local notification helper
│   ├── store/
│   │   ├── searchStore.ts
│   │   ├── engineStore.ts
│   │   └── historyStore.ts
│   ├── utils/
│   │   ├── promptBuilder.ts    ← Builds PROMPT 1 and PROMPT 2
│   │   ├── responseParser.ts   ← Parses AI engine text responses
│   │   ├── outlierDetection.ts ← Removes salary outliers
│   │   ├── merger.ts           ← Merges all results into final
│   │   ├── currency.ts         ← Currency formatting helpers
│   │   └── urlExtractor.ts     ← Extracts URLs from search pages
│   └── types/
│       └── index.ts
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx           ← Search Screen
│   │   ├── history.tsx         ← History Screen
│   │   └── settings.tsx        ← Engine Manager Screen
│   ├── searching.tsx           ← Progress Screen (no tab)
│   ├── results.tsx             ← Results Screen (no tab)
│   └── _layout.tsx
├── assets/
│   └── images/
├── scripts/
│   └── bump-version.js
├── whatsnew/
│   └── whatsnew-en-US
├── .github/
│   └── workflows/
│       └── release.yml
├── app.json
└── package.json
```

---

## 17. KEY CONSTANTS

```typescript
// src/constants/config.ts

export const APP_CONFIG = {
  appName: 'HireScope',
  packageName: 'com.rutambh.hirescope',
  supportEmail: 'rutambhtrivedi@gmail.com',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.rutambh.hirescope',

  // Scraping
  maxDomainsTarget: 50,
  maxDomainsFallback1: 25,
  maxDomainsFallback2: 5,
  perDomainTimeoutMs: 20000,       // 20 seconds per domain
  perEngineTimeoutMs: 30000,       // 30 seconds per AI engine
  phase1DurationMs: 10 * 60000,   // 10 minutes
  phase2DurationMs: 5 * 60000,    // 5 minutes
  totalTimeoutMs: 15 * 60000,     // 15 minutes absolute max

  // Engine health
  autoDisableAfterFails: 3,

  // History
  maxHistoryItems: 20,

  // WebView user agent
  webViewUserAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
} as const
```

---

## 18. ERROR STATES

| Scenario | Handling |
|---|---|
| All AI engines blocked | Use scraped domain data only for results |
| 0 domains scraped | Use AI engine data only for results |
| Both return nothing | Show "No Data Found" screen |
| Under 5 total sources | Show results with 🔴 Low confidence warning |
| 15 min timeout hit | Merge whatever exists, show results, note partial |
| No internet connection | Show "No internet connection" immediately |
| Search cancelled by user | Return to Search Screen, no history saved |
| Phase 2 all engines fail | Use Phase 1 raw data, do local frequency analysis for pros/cons |

---

## 19. WHAT THIS APP DOES NOT DO

- No user accounts or login
- No data sent to any server owned by you
- No analytics or tracking
- No ads
- No in-app purchases
- No camera or microphone access
- No location access
- No contact access
- No comparison between two companies (V2 feature)
- No interview question tracking (V2 feature)
- No AI API calls (Gemini API, Claude API, OpenAI API)

---

## 20. LAUNCH CHECKLIST (from NEW-APP-SETUP.md)

- [ ] App name and package name decided
- [ ] Keystore generated at `C:\rutambh\keystores\rutambh-hirescope.jks`
- [ ] Keystore backed up to Google Drive
- [ ] All 5 GitHub Secrets set
- [ ] `app.json` complete with correct package name
- [ ] Notification icon is white-on-transparent PNG
- [ ] Splash screen uses transparent.png
- [ ] First AAB manually uploaded to Play Store Internal Testing
- [ ] `whatsnew/whatsnew-en-US` written
- [ ] Service Account added to new app in Play Console

---

*PRD Version 1.0 — Ready for Development*
