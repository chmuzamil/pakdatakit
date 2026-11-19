import { useId, useState } from 'react';
import { analyzeNumber, getAreaCode } from 'pakdatakit/numbers';
import { Badge, Rows } from './common';

const TYPE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  landline: 'Landline',
  uan: 'UAN',
  'toll-free': 'Toll-free',
  premium: 'Premium-rate',
  personal: 'Personal',
};

export default function NumbersWidget() {
  const id = useId();
  const [value, setValue] = useState('042 35761234');
  const [city, setCity] = useState('Faisalabad');
  const info = analyzeNumber(value);
  const code = getAreaCode(city);
  return (
    <div className="pdk-card" data-widget="numbers">
      <div className="pdk-field">
        <label htmlFor={`${id}-number`}>Try any phone number</label>
        <input
          id={`${id}-number`}
          className="pdk-input mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="tel"
          autoComplete="off"
        />
      </div>
      <p aria-live="polite">
        <code>analyzeNumber()</code> <Badge valid={info !== null} />
      </p>
      <Rows
        rows={[
          ['Type', info ? TYPE_LABELS[info.type] : null],
          ['Formatted', info?.formatted],
          ['E.164', info?.e164],
          ['Area code', info?.areaCode],
          ['Cities', info?.cities.join(', ')],
        ]}
      />
      <div className="pdk-field">
        <label htmlFor={`${id}-city`}>Area code for a city</label>
        <input
          id={`${id}-city`}
          className="pdk-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="off"
        />
      </div>
      <Rows rows={[['getAreaCode()', code]]} />
    </div>
  );
}
