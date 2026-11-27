import { useEffect, useId, useRef } from 'react';
import {
  getPostOffice,
  searchPostalCodes,
  searchPostOffices,
  type PostOffice,
} from 'pakdatakit/postal';
import {
  PrivacyNote,
  ShareButton,
  trackTool,
  useHashState,
} from '../widgets/common';

const LIMIT = 100;

/** Offices matching a name, area or code prefix: exact code, then names starting with it. */
function search(query: string): PostOffice[] {
  const q = query.trim();
  if (q.length < 2 && !/^\d$/.test(q)) return [];
  const found = new Map<string, PostOffice>();
  for (const o of searchPostOffices(q)) found.set(o.code, o);
  // Area names from the city list, e.g. "Gulberg" or "Iqbal Town".
  for (const code of searchPostalCodes(q)) {
    const o = getPostOffice(code);
    if (o) found.set(o.code, o);
  }
  const lower = q.toLowerCase();
  const rank = (o: PostOffice) =>
    o.code === q
      ? 0
      : o.office.toLowerCase().startsWith(lower) ||
          o.town.toLowerCase().startsWith(lower)
        ? 1
        : 2;
  return [...found.values()].sort(
    (a, b) => rank(a) - rank(b) || a.office.localeCompare(b.office, 'en'),
  );
}

export default function PostalCodeTool({
  cityPages,
}: {
  /** City name → its /postal-codes/ page. */
  cityPages: Record<string, string>;
}) {
  const id = useId();
  const [state, set] = useHashState({ q: '' }, false);
  const tracked = useRef(false);
  const results = search(state.q);
  useEffect(() => {
    if (state.q && !tracked.current) {
      tracked.current = true;
      trackTool('postal-code');
    }
  }, [state.q]);
  const q = state.q.trim();
  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-field">
          <label htmlFor={id}>City, area, village or postal code</label>
          <input
            id={id}
            className="pdk-input"
            type="search"
            value={state.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="e.g. Gulberg, Murree or 54000"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-state`}
          />
        </div>
        <p id={`${id}-state`} aria-live="polite">
          {!q
            ? 'Type at least two letters of a place, or the start of a code.'
            : results.length === 0
              ? `No post office matches “${q}”. Try a nearby town, or fewer letters.`
              : results.length > LIMIT
                ? `${results.length.toLocaleString('en-US')} post offices match; showing the first ${LIMIT}. Type more to narrow it down.`
                : results.length === 1
                  ? '1 post office matches.'
                  : `${results.length} post offices match.`}
        </p>
        {results.length > 0 ? (
          <div
            className="pdk-table-wrap"
            tabIndex={0}
            aria-label="Matching post offices"
          >
            <table className="pdk-table">
              <thead>
                <tr>
                  <th scope="col">Post office</th>
                  <th scope="col">Postal code</th>
                  <th scope="col">City or town</th>
                  <th scope="col">Province</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, LIMIT).map((o) => (
                  <tr key={o.code}>
                    <td>{o.office}</td>
                    <td className="mono">{o.code}</td>
                    <td>
                      {cityPages[o.town] ? (
                        <a href={cityPages[o.town]}>{o.town}</a>
                      ) : (
                        o.town
                      )}
                    </td>
                    <td>{o.province}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {q ? <ShareButton state={state} /> : null}
      </div>
      <PrivacyNote>
        Names are as Pakistan Post spells them, so try another spelling if a
        place is missing.
      </PrivacyNote>
    </div>
  );
}
