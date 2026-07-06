# UI Design System

All design tokens live in [`src/constants/theme.ts`](../src/constants/theme.ts). The theme engine in [`src/utils/themeEngine.ts`](../src/utils/themeEngine.ts) handles pros/cons clustering, not visual themes — naming is slightly misleading.

## Theme Modes

**Light, Dark, and System-default** are supported from day one.

- Stored in `appStore.theme` (Zustand, persisted to AsyncStorage)
- Values: `'light'` | `'dark'` | `'system'`
- When `'system'`, the app follows the device's appearance setting via React Native's `useColorScheme()`
- Theme selection is in the Settings tab

## Color Tokens

### Dark Mode (`DarkColors`)

| Token | Value | Usage |
|---|---|---|
| `bg` | `#051424` | Main background |
| `bgAlt` | `#0d1c2d` | Alternate background |
| `surface` | `#122131` | Card/container surface |
| `surfaceAlt` | `#1c2b3c` | Alternate surface |
| `surfaceElevated` | `#273647` | Elevated elements |
| `border` | `#414754` | Default borders |
| `borderFocus` | `#aac7ff` | Focused input borders |
| `text` | `#d4e4fa` | Primary text |
| `textSecondary` | `#c0c6d6` | Secondary text |
| `textMuted` | `#8b91a0` | Muted/hint text |
| `primary` | `#aac7ff` | Primary accent (soft blue) |
| `success` | `#3e90ff` | Success state |
| `danger` | `#ffb4ab` | Error/danger state |
| `star` | `#aac7ff` | Rating star color |

### Light Mode (`LightColors`)

| Token | Value | Usage |
|---|---|---|
| `bg` | `#f9f9f9` | Main background |
| `surface` | `#ffffff` | Card/container surface |
| `border` | `#e2e8f0` | Default borders |
| `borderFocus` | `#3525cd` | Focused input borders |
| `text` | `#1a1c1c` | Primary text |
| `textSecondary` | `#464555` | Secondary text |
| `textMuted` | `#777587` | Muted/hint text |
| `primary` | `#3525cd` | Primary accent (deep indigo) |
| `success` | `#3525cd` | Success state |
| `danger` | `#ba1a1a` | Error/danger state |
| `star` | `#3525cd` | Rating star color |

### Palette (shared constants)

A full HSL palette is defined under `palette` with `violet`, `cyan`, `emerald`, `rose`, `amber`, and `slate` scales (50–900). These are available for component-level accents.

## Typography

Defined in `Typography` — uses system fonts (no custom font files loaded currently).

| Token | Size | Weight | Line Height |
|---|---|---|---|
| `h1` | 40 | 700 | 48 |
| `h2` | 32 | 700 | 40 |
| `h3` | 24 | 600 | 32 |
| `h4` | 18 | 700 | 24 |
| `body` | 16 | 400 | 24 |
| `bodyBold` | 16 | 600 | 24 |
| `caption` | 13 | 500 | 18 |
| `small` | 11 | 600 | 14 |
| `label` | 12 | 700 | 16 |
| `badge` | 10 | 700 | 12 |

## Spacing

| Token | Value (px) |
|---|---|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `xxl` | 40 |
| `xxxl` | 48 |

## Border Radius

| Token | Value |
|---|---|
| `sm` | 4 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 24 |
| `xxl` | 32 |
| `full` | 9999 |

## Shadows

Four shadow presets: `sm`, `md`, `lg`, and `glow` (blue glow effect, `#3e90ff`).

## Component UI Notes

- **Safe areas**: Header bars use `react-native-safe-area-context` to blend with status bar
- **Tab bar**: Uses glassmorphism effect with semi-transparent backgrounds (`tabBar`, `tabBarBorder`)
- **Dropdowns**: Custom overlay modal with search filter
- **Sliders**: Custom-built horizontal slider (not stock Material)
- **Progress**: Animated progress rings and bars
- **Cards**: Rounded containers with surface/border tokens, shadow presets
- **Splash screen**: Dark background (`#090D1A`) with 1×1 transparent PNG to suppress Expo logo
