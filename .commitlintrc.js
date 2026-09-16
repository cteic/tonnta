export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['app', 'web', 'mobile', 'worker', 'data', 'types', 'utils', 'ui', 'deps', 'ci', 'docs'],
    ],
  },
};
