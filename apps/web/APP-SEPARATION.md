# Web app separation: first phase

## Implemented locally

- Surf retains `/` and `/s/:spotId`, preserving existing links and installations.
- Swimming has `/swim` and `/swim/s/:spotId`. Spot navigation stays in its app.
- Activity is a server-provided route property, never local storage or a toggle. An old `tonnta-mode=snamh` preference cannot change the content of a surf link.
- Open tabs re-evaluate the downloaded forecast at sunrise/sunset boundaries, at most every 15 seconds, and immediately on focus/visibility changes. Sunrise/sunset and current-hour verdicts update locally without extra data requests; expired hours are not shown as current. After one hour without a fresh retrieval, the screen requests a reload rather than advancing an old forecast or water-quality snapshot.
- Surf retains board recommendations, surf windows, alerts and session-log navigation. Swimming retains swim verdicts, daylight swim windows, water temperature and quality warnings, without surf alerts or the surf-only diary.
- Each app links to the other at the same spot in its footer. This is navigation, not an in-place mode switch.
- Swimming has dedicated page metadata, canonical URLs, preview indexing rules, sitemap entries, social artwork, icon and install manifest. `Tonnta Swim` is a descriptive interim identity, not an approved new brand. Existing Snámh component names remain internal implementation details.
- The existing root service worker no longer substitutes cached surf conditions for an offline swim/other-spot page. Offline navigation gives an explicit unavailable message instead; only old Tonnta shell caches are removed.

## Deliberately shared

One Next.js build/deployment, origin, theme preferences, forecast data pipeline and component library. This is separate web entry points and experiences, not yet two independently deployed products. Surf installation scope still covers the root origin. Swimming has its own manifest ID and `/swim` scope, but installation behavior needs real-device verification. No swim push alerts, swim diary, new domains, accounts, subscriptions or payments were added.

## Decisions and launch checks

1. Approve swim naming and whether launch uses these paths or separate domains/deployments. Separate origins would also isolate storage and service workers; changing existing surf URLs needs a redirect and SEO plan.
2. If independently deployed products are required, split build targets and deployment configuration while continuing to share packages. Agree domains and update origin/canonical configuration, crawler metadata, service-worker scope and alert links before publishing.
3. Run the repository checks and production web build. Browser checks: direct load and refresh both home and spot routes; change spots, Back/Forward, revisit after storing the old swim preference; verify surf never renders swimming and swimming never exposes surf alerts/diary; invalid spots return 404.
4. Check both apps at night and daylight, water-quality restrictions and missing forecast data. On installed PWAs, verify each launch URL/icon/name and cross-app navigation, test an existing surf service-worker upgrade, and verify offline navigation shows no cached live forecast.
5. Review existing `/pro`, notification/payment setup and safety advice separately before launch. This work does not approve those flows for production or change their business model.
