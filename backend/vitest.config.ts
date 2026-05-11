import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-secret-do-not-use-in-production',
      DATA_DIR: './data-test',
    },
  },
});
