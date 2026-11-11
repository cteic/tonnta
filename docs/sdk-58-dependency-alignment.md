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
