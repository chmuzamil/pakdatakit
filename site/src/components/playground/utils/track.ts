// Custom events go to the self-hosted Umami, served from this site (/a.js).
// Event data is only ever a tool slug or package name from a fixed list,
// never anything the visitor typed.
type EventName = 'tool_run' | 'code_copy' | 'npm_click' | 'pub_click';

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string>) => void };
  }
}

/** The tool slug for a /playground/<slug>/ path; undefined elsewhere. */
export function toolFor(pathname: string): string | undefined {
  const m = /^\/playground\/([a-z0-9-]+)\/?$/.exec(pathname);
  return m?.[1];
}

export function track(event: EventName, data?: Record<string, string>) {
  try {
    window.umami?.track(event, data);
  } catch {
    // The tracker may be blocked or not loaded yet; analytics must never break the page.
  }
}
