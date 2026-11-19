import { useEffect, useId, useState } from 'react';
import { Rows } from './common';

// pakdatakit/geo bundles the district, division and tehsil data (most of it
// tehsils), so it is loaded only once the widget is on screen, not with the
// page's initial JS.
type Geo = typeof import('pakdatakit/geo');

export default function GeoWidget({
  initial = 'Attock',
}: {
  initial?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    import('pakdatakit/geo').then(
      (m) => live && setGeo(m),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);
  const province = geo?.getDistrictProvince(value) ?? null;
  const division = geo?.getDivisionOfDistrict(value) ?? null;
  const tehsils = geo?.getTehsils(value) ?? [];
  const suggestions = geo ? geo.searchDistricts(value).slice(0, 8) : [];
  const status = failed
    ? 'Could not load the district data.'
    : !geo
      ? 'Loading district data…'
      : province === null
        ? 'No district by that name.'
        : `${tehsils.length} tehsil${tehsils.length === 1 ? '' : 's'} found.`;
  return (
    <div className="pdk-card" data-widget="geo">
      <div className="pdk-field">
        <label htmlFor={id}>Try a district</label>
        <input
          id={id}
          className="pdk-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          list={`${id}-list`}
          autoComplete="off"
          spellCheck={false}
        />
        <datalist id={`${id}-list`}>
          {suggestions.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>
      <p aria-live="polite">{status}</p>
      <Rows
        rows={[
          ['Province', province, 'text'],
          ['Division (2023 census)', division, 'text'],
          ['Tehsils (2023 census)', tehsils.join(', '), 'text'],
        ]}
      />
    </div>
  );
}
