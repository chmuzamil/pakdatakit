import { useId, useState } from 'react';
import {
  parseElectricityRef,
  validateGasConsumerNumber,
} from 'pakdatakit/bills';
import { amountInWords } from 'pakdatakit/words';
import { AMOUNT_ERROR, Badge, Rows, amountField, rs } from './common';

type Utility = 'electricity' | 'SNGPL' | 'SSGC';

const KIND = {
  reference: 'DISCO reference number',
  'customer-id': 'DISCO customer ID',
  'k-electric': 'K-Electric account number',
} as const;

const NUMBER_LABEL: Record<Utility, string> = {
  electricity: 'Reference number, customer ID or K-Electric account number',
  SNGPL: 'SNGPL consumer number (11 digits)',
  SSGC: 'SSGC customer number (10 digits)',
};

/** amountInWords throws a RangeError for amounts it can't write. */
function words(value: number | null): string | null {
  if (value === null) return null;
  try {
    return amountInWords(value);
  } catch {
    return null;
  }
}

/** A bill payment form's two checks: the bill number and the amount typed. */
export default function BillPaymentWidget() {
  const utilityId = useId();
  const numberId = useId();
  const amountId = useId();
  const [utility, setUtility] = useState<Utility>('electricity');
  const [number, setNumber] = useState('12 34567 8901234 U');
  const [amount, setAmount] = useState('4,350');
  const bill = utility === 'electricity' ? parseElectricityRef(number) : null;
  const numberValid =
    utility === 'electricity'
      ? bill !== null
      : validateGasConsumerNumber(number, utility);
  const { value, invalid, echo } = amountField(amount);
  return (
    <div className="pdk-card" data-widget="bill-payment">
      <div className="pdk-field">
        <label htmlFor={utilityId}>Bill</label>
        <select
          id={utilityId}
          className="pdk-input"
          value={utility}
          onChange={(e) => setUtility(e.target.value as Utility)}
        >
          <option value="electricity">Electricity</option>
          <option value="SNGPL">Gas, SNGPL</option>
          <option value="SSGC">Gas, SSGC</option>
        </select>
      </div>
      <div className="pdk-field">
        <label htmlFor={numberId}>{NUMBER_LABEL[utility]}</label>
        <input
          id={numberId}
          className="pdk-input mono"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p aria-live="polite">
        Bill number{' '}
        <Badge valid={numberValid} labels={['Format OK', 'Not this format']} />
      </p>
      <div className="pdk-field">
        <label htmlFor={amountId}>Amount to pay (Rs.)</label>
        <input
          id={amountId}
          className="pdk-input mono"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={
            invalid ? `${amountId}-err` : echo ? `${amountId}-echo` : undefined
          }
        />
        {invalid ? (
          <p id={`${amountId}-err`} className="pdk-error">
            {AMOUNT_ERROR}
          </p>
        ) : echo ? (
          <p id={`${amountId}-echo`} className="pdk-note">
            = {echo}
          </p>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {value !== null ? `Paying ${rs(value)}` : ''}
      </p>
      <Rows
        rows={[
          [
            'Formatted',
            bill?.formatted ?? (numberValid ? number.trim() : null),
          ],
          ['Kind', bill ? KIND[bill.type] : null],
          ['Amount', rs(value)],
          ['In words', words(value), 'text'],
        ]}
      />
    </div>
  );
}
