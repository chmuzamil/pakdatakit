import { useId, useState } from 'react';
import { calculateSalaryTax } from 'pakdatakit/incometax';
import { AMOUNT_ERROR, Rows, amountField, rs } from './common';

export default function SalaryTaxWidget() {
  const id = useId();
  const [salary, setSalary] = useState('5000000');
  const { value, invalid } = amountField(salary);
  const result =
    value === null ? null : calculateSalaryTax(value, { taxYear: 2027 });
  return (
    <div className="pdk-card" data-widget="incometax">
      <div className="pdk-field">
        <label htmlFor={id}>Annual salary, tax year 2027 (Rs.)</label>
        <input
          id={id}
          className="pdk-input mono"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-err` : undefined}
        />
        {invalid ? (
          <p id={`${id}-err`} className="pdk-error">
            {AMOUNT_ERROR}
          </p>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {result
          ? `${rs(result.tax)} for the year, ${result.effectiveRate}% effective`
          : ''}
      </p>
      <Rows
        rows={[
          ['Tax for the year', rs(result?.tax)],
          ['Per month', rs(result?.monthly)],
          ['Effective rate', result ? `${result.effectiveRate}%` : null],
          [
            'Slab',
            result
              ? `${rs(result.slab.fixed)} + ${result.slab.rate}% above ${rs(result.slab.over)}`
              : null,
            'text',
          ],
        ]}
      />
    </div>
  );
}
