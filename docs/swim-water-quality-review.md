# Swim water-quality review

This is a review candidate. It does not establish that a beach is safe to enter.

## Stack and release order

This branch follows PR #73 (`feat/surf-only-web`) and preserves its surf-only
pages and redirects. PR #68 (`feat/worker-verdict-v2`) is integrated into this
review branch with its history intact so the worker and widget both use v2.
Neither existing PR has been merged into `dev` or `main` by this work.

The swim-site deployment and domain prerequisites in PRs #72 and #73 still
apply. Review and land the existing stack in its intended order, then retarget
this draft as needed. Do not deploy the redirects before `snamh.app` is live.

Draft PRs skip both web preview-upload jobs. Code checks and native bundle checks
still run. Marking a PR ready and pushing later can enable previews; merging to
`dev` or `main` deploys under the existing workflow. Those are separate release
steps, not part of creating this draft.

## Source knowledge

EPA's Alerts feed describes in-season incidents. A successful empty response or
an explicit `No` is not a current water sample and does not establish water
quality. Out-of-season sample reporting is voluntary. Locations' season-long
restriction field means the bathing season, not year-round coverage. Annual
classifications are historical evidence.

The application distinguishes a recorded restriction, a complete notice check
with no restriction reported, a failed check, an unmapped spot, an expired check,
and an unchecked state. Retrieval time is labelled separately from sampling time.
No dated samples or Locations' season-long flags are ingested in this candidate.

The interim policy withholds positive swim verdicts and windows whenever water
quality is unknown, including after a complete empty seasonal Alerts response.
Weather values remain visible. Actual weather hazards retain their explanations,
and a known bathing restriction takes precedence. The native screen retains a
known restriction across failed refreshes; clearing it requires a fresh complete
response with an explicit `No` for the same mapped beach. Even that response does
not permit positive swimming advice.

## Complete alert retrieval

The adapter requests explicit pages of 50 from the fixed EPA endpoint. It checks
page numbers, declared size, stable total count, expected row count, unique
positive numeric incident IDs, and contradictory final-page links. It does not
follow response URLs. The cap is 20 pages / 1,000 rows, with one 30-second deadline
covering fetches and response bodies. Invalid or incomplete results stay unknown.
A valid active restriction is returned immediately even if completeness cannot
be established. Later-page failures cannot turn an earlier `No` into clearance.

EPA supplies no snapshot token. Observable inconsistencies are rejected, but a
multi-page response cannot prove the source was unchanged between requests.

## Review and validation limits

- The live Alerts response checked on 10 November 2026 at 06:46 UTC was empty.
  Page-2 matches and partial failures are fixture-tested, not observed incidents.
  Populated live envelopes and incident-ID types still need validation.
- Test actual browser and physical-device behavior, including AbortSignal,
  caching, refresh, restriction retention, expiry and solar-boundary wakeups.
- A new browser session or native cold start does not persist a prior restriction.
  Missing knowledge still cannot restore a positive swim recommendation.
- Remote Expo doctor dependency alignment is a separate existing gate. Successful
  local bundle exports are not a substitute for device QA or green remote CI.
- Surfing calibration, dated-sample ingestion and any future relaxation of this
  conservative swim policy need separate evidence and review.

## Sources

- <https://data.epa.ie/api-list/bathing-water-open-data/>
- <https://www.beaches.ie/frequently-asked-questions/>
- <https://data.epa.ie/bw/swagger/v1/swagger.json>
- <https://data.epa.ie/bw/api/v1/alerts?page=1&per_page=50>
