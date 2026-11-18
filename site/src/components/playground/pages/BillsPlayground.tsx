import { useMemo, useState } from 'react'
import { parseElectricityRef, validateGasConsumerNumber, type GasCompany } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { escapeForCode, inputClassName, monoInputClassName } from '../utils/examples'

const refTypes = {
  reference: 'DISCO reference number',
  'customer-id': 'DISCO customer ID',
  'k-electric': 'K-Electric account number',
} as const

export function BillsPlayground() {
  const [ref, setRef] = useState('02-12624-0045901 R')
  const [gas, setGas] = useState('12345678901')
  const [company, setCompany] = useState<GasCompany>('SNGPL')

  const parsed = useMemo(() => parseElectricityRef(ref), [ref])
  const gasValid = useMemo(() => validateGasConsumerNumber(gas, company), [gas, company])

  const code = `import { parseElectricityRef, validateGasConsumerNumber } from "pakdatakit";

parseElectricityRef("${escapeForCode(ref)}");
// → ${parsed ? JSON.stringify(parsed) : 'null'}
validateGasConsumerNumber("${escapeForCode(gas)}", "${company}"); // → ${gasValid}`

  return (
    <PlaygroundShell
      title="Electricity & Gas Bills"
      description="Check and format electricity bill references (DISCO reference numbers and customer IDs, K-Electric accounts) and SNGPL or SSGC gas consumer numbers."
      input={
        <>
          <Card
            title="Electricity reference"
            description="14-digit DISCO reference (optionally with U or R), a 10-digit customer ID, or a K-Electric account number."
          >
            <label htmlFor="bill-ref" className="sr-only">
              Electricity reference
            </label>
            <input
              id="bill-ref"
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              spellCheck={false}
              className={monoInputClassName}
            />
            <p className="mt-2 text-xs text-text-muted">Try: 02-12624-0045901 R · 0400012345678</p>
          </Card>
          <Card title="Gas consumer number" description="SNGPL: 11 digits. SSGC: 10 digits.">
            <label htmlFor="gas-company" className="mb-1 block text-xs text-text-muted">
              Company
            </label>
            <select
              id="gas-company"
              value={company}
              onChange={(e) => setCompany(e.target.value as GasCompany)}
              className={inputClassName}
            >
              <option value="SNGPL">SNGPL</option>
              <option value="SSGC">SSGC</option>
            </select>
            <label htmlFor="gas-number" className="mt-3 mb-1 block text-xs text-text-muted">
              Consumer number
            </label>
            <input
              id="gas-number"
              type="text"
              inputMode="numeric"
              value={gas}
              onChange={(e) => setGas(e.target.value)}
              className={monoInputClassName}
            />
          </Card>
        </>
      }
      output={
        <Card title="Result">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-text-muted">Electricity reference</span>
            <ResultBadge valid={parsed !== null} />
          </div>
          <OutputRow label="Type" value={parsed ? refTypes[parsed.type] : ''} mono={false} />
          <OutputRow label="Formatted" value={parsed?.formatted ?? ''} />
          <OutputRow
            label="Urban / rural"
            value={parsed?.urbanRural === 'U' ? 'Urban' : parsed?.urbanRural === 'R' ? 'Rural' : ''}
            mono={false}
          />
          <OutputRow label="Company" value={parsed?.disco ?? ''} mono={false} />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-text-muted">Gas consumer number ({company})</span>
            <ResultBadge valid={gasValid} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            Format checks only: nothing is looked up, and no bill is fetched.
          </p>
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
