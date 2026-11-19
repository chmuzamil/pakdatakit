import { useId, useState } from 'react';
import { amountInWords, type WordsLanguage } from 'pakdatakit/words';
import { AMOUNT_ERROR, Rows, parseAmount } from './common';

function words(
  amount: number | null,
  language: WordsLanguage,
  cheque: boolean,
): string | null {
  if (amount === null) return null;
  try {
    return amountInWords(amount, { language, cheque });
  } catch {
    return null; // too large to write out
  }
}

export default function WordsWidget() {
  const id = useId();
  const [amount, setAmount] = useState('125000.50');
  const [language, setLanguage] = useState<WordsLanguage>('en');
  const { value, invalid } = parseAmount(amount);
  const plain = words(value, language, false);
  const cheque = words(value, language, true);
  const show = (text: string | null) =>
    text === null ? null : language === 'ur' ? (
      <span lang="ur" dir="rtl">
        {text}
      </span>
    ) : (
      text
    );
  return (
    <div className="pdk-card" data-widget="words">
      <div className="pdk-grid two">
        <div className="pdk-field">
          <label htmlFor={`${id}-a`}>Amount (Rs.)</label>
          <input
            id={`${id}-a`}
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
        <div className="pdk-field">
          <label htmlFor={`${id}-l`}>Language</label>
          <select
            id={`${id}-l`}
            className="pdk-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as WordsLanguage)}
          >
            <option value="en">English</option>
            <option value="ur">Urdu</option>
          </select>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {plain ?? ''}
      </p>
      <Rows
        rows={[
          ['In words', show(plain), 'text'],
          ['Cheque style', show(cheque), 'text'],
        ]}
      />
    </div>
  );
}
