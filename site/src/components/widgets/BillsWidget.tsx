import { useId, useState } from 'react';
import {
  parseElectricityRef,
  validateGasConsumerNumber,
  type GasCompany,
} from 'pakdatakit/bills';
import { Badge, Rows } from './common';

const TYPES = {
  reference: 'DISCO reference number',
  'customer-id': 'DISCO customer ID',
  'k-electric': 'K-Electric account number',
} as const;

export default function BillsWidget() {
  const refId = useId();
  const gasId = useId();
  const companyId = useId();
  const [ref, setRef] = useState('12 34567 8901234 U');
  const [gas, setGas] = useState('12345678901');
  const [company, setCompany] = useState<GasCompany>('SNGPL');
  const bill = parseElectricityRef(ref);
  const gasValid = validateGasConsumerNumber(gas, company);
  return (
    <div className="pdk-card" data-widget="bills">
      <div className="pdk-field">
        <label htmlFor={refId}>Try an electricity bill number</label>
        <input
          id={refId}
          className="pdk-input mono"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p aria-live="polite">
        <code>parseElectricityRef()</code> <Badge valid={bill !== null} />
      </p>
      <Rows
        rows={[
          ['Kind', bill ? TYPES[bill.type] : null],
          ['Formatted', bill?.formatted],
          ['Urban/rural', bill?.urbanRural],
          ['Company', bill?.disco],
        ]}
      />
      <div className="pdk-field">
        <label htmlFor={companyId}>Gas company</label>
        <select
          id={companyId}
          className="pdk-input"
          value={company}
          onChange={(e) => setCompany(e.target.value as GasCompany)}
        >
          <option value="SNGPL">SNGPL</option>
          <option value="SSGC">SSGC</option>
        </select>
      </div>
      <div className="pdk-field">
        <label htmlFor={gasId}>Try a gas consumer number</label>
        <input
          id={gasId}
          className="pdk-input mono"
          value={gas}
          onChange={(e) => setGas(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p aria-live="polite">
        <code>validateGasConsumerNumber()</code> <Badge valid={gasValid} />
      </p>
    </div>
  );
}
