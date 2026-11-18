import { useMemo, useState } from 'react'
import { amountInWords, formatLakh, formatPKR } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { CopyButton } from '../components/CopyButton'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { examples, monoInputClassName } from '../utils/examples'

export function CurrencyPlayground() {
  const [input, setInput] = useState(String(examples.amount))

  const amount = useMemo(() => {
    const parsed = Number(input.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : NaN
  }, [input])

  const pkr = useMemo(() => {
    if (!input.trim() || Number.isNaN(amount)) return ''
    return formatPKR(amount)
  }, [input, amount])

  const lakh = useMemo(() => {
    if (!input.trim() || Number.isNaN(amount)) return ''
    return formatLakh(amount)
  }, [input, amount])

  const words = useMemo(() => {
    if (!input.trim() || Number.isNaN(amount) || amount < 0) return null
    return {
      en: amountInWords(amount),
      cheque: amountInWords(amount, { cheque: true }),
      ur: amountInWords(amount, { language: 'ur' }),
    }
  }, [input, amount])

  const hasError = input.trim() !== '' && Number.isNaN(amount)
  const shown = Number.isNaN(amount) ? 0 : amount

  const code = `import { formatPKR, formatLakh, amountInWords } from "pakdatakit";

formatPKR(${shown});  // → "${pkr || 'Rs. 0'}"
formatLakh(${shown}); // → "${lakh || 'Rs. 0'}"
${
  words
    ? `amountInWords(${shown});
// → "${words.en}"
amountInWords(${shown}, { cheque: true });
// → "${words.cheque}"
amountInWords(${shown}, { language: "ur" });
// → "${words.ur}"`
    : '// amountInWords() needs an amount of zero or more'
}`

  return (
    <PlaygroundShell
      title="Currency & Amount in Words"
      description="Format Pakistani Rupee amounts with lakh/crore conventions and write them in words for cheques, in English and Urdu."
      input={
        <Card title="Input" description="Amount in PKR (numeric).">
          <label htmlFor="amount-input" className="sr-only">
            Amount in PKR
          </label>
          <input
            id="amount-input"
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="2500000"
            className={`${monoInputClassName} ${hasError ? 'border-error hover:border-error' : ''}`}
          />
          {hasError ? (
            <p className="mt-2 text-xs text-error">Enter a valid numeric amount.</p>
          ) : (
            <p className="mt-2 text-xs text-text-muted">
              Try: 150000 · 2500000 · 10000000
            </p>
          )}
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Enter an amount to format.</p>
          ) : hasError ? (
            <p className="text-sm text-error">Invalid number — check your input.</p>
          ) : (
            <>
              <OutputRow label="formatPKR()" value={pkr} />
              <OutputRow label="formatLakh()" value={lakh} />
              {words && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <p className="text-xs font-semibold tracking-wider text-text-muted uppercase">
                    In words
                  </p>
                  <WordsBlock label="English" text={words.en} />
                  <WordsBlock label="Cheque" text={words.cheque} />
                  <WordsBlock label="Urdu" text={words.ur} rtl />
                </div>
              )}
            </>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}

function WordsBlock({ label, text, rtl = false }: { label: string; text: string; rtl?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <CopyButton value={text} />
      </div>
      <p
        dir={rtl ? 'rtl' : undefined}
        lang={rtl ? 'ur' : undefined}
        className={`text-sm leading-relaxed text-text-heading ${rtl ? 'text-right text-base' : ''}`}
      >
        {text}
      </p>
    </div>
  )
}
