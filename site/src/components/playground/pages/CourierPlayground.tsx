import { useMemo, useState } from 'react'
import { mapCourierStatus, normalizeCityForCourier } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { escapeForCode, inputClassName } from '../utils/examples'

const samples = ['LHR', 'Khi', 'Pindi', 'lyallpur', 'Karachi City', 'لاہور', 'Atlantis']

export function CourierPlayground() {
  const [city, setCity] = useState('Pindi')
  const [courier, setCourier] = useState('PostEx')
  const [status, setStatus] = useState('Delivered')

  const normalized = useMemo(() => normalizeCityForCourier(city), [city])
  const mapped = useMemo(() => mapCourierStatus(courier, status), [courier, status])

  const code = `import { normalizeCityForCourier, mapCourierStatus } from "pakdatakit";

normalizeCityForCourier("${escapeForCode(city)}"); // → ${normalized ? `"${normalized}"` : 'null'}
mapCourierStatus("${escapeForCode(courier)}", "${escapeForCode(status)}"); // → ${mapped ? `"${mapped}"` : 'null'}`

  return (
    <PlaygroundShell
      title="Courier Cities"
      description="Match the short forms, old names and Urdu spellings customers type to the city list, and map a courier's own status to one vocabulary. No courier API is called."
      input={
        <>
          <div
            role="note"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-text-heading"
          >
            <strong>Experimental.</strong> The status mapping may change in a minor release as more
            couriers' lists are added.
          </div>
          <Card title="City as typed">
            <label htmlFor="courier-city" className="sr-only">
              City as typed
            </label>
            <input
              id="courier-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClassName}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {samples.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCity(s)}
                  className="rounded border border-border px-2 py-0.5 text-xs text-text-muted hover:border-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
          <Card title="Courier status" description="PostEx order statuses and tracking codes, and Leopards' returns.">
            <label htmlFor="courier-name" className="mb-1 block text-xs text-text-muted">
              Courier
            </label>
            <select
              id="courier-name"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className={inputClassName}
            >
              {['PostEx', 'Leopards', 'TCS', 'M&P', 'Trax', 'BlueEx'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <label htmlFor="courier-status" className="mt-3 mb-1 block text-xs text-text-muted">
              Status as the courier reports it
            </label>
            <input
              id="courier-status"
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClassName}
            />
          </Card>
        </>
      }
      output={
        <Card title="Result">
          <OutputRow label="City" value={normalized ?? ''} mono={false} emptyText="Not recognised" />
          <OutputRow label="Status" value={mapped ?? ''} emptyText="Not recognised" />
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
