import { useMemo, useState } from 'react'
import { calculateSalesTax, getSalesTaxRate, type SalesTaxKind } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { inputClassName, monoInputClassName } from '../utils/examples'

const provinces = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad'] as const

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SalesTaxPlayground() {
  const [amount, setAmount] = useState('1000')
  const [kind, setKind] = useState<SalesTaxKind>('services')
  const [province, setProvince] = useState<string>('Punjab')
  const [date, setDate] = useState(today())
  const [inclusive, setInclusive] = useState(false)

  const value = Number(amount)
  const rate = useMemo(
    () => getSalesTaxRate({ kind, province: kind === 'services' ? province : undefined, date }),
    [kind, province, date],
  )
  const result = useMemo(
    () =>
      Number.isFinite(value)
        ? calculateSalesTax(value, {
            kind,
            province: kind === 'services' ? province : undefined,
            date,
            inclusive,
          })
        : null,
    [value, kind, province, date, inclusive],
  )

  const opts = [
    `kind: "${kind}"`,
    kind === 'services' ? `province: "${province}"` : null,
    `date: "${date}"`,
    inclusive ? 'inclusive: true' : null,
  ]
    .filter(Boolean)
    .join(', ')
  const code = `import { getSalesTaxRate, calculateSalesTax } from "pakdatakit";

calculateSalesTax(${amount || 0}, { ${opts} });
// → ${result ? JSON.stringify(result) : 'null'}`

  return (
    <PlaygroundShell
      title="Sales Tax"
      description="Standard sales tax rates for goods (FBR) and services (PRA, SRB, KPRA, BRA, ICT) on any date from 1 July 2019, with the law behind each rate, and exact amounts in whole paisa."
      input={
        <>
          <Card title="Amount" description="In rupees, at most 2 decimals.">
            <label htmlFor="st-amount" className="sr-only">
              Amount
            </label>
            <input
              id="st-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={monoInputClassName}
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={inclusive}
                onChange={(e) => setInclusive(e.target.checked)}
              />
              Amount already includes sales tax
            </label>
          </Card>
          <Card title="What and where">
            <label htmlFor="st-kind" className="mb-1 block text-xs text-text-muted">
              Kind
            </label>
            <select
              id="st-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as SalesTaxKind)}
              className={inputClassName}
            >
              <option value="services">Services (provincial)</option>
              <option value="goods">Goods (federal)</option>
            </select>
            {kind === 'services' && (
              <>
                <label htmlFor="st-province" className="mt-3 mb-1 block text-xs text-text-muted">
                  Province
                </label>
                <select
                  id="st-province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={inputClassName}
                >
                  {provinces.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </>
            )}
            <label htmlFor="st-date" className="mt-3 mb-1 block text-xs text-text-muted">
              Date
            </label>
            <input
              id="st-date"
              type="date"
              min="2019-07-01"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClassName}
            />
          </Card>
        </>
      }
      output={
        <Card title="Result">
          <OutputRow label="Authority" value={rate?.authority ?? ''} mono={false} />
          <OutputRow label="Rate" value={rate ? `${rate.rate}%` : ''} />
          <OutputRow label="Net" value={result ? result.net.toFixed(2) : ''} />
          <OutputRow label="Sales tax" value={result ? result.tax.toFixed(2) : ''} />
          <OutputRow label="Gross" value={result ? result.gross.toFixed(2) : ''} />
          <OutputRow
            label="In force"
            value={rate ? `${rate.from} to ${rate.to ?? 'now'}` : ''}
            mono={false}
          />
          <OutputRow label="Law" value={rate?.law ?? ''} mono={false} />
          {rate && (
            <p className="mt-3 text-xs text-text-muted">
              Source:{' '}
              <a href={rate.source} target="_blank" rel="noreferrer" className="text-brand underline">
                {rate.source}
              </a>
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            Standard rates only. Reduced rates, exemptions and the Third Schedule are not covered.
          </p>
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
