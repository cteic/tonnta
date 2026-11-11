# SDK 58 dependency alignment

## Scope

PR #74's initial Mobile run failed Expo doctor's SDK-version check with 16
mismatched packages, preventing its native export step from running:
https://github.com/cteic/tonnta/actions/runs/42801210058.

This correction keeps SDK 58 and React 19.3.0. It aligns the reported Expo
packages, React Native 0.88.1, safe-area-context 5.11.1, and screens 4.30.1.
The root React Native override must match the app's version. The direct Babel
preset is aligned to 58.0.24, and the app explicitly supplies
`@react-native/metro-config` 0.88.1 so pnpm does not retain the older auto-installed
peer. Existing Expo doctor exclusions are unchanged. No check is disabled.

The lockfile is regenerated with the repository's pinned pnpm 9.15.0. React,
Tamagui versions and patches, and unrelated direct dependency declarations are
unchanged. This is a dependency correction, not a change to swim-safety policy.

## Native release gates

Native dependencies change, and this app uses fingerprint runtime versions.
A release therefore requires new native binaries and device testing. Do not
publish an OTA update to old binaries as a substitute.

Before release, inspect the final Android manifest and background behavior,
including task-manager's boot receiver and WorkManager dependencies. Check
startup/update recovery, safe-area layout, background refresh, widget expiry,
and reopening after reboot on actual devices. The Android widget remains
forecast-only.

Local bundle exports do not validate Gradle/Xcode builds or device behavior.
No EAS build, app-store upload, OTA update, preview, or production deployment
is part of this change. Keep the PR in draft.

## Verification

Use Node 22 and pnpm 9.15.0, as in CI. Run a frozen install, Expo's online
compatibility check and Expo doctor, full unit/contract tests, lint, typecheck,
formatting, both web builds, worker dry-run, and iOS/Android exports. Verify
remote Code Checks and Mobile on the published commit. Native release/device
gates remain separate even after CI passes.

### Local recovery verification (11 November 2026)

On Node 22.23.4 and pnpm 9.15.0:

- Frozen install and formatting passed after formatting the regenerated lockfile.
- Expo online compatibility check passed; Expo doctor passed all 20 checks.
- Full lint, typecheck, and 961 unit/contract tests in 58 files passed.
- Surf and swim web production builds, worker dry-run, and iOS/Android bundle
  exports passed. `build:packages` completed with no tasks defined.
- Workflow timeout validation passed for seven jobs.
- Independent semantic review found 1,657 package records (previously 1,660), no
  new package names, unchanged-version integrity hashes preserved, and all
  Tamagui patch hashes intact. Safety code and workflows are unchanged.

Remote CI must still be checked on the resulting published commit.

### Remote doctor tooling correction

The first remote run passed frozen installation and Code Checks, but the floating
`expo-doctor@latest` resolved 1.21.7 and crashed before checks with missing
`@expo/env`. Local validation had resolved 1.21.6. Mobile CI now pins 1.21.6,
which passed all 20 checks again from a fresh cache without `NODE_PATH`. This
keeps all doctor checks enabled while avoiding the broken floating release.
Revisit the pin when a later release is independently verified.

### Follow-up patch alignment (CTE-100, 11 November 2026)

PR #75's Mobile run encountered 11 newly recommended Expo patches:
https://github.com/cteic/tonnta/actions/runs/43067276330.
A fresh online `expo install --check` reproduced the same recommendations.
This separate follow-up updates only those app declarations and their lockfile
resolution: `@expo/ui` 58.0.28, `expo` 58.0.24, `expo-background-task` 58.0.13,
`expo-constants` 58.0.16, `expo-linking` 58.0.17, `expo-router` 58.0.31,
`expo-splash-screen` 58.0.14, `expo-status-bar` 58.0.5,
`expo-task-manager` 58.0.14, `expo-updates` 58.0.22, and `expo-widgets` 58.0.28.
The doctor pin and existing exclusions are unchanged.

These direct patch releases bring upstream transitive changes, including
`expo-modules-core`, `expo-modules-autolinking`, and `expo-server` 58.1.0,
`expo-modules-cli` 0.5.0, `expo-modules-macros` 0.33.0, and `@expo/env` 2.6.0.
They are not evidence of native build or device acceptance. All native release
gates above still apply; CTE-100 remains open for that acceptance.

Semantic lockfile review found 1,659 package records versus 1,657 previously.
Only the app importer changed. Unchanged-version package metadata/integrities,
all other importers, overrides, and Tamagui patch hashes are preserved.

Independent review compared 38 old/new installed packages and 17 Android
manifest/privacy files without finding manifest or privacy-file changes.
`RECEIVE_BOOT_COMPLETED` was already present in task-manager 58.0.13.
Core/macros/autolinking still change iOS module generation and validation;
check native compilation and device behavior before any release.
The direct Babel preset remains 58.0.24 while Expo resolves a separate
transitive 58.0.25; no blanket latest-version claim is intended.

Local verification on Node 22.23.4 and pnpm 9.15.0 passed frozen installation,
formatting, workflow timeouts, lint, typecheck, 961 unit/contract tests in
58 files, both web builds, worker dry-run, and iOS/Android exports.
`build:packages` completed with no tasks defined. A fresh-cache
`expo-doctor@1.21.6` passed all 20 checks, and the online compatibility check
passed. Remote Code Checks and Mobile must still be verified on the published
commit. No merge, EAS build, submission, OTA update, or deployment was performed.
