import { useEffect, useState, type ReactNode } from 'react';

export function Badge({
  valid,
  labels = ['Valid', 'Invalid'],
}: {
  valid: boolean;
  labels?: [string, string];
}) {
  return (
    <span className={`pdk-badge ${valid ? 'valid' : 'invalid'}`}>
      {valid ? labels[0] : labels[1]}
    </span>
  );
}

/** A definition list of results; empty values show as an em dash. */
export function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="pdk-rows">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v === null || v === undefined || v === '' ? '—' : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PrivacyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="pdk-privacy">
      <span aria-hidden="true">🔒</span>
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
  const [done, setDone] = useState(false);
  const copy = async () => {
    const url = `${location.origin}${location.pathname}${buildHash(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      prompt('Copy this link:', url);
    }
  };
  return (
    <div>
      <button type="button" className="pdk-button" onClick={copy}>
        {done ? 'Link copied' : 'Copy share link'}
      </button>
      {personal ? (
        <p className="pdk-note">
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
