import { useMemo, useState } from 'react'
import { parseVehiclePlate, validatePassport, validateVehiclePlate } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { escapeForCode, monoInputClassName } from '../utils/examples'

export function PassportPlatesPlayground() {
  const [passport, setPassport] = useState('AB1234567')
  const [plate, setPlate] = useState('LEA-1234-19')

  const passportValid = useMemo(() => validatePassport(passport), [passport])
  const parsed = useMemo(() => parseVehiclePlate(plate), [plate])
  const plateValid = useMemo(() => validateVehiclePlate(plate), [plate])

  const code = `import { validatePassport, parseVehiclePlate } from "pakdatakit";

validatePassport("${escapeForCode(passport)}"); // → ${passportValid}
parseVehiclePlate("${escapeForCode(plate)}");
// → ${parsed ? JSON.stringify(parsed) : 'null'}`

  return (
    <PlaygroundShell
      title="Passport & Vehicle Plates"
      description="Check the shape of a Pakistani passport number, and split a vehicle registration plate into series, number and year."
      input={
        <>
          <Card title="Passport number" description="Two letters and seven digits.">
            <label htmlFor="passport-input" className="sr-only">
              Passport number
            </label>
            <input
              id="passport-input"
              type="text"
              value={passport}
              onChange={(e) => setPassport(e.target.value)}
              placeholder="AB1234567"
              spellCheck={false}
              className={monoInputClassName}
            />
            <p className="mt-2 text-xs text-text-muted">Try: AB1234567 · ab 1234567 · A12345678</p>
          </Card>
          <Card
            title="Vehicle plate"
            description="1–4 letters, then 1–4 digits, with the optional year older Punjab plates carry."
          >
            <label htmlFor="plate-input" className="sr-only">
              Vehicle plate
            </label>
            <input
              id="plate-input"
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="LEA-1234-19"
              spellCheck={false}
              className={monoInputClassName}
            />
            <p className="mt-2 text-xs text-text-muted">Try: LEA-1234-19 · lea 1234 · ABC-123</p>
          </Card>
        </>
      }
      output={
        <Card title="Result">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-text-muted">Passport</span>
            <ResultBadge valid={passportValid} />
          </div>
          <div className="mt-4 mb-2 flex items-center justify-between">
            <span className="text-sm text-text-muted">Vehicle plate</span>
            <ResultBadge valid={plateValid} />
          </div>
          <OutputRow label="Series" value={parsed?.series ?? ''} />
          <OutputRow label="Number" value={parsed?.number ?? ''} />
          <OutputRow label="Year" value={parsed?.year ?? ''} />
          <OutputRow label="Formatted" value={parsed?.formatted ?? ''} />
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            DGIP does not publish the passport format, and each province sets its own plate format,
            so these check the common shape only.
          </p>
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
