import { useId, useState } from 'react';
import { getCNICInfo, validateCNIC } from 'pakdatakit/cnic';
import { Badge, Rows } from './common';

export default function CnicWidget({
  initial = '35202-1234567-1',
}: {
  initial?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const valid = validateCNIC(value);
  const info = getCNICInfo(value);
  return (
    <div className="pdk-card" data-widget="cnic">
      <div className="pdk-field">
        <label htmlFor={id}>Try a CNIC</label>
        <input
          id={id}
          className="pdk-input mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p aria-live="polite">
        <code>validateCNIC()</code> <Badge valid={valid} />
      </p>
      <Rows
        rows={[
          ['Formatted', info?.formatted],
          ['Province', info?.province],
          [
            'Gender',
            info?.gender
              ? info.gender.charAt(0).toUpperCase() + info.gender.slice(1)
              : null,
          ],
        ]}
      />
    </div>
  );
}
