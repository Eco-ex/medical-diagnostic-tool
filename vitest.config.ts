import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    // database.test.ts unit-tests the pure mappers in lib/server/database.ts,
    // but importing that module transitively constructs the Supabase client in
    // lib/server/supabase.ts, which throws if these are unset. Dummy values
    // satisfy the import-time guard; createClient() makes no network call and
    // the pure-mapper tests never touch the client.
    env: {
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SECRET_KEY: 'sb_secret_test-key',
    },
  },
});
