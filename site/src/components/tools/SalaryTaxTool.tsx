import { useEffect, useId, useRef } from 'react';
import {
  calculateMonthlySalaryTax,
  calculateSalaryTax,
  getSalaryTaxSlabs,
  getSalaryTaxYears,
} from 'pakdatakit/incometax';
import {
  AMOUNT_ERROR,
  PrivacyNote,
  Rows,
  amountField,
  ShareButton,
  rs,
  trackTool,
  useHashState,
} from '../widgets/common';

const YEARS = getSalaryTaxYears();

/** "9% of the tax when taxable income is above Rs. 10,000,000", or why none. */
function surchargeRule(
  surcharge: { rate: number; over: number } | null,
): string {
  if (surcharge === null) return 'None in this tax year';
  if (surcharge.rate === 0) return 'None for salaried individuals this year';
  return `${surcharge.rate}% of the tax when taxable income is above ${rs(surcharge.over)}`;
}

export default function SalaryTaxTool({
  dataChecked,
}: {
  dataChecked: string;
}) {
  const id = useId();
  const [state, set] = useHashState(
    { salary: '150000', per: 'month', year: '2027' },
    true,
  );
  const tracked = useRef(false);
  const year = Number(state.year);
  const { value: amount, invalid, echo } = amountField(state.salary);
  const result =
    amount === null
      ? null
      : state.per === 'month'
        ? calculateMonthlySalaryTax(amount, {
            taxYear: year,
            includeSurcharge: true,
          })
        : calculateSalaryTax(amount, { taxYear: year, includeSurcharge: true });
  const table = getSalaryTaxSlabs(year);
  useEffect(() => {
    if (
      !tracked.current &&
      (state.salary !== '150000' || state.year !== '2027')
    ) {
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
              aria-invalid={invalid || undefined}
              aria-describedby={
                invalid ? `${id}-err` : echo ? `${id}-echo` : undefined
              }
            />
            {invalid ? (
              <p id={`${id}-err`} className="pdk-error">
                {AMOUNT_ERROR}
              </p>
            ) : null}
            {echo ? (
              <p id={`${id}-echo`} className="pdk-note">
                = {echo}
              </p>
            ) : null}
          </div>
          <div className="pdk-field">
            <label htmlFor={`${id}-p`}>Per</label>
            <select
              id={`${id}-p`}
              className="pdk-select"
              value={state.per}
              onChange={(e) => set({ per: e.target.value })}
            >
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="pdk-field">
            <label htmlFor={`${id}-y`}>Tax year</label>
            <select
              id={`${id}-y`}
              className="pdk-select"
              value={state.year}
              onChange={(e) => set({ year: e.target.value })}
            >
              {[...YEARS].reverse().map((y) => (
                <option key={y} value={y}>
                  {y} ({y - 1}–{String(y).slice(2)}, July to June)
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="pdk-result" aria-live="polite">
          {result
            ? `${rs(result.monthly)} a month, ${result.effectiveRate}% effective`
            : invalid
              ? 'No result: the salary isn’t a number.'
              : 'Enter a salary to see the tax.'}
        </p>
        <Rows
          rows={[
            ['Tax from the rate table', rs(result?.tax)],
            result && result.surcharge === 0
              ? [
                  'Surcharge (section 4AB)',
                  `Rs. 0: ${surchargeRule(table?.surcharge ?? null).toLowerCase()}`,
                  'text',
                ]
              : ['Surcharge (section 4AB)', rs(result?.surcharge)],
            ['Total tax per year', rs(result?.total)],
            ['Tax per month', rs(result?.monthly)],
            ['Effective rate', result ? `${result.effectiveRate}%` : null],
            [
              'Slab',
              result
                ? `${rs(result.slab.fixed)} + ${result.slab.rate}% of the amount above ${rs(result.slab.over)}`
                : null,
              'text',
            ],
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
              {table.slabs.map((s) => {
                const mine = result?.slab.over === s.over;
                return (
                  <tr
                    key={s.over}
                    className={mine ? 'hl' : undefined}
                    aria-current={mine ? 'true' : undefined}
                  >
                    <td>
                      {s.upTo === null
                        ? `Above ${s.over.toLocaleString('en-PK')}`
                        : `${s.over.toLocaleString('en-PK')} to ${s.upTo.toLocaleString('en-PK')}`}
                      {mine ? (
                        <span className="pdk-mine"> (your slab)</span>
                      ) : null}
                    </td>
                    <td>
                      {s.rate === 0
                        ? 'No tax'
                        : `${s.fixed ? `${s.fixed.toLocaleString('en-PK')} + ` : ''}${s.rate}% of the amount above ${s.over.toLocaleString('en-PK')}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="pdk-note">
            <strong>Law:</strong> {table.law}. <strong>Source:</strong>{' '}
            <a href={table.source} rel="noopener">
              {table.source}
            </a>
            . <strong>Checked:</strong> {dataChecked}.
          </p>
          <p className="pdk-note">
            <strong>Surcharge:</strong> {surchargeRule(table.surcharge)}.
            {table.surcharge ? (
              <>
                {' '}
                It is a percentage of the whole tax, so one rupee over the
                threshold adds it in full. {table.surcharge.law}.{' '}
                <strong>Source:</strong>{' '}
                <a href={table.surcharge.source} rel="noopener">
                  {table.surcharge.source}
                </a>
                .
              </>
            ) : (
              <> Section 4AB was added by the Finance Act 2024.</>
            )}
          </p>
        </section>
      ) : null}
      <p className="pdk-note">
        An estimate from the salaried rate table and the section 4AB surcharge:
        the table applies when salary is more than 75% of taxable income, and it
        does not include tax credits, exemptions, allowances or super tax. Not
        tax advice.
      </p>
      <PrivacyNote />
    </div>
  );
}
