import { useMemo, useState } from 'react'
import {
  getDistrictProvince,
  getPostOffice,
  getTehsilDistrict,
  getTehsils,
  searchPostOffices,
} from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultList } from '../components/ResultList'
import { escapeForCode, inputClassName, monoInputClassName } from '../utils/examples'

export function PostOfficesPlayground() {
  const [code, setCode] = useState('12380')
  const [query, setQuery] = useState('Chak')
  const [district, setDistrict] = useState('Lahore')
  const [tehsil, setTehsil] = useState('Raiwind')

  const office = useMemo(() => getPostOffice(code), [code])
  const offices = useMemo(
    () => (query.trim().length >= 2 ? searchPostOffices(query).slice(0, 50) : []),
    [query],
  )
  const tehsils = useMemo(() => getTehsils(district), [district])
  const tehsilDistrict = useMemo(() => getTehsilDistrict(tehsil), [tehsil])

  const preview = `import { getPostOffice, searchPostOffices, getTehsils, getTehsilDistrict } from "pakdatakit";

getPostOffice("${escapeForCode(code)}");
// → ${office ? JSON.stringify(office) : 'null'}
searchPostOffices("${escapeForCode(query)}").length; // → ${query.trim().length >= 2 ? searchPostOffices(query).length : 0}
getTehsils("${escapeForCode(district)}"); // → ${tehsils.length} tehsils
getTehsilDistrict("${escapeForCode(tehsil)}"); // → ${tehsilDistrict ? `"${tehsilDistrict}"` : 'null'}`

  return (
    <PlaygroundShell
      title="Post Offices & Tehsils"
      description="Every delivery post office in Pakistan Post's directory (about 2,560, including villages), and the tehsils of each district from the 2023 census."
      input={
        <>
          <Card title="Post office code" description="Five digits, including village offices.">
            <label htmlFor="po-code" className="sr-only">
              Post office code
            </label>
            <input
              id="po-code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="12380"
              className={monoInputClassName}
            />
            <p className="mt-2 text-xs text-text-muted">Try: 12380 · 47040 · 54000</p>
          </Card>
          <Card title="Search post offices" description="By office, town or district name.">
            <label htmlFor="po-search" className="sr-only">
              Search post offices
            </label>
            <input
              id="po-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chak"
              className={inputClassName}
            />
          </Card>
          <Card title="Tehsils" description="A district's tehsils, and the district of a tehsil.">
            <label htmlFor="district-input" className="mb-1 block text-xs text-text-muted">
              District
            </label>
            <input
              id="district-input"
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Lahore"
              className={inputClassName}
            />
            <label htmlFor="tehsil-input" className="mt-3 mb-1 block text-xs text-text-muted">
              Tehsil
            </label>
            <input
              id="tehsil-input"
              type="text"
              value={tehsil}
              onChange={(e) => setTehsil(e.target.value)}
              placeholder="Raiwind"
              className={inputClassName}
            />
          </Card>
        </>
      }
      output={
        <Card title="Result">
          <OutputRow label="Office" value={office?.office ?? ''} mono={false} />
          <OutputRow label="Town" value={office?.town ?? ''} mono={false} />
          <OutputRow label="District" value={office?.district ?? ''} mono={false} />
          <OutputRow label="Province" value={office?.province ?? ''} mono={false} />
          <ResultList
            label="Matching offices (first 50)"
            items={offices.map((o) => `${o.code} · ${o.office}, ${o.province}`)}
          />
          <ResultList label={`Tehsils of ${district || '…'}`} items={tehsils} />
          <OutputRow label="District of tehsil" value={tehsilDistrict ?? ''} mono={false} />
          <OutputRow
            label="Province of that district"
            value={tehsilDistrict ? (getDistrictProvince(tehsilDistrict) ?? '') : ''}
            mono={false}
          />
        </Card>
      }
      code={<CodePreview code={preview} />}
    />
  )
}
