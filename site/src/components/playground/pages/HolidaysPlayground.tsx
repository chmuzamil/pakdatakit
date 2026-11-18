import { useMemo, useState } from 'react'
import { getPakistanHolidays, isPakistanHoliday } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { inputClassName } from '../utils/examples'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 9 }, (_, i) => currentYear - 6 + i)

function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function HolidaysPlayground() {
  const [year, setYear] = useState(currentYear)
  const [christian, setChristian] = useState(false)
  const [checkDate, setCheckDate] = useState(() => {
    const now = new Date()
    return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((n, i) => String(n).padStart(i === 0 ? 4 : 2, '0'))
      .join('-')
  })

  const holidays = useMemo(
    () => getPakistanHolidays(year, { includeChristianHolidays: christian }),
    [year, christian],
  )
  const isHoliday = useMemo(
    () => (checkDate ? isPakistanHoliday(checkDate) : false),
    [checkDate],
  )

  const code = `import { getPakistanHolidays, isPakistanHoliday } from "pakdatakit";

getPakistanHolidays(${year}${christian ? ', { includeChristianHolidays: true }' : ''});
// → ${holidays.length} holidays
isPakistanHoliday("${checkDate}"); // → ${isHoliday}`

  return (
    <PlaygroundShell
      title="Public Holidays"
      description="Pakistan's federal public holidays, using the Eid, Ashura and Milad dates actually observed after moon sighting."
      input={
        <>
          <Card title="Year">
            <select
              aria-label="Year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={inputClassName}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <label className="mt-3 flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={christian}
                onChange={(e) => setChristian(e.target.checked)}
              />
              Include 26 December (Christians only)
            </label>
          </Card>
          <Card title="Check a date">
            <input
              aria-label="Date"
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className={inputClassName}
            />
            {checkDate && (
              <div className="mt-3">
                <ResultBadge valid={isHoliday} validLabel="Public holiday" invalidLabel="Working day" />
              </div>
            )}
          </Card>
        </>
      }
      output={
        <Card title={`Holidays in ${year}`}>
          <ul className="divide-y divide-border">
            {holidays.map((holiday) => (
              <li
                key={`${holiday.id}-${holiday.date}`}
                className="flex items-center justify-between gap-4 py-2"
              >
                <span className="text-sm text-text-heading">
                  {holiday.name}
                  {holiday.estimated && (
                    <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] tracking-wide text-text-muted uppercase">
                      estimated
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-xs text-text-muted">
                  {formatDay(holiday.date)}
                </span>
              </li>
            ))}
          </ul>
          {holidays.some((h) => h.estimated) && (
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              Estimated dates come from the Hijri calendar. The actual dates depend on the
              moon-sighting announcement.
            </p>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
