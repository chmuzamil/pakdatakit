import { useId, useState } from 'react';
import { formatHijri, isRamadan } from 'pakdatakit/hijri';
import { Rows } from './common';

/** `YYYY-MM-DD` from a date field → a local-midnight Date, or null. */
function parseDate(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  date.setFullYear(Number(m[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function HijriWidget() {
  const id = useId();
  const [text, setText] = useState('2026-03-01');
  const date = parseDate(text);
  const hijri = date ? formatHijri(date) : null;
  const ramadan = date ? isRamadan(date) : null;
  return (
    <div className="pdk-card" data-widget="hijri">
      <div className="pdk-field">
        <label htmlFor={id}>Gregorian date</label>
        <input
          id={id}
          type="date"
          className="pdk-input mono"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {hijri ?? ''}
      </p>
      <Rows
        rows={[
          ['Hijri date', hijri, 'text'],
          [
            'In Ramadan',
            ramadan === null ? null : ramadan ? 'Yes' : 'No',
            'text',
          ],
        ]}
      />
      <p className="pdk-note">
        Tabular calendar: dates in Pakistan follow moon sighting and can differ
        by a day or two.
      </p>
    </div>
  );
}
