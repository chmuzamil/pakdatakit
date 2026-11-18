import { useMemo, useState } from 'react'
import { createFaker, PROVINCES, type Business, type Person } from 'pakdatakit-faker'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { CopyButton } from '../components/CopyButton'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { TabBar } from '../components/TabBar'
import { inputClassName, monoInputClassName } from '../utils/examples'

const kinds = [
  { id: 'person', label: 'Person' },
  { id: 'business', label: 'Business' },
] as const

type Kind = (typeof kinds)[number]['id']

const counts = [1, 10, 50] as const

function toCsv(rows: Array<Person | Business>): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0]!) as Array<keyof (Person | Business)>
  const cell = (value: unknown) => {
    const text = value == null ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [keys.join(','), ...rows.map((row) => keys.map((key) => cell(row[key])).join(','))].join(
    '\n',
  )
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function FakerPlayground() {
  const [kind, setKind] = useState<Kind>('person')
  const [seed, setSeed] = useState('42')
  const [province, setProvince] = useState('')
  const [gender, setGender] = useState('')
  const [count, setCount] = useState<(typeof counts)[number]>(1)

  const rows = useMemo(() => {
    const faker = createFaker({ seed: seed.trim() || 0 })
    const options = province ? { province: province as Person['province'] } : {}
    return faker.many(count, () =>
      kind === 'person'
        ? faker.person({ ...options, ...(gender ? { gender: gender as Person['gender'] } : {}) })
        : faker.business(options),
    ) as Array<Person | Business>
  }, [kind, seed, province, gender, count])

  const first = rows[0]
  const json = JSON.stringify(count === 1 ? first : rows, null, 2)
  const optionCode = [
    province ? `province: "${province}"` : '',
    kind === 'person' && gender ? `gender: "${gender}"` : '',
  ]
    .filter(Boolean)
    .join(', ')

  const code = `import { createFaker } from "pakdatakit-faker";

const faker = createFaker({ seed: ${JSON.stringify(seed.trim() || '0')} });
${count === 1 ? `faker.${kind}(${optionCode ? `{ ${optionCode} }` : ''});` : `faker.many(${count}, () => faker.${kind}(${optionCode ? `{ ${optionCode} }` : ''}));`}

// Same seed → same data, on every machine.
// Every CNIC, phone and IBAN passes pakdatakit's validators.`

  return (
    <PlaygroundShell
      title="Mock Data (Faker)"
      description="Generate realistic Pakistani test data where everything fits together: the CNIC matches the province and gender, and the city, postal code, area code and bank all agree."
      input={
        <>
          <TabBar tabs={kinds} active={kind} onChange={setKind} />
          <Card title="Options">
            <div className="space-y-3">
              <label className="block text-sm text-text-muted">
                Seed
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  spellCheck={false}
                  className={`${monoInputClassName} mt-1`}
                />
              </label>
              <label className="block text-sm text-text-muted">
                Province
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={`${inputClassName} mt-1`}
                >
                  <option value="">Any</option>
                  {PROVINCES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {kind === 'person' && (
                <label className="block text-sm text-text-muted">
                  Gender
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={`${inputClassName} mt-1`}
                  >
                    <option value="">Any</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                Records:
                {counts.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      count === n
                        ? 'bg-accent-muted text-accent'
                        : 'border border-border text-text-muted hover:text-text-heading'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSeed(String(Math.floor(Math.random() * 1_000_000)))}
                className="rounded-md border border-border px-3 py-2 text-sm text-text-heading hover:border-accent hover:text-accent"
              >
                New random seed
              </button>
            </div>
          </Card>
          <Card title="Test data only">
            <p className="text-xs leading-relaxed text-text-muted">
              Pakistan has no reserved test ranges, so a generated CNIC, phone number or IBAN may
              belong to a real person. Never call or message generated numbers, and never use
              generated IBANs with real payment providers. Emails use reserved test domains only.
            </p>
          </Card>
        </>
      }
      output={
        <Card title={count === 1 ? `Generated ${kind}` : `${rows.length} ${kind} records`}>
          {count === 1 && first ? (
            <>
              {Object.entries(first).map(([key, value]) => (
                <OutputRow
                  key={key}
                  label={key}
                  value={value == null ? '' : String(value)}
                  mono={/cnic|phone|iban|ntn|strn|landline|uan|postal/i.test(key)}
                />
              ))}
            </>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {rows.map((row, index) => (
                <li key={index} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span className="text-text-heading">{row.name}</span>
                  <span className="truncate text-xs text-text-muted">{row.city}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton value={json} label="Copy JSON" />
            <button
              type="button"
              onClick={() => download(`pakdatakit-${kind}-${seed || 0}.csv`, toCsv(rows))}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:border-accent hover:text-accent"
            >
              Download CSV
            </button>
          </div>
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
