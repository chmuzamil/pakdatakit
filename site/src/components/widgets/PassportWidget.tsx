import { useId, useState } from 'react';
import { validatePassport } from 'pakdatakit/passport';
import { Badge } from './common';

export default function PassportWidget() {
  const id = useId();
  const [value, setValue] = useState('AB1234567');
  const valid = validatePassport(value);
  return (
    <div className="pdk-card" data-widget="passport">
      <div className="pdk-field">
        <label htmlFor={id}>Try a passport number</label>
        <input
          id={id}
          className="pdk-input mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </div>
      <p aria-live="polite">
        <code>validatePassport()</code>{' '}
        <Badge valid={valid} labels={['Common shape', 'Unusual shape']} />
      </p>
    </div>
  );
}
