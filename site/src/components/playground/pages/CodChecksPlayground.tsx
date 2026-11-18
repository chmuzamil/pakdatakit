import { useMemo, useState } from 'react'
import { phoneRiskSignals, scoreAddress } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { escapeForCode, monoInputClassName, textareaClassName } from '../utils/examples'

const partLabels: Record<string, string> = {
  city: 'City',
  houseNumber: 'House number',
  street: 'Street',
  area: 'Area',
  postalCode: 'Postal code',
  landmark: 'Landmark',
}

export function CodChecksPlayground() {
  const [address, setAddress] = useState(
    'House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660',
  )
  const [phone, setPhone] = useState('03001234567')

  const score = useMemo(() => scoreAddress(address), [address])
  const flags = useMemo(() => phoneRiskSignals(phone), [phone])

  const code = `import { scoreAddress, phoneRiskSignals } from "pakdatakit";

scoreAddress("${escapeForCode(address)}");
// → { score: ${score.score}, missing: ${JSON.stringify(score.missing)} }
phoneRiskSignals("${escapeForCode(phone)}"); // → ${JSON.stringify(flags)}`

  return (
    <PlaygroundShell
      title="COD Checks"
      description="Spot cash-on-delivery orders a rider will struggle to deliver: score how complete an address is, and flag phone numbers a courier cannot use."
      input={
        <>
          <Card title="Delivery address">
            <label htmlFor="cod-address" className="sr-only">
              Delivery address
            </label>
            <textarea
              id="cod-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={textareaClassName}
            />
            <p className="mt-2 text-xs text-text-muted">Try just: Lahore</p>
          </Card>
          <Card title="Phone number">
            <label htmlFor="cod-phone" className="sr-only">
              Phone number
            </label>
            <input
              id="cod-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={monoInputClassName}
            />
            <p className="mt-2 text-xs text-text-muted">
              Try: 0301-2945716 · 03000000000 · 042 35761234
            </p>
          </Card>
        </>
      }
      output={
        <Card title="Result">
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Address score</span>
              <span className="font-mono text-text-heading">{score.score} / 100</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-surface" aria-hidden="true">
              <div className="h-full bg-accent" style={{ width: `${score.score}%` }} />
            </div>
          </div>
          <OutputRow
            label="Missing"
            value={score.missing.map((m) => partLabels[m] ?? m).join(', ')}
            mono={false}
            emptyText="Nothing"
          />
          <OutputRow label="City found" value={score.parsed.city ?? ''} mono={false} />
          <OutputRow label="Postal code found" value={score.parsed.postalCode ?? ''} />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-text-muted">Phone usable for COD</span>
            <ResultBadge valid={flags.length === 0} />
          </div>
          <OutputRow label="Flags" value={flags.join(', ')} emptyText="None" />
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            Heuristics on the text only: no lists of real people or numbers, and no network calls.
          </p>
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
