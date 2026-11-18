import { useMemo, useState } from 'react'
import {
  normalizeRomanUrdu,
  normalizeText,
  toEnglishDigits,
  toUrduDigits,
} from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { TabBar } from '../components/TabBar'
import { escapeForCode, examples, inputClassName } from '../utils/examples'

type TextMode = 'normalize' | 'roman' | 'digits'

export function TextPlayground() {
  const [mode, setMode] = useState<TextMode>('normalize')
  const [input, setInput] = useState<string>(
    mode === 'roman' ? examples.romanUrdu : mode === 'digits' ? '0300 ۱۲۳۴۵۶۷' : examples.text,
  )

  const output = useMemo(() => {
    if (!input.trim()) return ''
    switch (mode) {
      case 'normalize':
        return normalizeText(input)
      case 'roman':
        return normalizeRomanUrdu(input)
      case 'digits':
        return toUrduDigits(input)
      default:
        return ''
    }
  }, [input, mode])

  const englishDigits = useMemo(() => {
    if (!input.trim() || mode !== 'digits') return ''
    return toEnglishDigits(input)
  }, [input, mode])

  const codeByMode: Record<TextMode, string> = {
    normalize: `import { normalizeText } from "pakdatakit";

normalizeText("${escapeForCode(input || examples.text)}"); // → "${escapeForCode(output || '')}"`,
    roman: `import { normalizeRomanUrdu } from "pakdatakit";

normalizeRomanUrdu("${escapeForCode(input || examples.romanUrdu)}"); // → "${escapeForCode(output || '')}"`,
    digits: `import { toUrduDigits, toEnglishDigits } from "pakdatakit";

toUrduDigits("${escapeForCode(input || '0300 ۱۲۳۴۵۶۷')}");    // → "${escapeForCode(output || '')}"
toEnglishDigits("${escapeForCode(input || '0300 ۱۲۳۴۵۶۷')}"); // → "${escapeForCode(englishDigits || '')}"`,
  }

  function handleModeChange(next: TextMode) {
    setMode(next)
    if (next === 'normalize') setInput(examples.text)
    else if (next === 'roman') setInput(examples.romanUrdu)
    else setInput('0300 ۱۲۳۴۵۶۷')
  }

  return (
    <PlaygroundShell
      title="Text Utils"
      description="Normalize text, Roman Urdu spellings, and convert between English and Urdu digits."
      input={
        <Card title="Input">
          <TabBar
            tabs={[
              { id: 'normalize', label: 'Normalize' },
              { id: 'roman', label: 'Roman Urdu' },
              { id: 'digits', label: 'Digits' },
            ]}
            active={mode}
            onChange={handleModeChange}
          />
          <label htmlFor="text-input" className="sr-only">
            Text input
          </label>
          <input
            id="text-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'roman' ? 'ap kia ker rhe ho' : mode === 'digits' ? '0300 ۱۲۳۴۵۶۷' : '  Hello   World  '
            }
            className={`${inputClassName} mt-3`}
          />
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Enter text to transform.</p>
          ) : mode === 'digits' ? (
            <>
              <OutputRow label="toUrduDigits()" value={output} />
              <OutputRow label="toEnglishDigits()" value={englishDigits} />
            </>
          ) : (
            <OutputRow
              label={mode === 'normalize' ? 'normalizeText()' : 'normalizeRomanUrdu()'}
              value={output}
              mono={false}
            />
          )}
        </Card>
      }
      code={<CodePreview code={codeByMode[mode]} />}
    />
  )
}
