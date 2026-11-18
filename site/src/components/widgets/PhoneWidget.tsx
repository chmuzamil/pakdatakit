import { useId, useState } from 'react';
import { analyzePhone } from 'pakdatakit/phone';
import { Badge, Rows } from './common';

export default function PhoneWidget() {
  const id = useId();
  const [value, setValue] = useState('0345 1234567');
  const result = analyzePhone(value);
  return (
    <div className="pdk-card" data-widget="phone">
      <div className="pdk-field">
        <label htmlFor={id}>Try a mobile number</label>
        <input
          id={id}
          className="pdk-input mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="tel"
          autoComplete="off"
        />
      </div>
      <p>
        <code>analyzePhone()</code> <Badge valid={result.valid} />
      </p>
      <Rows
        rows={[
          ['E.164', result.formatted],
          ['Original network', result.valid ? result.network : null],
        ]}
      />
    </div>
  );
}
