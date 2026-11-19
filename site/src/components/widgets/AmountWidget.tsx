import { useId, useState } from 'react';
import { formatAmountInput, parseAmount } from 'pakdatakit/format';
import { Badge, Rows } from './common';

/** Forms to try, one click each. */
const SAMPLES = ['Rs. 1,50,000/-', '2.25 crore', '1.5 lakh', '15k', '5-10k'];

export default function AmountWidget() {
  const id = useId();
  const [text, setText] = useState('Rs. 1,50,000/-');
  const parsed = parseAmount(text);
  const empty = text.trim() === '';
  return (
    <div className="pdk-card" data-widget="amount">
      <div className="pdk-field">
        <label htmlFor={id}>Type an amount</label>
        <input
          id={id}
          className="pdk-input mono"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          aria-describedby={`${id}-try`}
        />
      </div>
      <p className="pdk-note" id={`${id}-try`}>
        Try:{' '}
        {SAMPLES.map((s, i) => (
          <span key={s}>
            {i ? ', ' : ''}
            <button
              type="button"
              className="pdk-link-button"
              onClick={() => setText(s)}
            >
              {s}
            </button>
          </span>
        ))}
      </p>
      <p aria-live="polite">
        <code>parseAmount()</code>{' '}
        {empty ? (
          'Type an amount'
        ) : (
          <Badge
            valid={parsed !== null}
            labels={['One amount', 'Not one amount']}
          />
        )}
      </p>
      <Rows
        rows={[
          ['value', parsed === null ? null : String(parsed.value)],
          ['raw', parsed?.raw ?? null],
          ['formatAmountInput()', formatAmountInput(text)],
        ]}
      />
    </div>
  );
}
