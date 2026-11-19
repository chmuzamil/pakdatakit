import { useId, useState } from 'react';
import { phoneRiskSignals, scoreAddress } from 'pakdatakit/quality';
import { Badge, Rows } from './common';

const PART_LABELS: Record<string, string> = {
  city: 'city',
  houseNumber: 'house number',
  street: 'street',
  area: 'area',
  postalCode: 'postal code',
  landmark: 'landmark',
};

export default function QualityWidget() {
  const id = useId();
  const [address, setAddress] = useState(
    'House 7, Street 2, near Jamia Masjid, Multan',
  );
  const [phone, setPhone] = useState('0300 1234567');
  const result = scoreAddress(address);
  const flags = phoneRiskSignals(phone);
  return (
    <div className="pdk-card" data-widget="quality">
      <div className="pdk-field">
        <label htmlFor={`${id}-address`}>Delivery address</label>
        <input
          id={`${id}-address`}
          className="pdk-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="pdk-field">
        <label htmlFor={`${id}-phone`}>Phone number</label>
        <input
          id={`${id}-phone`}
          className="pdk-input mono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="off"
        />
      </div>
      <p aria-live="polite">
        <code>scoreAddress()</code> {result.score} / 100,{' '}
        <code>phoneRiskSignals()</code>{' '}
        <Badge valid={flags.length === 0} labels={['No flags', 'Check']} />
      </p>
      <Rows
        rows={[
          ['Address score', `${result.score} / 100`],
          [
            'Missing',
            result.missing.map((part) => PART_LABELS[part]).join(', '),
            'text',
          ],
          ['Warnings', result.parsed.warnings.join('; '), 'text'],
          ['Phone flags', flags.length ? flags.join(', ') : 'none', 'text'],
        ]}
      />
    </div>
  );
}
