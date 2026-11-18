import { useMemo, useState } from 'react'
import {
  getCityByPostalCode,
  getPostalAreas,
  getPostalCode,
  getPostalCodes,
  searchPostalCodes,
} from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultList } from '../components/ResultList'
import { TabBar } from '../components/TabBar'
import { escapeForCode, examples, inputClassName } from '../utils/examples'

type PostalMode = 'city' | 'code' | 'search'

export function PostalPlayground() {
  const [mode, setMode] = useState<PostalMode>('city')
  const [input, setInput] = useState<string>(examples.city)

  const cityByCode = useMemo(() => {
    if (!input.trim() || mode !== 'code') return null
    return getCityByPostalCode(input)
  }, [input, mode])

  const primaryCode = useMemo(() => {
    if (!input.trim() || mode !== 'city') return null
    return getPostalCode(input)
  }, [input, mode])

  const allCodes = useMemo(() => {
    if (!input.trim() || mode !== 'city') return []
    return getPostalCodes(input)
  }, [input, mode])

  const areas = useMemo(() => {
    if (!input.trim() || mode !== 'city') return []
    return getPostalAreas(input)
  }, [input, mode])

  const searchResults = useMemo(() => {
    if (!input.trim() || mode !== 'search') return []
    return searchPostalCodes(input)
  }, [input, mode])

  const placeholder =
    mode === 'city' ? 'Lahore' : mode === 'code' ? '54000' : 'Karachi'

  const codeByMode: Record<PostalMode, string> = {
    city: `import { getPostalCode, getPostalCodes, getPostalAreas } from "pakdatakit";

getPostalCode("${escapeForCode(input || examples.city)}");   // → ${primaryCode ? `"${primaryCode}"` : 'null'}
getPostalCodes("${escapeForCode(input || examples.city)}"); // → [${allCodes.slice(0, 3).map((c) => `"${c}"`).join(', ')}${allCodes.length > 3 ? ', ...' : ''}]
getPostalAreas("${escapeForCode(input || examples.city)}");  // → [${areas.slice(0, 3).map((a) => `"${a}"`).join(', ')}${areas.length > 3 ? ', ...' : ''}]`,
    code: `import { getCityByPostalCode } from "pakdatakit";

getCityByPostalCode("${escapeForCode(input || examples.postalCode)}"); // → ${cityByCode ? `"${cityByCode}"` : 'null'}`,
    search: `import { searchPostalCodes } from "pakdatakit";

searchPostalCodes("${escapeForCode(input || examples.city)}"); // → [${searchResults.slice(0, 3).map((c) => `"${c}"`).join(', ')}${searchResults.length > 3 ? ', ...' : ''}]`,
  }

  function handleModeChange(next: PostalMode) {
    setMode(next)
    if (next === 'code') setInput(examples.postalCode)
    else setInput(examples.city)
  }

  return (
    <PlaygroundShell
      title="Postal Codes"
      description="Look up postal codes by city, find cities by code, or search postal entries."
      input={
        <Card title="Input">
          <TabBar
            tabs={[
              { id: 'city', label: 'By City' },
              { id: 'code', label: 'By Code' },
              { id: 'search', label: 'Search' },
            ]}
            active={mode}
            onChange={handleModeChange}
          />
          <label htmlFor="postal-input" className="sr-only">
            Postal lookup input
          </label>
          <input
            id="postal-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className={`${inputClassName} mt-3`}
          />
          <p className="mt-2 text-xs text-text-muted">
            {mode === 'city' && 'Try: Lahore · Karachi · Multan'}
            {mode === 'code' && 'Try: 54000 · 74200 · 60000'}
            {mode === 'search' && 'Try: Karachi · 54 · Gulberg'}
          </p>
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Enter a value to look up.</p>
          ) : (
            <>
              {mode === 'city' && (
                <>
                  <OutputRow label="Primary code" value={primaryCode ?? ''} />
                  <ResultList label="All codes" items={allCodes} emptyText="No postal codes found." />
                  <ResultList label="Areas" items={areas} emptyText="No areas found." />
                </>
              )}
              {mode === 'code' && (
                <OutputRow label="City" value={cityByCode ?? ''} mono={false} />
              )}
              {mode === 'search' && (
                <ResultList label="Matching codes" items={searchResults} />
              )}
            </>
          )}
        </Card>
      }
      code={<CodePreview code={codeByMode[mode]} />}
    />
  )
}
