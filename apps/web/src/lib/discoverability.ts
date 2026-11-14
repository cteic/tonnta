import type { Metadata, MetadataRoute } from 'next';

import { DEFAULT_SPOT_ID, SPOTS } from '@tonnta/data';

/**
 * Crawler-facing artefacts: the robots.txt body and the sitemap entries.
 *
 * These live here rather than in the `app/` file-convention routes so they
 * are plain functions we can assert on — the route handlers are thin shells
 * that pass the request host in and hand the string back out.
 */

/**
 * Machine-facing paths a crawler gains nothing from fetching. `/mcp` is
 * deliberately absent: it is the `Dataset` distribution URL, so disallowing
 * it would point crawlers at a door and then lock it.
 */
const DISALLOWED_PATHS: readonly string[] = ['/api/'];

/**
 * Crawlers that harvest for model training and give nothing back — no
 * citation, no link, no grounding. Cloudflare's Managed robots.txt used to
 * emit these groups; the app owns robots.txt now, so it emits them itself.
 * Per-bot groups beat `User-agent: *` regardless of order.
 */
const TRAINING_ONLY_CRAWLERS: readonly string[] = [
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'Applebot-Extended',
];

interface PublicPath {
  path: string;
  priority: number;
  changeFrequency: 'hourly' | 'monthly';
}

/** Fixed public routes, in the order a reader would meet them. */
const FIXED_PATHS: readonly PublicPath[] = [
  { path: '/', priority: 1, changeFrequency: 'hourly' },
  { path: '/log', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/pro', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'monthly' },
];

/**
 * One `/s/<id>` entry per spot in the registry, minus the default spot: `/`
 * already serves Donabate, so listing `/s/donabate` too would offer crawlers
 * two URLs for one page. Driving this off `SPOTS` means a new spot reaches
 * the sitemap as a registry entry, not a sitemap edit.
 */
function spotPaths(): PublicPath[] {
  return SPOTS.filter((spot) => spot.id !== DEFAULT_SPOT_ID).map((spot) => ({
    path: `/s/${spot.id}`,
    priority: 0.8,
    changeFrequency: 'hourly',
  }));
}

export function publicPaths(): PublicPath[] {
  return [...FIXED_PATHS, ...spotPaths()];
}

export interface RobotsOptions {
  /** Absolute origin used for the Sitemap: line, no trailing slash. */
  siteUrl: string;
  /** False for previews and local dev — the whole host is then disallowed. */
  indexable: boolean;
}

function trimOrigin(siteUrl: string): string {
  return siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
}

/**
 * Hand-written rather than Next's `MetadataRoute.Robots`: that API has no
 * escape hatch for the Content Signals `Content-Signal:` directive, which is
 * the point of shipping our own robots.txt at all.
 */
export function buildRobotsTxt({ siteUrl, indexable }: RobotsOptions): string {
  const origin = trimOrigin(siteUrl);

  if (!indexable) {
    return [
      '# Not the live site — a preview or local build of tonnta.surf.',
      '# Nothing served from this host should be indexed or reused.',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }

  const trainingGroups = TRAINING_ONLY_CRAWLERS.flatMap((crawler) => [
    `User-agent: ${crawler}`,
    'Disallow: /',
    '',
  ]);

  return [
    '# Tonnta — surf conditions for Donabate, Co. Dublin.',
    '#',
    '# Content Signals Policy — https://developers.cloudflare.com/ai-crawl-control/',
    '#   search:   search engines building an index and showing links/excerpts',
    '#   ai-input: real-time use in generative AI answers (e.g. RAG)',
    '#   ai-train: use as training or fine-tuning data',
    '#',
    '# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF',
    '# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT',
    '# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.',
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=no',
    'Allow: /',
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
    '',
    '# Agent-facing endpoints — crawl these, they are the whole point:',
    `#   MCP (JSON-RPC 2.0 over POST): ${origin}/mcp`,
    `#   Site guide for LLMs:          ${origin}/llms.txt`,
    '',
    '# Crawlers that cite, link and ground answers — ClaudeBot, Google-Extended,',
    '# GPTBot, OAI-SearchBot, PerplexityBot — are allowed ON PURPOSE, under the',
    '# User-agent: * group above. Do not add Disallow groups for them: blocking',
    '# them costs us the citations, and ai-train=no already covers the training.',
    '',
    '# Training-only crawlers: they take the text and give back nothing.',
    ...trainingGroups,
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

/** Every public route, newest-modified first is irrelevant here — order is stable. */
export function buildSitemapEntries(siteUrl: string, lastModified: Date): MetadataRoute.Sitemap {
  const origin = trimOrigin(siteUrl);
  return publicPaths().map(({ path, priority, changeFrequency }) => ({
    url: path === '/' ? `${origin}/` : `${origin}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

/**
 * The `<meta name="robots">` directives for a host.
 *
 * This is applied per public page rather than in the root layout on purpose:
 * reading the request host in the root layout opts the whole tree, including
 * `/_not-found`, into dynamic rendering, so nothing can be prerendered. Every
 * URL in the sitemap goes through a page that calls this, so the coverage is
 * the same at a far lower cost.
 */
export function buildRobotsMetadata(indexable: boolean): Metadata['robots'] {
  if (!indexable) {
    return { index: false, follow: false };
  }
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}
