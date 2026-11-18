// Site-wide settings for pakdatakit.dev.

export const SITE = 'https://pakdatakit.dev';

// Search engines: false adds `noindex` to every page and disallows everything
// in robots.txt. Launch is a one-line change to `true`.
export const INDEXABLE = false;

// Umami (self-hosted at t.chaudhery.com) is served from this site's own origin:
// Nginx proxies /a.js and /api/send, so the CSP can stay connect-src 'self'.
// It records the page path and the tool name only, never what is typed
// (tool state lives in the URL hash, which Umami does not send, and query
// strings are excluded). See /about.
export const UMAMI_WEBSITE_ID = 'a3f005ba-8dcf-4d38-bcc9-4599c3cc54e1';

export const GITHUB = 'https://github.com/chmuzamil/pakdatakit';
