import { useMemo, useState } from 'react'
import { formatHijri, getHijriMonthName, isRamadan, toHijri } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { TabBar } from '../components/TabBar'
import { examples, inputClassName, parseDateInput } from '../utils/examples'

const offsetTabs = [
  { id: '-2', label: '−2' },
  { id: '-1', label: '−1' },
  { id: '0', label: '0' },
  { id: '1', label: '+1' },
  { id: '2', label: '+2' },
] as const

type OffsetId = (typeof offsetTabs)[number]['id']

export function HijriPlayground() {
  const [input, setInput] = useState<string>(examples.hijriDate)
  const [offsetId, setOffsetId] = useState<OffsetId>('0')
  const offset = Number(offsetId)

  const date = useMemo(() => parseDateInput(input), [input])
  const hasError = input.trim() !== '' && date === null

  const hijri = useMemo(() => (date ? toHijri(date, { offset }) : null), [date, offset])
  const formatted = useMemo(() => (date ? formatHijri(date, { offset }) : ''), [date, offset])
  const monthName = useMemo(
    () => (hijri ? (getHijriMonthName(hijri.month) ?? '') : ''),
    [hijri],
  )
  const ramadan = useMemo(() => (date ? isRamadan(date, { offset }) : false), [date, offset])

  const optionsCode = offset === 0 ? '' : `, { offset: ${offset} }`
  const [y, m, d] = (date ? input : examples.hijriDate).split('-').map(Number)

  const code = `import { toHijri, formatHijri, getHijriMonthName, isRamadan } from "pakdatakit";

const date = new Date(${y}, ${(m ?? 1) - 1}, ${d});
toHijri(date${optionsCode});     // → { year: ${hijri?.year ?? 0}, month: ${hijri?.month ?? 0}, day: ${hijri?.day ?? 0} }
formatHijri(date${optionsCode}); // → "${formatted || ''}"
getHijriMonthName(${hijri?.month ?? 0}); // → "${monthName || ''}"
isRamadan(date${optionsCode});   // → ${ramadan}`

  return (
    <PlaygroundShell
      title="Hijri Calendar"
      description="Convert Gregorian dates to Hijri, format Islamic dates, and check for Ramadan."
      input={
        <>
          <Card title="Input" description="Gregorian date (YYYY-MM-DD).">
            <label htmlFor="hijri-date" className="sr-only">
              Gregorian date
            </label>
            <input
              id="hijri-date"
              type="date"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={inputClassName}
            />
            {hasError && (
              <p className="mt-2 text-xs text-error">Enter a valid date in YYYY-MM-DD format.</p>
            )}
          </Card>
          <Card
            title="Moon-sighting offset"
            description="Shift the tabular calendar by whole days to match the date announced in Pakistan."
          >
            <TabBar tabs={offsetTabs} active={offsetId} onChange={setOffsetId} />
          </Card>
        </>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Pick a date to convert.</p>
          ) : hasError ? (
            <p className="text-sm text-error">Invalid date — check your input.</p>
          ) : (
            <>
              <div className="mb-4">
                <ResultBadge valid={ramadan} validLabel="Ramadan" invalidLabel="Not Ramadan" />
              </div>
              <OutputRow
                label="Hijri"
                value={hijri ? `${hijri.day} / ${hijri.month} / ${hijri.year}` : ''}
              />
              <OutputRow label="formatHijri()" value={formatted} mono={false} />
              <OutputRow label="Month" value={monthName} mono={false} />
            </>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
