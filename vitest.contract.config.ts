import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['scripts/verdict-contract.spec.ts'] },
});
