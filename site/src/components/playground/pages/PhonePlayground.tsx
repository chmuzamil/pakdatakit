import { useMemo, useState } from 'react'
import { analyzePhone } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { escapeForCode, examples, monoInputClassName } from '../utils/examples'

const networkColors: Record<string, string> = {
  Jazz: 'text-emerald-400',
  Zong: 'text-purple-400',
  Telenor: 'text-sky-400',
  Ufone: 'text-orange-400',
  Unknown: 'text-text-muted',
}

export function PhonePlayground() {
  const [input, setInput] = useState<string>(examples.phone)

  const analysis = useMemo(() => {
    if (!input.trim()) return null
    return analyzePhone(input)
  }, [input])

  const code = `import { analyzePhone } from "pakdatakit";

analyzePhone("${escapeForCode(input || examples.phone)}");
// → { valid: ${analysis?.valid ?? false}, formatted: ${analysis?.formatted ? `"${analysis.formatted}"` : 'null'}, network: "${analysis?.network ?? 'Unknown'}" }`

// Or use individual helpers:
// validatePhone(), formatPhone(), getNetwork()`

  return (
    <PlaygroundShell
      title="Phone Analyzer"
      description="Validate Pakistani mobile numbers, format to E.164, and detect the issuing network."
      input={
        <Card title="Input" description="Local, international, or short format.">
          <label htmlFor="phone-input" className="sr-only">
            Phone number
          </label>
          <input
            id="phone-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="03001234567"
            spellCheck={false}
            className={monoInputClassName}
          />
          <p className="mt-2 text-xs text-text-muted">
            Try: 03001234567 · +923001234567 · 3001234567
          </p>
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() || !analysis ? (
            <p className="text-sm text-text-muted">Enter a phone number to analyze.</p>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <ResultBadge valid={analysis.valid} />
                {analysis.valid && (
                  <span className={`text-sm font-medium ${networkColors[analysis.network]}`}>
                    {analysis.network}
                  </span>
                )}
              </div>
              <OutputRow label="Formatted" value={analysis.formatted ?? ''} />
              <OutputRow label="Network" value={analysis.valid ? analysis.network : ''} mono={false} />
            </>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
