# CricketTips Mobile App

React Native (Expo) app for the CricketTips.ai platform.

## Setup

```bash
cd mobile
npm install
npx expo start
```

Then press `a` to open on Android emulator, or scan QR code with Expo Go.

## Build APK (for testing)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build preview APK (no signing required)
eas build --platform android --profile preview
```

## Screens

| Tab | Screen | Description |
|-----|--------|-------------|
| Live | Home | Real-time match cards, auto-refresh 15s |
| Matches | All Matches | Full list with pull-to-refresh |
| Predictions | AI Predictions | Live/upcoming matches with win probability |
| News | Blog | AI-generated articles from Sanity CMS |
| Profile | Auth | Login/logout via BetterAuth |

| Stack Screen | Route | Description |
|-------------|-------|-------------|
| Live Match | `/live/[matchKey]` | Scoreboard, ball-by-ball, win probability |
| Article | `/news/[slug]` | Full blog article |

## API

All data comes from the Railway-deployed Next.js app at `https://crickettips.ai`.
Endpoints used:
- `GET /api/matches` — featured matches
- `GET /api/cricket/match/[key]/full-live` — live match data
- `GET /api/blog/posts` — blog list
- `GET /api/blog/posts/[slug]` — single article
- `POST /api/auth/sign-in/email` — login
- `POST /api/auth/sign-out` — logout
- `GET /api/auth/get-session` — session check

## Assets needed

Place in `assets/`:
- `icon.png` — 1024×1024 app icon
- `splash.png` — 1284×2778 splash screen
- `adaptive-icon.png` — 1024×1024 Android adaptive icon foreground
