import { useId, useState } from 'react';
import { mapCourierStatus, normalizeCityForCourier } from 'pakdatakit/courier';
import { Rows } from './common';

const COURIERS = ['PostEx', 'Leopards', 'TCS', 'M&P', 'Trax', 'BlueEx'];

export default function CourierWidget() {
  const courierId = useId();
  const statusId = useId();
  const cityId = useId();
  const [courier, setCourier] = useState('PostEx');
  const [status, setStatus] = useState('Out for Delivery');
  const [city, setCity] = useState('Pindi');
  const mapped = mapCourierStatus(courier, status);
  const normalized = normalizeCityForCourier(city);
  return (
    <div className="pdk-card" data-widget="courier">
      <div className="pdk-field">
        <label htmlFor={courierId}>Courier</label>
        <select
          id={courierId}
          className="pdk-input"
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
        >
          {COURIERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="pdk-field">
        <label htmlFor={statusId}>Courier's status</label>
        <input
          id={statusId}
          className="pdk-input mono"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="pdk-field">
        <label htmlFor={cityId}>City as written</label>
        <input
          id={cityId}
          className="pdk-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div aria-live="polite">
        <Rows
          rows={[
            ['mapCourierStatus()', mapped ?? 'null', 'text'],
            ['normalizeCityForCourier()', normalized ?? 'null', 'text'],
          ]}
        />
      </div>
    </div>
  );
}
