# 0005. Fingerprint runtime versions for over-the-air updates

- Status: Accepted
- Date: 2026-10-21

## Context

EAS Update ships JavaScript to installed apps without a store release. An
update that expects native code the installed binary lacks crashes on launch.
A hand-maintained version number relies on someone remembering to bump it.

## Decision

`app.json` sets `runtimeVersion` to the `fingerprint` policy. EAS hashes the
native inputs (native modules, config plugins, `app.json` native fields), and
an update reaches only the builds with the same hash. Builds and updates use
channels: `preview` for internal builds, `production` for the stores. Pushes to
`dev` publish an update to `preview`.

## Options rejected

- **The app version as the runtime version**: depends on a manual bump, the
  step most likely to be forgotten.
- **No over-the-air updates**: every copy fix waits for store review.

## Consequences

- A native change needs a new build, and the fingerprint makes that explicit.
  CodeRabbit flags `app.json` changes for this reason.
- JavaScript-only fixes reach testers within minutes of a merge to `dev`.
