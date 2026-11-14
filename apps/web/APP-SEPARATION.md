# Surf and swim sites

Tonnta (`apps/web`, tonnta.surf) is surf only. Swimming lives on its own site, Snámh (`apps/swim-web`, snamh.app). Both sites render the same shell from `@tonnta/web-shell` and the same conditions UI from `@tonnta/web-conditions`, so branding, themes and data stay identical.

## Links between the sites

- Each footer links to the same spot on the other site.
- `tonnta.surf/swim` and `tonnta.surf/swim/s/:spotId` return 301 to the same spot on snamh.app.
- The swim origin is set in `src/lib/spot-links.ts` and in the redirects in `next.config.js`. Change both together.

## Still shared

The surf site's Pro alerts still include swim windows, and its MCP tool still returns a swim verdict. Moving those to the swim site is separate work.

## Launch checks

1. After the first swim deploy, attach snamh.app to the `snamh-web` worker and confirm the redirects land on a live page.
2. Check both sites at night, in daylight, under a water-quality restriction and with missing forecast data.
3. On installed PWAs, check each site's name, icon and launch URL, and that offline navigation shows no cached forecast.
