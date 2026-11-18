import { useMemo, useState } from 'react'
import {
  getDistrictProvince,
  getDistrictsByProvince,
  getProvince,
  searchCities,
  searchDistricts,
} from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultList } from '../components/ResultList'
import { TabBar } from '../components/TabBar'
import { escapeForCode, examples, inputClassName } from '../utils/examples'

type GeoMode = 'cities' | 'districts' | 'province'

export function GeoPlayground() {
  const [mode, setMode] = useState<GeoMode>('cities')
  const [input, setInput] = useState<string>(examples.city)

  const province = useMemo(() => {
    if (!input.trim()) return null
    return mode === 'districts' ? getDistrictProvince(input) : getProvince(input)
  }, [input, mode])

  const cities = useMemo(() => {
    if (!input.trim() || mode !== 'cities') return []
    return searchCities(input)
  }, [input, mode])

  const districts = useMemo(() => {
    if (!input.trim()) return []
    return mode === 'districts' ? searchDistricts(input) : getDistrictsByProvince(input)
  }, [input, mode])

  const placeholder =
    mode === 'cities' ? 'Lahore' : mode === 'districts' ? 'Lahore' : 'Punjab'

  const codeByMode: Record<GeoMode, string> = {
    cities: `import { getProvince, searchCities } from "pakdatakit";

getProvince("${escapeForCode(input || examples.city)}");   // → ${province ? `"${province}"` : 'null'}
searchCities("${escapeForCode(input || examples.city)}"); // → [${cities.slice(0, 3).map((c) => `"${c}"`).join(', ')}${cities.length > 3 ? ', ...' : ''}]`,
    districts: `import { getDistrictProvince, searchDistricts } from "pakdatakit";

getDistrictProvince("${escapeForCode(input || examples.district)}"); // → ${province ? `"${province}"` : 'null'}
searchDistricts("${escapeForCode(input || examples.district)}");     // → [${districts.slice(0, 3).map((d) => `"${d}"`).join(', ')}${districts.length > 3 ? ', ...' : ''}]`,
    province: `import { getDistrictsByProvince } from "pakdatakit";

getDistrictsByProvince("${escapeForCode(input || examples.province)}"); // → [${districts.slice(0, 3).map((d) => `"${d}"`).join(', ')}${districts.length > 3 ? ', ...' : ''}]`,
  }

  function handleModeChange(next: GeoMode) {
    setMode(next)
    if (next === 'cities') setInput(examples.city)
    else if (next === 'districts') setInput(examples.district)
    else setInput(examples.province)
  }

  return (
    <PlaygroundShell
      title="Geo Lookup"
      description="Look up provinces, search cities and districts, or list districts by province."
      input={
        <Card title="Input">
          <TabBar
            tabs={[
              { id: 'cities', label: 'Cities' },
              { id: 'districts', label: 'Districts' },
              { id: 'province', label: 'By Province' },
            ]}
            active={mode}
            onChange={handleModeChange}
          />
          <label htmlFor="geo-input" className="sr-only">
            Geo search input
          </label>
          <input
            id="geo-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className={`${inputClassName} mt-3`}
          />
          <p className="mt-2 text-xs text-text-muted">
            {mode === 'cities' && 'Try: Lahore · Karachi · Islam'}
            {mode === 'districts' && 'Try: Lahore · Multan · Rawalpindi'}
            {mode === 'province' && 'Try: Punjab · Sindh · Khyber Pakhtunkhwa'}
          </p>
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Enter a value to search.</p>
          ) : (
            <>
              {mode !== 'province' && (
                <OutputRow label="Province" value={province ?? ''} mono={false} />
              )}
              {mode === 'cities' && (
                <ResultList label="Matching cities" items={cities} emptyText="No matching cities found." />
              )}
              {mode === 'districts' && (
                <ResultList
                  label="Matching districts"
                  items={districts}
                  emptyText="No matching districts found."
                />
              )}
              {mode === 'province' && (
                <ResultList
                  label="Districts"
                  items={districts}
                  emptyText="No districts found for this province."
                />
              )}
            </>
          )}
        </Card>
      }
      code={<CodePreview code={codeByMode[mode]} />}
    />
  )
}
