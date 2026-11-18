import { useMemo, useState } from 'react'
import { analyzeNTN, validateSTRN } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { escapeForCode, monoInputClassName } from '../utils/examples'

export function TaxPlayground() {
  const [ntn, setNtn] = useState('0622438-9')
  const [strn, setStrn] = useState('17-00-3761-882-19')

  const ntnInfo = useMemo(() => (ntn.trim() ? analyzeNTN(ntn) : null), [ntn])
  const strnValid = useMemo(() => strn.trim() !== '' && validateSTRN(strn), [strn])

  const code = `import { analyzeNTN, validateSTRN } from "pakdatakit";

analyzeNTN("${escapeForCode(ntn)}");
// → ${ntnInfo ? `{ type: "${ntnInfo.type}", formatted: "${ntnInfo.formatted}" }` : 'null'}
validateSTRN("${escapeForCode(strn)}"); // → ${strnValid}`

  return (
    <PlaygroundShell
      title="NTN & STRN"
      description="Check the format of FBR National Tax Numbers and Sales Tax Registration Numbers."
      input={
        <>
          <Card
            title="NTN"
            description="A CNIC for individuals, or 7 digits (plus optional check digit) for companies and AOPs."
          >
            <label htmlFor="ntn-input" className="sr-only">
              NTN
            </label>
            <input
              id="ntn-input"
              type="text"
              value={ntn}
              onChange={(e) => setNtn(e.target.value)}
              placeholder="0622438-9"
              spellCheck={false}
              className={monoInputClassName}
            />
            <p className="mt-2 text-xs text-text-muted">Try: 0622438-9 · 0622438 · 35202-1234567-1</p>
          </Card>
          <Card title="STRN" description="13 digits, with optional dashes or spaces.">
            <label htmlFor="strn-input" className="sr-only">
              STRN
            </label>
            <input
              id="strn-input"
              type="text"
              value={strn}
              onChange={(e) => setStrn(e.target.value)}
              placeholder="17-00-3761-882-19"
              spellCheck={false}
              className={monoInputClassName}
            />
          </Card>
        </>
      }
      output={
        <Card title="Result">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-text-muted">NTN</span>
            <ResultBadge valid={ntnInfo !== null} />
          </div>
          <OutputRow
            label="Type"
            value={ntnInfo ? (ntnInfo.type === 'individual' ? 'Individual (CNIC)' : 'Business') : ''}
            mono={false}
          />
          <OutputRow label="Formatted" value={ntnInfo?.formatted ?? ''} />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-text-muted">STRN</span>
            <ResultBadge valid={strnValid} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            FBR does not publish its check-digit algorithms, so these check the format only.
          </p>
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
