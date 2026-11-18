import { useId, useState } from 'react';
import { getBankInfo, validateIBAN } from 'pakdatakit/iban';
import { Badge, Rows } from './common';

export default function IbanWidget() {
  const id = useId();
  const [value, setValue] = useState('PK36 SCBL 0000 0011 2345 6702');
  const valid = validateIBAN(value);
  const code = value.replace(/\s+/g, '').toUpperCase().slice(4, 8);
  const bank = valid ? getBankInfo(code) : null;
  return (
    <div className="pdk-card" data-widget="iban">
      <div className="pdk-field">
        <label htmlFor={id}>Try an IBAN</label>
        <input
          id={id}
          className="pdk-input mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p>
        <code>validateIBAN()</code> <Badge valid={valid} />
      </p>
      <Rows
        rows={[
          ['Bank', bank?.name],
          ['Type', bank?.type],
          ['Active', bank ? (bank.active ? 'yes' : 'no') : null],
        ]}
      />
    </div>
  );
}
