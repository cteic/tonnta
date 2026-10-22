# @tonnta/app

The Tonnta universal app: one Expo Router codebase that ships to the web, iOS
and Android. Screens are Tamagui components from `@tonnta/ui`; the verdict and
outlook come from `@tonnta/data`.

## Routes

| Route         | Screen                                       |
| ------------- | -------------------------------------------- |
| `/`           | Verdict for the current hour + 7-day outlook |
| `/log`        | Loga: session diary (placeholder)            |
| `/pro`        | Tonnta Pro (placeholder)                     |
| `/s/[spotId]` | Spot screen, reads the id from the URL       |

## Web

```sh
pnpm dev:app                 # Metro dev server; press `w` for the browser
pnpm build:app:web           # static export to apps/app/dist
npx serve apps/app/dist      # serve the export locally
```

## iOS simulator

Needs Xcode with an iOS simulator installed.

```sh
cd apps/app
pnpm ios                     # expo prebuild + build + launch on the default simulator
```

`ios/` and `android/` are generated (continuous native generation) and are
git-ignored; `app.json` is the source of truth for native config.

## Preview builds (EAS)

`eas.json` has a `preview` profile: an iOS simulator build and an Android APK,
both internal distribution. Neither needs an Apple or Google developer account.
The project belongs to the `cteic` Expo account.

```sh
cd apps/app
pnpm dlx eas-cli@latest login                         # once per machine
pnpm dlx eas-cli@latest init                          # once: writes extra.eas.projectId to app.json
pnpm dlx eas-cli@latest build -p android --profile preview
pnpm dlx eas-cli@latest build -p ios --profile preview
pnpm dlx eas-cli@latest build:run -p ios --latest     # install the simulator build
```

## Home-screen widget

`src/widgets/` holds a verdict widget for both platforms, built with
`expo-widgets`: SwiftUI on iOS (small and medium), Glance on Android (2x2,
resizable). The layouts are `verdict-widget.ios.tsx` and
`verdict-widget.android.tsx`; they run outside the app, so they may only read
their props.

Data comes from the worker's `GET /verdict`. The app refreshes the widget on
open, on return to the foreground, and from an hourly background task. iOS gets
the whole day as a timeline; Android gets the current hour.

To point a dev build at a local worker, run `pnpm dev:worker` and start Metro
with the worker's LAN address, which both the simulator and the emulator reach:

```sh
cd apps/app
EXPO_PUBLIC_VERDICT_URL=http://<lan-ip>:8787/verdict pnpm ios
```

Two things to know:

- Android widgets are behind the plugin's `enableAndroid` flag in `app.json`.
- Metro started with `CI=1` does not watch files. A widget layout edit then
  never reaches the device; restart Metro without it.

## Live tide

The home screen streams the spot's tide gauge (Skerries Harbour for Donabate)
from the worker's `GET /live`, a Server-Sent Events stream: a snapshot of the
last hour, then each new reading as the gauge reports every 5 minutes.

React Native has no `EventSource`, so `src/live/` reads the stream with
`expo/fetch` and parses it with its own SSE parser (`sse.ts`). The hook holds
the connection only while the app is in the foreground, reconnects when the
server closes the stream (every 15 minutes), and backs off on failure.

Point a dev build at a local worker with `EXPO_PUBLIC_LIVE_URL`, the same way
as the widget's `EXPO_PUBLIC_VERDICT_URL`.

## CI and releases

| What                                            | Where                              | When                                       |
| ----------------------------------------------- | ---------------------------------- | ------------------------------------------ |
| Expo doctor, iOS and Android bundle export      | `.github/workflows/mobile.yml`     | Every PR touching the app or packages      |
| Preview builds (iOS simulator app, Android APK) | `.eas/workflows/preview-build.yml` | Label a PR `preview-build`                 |
| Over-the-air update to the `preview` channel    | `.eas/workflows/deploy-update.yml` | Push to `dev` touching the app or packages |
| Maestro flows on an Android emulator            | `.github/workflows/e2e.yml`        | Label a PR `e2e`                           |

Updates use a fingerprint runtime version: an update reaches only the builds
whose native code it matches. A native change (a new native module, an
`app.json` plugin change) needs a new build, and the fingerprint makes that
explicit instead of shipping JavaScript that crashes on old binaries.

The EAS workflows run once the GitHub repository is connected to the Expo
project. Maestro runs in GitHub Actions rather than EAS: the repository is
public, so the runner minutes cost nothing, where EAS charges per Maestro job.

## UI smoke test (Maestro)

With the app installed on a booted simulator (`pnpm ios` leaves it running):

```sh
cd apps/app
maestro test .maestro        # launches the app and waits for the verdict heading
```

The flow is `.maestro/home.yaml`. It asserts on `testID="verdict-heading"`,
so it passes whatever the sea is doing.

To run it headless, with no simulator window, boot the device without the
Simulator app or start the emulator with no window:

```sh
xcrun simctl boot "iPhone 18 Pro"                  # iOS: boots without opening Simulator.app
emulator -avd <avd-name> -no-window -no-audio &    # Android
```

## Placeholder assets

`assets/*.png` are generated placeholders (a wave glyph on the Éirí palette).
Regenerate with `pnpm generate:assets`; replace them with the real brand marks
before a store submission.
