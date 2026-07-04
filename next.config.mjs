// Content Security Policy + related headers.
//
// Ported from the old Helmet config and the Nginx security headers.
//
// NOTE — script-src includes 'unsafe-inline'. The previous Vite/Nginx build used
// a strict `script-src 'self'` because Vite emits no inline scripts. Next.js
// injects inline bootstrap and hydration scripts, so a strict policy would break
// the app. This is a deliberate, documented relaxation. To restore a strict
// policy, generate a per-request nonce in a `middleware.ts` and reference it
// here as `'nonce-<value>' 'strict-dynamic'`.
//
// In development, Next.js additionally relies on eval() for Fast Refresh and on
// a WebSocket for HMR, so the dev policy must allow 'unsafe-eval' and ws:.
// Without 'unsafe-eval' the dev client bundle is blocked and the app hangs on
// the initial "Loading application..." screen. Production needs neither.
const isDev = process.env.NODE_ENV === 'development';

const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  isDev ? "connect-src 'self' ws:" : "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a self-contained server build (.next/standalone) for the Docker image.
  output: 'standalone',

  // Pin the file-tracing root to this project. Without it, an unrelated
  // lockfile elsewhere on the machine can be picked as the root and produce a
  // broken standalone build.
  outputFileTracingRoot: import.meta.dirname,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
