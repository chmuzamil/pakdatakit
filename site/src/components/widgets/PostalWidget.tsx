import { useId, useState } from 'react';
import { getCityByPostalCode, getPostOffice } from 'pakdatakit/postal';
import { Rows } from './common';

export default function PostalWidget() {
  const id = useId();
  const [code, setCode] = useState('12380');
  const office = getPostOffice(code);
  return (
    <div className="pdk-card" data-widget="postal">
      <div className="pdk-field">
        <label htmlFor={id}>Try a postal code</label>
        <input
          id={id}
          className="pdk-input mono"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          maxLength={5}
        />
      </div>
      <Rows
        rows={[
          ['City (getCityByPostalCode)', getCityByPostalCode(code)],
          ['Post office', office?.office],
          ['Town', office?.town],
          ['District', office?.district],
          ['Province', office?.province],
        ]}
      />
    </div>
  );
}
