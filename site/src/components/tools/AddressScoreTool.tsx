import { useEffect, useId, useRef } from 'react';
import {
  ADDRESS_WEIGHTS,
  phoneRiskSignals,
  scoreAddress,
  type AddressPart,
  type PhoneRiskFlag,
} from 'pakdatakit/quality';
import {
  PrivacyNote,
  Rows,
  ShareButton,
  trackTool,
  useHashState,
} from '../widgets/common';

const PART: Record<AddressPart, string> = {
  city: 'City',
  houseNumber: 'House, plot or flat number',
  street: 'Street',
  area: 'Area or block',
  postalCode: 'Postal code',
  landmark: 'Landmark ("near", "opp", "nazd", "qareeb", نزد, سامنے …)',
};

/** From the phoneRiskSignals() reference on /docs/quality/. */
const FLAG: Record<PhoneRiskFlag, string> = {
  invalid: 'Not a Pakistani phone number',
  landline: 'A fixed-line number: no SMS, often unanswered',
  'not-mobile': 'A UAN, toll-free or other service number',
  'repeated-digits': 'The last 7 digits use at most two different digits',
  'sequential-digits': 'The last 7 digits are a run, such as 1234567',
  'test-number': 'A placeholder often typed into forms',
};

/** Samples in English, Roman Urdu and with an Urdu landmark (made up). */
const SAMPLES = [
  'Gulberg Lahore',
  'House 12, Gali 4, nazd Jamia Masjid, Samanabad, Lahore 54500',
  'House 7, Street 2, جامع مسجد کے سامنے, Multan',
];

export default function AddressScoreTool() {
  const id = useId();
  const [state, set] = useHashState({ address: '', phone: '' }, false);
  const tracked = useRef(false);
  const { address, phone } = state;
  const result = address.trim() ? scoreAddress(address) : null;
  const flags = phone.trim() ? phoneRiskSignals(phone) : null;
  useEffect(() => {
    if ((address || phone) && !tracked.current) {
      tracked.current = true;
      trackTool('address-score');
    }
  }, [address, phone]);
  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-field">
          <label htmlFor={`${id}-address`}>Delivery address</label>
          <textarea
            id={`${id}-address`}
            className="pdk-input"
            rows={3}
            dir="auto"
            value={address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="House 12, Street 4, near Jamia Masjid, Samanabad, Lahore 54500"
            autoComplete="off"
          />
        </div>
        <div className="pdk-actions">
          <span>Try:</span>
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              className="pdk-button"
              dir="auto"
              onClick={() => set({ address: s })}
            >
              {s.length > 28 ? `${s.slice(0, 26)}…` : s}
            </button>
          ))}
        </div>
        <div className="pdk-field">
          <label htmlFor={`${id}-phone`}>Phone number (optional)</label>
          <input
            id={`${id}-phone`}
            className="pdk-input mono"
            value={phone}
            onChange={(e) => set({ phone: e.target.value })}
            inputMode="tel"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={flags?.includes('invalid') || undefined}
            aria-describedby={`${id}-phone-state`}
          />
          <p
            id={`${id}-phone-state`}
            className={flags?.includes('invalid') ? 'pdk-error' : undefined}
            aria-live="polite"
          >
            {flags === null
              ? 'A courier calls or texts this number.'
              : flags.length === 0
                ? 'No risk signals.'
                : flags.includes('invalid')
                  ? FLAG.invalid
                  : `Risk signals: ${flags.map((f) => FLAG[f]).join('; ')}.`}
          </p>
        </div>
        <p className="pdk-result" aria-live="polite">
          {result
            ? `Address score: ${result.score} out of 100`
            : 'Type an address to score it.'}
        </p>
        {result ? (
          <>
            <meter
              className="pdk-meter"
              min={0}
              max={100}
              low={50}
              high={80}
              optimum={100}
              value={result.score}
              aria-label="Address score"
            />
            <h2 className="pdk-subhead">Missing</h2>
            {result.missing.length === 0 ? (
              <p>Nothing: every part was found.</p>
            ) : (
              <ul className="pdk-list">
                {result.missing.map((p) => (
                  <li key={p}>
                    {PART[p]}{' '}
                    <span className="pdk-note">
                      (up to {ADDRESS_WEIGHTS[p]} points)
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <h2 className="pdk-subhead">As read</h2>
            <Rows
              rows={[
                ['Street', result.parsed.street, 'text'],
                ['Area', result.parsed.area, 'text'],
                ['City', result.parsed.city],
                ['Province', result.parsed.province],
                ['Postal code', result.parsed.postalCode],
              ]}
            />
            {result.parsed.warnings.length ? (
              <ul className="pdk-list" role="list">
                {result.parsed.warnings.map((w) => (
                  <li key={w} className="pdk-error">
                    {w}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
        <ShareButton state={state} personal />
      </div>
      <p className="pdk-note">
        <strong>A heuristic, not verification.</strong> The score says how much
        the address tells a rider, not whether the address exists. A postal code
        scores in full only when it is a known post office code; an unknown one
        scores 5. Phone signals come from the number itself: no list of real
        numbers, no lookup.
      </p>
      <PrivacyNote />
    </div>
  );
}
