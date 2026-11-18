import { useEffect, useId, useRef } from 'react';
import { calculateSalesTax, getSalesTaxRate } from 'pakdatakit/salestax';
import {
  PrivacyNote,
  Rows,
  ShareButton,
  rs,
  trackTool,
  useHashState,
} from '../widgets/common';

const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad',
];
const today = () => new Date().toISOString().slice(0, 10);

export default function SalesTaxTool({ dataChecked }: { dataChecked: string }) {
  const id = useId();
  const [state, set] = useHashState(
    {
      amount: '1000',
      kind: 'goods',
      province: 'Punjab',
      inclusive: '',
      date: '',
    },
    true,
  );
  const tracked = useRef(false);
  const kind = state.kind === 'services' ? 'services' : 'goods';
  const province = kind === 'services' ? state.province : undefined;
  const date = state.date || today();
  const rate = getSalesTaxRate({ kind, province, date });
  const result = calculateSalesTax(Number(state.amount.replace(/[,\s]/g, '')), {
    kind,
    province,
    date,
    inclusive: state.inclusive === '1',
  });
  useEffect(() => {
    if (!tracked.current && state.amount !== '1000') {
      tracked.current = true;
      trackTool('sales-tax');
    }
  }, [state]);
  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-grid two">
          <div className="pdk-field">
            <label htmlFor={`${id}-a`}>Amount (Rs.)</label>
            <input
              id={`${id}-a`}
              className="pdk-input mono"
              value={state.amount}
              onChange={(e) => set({ amount: e.target.value })}
              inputMode="decimal"
              autoComplete="off"
            />
          </div>
          <div className="pdk-field">
            <label htmlFor={`${id}-k`}>Goods or services</label>
            <select
              id={`${id}-k`}
              className="pdk-select"
              value={kind}
              onChange={(e) => set({ kind: e.target.value })}
            >
              <option value="goods">Goods (federal, FBR)</option>
              <option value="services">Services (provincial)</option>
            </select>
          </div>
          {kind === 'services' ? (
            <div className="pdk-field">
              <label htmlFor={`${id}-p`}>Province</label>
              <select
                id={`${id}-p`}
                className="pdk-select"
                value={state.province}
                onChange={(e) => set({ province: e.target.value })}
              >
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="pdk-field">
            <label htmlFor={`${id}-d`}>Date</label>
            <input
              id={`${id}-d`}
              type="date"
              min="2019-07-01"
              className="pdk-input"
              value={date}
              onChange={(e) =>
                set({ date: e.target.value === today() ? '' : e.target.value })
              }
            />
          </div>
        </div>
        <p>
          <label>
            <input
              type="checkbox"
              checked={state.inclusive === '1'}
              onChange={(e) => set({ inclusive: e.target.checked ? '1' : '' })}
            />{' '}
            The amount already includes sales tax
          </label>
        </p>
        <Rows
          rows={[
            ['Authority', rate?.authority],
            ['Rate', rate ? `${rate.rate}%` : null],
            ['Net', rs(result?.net)],
            ['Sales tax', rs(result?.tax)],
            ['Total', rs(result?.gross)],
          ]}
        />
        <ShareButton state={state} />
      </div>
      {rate ? (
        <p className="pdk-note">
          <strong>Law:</strong> {rate.law}. <strong>In force:</strong>{' '}
          {rate.from} to {rate.to ?? 'now'}. <strong>Source:</strong>{' '}
          <a href={rate.source} rel="noopener">
            {rate.source}
          </a>
          . <strong>Checked:</strong> {dataChecked}.
        </p>
      ) : (
        <p className="pdk-note">
          No standard rate for that combination (dates before 1 July 2019, or
          goods in AJK or Gilgit-Baltistan).
        </p>
      )}
      <p className="pdk-note">
        Standard rates only. Reduced rates, exemptions, the Third Schedule
        (retail price) and further tax are not included. Amounts are exact to
        the paisa. Not tax advice.
      </p>
      <PrivacyNote />
    </div>
  );
}
