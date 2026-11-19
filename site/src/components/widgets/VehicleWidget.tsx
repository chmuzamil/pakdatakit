import { useId, useState } from 'react';
import { parseVehiclePlate } from 'pakdatakit/vehicle';
import { Badge, Rows } from './common';

export default function VehicleWidget() {
  const id = useId();
  const [value, setValue] = useState('LEA-1234');
  const plate = parseVehiclePlate(value);
  return (
    <div className="pdk-card" data-widget="vehicle">
      <div className="pdk-field">
        <label htmlFor={id}>Try a registration number</label>
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
        <code>parseVehiclePlate()</code> <Badge valid={plate !== null} />
      </p>
      <Rows
        rows={[
          ['Series', plate?.series],
          ['Number', plate?.number],
          ['Year', plate?.year],
          ['Formatted', plate?.formatted],
        ]}
      />
    </div>
  );
}
