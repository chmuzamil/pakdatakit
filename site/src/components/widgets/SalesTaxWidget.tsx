import { useId, useState } from 'react';
import { calculateSalesTax, getSalesTaxRate } from 'pakdatakit/salestax';
import { Rows, rs } from './common';

const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad'];

export default function SalesTaxWidget() {
  const id = useId();
  const [amount, setAmount] = useState('1000');
  const [where, setWhere] = useState('goods');
  const kind = where === 'goods' ? 'goods' : 'services';
  const province = where === 'goods' ? undefined : where;
  const rate = getSalesTaxRate({ kind, province });
  const result = calculateSalesTax(Number(amount), { kind, province });
  return (
    <div className="pdk-card" data-widget="salestax">
      <div className="pdk-grid two">
        <div className="pdk-field">
          <label htmlFor={`${id}-a`}>Amount (Rs.)</label>
          <input
            id={`${id}-a`}
            className="pdk-input mono"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="pdk-field">
          <label htmlFor={`${id}-w`}>Goods, or services in</label>
          <select id={`${id}-w`} className="pdk-select" value={where} onChange={(e) => setWhere(e.target.value)}>
            <option value="goods">Goods (FBR)</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                Services: {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Rows
        rows={[
          ['Authority', rate?.authority],
          ['Rate today', rate ? `${rate.rate}%` : null],
          ['Sales tax', rs(result?.tax)],
          ['Total', rs(result?.gross)],
        ]}
      />
    </div>
  );
}
