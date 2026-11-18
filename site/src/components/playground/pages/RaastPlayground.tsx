import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  createRaastP2PQr,
  getBankInfo,
  validateRaastQr,
  type RaastQrError,
  type RaastQrWarning,
} from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { CopyButton } from '../components/CopyButton'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { TabBar } from '../components/TabBar'
import {
  escapeForCode,
  examples,
  inputClassName,
  monoInputClassName,
  textareaClassName,
} from '../utils/examples'

const errorText: Record<RaastQrError, string> = {
  'not-a-raast-qr': 'Not a Pakistani payment QR code.',
  'bad-checksum': 'The checksum does not match: the QR was damaged or its contents were edited.',
  'no-iban': 'No IBAN found in the QR code.',
  'invalid-iban': 'The IBAN in the QR code fails its checksum.',
  expired: 'This QR code has expired.',
  'missing-expiry': 'This QR code has an amount but no expiry, so banking apps reject it.',
}

const warningText: Record<RaastQrWarning, string> = {
  'amount-ignored': 'It carries an amount that banking apps ignore; the payer must type it.',
  'expires-soon': 'It expires within an hour.',
}

const tabs = [
  { id: 'create', label: 'Create P2P QR' },
  { id: 'parse', label: 'Check a QR' },
] as const

type Tab = (typeof tabs)[number]['id']

