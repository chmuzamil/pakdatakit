import { useMemo, useState } from 'react'
import { getCNICInfo, validateCNIC } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { escapeForCode, examples, monoInputClassName } from '../utils/examples'

export function CNICPlayground() {
  const [input, setInput] = useState<string>(examples.cnic)

  const isValid = useMemo(() => {
    if (!input.trim()) return false
    return validateCNIC(input)
  }, [input])

  const info = useMemo(() => (input.trim() ? getCNICInfo(input) : null), [input])
  const shown = escapeForCode(input || examples.cnic)

  const code = `import { validateCNIC, getCNICInfo } from "pakdatakit";

validateCNIC("${shown}"); // → ${isValid}
getCNICInfo("${shown}");
// → ${info ? `{ formatted: "${info.formatted}", province: "${info.province}", gender: "${info.gender}" }` : 'null'}`

  return (
    <PlaygroundShell
      title="CNIC Validator"
      description="Validate Pakistani CNIC numbers and read the province and gender they encode."
      input={
        <Card title="Input" description="13-digit CNIC with optional separators.">
          <label htmlFor="cnic-input" className="sr-only">
            CNIC number
          </label>
          <input
            id="cnic-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="35202-1234567-1"
            spellCheck={false}
            className={monoInputClassName}
          />
          <p className="mt-2 text-xs text-text-muted">
            Try: 35202-1234567-1 · 42101 1234567 2 · ۳۵۲۰۲-۱۲۳۴۵۶۷-۱
          </p>
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Enter a CNIC to validate.</p>
          ) : (
            <>
              <div className="mb-4">
                <ResultBadge valid={isValid} />
              </div>
              <OutputRow
                label="Formatted"
                value={info?.formatted ?? ''}
                emptyText="Invalid CNIC"
              />
              <OutputRow label="Province" value={info?.province ?? ''} mono={false} />
              <OutputRow
                label="Gender"
                value={info ? (info.gender === 'male' ? 'Male' : 'Female') : ''}
                mono={false}
              />
              {info && (
                <p className="mt-3 text-xs leading-relaxed text-text-muted">
                  The province is where the CNIC was first registered, not necessarily where the
                  holder lives now.
                </p>
              )}
            </>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
