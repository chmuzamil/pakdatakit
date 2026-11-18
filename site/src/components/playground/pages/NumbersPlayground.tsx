import { useMemo, useState } from 'react'
import { analyzeNumber, type NumberType } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { escapeForCode, monoInputClassName } from '../utils/examples'

const typeLabels: Record<NumberType, string> = {
  mobile: 'Mobile',
  landline: 'Landline',
  uan: 'UAN (111)',
  'toll-free': 'Toll-free (0800)',
  premium: 'Premium rate (0900)',
  personal: 'Personal (0122)',
}

const samples = ['021-111-825-888', '042 35761234', '051-9260138', '0800-12345', '0300 1234567']

export function NumbersPlayground() {
  const [input, setInput] = useState(samples[0]!)

  const info = useMemo(() => (input.trim() ? analyzeNumber(input) : null), [input])

  const code = `import { analyzeNumber } from "pakdatakit";

analyzeNumber("${escapeForCode(input)}");
// → ${
    info
      ? `{ type: "${info.type}", formatted: "${info.formatted}", e164: ${info.e164 ? `"${info.e164}"` : 'null'}, areaCode: ${info.areaCode ? `"${info.areaCode}"` : 'null'}, cities: [${info.cities.map((c) => `"${c}"`).join(', ')}] }`
      : 'null'
  }`

  return (
    <PlaygroundShell
      title="Landline & Service Numbers"
      description="Identify mobile, landline, UAN, toll-free, premium-rate and personal numbers, with area code and city."
      input={
        <Card title="Input" description="Any Pakistani number, local or international.">
          <label htmlFor="number-input" className="sr-only">
            Phone number
          </label>
          <input
            id="number-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="021-111-825-888"
            spellCheck={false}
            className={monoInputClassName}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {samples.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setInput(sample)}
                className="rounded-md border border-border px-2 py-1 font-mono text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {sample}
              </button>
            ))}
          </div>
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Enter a number to analyze.</p>
          ) : (
            <>
              <div className="mb-4">
                <ResultBadge valid={info !== null} />
              </div>
              <OutputRow label="Type" value={info ? typeLabels[info.type] : ''} mono={false} />
              <OutputRow label="Formatted" value={info?.formatted ?? ''} />
              <OutputRow label="E.164" value={info?.e164 ?? ''} />
              <OutputRow label="Area code" value={info?.areaCode ?? ''} />
              <OutputRow label="City" value={info?.cities.join(' / ') ?? ''} mono={false} />
            </>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
