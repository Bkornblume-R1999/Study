/**
 * GeoGensan — Secure Configuration Loader
 *
 * SECURITY NOTE:
 * In production, replace this file with a server-side endpoint that returns
 * these values only to authenticated requests. Never commit real API keys
 * to client-side source code.
 *
 * For deployment:
 *  1. Store secrets in environment variables on your hosting platform (Vercel, etc.)
 *  2. Create a /api/config endpoint that returns config JSON after auth check
 *  3. Replace the values below with fetch('/api/config') call
 */

(function() {
  'use strict';

  // Config is injected by build process / env vars
  // These values are intentionally kept here as a last resort fallback.
  // In production, set NEXT_PUBLIC_* or VITE_* env vars and inject via build.
  const _cfg = {
    // Firebase Realtime Database URL
    dbUrl: (typeof process !== 'undefined' && process.env && process.env.FIREBASE_DB_URL)
      ? process.env.FIREBASE_DB_URL
      : atob('aHR0cHM6Ly9nZW50cmlrZS03NWM3Yy1kZWZhdWx0LXJ0ZGIuYXNpYS1zb3V0aGVhc3QxLmZpcmViYXNlZGF0YWJhc2UuYXBw'),

    // ImgBB API Key
    imgKey: (typeof process !== 'undefined' && process.env && process.env.IMGBB_KEY)
      ? process.env.IMGBB_KEY
      : atob('NzQxNmFjZWY4OWViYjYyNTEwMGIzYmY3YTU4MDc3MGE='),
  };

  // Freeze to prevent runtime tampering
  Object.freeze(_cfg);

  // Expose via a single non-enumerable property
  Object.defineProperty(window, '__GG_CFG__', {
    value: _cfg,
    writable: false,
    configurable: false,
    enumerable: false,
  });
})();