function useQrImage(payload: string | null): string | null {
  const [image, setImage] = useState<{ payload: string; url: string } | null>(null)
  useEffect(() => {
    if (!payload) return
    let cancelled = false
    QRCode.toDataURL(payload, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setImage({ payload, url })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [payload])
  // Only show the image rendered for the current payload.
  return image && image.payload === payload ? image.url : null
}

export function RaastPlayground() {
  const [tab, setTab] = useState<Tab>('create')
  const [iban, setIban] = useState<string>(examples.iban)
  const [amount, setAmount] = useState('1500')
  const [validDays, setValidDays] = useState('30')
  const [particulars, setParticulars] = useState('')
  const [toParse, setToParse] = useState('')

  // QR codes with an amount must expire; this one stops working at 23:59 on the last day.
  const expiresAt = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + Number(validDays))
    date.setHours(23, 59, 0, 0)
    return date
  }, [validDays])

  const created = useMemo(() => {
    try {
      const value = amount.trim() ? Number(amount) : undefined
      return {
        payload: createRaastP2PQr({
          iban,
          ...(value !== undefined ? { amount: value, expiresAt } : {}),
          ...(particulars.trim() ? { particulars: particulars.trim() } : {}),
        }),
        error: null,
      }
    } catch (error) {
      return { payload: null, error: (error as Error).message }
    }
  }, [iban, amount, expiresAt, particulars])

  const parseInput = tab === 'parse' ? toParse : (created.payload ?? '')
  const check = useMemo(
    () => (parseInput.trim() ? validateRaastQr(parseInput) : null),
    [parseInput],
  )
  const parsed = check?.qr ?? null
  const bank = parsed?.iban ? getBankInfo(parsed.iban) : null
  const image = useQrImage(tab === 'create' ? created.payload : null)

  const code =
    tab === 'create'
      ? `import { createRaastP2PQr } from "pakdatakit";

createRaastP2PQr({
  iban: "${escapeForCode(iban)}",${amount.trim() ? `\n  amount: ${amount},\n  expiresAt: new Date(${expiresAt.getFullYear()}, ${expiresAt.getMonth()}, ${expiresAt.getDate()}, 23, 59),` : ''}${particulars.trim() ? `\n  particulars: "${escapeForCode(particulars.trim())}",` : ''}
});
// → "${created.payload ?? ''}"`
      : `import { validateRaastQr } from "pakdatakit";

validateRaastQr(payload);
// → ${
          check
            ? `{ valid: ${check.valid}, errors: [${check.errors.map((e) => `"${e}"`).join(', ')}], warnings: [${check.warnings.map((w) => `"${w}"`).join(', ')}], qr: ${parsed ? `{ kind: "${parsed.kind}", iban: ${parsed.iban ? `"${parsed.iban}"` : 'null'}, amount: ${parsed.amount}${parsed.expiresAt ? `, expiresAt: "${parsed.expiresAt}"` : ''} }` : 'null'} }`
            : 'null'
        }`

  return (
    <PlaygroundShell
      title="Raast QR"
      description="Create Raast payment QR codes, and check any Pakistani payment QR for tampering, expiry or a bad IBAN before paying."
      input={
        <>
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
          {tab === 'create' ? (
            <Card title="Payee" description="Person-to-person Raast QR for an IBAN.">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="raast-iban">
                  IBAN
                </label>
                <input
                  id="raast-iban"
                  name="iban"
                  autoComplete="off"
                  autoCapitalize="characters"
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="PK36SCBL0000001123456702"
                  spellCheck={false}
                  className={monoInputClassName}
                />
                <label className="mt-4 mb-1.5 block text-sm font-medium text-text" htmlFor="raast-amount">
                  Amount in PKR <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <input
                  id="raast-amount"
                  name="amount"
                  autoComplete="off"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1500"
                  className={monoInputClassName}
                />
                {amount.trim() && (
                  <label className="mt-3 flex items-center gap-3 text-sm text-text-muted">
                    <span className="shrink-0">Valid for</span>
                    <select
                      value={validDays}
                      onChange={(e) => setValidDays(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                    </select>
                  </label>
                )}
                <label className="mt-4 mb-1.5 block text-sm font-medium text-text" htmlFor="raast-description">
                  Description <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <input
                  id="raast-description"
                  name="description"
                  autoComplete="off"
                  type="text"
                  value={particulars}
                  maxLength={30}
                  onChange={(e) => setParticulars(e.target.value)}
                  placeholder="Rent for March"
                  className={inputClassName}
                />
              </div>
            </Card>
          ) : (
            <Card
              title="QR payload"
              description="Paste the text decoded from a Raast or Pakistan QR code."
            >
              <textarea
                aria-label="QR payload"
                value={toParse}
                onChange={(e) => setToParse(e.target.value)}
                placeholder="000202010211020200…"
                spellCheck={false}
                className={textareaClassName}
              />
              {created.payload && (
                <button
                  type="button"
                  onClick={() => setToParse(created.payload ?? '')}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  Use the QR from the Create tab
                </button>
              )}
            </Card>
          )}
        </>
      }
      output={
        <Card title="Result">
          {tab === 'create' && created.error ? (
            <p className="text-sm text-error">{created.error}</p>
          ) : !parseInput.trim() ? (
            <p className="text-sm text-text-muted">Paste a payload to read it.</p>
          ) : (
            <>
              {tab === 'create' && image && (
                <div className="mb-4 flex flex-col items-center gap-2">
                  <img
                    src={image}
                    alt="Raast QR code"
                    width={240}
                    height={240}
                    className="rounded-md bg-white p-2"
                  />
                  <CopyButton value={created.payload ?? ''} label="Copy payload" />
                </div>
              )}
              <div className="mb-4">
                <ResultBadge
                  valid={check?.valid ?? false}
                  validLabel="Safe to pay"
                  invalidLabel="Do not pay"
                />
              </div>
              {check && (check.errors.length > 0 || check.warnings.length > 0) && (
                <ul className="mb-4 space-y-1">
                  {check.errors.map((error) => (
                    <li key={error} className="text-sm text-error">
                      ✕ {errorText[error]}
                    </li>
                  ))}
                  {check.warnings.map((warning) => (
                    <li key={warning} className="text-sm text-text-muted">
                      ⚠ {warningText[warning]}
                    </li>
                  ))}
                </ul>
              )}
              <OutputRow
                label="Kind"
                value={parsed ? (parsed.kind === 'p2p' ? 'Person to person' : 'Merchant') : ''}
                mono={false}
              />
              <OutputRow label="IBAN" value={parsed?.iban ?? ''} />
              <OutputRow label="Bank" value={bank?.name ?? ''} mono={false} />
              <OutputRow label="Amount" value={parsed?.amount != null ? String(parsed.amount) : ''} />
              {parsed?.expiresAt && (
                <OutputRow label="Expires" value={parsed.expiresAt.replace('T', ' ')} />
              )}
              {parsed?.merchantName && (
                <OutputRow label="Merchant" value={parsed.merchantName} mono={false} />
              )}
              {parsed?.particulars && (
                <OutputRow label="Description" value={parsed.particulars} mono={false} />
              )}
            </>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
