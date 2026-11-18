// Site-wide settings for pakdatakit.dev.

export const SITE = 'https://pakdatakit.dev';

// Search engines: false adds `noindex` to every page and disallows everything
// in robots.txt. Launch is a one-line change to `true`.
export const INDEXABLE = true;

// Umami (self-hosted at t.chaudhery.com) is served from this site's own origin:
// Nginx proxies /a.js and /api/send, so the CSP can stay connect-src 'self'.
// It records the page path and the tool name only, never what is typed
// (tool state lives in the URL hash, which Umami does not send, and query
// strings are excluded). See /about.
export const UMAMI_WEBSITE_ID = '0cdf6457-e044-4783-84ae-85b6390c90e6';

export const GITHUB = 'https://github.com/chmuzamil/pakdatakit';

// The Content-Security-Policy header the server sends with every page (the
// server's Nginx config must match it). script-src and style-src are not in
// it: each page carries those in a <meta> CSP with the hash of every inline
// script (scripts/csp-hashes.mjs), and browsers enforce both policies. The
// quality tests serve pages with this header too.
export const HEADER_CSP =
  "img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; media-src 'self'; manifest-src 'self'; frame-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
