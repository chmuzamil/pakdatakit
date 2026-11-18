import { useMemo, useState } from 'react'
import {
  calculateMonthlySalaryTax,
  calculateSalaryTax,
  getSalaryTaxSlabs,
  getSalaryTaxYears,
} from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { inputClassName, monoInputClassName } from '../utils/examples'

const rupees = (n: number) => `Rs. ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`

export function IncomeTaxPlayground() {
  const years = useMemo(() => getSalaryTaxYears(), [])
  const [taxYear, setTaxYear] = useState(years.includes(2027) ? 2027 : years[years.length - 1])
  const [salary, setSalary] = useState('5000000')
  const [period, setPeriod] = useState<'annual' | 'monthly'>('annual')

  const value = Number(salary)
  const result = useMemo(() => {
    if (!Number.isFinite(value)) return null
    return period === 'annual'
      ? calculateSalaryTax(value, { taxYear })
      : calculateMonthlySalaryTax(value, { taxYear })
  }, [value, period, taxYear])
  const table = useMemo(() => getSalaryTaxSlabs(taxYear), [taxYear])

  const fn = period === 'annual' ? 'calculateSalaryTax' : 'calculateMonthlySalaryTax'
  const code = `import { ${fn} } from "pakdatakit";

${fn}(${salary || 0}, { taxYear: ${taxYear} });
// → ${result ? JSON.stringify(result) : 'null'}`

  return (
    <PlaygroundShell
      title="Salary Income Tax"
      description="Income tax on salary from the salaried rate table of the Income Tax Ordinance 2001, for tax years 2020 to 2027, computed exactly in whole paisa."
      input={
        <Card title="Salary">
          <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Salary period">
            {(['annual', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                onClick={() => setPeriod(p)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  period === p
                    ? 'border-accent bg-accent/10 text-text-heading'
                    : 'border-border text-text-muted'
                }`}
              >
                {p === 'annual' ? 'Annual' : 'Monthly'}
              </button>
            ))}
          </div>
          <label htmlFor="it-salary" className="sr-only">
            Salary
          </label>
          <input
            id="it-salary"
            type="text"
            inputMode="decimal"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            className={monoInputClassName}
          />
          <label htmlFor="it-year" className="mt-3 mb-1 block text-xs text-text-muted">
            Tax year (1 July to 30 June; tax year 2027 is July 2026 to June 2027)
          </label>
          <select
            id="it-year"
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            className={inputClassName}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Card>
      }
      output={
        <>
          <Card title="Result">
            <OutputRow label="Annual tax" value={result ? rupees(result.tax) : ''} />
            <OutputRow label="Monthly tax" value={result ? rupees(result.monthly) : ''} />
            <OutputRow label="Effective rate" value={result ? `${result.effectiveRate}%` : ''} />
            <OutputRow
              label="Slab"
              value={
                result
                  ? `${rupees(result.slab.fixed)} + ${result.slab.rate}% over ${rupees(result.slab.over)}`
                  : ''
              }
            />
          </Card>
          {table && (
            <Card title={`Tax year ${table.taxYear} rates`} description={table.law}>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th className="py-1 font-normal">Taxable income</th>
                    <th className="py-1 font-normal">Tax</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-text-heading">
                  {table.slabs.map((s) => (
                    <tr
                      key={s.over}
                      className={result?.slab.over === s.over ? 'bg-accent/10' : undefined}
                    >
                      <td className="py-1">
                        {s.upTo === null
                          ? `Over ${s.over.toLocaleString('en-PK')}`
                          : `${s.over.toLocaleString('en-PK')} to ${s.upTo.toLocaleString('en-PK')}`}
                      </td>
                      <td className="py-1">
                        {s.rate === 0
                          ? '0'
                          : `${s.fixed ? `${s.fixed.toLocaleString('en-PK')} + ` : ''}${s.rate}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-text-muted">
                Source:{' '}
                <a href={table.source} target="_blank" rel="noreferrer" className="text-brand underline">
                  {table.source}
                </a>
              </p>
            </Card>
          )}
        </>
      }
      code={<CodePreview code={code} />}
    />
  )
}
