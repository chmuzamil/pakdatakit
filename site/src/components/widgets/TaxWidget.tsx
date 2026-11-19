import { useId, useState } from 'react';
import { analyzeNTN, validateSTRN } from 'pakdatakit/tax';
import { Badge, Rows } from './common';

export default function TaxWidget() {
  const ntnId = useId();
  const strnId = useId();
  const [ntn, setNtn] = useState('1234567-8');
  const [strn, setStrn] = useState('12-34-5678-901-23');
  const info = analyzeNTN(ntn);
  const strnValid = validateSTRN(strn);
  return (
    <div className="pdk-card" data-widget="tax">
      <div className="pdk-field">
        <label htmlFor={ntnId}>Try an NTN</label>
        <input
          id={ntnId}
          className="pdk-input mono"
          value={ntn}
          onChange={(e) => setNtn(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="pdk-field">
        <label htmlFor={strnId}>Try an STRN</label>
        <input
          id={strnId}
          className="pdk-input mono"
          value={strn}
          onChange={(e) => setStrn(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p aria-live="polite">
        <code>analyzeNTN()</code> <Badge valid={info !== null} />{' '}
        <code>validateSTRN()</code> <Badge valid={strnValid} />
      </p>
      <Rows
        rows={[
          [
            'NTN type',
            info
              ? info.type === 'individual'
                ? 'Individual'
                : 'Business'
              : null,
          ],
          ['NTN formatted', info?.formatted],
        ]}
      />
    </div>
  );
}
