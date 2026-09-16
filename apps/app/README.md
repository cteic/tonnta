# @tonnta/app

The Tonnta universal app: one Expo Router codebase that ships to the web, iOS
and Android. Screens are Tamagui components from `@tonnta/ui`; the verdict and
outlook come from `@tonnta/data`.

## Routes

| Route         | Screen                                       |
| ------------- | -------------------------------------------- |
| `/`           | Verdict for the current hour + 7-day outlook |
| `/log`        | Loga — session diary (placeholder)           |
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

## UI smoke test (Maestro)

With the app installed on a booted simulator (`pnpm ios` leaves it running):

```sh
cd apps/app
maestro test .maestro        # launches the app and waits for the verdict heading
```

The flow is `.maestro/home.yaml`. It asserts on `testID="verdict-heading"`,
so it passes whatever the sea is doing.

## Placeholder assets

`assets/*.png` are generated placeholders (a wave glyph on the Éirí palette).
Regenerate with `pnpm generate:assets`; replace them with the real brand marks
before a store submission.
