import { useId, useState } from 'react';
import { getHolidaysOn } from 'pakdatakit/holidays';
import { Badge, Rows } from './common';

export default function HolidaysWidget() {
  const id = useId();
  const [date, setDate] = useState('2026-08-14');
  const [christian, setChristian] = useState(false);
  let holidays: ReturnType<typeof getHolidaysOn> | null = null;
  try {
    holidays = getHolidaysOn(date, { includeChristianHolidays: christian });
  } catch {
    holidays = null; // not a complete YYYY-MM-DD date yet
  }
  const first = holidays?.[0];
  return (
    <div className="pdk-card" data-widget="holidays">
      <div className="pdk-field">
        <label htmlFor={id}>Date</label>
        <input
          id={id}
          type="date"
          className="pdk-input mono"
          value={date}
          min="1948-01-01"
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <label className="pdk-check">
        <input
          type="checkbox"
          checked={christian}
          onChange={(e) => setChristian(e.target.checked)}
        />
        Include 26 December (Christian employees only)
      </label>
      <p aria-live="polite">
        <code>isPakistanHoliday()</code>{' '}
        {holidays ? (
          <Badge
            valid={holidays.length > 0}
            labels={['Public holiday', 'Not a public holiday']}
          />
        ) : null}
      </p>
      <Rows
        rows={[
          ['Holiday', first?.name, 'text'],
          ['Type', first?.type, 'text'],
          [
            'Date',
            first
              ? first.estimated
                ? 'Estimated (tabular Hijri calendar)'
                : first.source
                  ? 'Observed'
                  : 'Fixed date'
              : null,
            'text',
          ],
        ]}
      />
    </div>
  );
}
