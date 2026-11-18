import { useEffect, useId, useRef } from 'react';
import {
  calculateMonthlySalaryTax,
  calculateSalaryTax,
  getSalaryTaxSlabs,
  getSalaryTaxYears,
} from 'pakdatakit/incometax';
import { PrivacyNote, Rows, ShareButton, rs, trackTool, useHashState } from '../widgets/common';

const YEARS = getSalaryTaxYears();

export default function SalaryTaxTool({ dataChecked }: { dataChecked: string }) {
  const id = useId();
  const [state, set] = useHashState({ salary: '150000', per: 'month', year: '2027' }, true);
  const tracked = useRef(false);
  const year = Number(state.year);
  const amount = Number(state.salary.replace(/[,\s]/g, ''));
  const result =
    state.per === 'month'
      ? calculateMonthlySalaryTax(amount, { taxYear: year })
      : calculateSalaryTax(amount, { taxYear: year });
  const table = getSalaryTaxSlabs(year);
  useEffect(() => {
    if (!tracked.current && (state.salary !== '150000' || state.year !== '2027')) {
      tracked.current = true;
      trackTool('salary-tax');
    }
  }, [state]);
  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-grid two">
          <div className="pdk-field">
            <label htmlFor={`${id}-s`}>Salary (Rs.)</label>
            <input
              id={`${id}-s`}
              className="pdk-input mono"
              value={state.salary}
              onChange={(e) => set({ salary: e.target.value })}
              inputMode="decimal"
              autoComplete="off"
            />
          </div>
          <div className="pdk-field">
            <label htmlFor={`${id}-p`}>Per</label>
            <select id={`${id}-p`} className="pdk-select" value={state.per} onChange={(e) => set({ per: e.target.value })}>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="pdk-field">
            <label htmlFor={`${id}-y`}>Tax year</label>
            <select id={`${id}-y`} className="pdk-select" value={state.year} onChange={(e) => set({ year: e.target.value })}>
              {[...YEARS].reverse().map((y) => (
                <option key={y} value={y}>
                  {y} ({y - 1}-{String(y).slice(2)}, July to June)
                </option>
              ))}
            </select>
          </div>
        </div>
        <Rows
          rows={[
            ['Tax per year', rs(result?.tax)],
            ['Tax per month', rs(result?.monthly)],
            ['Effective rate', result ? `${result.effectiveRate}%` : null],
            ['Slab', result ? `${rs(result.slab.fixed)} + ${result.slab.rate}% of the amount above ${rs(result.slab.over)}` : null],
          ]}
        />
        <ShareButton state={state} />
      </div>
      {table ? (
        <section>
          <h2>Tax year {table.taxYear} rates for salaried individuals</h2>
          <table className="pdk-table">
            <thead>
              <tr>
                <th scope="col">Taxable income (Rs. per year)</th>
                <th scope="col">Tax</th>
              </tr>
            </thead>
            <tbody>
              {table.slabs.map((s) => (
                <tr key={s.over}>
                  <td className={result?.slab.over === s.over ? 'hl' : undefined}>
                    {s.upTo === null
                      ? `Above ${s.over.toLocaleString('en-PK')}`
                      : `${s.over.toLocaleString('en-PK')} to ${s.upTo.toLocaleString('en-PK')}`}
                  </td>
                  <td className={result?.slab.over === s.over ? 'hl' : undefined}>
                    {s.rate === 0 ? 'No tax' : `${s.fixed ? `${s.fixed.toLocaleString('en-PK')} + ` : ''}${s.rate}% of the amount above ${s.over.toLocaleString('en-PK')}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pdk-note">
            <strong>Law:</strong> {table.law}. <strong>Source:</strong>{' '}
            <a href={table.source} rel="noopener">
              {table.source}
            </a>
            . <strong>Checked:</strong> {dataChecked}.
          </p>
        </section>
      ) : null}
      <p className="pdk-note">
        An estimate from the salaried rate table only: it applies when salary is more than 75% of taxable income, and
        does not include tax credits, exemptions or allowances. Not tax advice.
      </p>
      <PrivacyNote />
    </div>
  );
}
