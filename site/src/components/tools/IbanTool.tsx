import { useEffect, useId, useRef } from 'react';
import { getBankInfo, validateIBAN } from 'pakdatakit/iban';
import { checkIBANInput, formatIBANInput } from 'pakdatakit/input';
import {
  Badge,
  PrivacyNote,
  Rows,
  ShareButton,
  trackTool,
  useHashState,
} from '../widgets/common';

const TYPES: Record<string, string> = {
  commercial: 'Commercial bank',
  islamic: 'Islamic bank',
  microfinance: 'Microfinance bank',
  digital: 'Digital bank',
  emi: 'Electronic money institution (wallet)',
  foreign: 'Foreign bank (Pakistan branch)',
  specialized: 'Specialized bank',
  'public-sector': 'Public-sector bank',
  central: 'Central bank',
};

export default function IbanTool() {
  const id = useId();
  const [state, set] = useHashState({ iban: '' }, false);
  const tracked = useRef(false);
  const value = state.iban;
  const check = checkIBANInput(value);
  const valid = validateIBAN(value);
  const code = value.replace(/\s+/g, '').toUpperCase().slice(4, 8);
  const bank = valid ? getBankInfo(code) : null;
  useEffect(() => {
    if (value && !tracked.current) {
      tracked.current = true;
      trackTool('iban');
    }
  }, [value]);
  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-field">
          <label htmlFor={id}>Pakistani IBAN</label>
          <input
            id={id}
            className="pdk-input mono"
            value={value}
            onChange={(e) => set({ iban: formatIBANInput(e.target.value) })}
            placeholder="PK36 SCBL 0000 0011 2345 6702"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-state`}
          />
        </div>
        <p id={`${id}-state`} aria-live="polite">
          {check === 'empty' ? (
            'Type or paste a 24-character IBAN starting with PK.'
          ) : check === 'incomplete' ? (
            'Keep typing…'
          ) : (
            <>
              Checksum:{' '}
              <Badge valid={valid} labels={['Correct', 'Not a valid IBAN']} />
            </>
          )}
        </p>
        <Rows
          rows={[
            ['Bank', bank?.name],
            ['Bank code', valid ? code : null],
            ['Type', bank ? (TYPES[bank.type] ?? bank.type) : null],
            [
              'Status',
              bank
                ? bank.active
                  ? 'Active'
                  : `Inactive${bank.mergedInto ? `, merged into ${bank.mergedInto}` : ''}`
                : null,
            ],
          ]}
        />
        <ShareButton state={state} personal />
      </div>
      <p className="pdk-note">
        <strong>A correct IBAN is not a verified account.</strong> The mod-97
        checksum catches typing mistakes and the bank code names the bank. It
        cannot tell whether the account exists or who owns it; only the bank
        can.
      </p>
      <PrivacyNote />
    </div>
  );
}
