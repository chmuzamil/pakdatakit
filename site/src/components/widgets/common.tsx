import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function Badge({
  valid,
  labels = ['Valid', 'Invalid'],
}: {
  valid: boolean;
  labels?: [string, string];
}) {
  return (
    <span
      key={String(valid)}
      className={`pdk-badge pdk-pop ${valid ? 'valid' : 'invalid'}`}
    >
      {valid ? labels[0] : labels[1]}
    </span>
  );
}

/**
 * A definition list of results; empty values show as an em dash. Values are
 * set in the mono font unless the row is marked 'text' (prose, e.g. a slab
 * description). Each value is keyed on its content, so a changed value
 * briefly flashes (theme.css, only without reduced motion).
 */
export function Rows({
  rows,
}: {
  rows: ([string, ReactNode] | [string, ReactNode, 'text'])[];
}) {
  return (
    <dl className="pdk-rows">
      {rows.map(([k, v, kind]) => {
        const empty = v === null || v === undefined || v === '';
        return (
          <div key={k} className="pdk-row">
            <dt>{k}</dt>
            <dd
              key={empty ? '' : String(v)}
              className={kind === 'text' ? 'text' : undefined}
            >
              {empty ? '—' : v}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Parses a rupee amount as typed: commas and spaces are ignored. `value` is
 * null when the field is empty or not a non-negative number; `invalid` is true
 * only for something typed that isn't one.
 */
export function parseAmount(text: string): {
  value: number | null;
  invalid: boolean;
} {
  const t = text.replace(/[,\s]/g, '');
  if (t === '') return { value: null, invalid: false };
  const n = Number(t);
  return Number.isFinite(n) && n >= 0
    ? { value: n, invalid: false }
    : { value: null, invalid: true };
}

/** The message under an amount field that isn't a number. */
export const AMOUNT_ERROR = 'Enter an amount in rupees, like 150,000.';

export function PrivacyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="pdk-privacy">
      <svg
        aria-hidden="true"
        className="pdk-privacy-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>
        Runs on your device: nothing you type is uploaded or stored, and it
        works offline.
        {children ? <> {children}</> : null}
      </span>
    </p>
  );
}

/** Reads `#key=value&…` from the URL hash once, on first render in the browser. */
export function readHash(): Record<string, string> {
  if (typeof location === 'undefined') return {};
  return Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
}

function buildHash(state: Record<string, string>): string {
  const params = new URLSearchParams(
    Object.entries(state).filter(([, v]) => v !== '' && v !== undefined),
  );
  return params.toString() ? `#${params}` : '';
}

/**
 * State kept in the URL hash (never sent to the server). With `live`, the hash
 * follows every change; without it, the URL changes only through ShareButton,
 * so personal data never lands in the address bar or history by itself.
 */
export function useHashState<T extends Record<string, string>>(
  defaults: T,
  live: boolean,
) {
  const [state, setState] = useState<T>(defaults);
  useEffect(() => {
    const fromHash = readHash();
    const picked = Object.fromEntries(
      Object.keys(defaults)
        .filter((k) => k in fromHash)
        .map((k) => [k, fromHash[k]]),
    );
    if (Object.keys(picked).length) setState((s) => ({ ...s, ...picked }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!live || typeof history === 'undefined') return;
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}${buildHash(state)}`,
    );
  }, [state, live]);
  const set = (patch: Partial<T>) => setState((s) => ({ ...s, ...patch }));
  return [state, set] as const;
}

/** Copies a link that restores the current inputs (via the hash). */
export function ShareButton({
  state,
  personal,
}: {
  state: Record<string, string>;
  personal?: boolean;
}) {
  const id = useId();
  const [done, setDone] = useState(false);
  // When the clipboard isn't available, the link is shown to copy by hand.
  const [manual, setManual] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    const url = `${location.origin}${location.pathname}${buildHash(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      setManual(null);
      setDone(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), 2000);
    } catch {
      setManual(url);
    }
  };
  return (
    <div className="pdk-share">
      <button
        type="button"
        className="pdk-button"
        onClick={copy}
        aria-describedby={personal ? `${id}-note` : undefined}
      >
        {done ? 'Link copied' : 'Copy share link'}
      </button>
      <span role="status" className="sr-only">
        {done ? 'Link copied to the clipboard' : ''}
      </span>
      {manual ? (
        <div className="pdk-field">
          <label htmlFor={`${id}-url`}>
            Couldn't copy automatically. Select and copy this link:
          </label>
          <input
            id={`${id}-url`}
            className="pdk-input mono"
            readOnly
            value={manual}
            ref={(el) => el?.select()}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      ) : null}
      {personal ? (
        <p className="pdk-note" id={`${id}-note`}>
          The link contains what you typed (after the #, which browsers never
          send to a server). Share it only with people who may see it.
        </p>
      ) : null}
    </div>
  );
}

/** Rupee amounts, en-PK grouping, up to 2 decimals. */
export const rs = (n: number | null | undefined) =>
  n === null || n === undefined
    ? ''
    : `Rs. ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

/** Sends a tool-run event to Umami: the tool's name only, never inputs. */
export function trackTool(tool: string) {
  try {
    (
      window as unknown as {
        umami?: { track: (e: string, d: Record<string, string>) => void };
      }
    ).umami?.track('tool_run', { tool });
  } catch {
    /* analytics must never break a tool */
  }
}
