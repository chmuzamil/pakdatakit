import { useId, useState } from 'react';
import { formatLakh, formatPKR } from 'pakdatakit/format';
import { AMOUNT_ERROR, Rows, parseAmount } from './common';

export default function FormatWidget() {
  const id = useId();
  const [amount, setAmount] = useState('12500000');
  const { value, invalid } = parseAmount(amount);
  const pkr = value === null ? null : formatPKR(value);
  const lakh = value === null ? null : formatLakh(value);
  return (
    <div className="pdk-card" data-widget="format">
      <div className="pdk-field">
        <label htmlFor={id}>Amount (Rs.)</label>
        <input
          id={id}
          className="pdk-input mono"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-err` : undefined}
        />
        {invalid ? (
          <p id={`${id}-err`} className="pdk-error">
            {AMOUNT_ERROR}
          </p>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {pkr && lakh ? `${pkr}, ${lakh}` : ''}
      </p>
      <Rows
        rows={[
          ['formatPKR()', pkr],
          ['formatLakh()', lakh],
        ]}
      />
    </div>
  );
}
