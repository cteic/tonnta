import { withTamagui } from '@tamagui/next-plugin';

/** @type {import('next').NextConfig} */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.workers.dev https://cloudflareinsights.com http://localhost:* ws://localhost:*",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self'",
].join('; ');

const nextConfig = {
  transpilePackages: [
    '@tonnta/ui',
    '@tonnta/data',
    '@tonnta/types',
    '@tonnta/web-shell',
    'react-native',
    'react-native-web',
    'tamagui',
    '@tamagui/core',
    '@tamagui/web',
    '@tamagui/animations-react-native',
    '@tamagui/shorthands',
    '@tamagui/themes',
  ],
  typedRoutes: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        'react-native$': 'react-native-web',
      };
    }
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
        'process.env.IS_STATIC': JSON.stringify(''),
        __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      })
    );
    return config;
  },
};

const tamaguiPlugin = withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui', '@tonnta/ui'],
  appDir: true,
  outputCSS: null,
  disableExtraction: true,
  logTimings: true,
  doesMedia: true,
});

export default tamaguiPlugin(nextConfig);
