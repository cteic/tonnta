// Babel config for the Tonnta Expo app. `@tamagui/babel-plugin` is wired so
// static extraction is a one-flag change later; it stays off for now because
// extracted components import `@tamagui/core` directly, and every Tamagui
// import must flow through `@tonnta/ui` so the bundle holds one instance.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui', '@tonnta/ui'],
          config: './tamagui.config.ts',
          logTimings: false,
          disableExtraction: true,
        },
      ],
    ],
  };
};
