import { useEffect, useId, useState } from 'react';
import { Rows } from './common';

// pakdatakit/address matches against the city, district and postal code
// data (several hundred KB unminified), so it is loaded only once the widget
// is on screen, not with the page's initial JS.
type AddressModule = typeof import('pakdatakit/address');

export default function AddressWidget({
  initial = 'House 12, Street 5, F-7/2, Islamabad 44000',
}: {
  initial?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const [mod, setMod] = useState<AddressModule | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    import('pakdatakit/address').then(
      (m) => live && setMod(m),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);
  const parsed = mod ? mod.parseAddress(value) : null;
  const formatted = mod && parsed ? mod.formatAddress(parsed) : null;
  const status = failed
    ? 'Could not load the address data.'
    : !parsed
      ? 'Loading address data…'
      : parsed.warnings.length > 0
        ? parsed.warnings.join(' ')
        : parsed.city || parsed.province
          ? `Found ${[parsed.city, parsed.province].filter(Boolean).join(', ')}.`
          : 'No city or province found.';
  return (
    <div className="pdk-card" data-widget="address">
      <div className="pdk-field">
        <label htmlFor={id}>Try an address</label>
        <input
          id={id}
          className="pdk-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p aria-live="polite">{status}</p>
      <Rows
        rows={[
          ['Street', parsed?.street, 'text'],
          ['Area', parsed?.area, 'text'],
          ['City', parsed?.city, 'text'],
          ['District', parsed?.district, 'text'],
          ['Province', parsed?.province, 'text'],
          ['Postal code', parsed?.postalCode],
          ['formatAddress()', formatted, 'text'],
        ]}
      />
    </div>
  );
}
