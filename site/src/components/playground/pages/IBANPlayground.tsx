import { useMemo, useState } from 'react'
import { getBankInfo, validateIBAN, type BankType } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { escapeForCode, examples, monoInputClassName } from '../utils/examples'

const typeLabels: Record<BankType, string> = {
  commercial: 'Commercial bank',
  islamic: 'Islamic bank',
  microfinance: 'Microfinance bank',
  digital: 'Digital bank',
  emi: 'Electronic money institution (wallet)',
  foreign: 'Foreign bank (Pakistan branch)',
  specialized: 'Specialized bank',
  central: 'Central bank',
  'public-sector': 'Public-sector bank',
}

export function IBANPlayground() {
  const [input, setInput] = useState<string>(examples.iban)

  const isValid = useMemo(() => {
    if (!input.trim()) return false
    return validateIBAN(input)
  }, [input])

  const bank = useMemo(() => (input.trim() ? getBankInfo(input) : null), [input])
  const shown = escapeForCode(input || examples.iban)

  const code = `import { validateIBAN, getBankInfo } from "pakdatakit";

validateIBAN("${shown}"); // → ${isValid}
getBankInfo("${shown}");
// → ${
    bank
      ? `{ code: "${bank.code}", name: "${bank.name}", type: "${bank.type}", active: ${bank.active}${bank.mergedInto ? `, mergedInto: "${bank.mergedInto}"` : ''}${bank.aliasOf ? `, aliasOf: "${bank.aliasOf}"` : ''} }`
      : 'null'
  }`

  return (
    <PlaygroundShell
      title="IBAN Validator"
      description="Validate Pakistani IBANs with the mod-97 checksum and see which bank issued them, what kind of bank it is and whether it still exists."
      input={
        <Card title="Input" description="24-character PK IBAN, with or without spaces.">
          <label htmlFor="iban-input" className="sr-only">
            IBAN
          </label>
          <input
            id="iban-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="PK36SCBL0000001123456702"
            spellCheck={false}
            className={monoInputClassName}
          />
          <p className="mt-2 text-xs text-text-muted">
            Try: PK36SCBL0000001123456702 · PK36 SCBL 0000 0011 2345 6702
          </p>
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Enter an IBAN to validate.</p>
          ) : (
            <>
              <div className="mb-4">
                <ResultBadge valid={isValid} />
              </div>
              <OutputRow label="Bank" value={bank?.name ?? ''} mono={false} emptyText="Unknown bank" />
              <OutputRow label="Bank code" value={bank?.code ?? ''} />
              <OutputRow label="Type" value={bank ? typeLabels[bank.type] : ''} mono={false} />
              <OutputRow
                label="Status"
                value={
                  bank
                    ? bank.mergedInto
                      ? `Merged into ${bank.mergedInto}`
                      : bank.aliasOf
                        ? `Active (older code of ${bank.aliasOf})`
                        : 'Active'
                    : ''
                }
                mono={false}
              />
            </>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
