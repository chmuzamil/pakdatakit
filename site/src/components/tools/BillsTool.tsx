import { useEffect, useId, useRef } from 'react';
import {
  parseElectricityRef,
  validateGasConsumerNumber,
  type ElectricityRef,
} from 'pakdatakit/bills';
import {
  Badge,
  PrivacyNote,
  Rows,
  ShareButton,
  trackTool,
  useHashState,
} from '../widgets/common';
import { Batch } from './Batch';

type Utility = 'electricity' | 'SNGPL' | 'SSGC';

const UTILITIES: Record<
  Utility,
  { label: string; field: string; hint: string }
> = {
  electricity: {
    label: 'Electricity (any DISCO or K-Electric)',
    field: 'Reference number, customer ID or K-Electric account number',
    hint: 'A 14-digit reference number with U or R, a 10-digit customer ID (11 for LESCO), or a 13-digit K-Electric account number starting 04000.',
  },
  SNGPL: {
    label: 'Gas: SNGPL',
    field: 'SNGPL consumer number',
    hint: 'An 11-digit consumer number.',
  },
  SSGC: {
    label: 'Gas: SSGC',
    field: 'SSGC customer number',
    hint: 'A 10-digit customer number.',
  },
};

const KIND: Record<ElectricityRef['type'], string> = {
  reference: 'DISCO reference number',
  'customer-id': 'DISCO customer ID',
  'k-electric': 'K-Electric account number',
};

function check(utility: Utility, value: string) {
  if (utility === 'electricity') {
    const bill = parseElectricityRef(value);
    return { valid: bill !== null, bill };
  }
  return { valid: validateGasConsumerNumber(value, utility), bill: null };
}

export default function BillsTool() {
  const id = useId();
  const [state, set] = useHashState(
    { utility: 'electricity', number: '' },
    false,
  );
  const tracked = useRef(false);
  const utility = (
    state.utility in UTILITIES ? state.utility : 'electricity'
  ) as Utility;
  const value = state.number;
  const digits = value.replace(/\D/g, '').length;
  const { valid, bill } = check(utility, value);
  const invalid = value.trim() !== '' && !valid && digits >= 10;
  useEffect(() => {
    if (value && !tracked.current) {
      tracked.current = true;
      trackTool('bills');
    }
  }, [value]);
  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-field">
          <label htmlFor={`${id}-utility`}>Bill</label>
          <select
            id={`${id}-utility`}
            className="pdk-select"
            value={utility}
            onChange={(e) => set({ utility: e.target.value })}
          >
            {Object.entries(UTILITIES).map(([k, u]) => (
              <option key={k} value={k}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div className="pdk-field">
          <label htmlFor={id}>{UTILITIES[utility].field}</label>
          <input
            id={id}
            className="pdk-input mono"
            value={value}
            onChange={(e) => set({ number: e.target.value })}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            aria-describedby={`${id}-state`}
          />
          <p
            id={`${id}-state`}
            className={invalid ? 'pdk-error' : undefined}
            aria-live="polite"
          >
            {value.trim() === '' ? (
              UTILITIES[utility].hint
            ) : valid ? (
              <>
                Format: <Badge valid labels={['Correct format', '']} />
              </>
            ) : invalid ? (
              `Not this format. ${UTILITIES[utility].hint}`
            ) : (
              'Keep typing…'
            )}
          </p>
        </div>
        <Rows
          rows={[
            [
              'Kind',
              bill ? KIND[bill.type] : valid ? UTILITIES[utility].field : null,
            ],
            [
              'Formatted',
              bill?.formatted ?? (valid ? value.replace(/\D/g, '') : null),
            ],
            [
              'Urban or rural',
              bill?.urbanRural === 'U'
                ? 'Urban'
                : bill?.urbanRural === 'R'
                  ? 'Rural'
                  : null,
            ],
            [
              'Company',
              utility !== 'electricity'
                ? utility
                : bill
                  ? (bill.disco ?? 'Not in the number: see your bill')
                  : null,
              'text',
            ],
          ]}
        />
        <ShareButton state={state} personal />
      </div>
      <p className="pdk-note">
        <strong>A format check, not a lookup.</strong> It doesn't fetch the bill
        or say whether it is paid. No official source says which digits belong
        to which electricity company, so the company is not guessed (only a
        K-Electric account number names its company). No check digit is
        published, so a mistyped digit can still pass. IESCO notes that
        reference numbers can change.
      </p>
      <Batch
        noun={utility === 'electricity' ? 'bill number' : `${utility} number`}
        filename="bill-numbers-checked.csv"
        run={(line) => check(utility, line)}
        columns={[
          { header: 'valid format', value: (r) => (r.valid ? 'yes' : 'no') },
          {
            header: 'kind',
            value: (r) => (r.bill ? KIND[r.bill.type] : r.valid ? utility : ''),
          },
          { header: 'formatted', value: (r) => r.bill?.formatted ?? '' },
          { header: 'urban/rural', value: (r) => r.bill?.urbanRural ?? '' },
        ]}
        summary={(rows) => {
          const ok = rows.filter((r) => r.valid).length;
          return `Checked ${rows.length} as ${UTILITIES[utility].label}: ${ok} in the right format, ${rows.length - ok} not.`;
        }}
      />
      <PrivacyNote />
    </div>
  );
}
