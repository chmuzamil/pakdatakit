import { useState } from 'react'
import type { InputState } from 'pakdatakit'
import { CNICInput, IBANInput, PhoneInput } from 'pakdatakit-react'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { monoInputClassName } from '../utils/examples'

interface FieldState {
  value: string
  state: InputState
  detail: string
}

const empty: FieldState = { value: '', state: 'empty', detail: '' }

const stateStyles: Record<InputState, string> = {
  empty: 'text-text-muted',
  incomplete: 'text-text-muted',
  valid: 'text-success',
  invalid: 'text-error',
}

const stateLabels: Record<InputState, string> = {
  empty: 'Empty',
  incomplete: 'Keep typing…',
  valid: 'Valid',
  invalid: 'Invalid',
}

function inputClass(state: InputState): string {
  return `${monoInputClassName} ${state === 'invalid' ? 'border-error focus:border-error' : ''}`
}

function Status({ id, field }: { id: string; field: FieldState }) {
  return (
    <p id={id} className={`mt-2 text-xs ${stateStyles[field.state]}`} aria-live="polite">
      {stateLabels[field.state]}
      {field.detail ? ` · ${field.detail}` : ''}
    </p>
  )
}

export function FormInputsPlayground() {
  const [cnic, setCnic] = useState<FieldState>(empty)
  const [phone, setPhone] = useState<FieldState>(empty)
  const [iban, setIban] = useState<FieldState>(empty)

  const code = `import { CNICInput, PhoneInput, IBANInput } from "pakdatakit-react";

<CNICInput
  onValueChange={(value, state, info) => {
    // value: "${cnic.value}"
    // state: "${cnic.state}"${cnic.state === 'valid' ? `\n    // info: { province, gender, … }` : ''}
  }}
  aria-describedby="cnic-help"
/>

// Not using React? The same helpers are in pakdatakit:
import { formatCNICInput, checkCNICInput } from "pakdatakit/input";`

  return (
    <PlaygroundShell
      title="Form Inputs"
      description="Fields that format as you type and only show an error when the value can no longer become valid. Built with the pakdatakit-react components."
      input={
        <>
          <Card title="CNIC" description="Dashes are added for you. Try starting with 0.">
            <label htmlFor="form-cnic" className="sr-only">
              CNIC
            </label>
            <CNICInput
              id="form-cnic"
              placeholder="35202-1234567-1"
              aria-describedby="form-cnic-status"
              className={inputClass(cnic.state)}
              onValueChange={(value, state, info) =>
                setCnic({
                  value,
                  state,
                  detail: info ? `${info.province}, ${info.gender}` : '',
                })
              }
            />
            <Status id="form-cnic-status" field={cnic} />
          </Card>
          <Card title="Mobile number" description="Local or +92. Try 0360 (not allocated).">
            <label htmlFor="form-phone" className="sr-only">
              Mobile number
            </label>
            <PhoneInput
              id="form-phone"
              placeholder="0300-1234567"
              aria-describedby="form-phone-status"
              className={inputClass(phone.state)}
              onValueChange={(value, state, info) =>
                setPhone({
                  value,
                  state,
                  detail: info?.formatted ? `${info.formatted} · ${info.network}` : '',
                })
              }
            />
            <Status id="form-phone-status" field={phone} />
          </Card>
          <Card title="IBAN" description="Grouped in fours and uppercased as you type.">
            <label htmlFor="form-iban" className="sr-only">
              IBAN
            </label>
            <IBANInput
              id="form-iban"
              placeholder="PK36 SCBL 0000 0011 2345 6702"
              aria-describedby="form-iban-status"
              className={inputClass(iban.state)}
              onValueChange={(value, state, bank) =>
                setIban({ value, state, detail: bank ?? '' })
              }
            />
            <Status id="form-iban-status" field={iban} />
          </Card>
        </>
      }
      output={
        <Card title="Why this matters">
          <ul className="space-y-2 text-sm leading-relaxed text-text-muted">
            <li>
              <strong className="text-text-heading">No early errors.</strong> A half-typed CNIC is
              “incomplete”, not “invalid”, so users aren’t told off mid-way.
            </li>
            <li>
              <strong className="text-text-heading">Instant real errors.</strong> A CNIC starting
              with 0, a mobile prefix no operator uses, or a non-PK IBAN is flagged straight away.
            </li>
            <li>
              <strong className="text-text-heading">Cursor stays put.</strong> Editing in the middle
              or deleting a dash keeps the caret where you expect.
            </li>
          </ul>
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
