import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Set them in .env.'
  );
}

/**
 * Server-only Supabase client.
 *
 * Uses the secret key (`sb_secret_...`), so it BYPASSES Row Level Security.
 * This is intentional: every query runs inside a trusted Next.js API route,
 * which is the security boundary. Never import this into client components and
 * never expose the key to the browser.
 */
export const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});