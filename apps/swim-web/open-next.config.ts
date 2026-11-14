import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// The home screen is fully dynamic (live marine data per request), so no
// incremental cache is configured; static assets are served via the ASSETS
// binding with immutable headers from public/_headers.
export default defineCloudflareConfig({});
