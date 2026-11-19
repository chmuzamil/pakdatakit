import { useId, useState } from 'react';
import { getNetwork } from 'pakdatakit/networks';
import { Badge, Rows } from './common';

export default function NetworksWidget() {
  const id = useId();
  const [value, setValue] = useState('0300 1234567');
  const network = getNetwork(value);
  const known = network !== 'Unknown';
  return (
    <div className="pdk-card" data-widget="networks">
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
      <p aria-live="polite">
        <code>getNetwork()</code>{' '}
        <Badge valid={known} labels={['Known prefix', 'Unknown']} />
      </p>
      <Rows rows={[['Original network', known ? network : null]]} />
      <p className="pdk-note">
        The network the prefix was originally allocated to. With number
        portability, the current carrier may differ.
      </p>
    </div>
  );
}
