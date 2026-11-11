import baseConfig from '@tonnta/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['scripts/verdict-contract.spec.ts', 'vitest.contract.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.contract.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
