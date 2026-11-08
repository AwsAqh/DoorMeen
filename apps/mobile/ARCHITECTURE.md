# DoorMeen Mobile — Architecture

## Tech Stack
| Concern | Web (`apps/web`) | Mobile (`apps/mobile`) |
|---|---|---|
| Framework | React + Vite | React Native + Expo |
| Navigation | React Router v6 | React Navigation v6 |
| Realtime | `@microsoft/signalr` | `@microsoft/signalr` (same pkg) |
| Storage | `localStorage` | `react-native-mmkv` |
| i18n | `react-i18next` | `react-i18next` + `AsyncStorage` |
| Validation | `zod` | `zod` (same schemas) |
| Styling | Tailwind + CSS vars | `StyleSheet` + `src/constants/theme.ts` |
| QR | `@yudiel/react-qr-scanner` | `expo-camera` |

---

## Folder Structure

```
apps/mobile/
├── App.tsx                          ← Root: i18n init → GestureHandler → Navigator
├── app.json                         ← Expo manifest (dark theme, camera permissions)
├── .env.example                     ← EXPO_PUBLIC_API_BASE_URL
│
└── src/
    ├── constants/
    │   ├── theme.ts                 ← Design tokens (mirrors web CSS vars exactly)
    │   └── status.ts                ← Status type, RANK map, i18n key helper
    │
    ├── features/queue/
    │   ├── handlers/index.ts        ← handleJoin, handleCreate, handleManage
    │   ├── services/api.ts          ← All fetch calls (mirror of web api.tsx)
    │   └── validations/
    │       ├── join.schema.ts
    │       ├── create.schema.ts
    │       └── manage.schema.ts
    │
    ├── hooks/
    │   ├── useQueueSignalR.ts       ← SignalR connection hook
    │   └── useOwnerSession.ts       ← MMKV-backed JWT session
    │
    ├── i18n/
    │   ├── config.ts                ← initI18n() — async, handles RTL
    │   └── locales/
    │       ├── en.json              ← Copied from web (keep in sync)
    │       └── ar.json
    │
    ├── navigation/
    │   └── AppNavigator.tsx         ← NativeStack + RootStackParamList
    │
    └── screens/
        ├── HomeScreen.tsx           ← Hero + scan/create CTAs + My Queues
        ├── ScanScreen.tsx           ← QR scanner → JoinScreen
        ├── JoinScreen.tsx           ← Join form (Name, Phone, Email)
        ├── VerifyScreen.tsx         ← 6-box PIN input
        ├── QueueScreen.tsx          ← Customer live queue view
        ├── ManageLoginScreen.tsx    ← Owner password login
        ├── OwnerDashboardScreen.tsx ← Owner dashboard + settings modal
        └── CreateQueueScreen.tsx    ← Create new queue
```

---

## Navigation Map

```
Home
 ├── Scan ──→ Join ──→ Verify ──→ Queue
 ├── CreateQueue ──→ Home
 └── Queue (FAB ⚙️) ──→ ManageLogin ──→ OwnerDashboard
```

---

## Design Token System

All colours, spacing, radius, typography and shadows live in `src/constants/theme.ts`.
These mirror the CSS custom properties in `apps/web/src/index.css` exactly.

| CSS variable | Token |
|---|---|
| `--dm-bg-primary` | `Colors.bgPrimary` |
| `--dm-accent` | `Colors.accent` |
| `--dm-text-primary` | `Colors.textPrimary` |
| `--dm-surface` | `Colors.surface` |
| `--dm-status-progress` | `Colors.statusProgress` |

> **Rule:** Never hardcode a colour or pixel value in a screen file. Always import from `theme.ts`.

---

## API Layer

`src/features/queue/services/api.ts` is a 1-to-1 port of the web's `api.tsx`:
- Same endpoint paths and same `ApiError` class
- `localStorage` → `MMKV`
- `import.meta.env.VITE_*` → `process.env.EXPO_PUBLIC_*`

> **Rule:** Never call `fetch` directly from a screen. Always go through `api.ts` → `handlers/`.

---

## SignalR Events (same as web)

`CustomerJoined` · `CustomerStatusChanged` · `CustomerVerified` · `QueueUpdated`

---

## i18n & RTL

- Locale files are direct copies from the web. Keep `en.json` / `ar.json` in sync manually until a shared `packages/i18n` workspace is set up.
- RTL for Arabic is applied via `I18nManager.forceRTL(true)` at startup inside `initI18n()`.
- Language preference is persisted in `AsyncStorage` under key `dm_language`.

---

## Adding a New Screen

1. Add its param type to `RootStackParamList` in `AppNavigator.tsx`
2. Create `src/screens/MyScreen.tsx` — use only theme tokens, no raw values
3. Register in `Stack.Navigator`
4. Add any new API calls to `api.ts`, optionally a handler to `handlers/`

---

## Running Locally

```bash
# 1. Copy and fill in your API URL
cp .env.example .env

# 2. Start (Expo Go app on your phone)
npm run android   # or: npm run ios

# 3. Quick UI check in browser
npm run web
```
