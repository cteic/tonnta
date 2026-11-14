# 0007. Run Maestro end-to-end tests on GitHub Actions

- Status: Accepted
- Date: 2026-10-21

## Context

The app needs end-to-end UI tests on a real device runtime. EAS can run Maestro
flows, but only on a paid plan, and it charges per job. The repository is
public, so GitHub Actions runner minutes cost nothing.

## Decision

Maestro flows run in `.github/workflows/e2e.yml` on an Android emulator
(API 35), against a release APK, when a PR carries the `e2e` label. EAS keeps
builds and updates. Developers run the same flows headless on a local
simulator or emulator.

## Options rejected

- **Maestro on EAS**: a paid plan plus a charge per run, for the same flows.
- **Running on every PR**: emulator jobs take minutes. The label keeps them for
  PRs that change UI.

## Consequences

- No spend on end-to-end runs.
- A UI PR needs the `e2e` label to get end-to-end coverage. Reviewers ask for it.
- iOS end-to-end tests in CI need a macOS runner, not yet added.
