import { useMemo, useState } from 'react'
import { buildFbrInvoice, validateFbrInvoice, type FbrInvoice } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import { textareaClassName } from '../utils/examples'

const example = buildFbrInvoice({
  invoiceType: 'Sale Invoice',
  invoiceDate: '2025-04-21',
  sellerNTNCNIC: '1234567',
  sellerBusinessName: 'Example Traders',
  sellerProvince: 'Sindh',
  sellerAddress: 'Karachi',
  buyerNTNCNIC: '7654321',
  buyerBusinessName: 'Example Buyer',
  buyerProvince: 'Punjab',
  buyerAddress: 'Lahore',
  buyerRegistrationType: 'Registered',
  items: [
    {
      hsCode: '0101.2100',
      productDescription: 'Horses',
      rate: '18%',
      uoM: 'Numbers, pieces, units',
      quantity: 2,
      valueSalesExcludingST: 1234,
      saleType: 'Goods at standard rate (default)',
    },
  ],
})!.invoice

const broken: FbrInvoice = {
  ...example,
  invoiceDate: '21-04-2025',
  buyerNTNCNIC: example.sellerNTNCNIC,
  items: [{ ...example.items[0], salesTaxApplicable: 100 }],
}

const pretty = (v: unknown) => JSON.stringify(v, null, 2)

export function FbrInvoicePlayground() {
  const [text, setText] = useState(pretty(broken))

  const parsed = useMemo((): { invoice: FbrInvoice | null; error: string | null } => {
    try {
      return { invoice: JSON.parse(text) as FbrInvoice, error: null }
    } catch (e) {
      return { invoice: null, error: e instanceof Error ? e.message : 'Invalid JSON' }
    }
  }, [text])
  const result = useMemo(
    () => (parsed.invoice ? validateFbrInvoice(parsed.invoice) : null),
    [parsed.invoice],
  )

  const code = `import { validateFbrInvoice } from "pakdatakit";

validateFbrInvoice(invoice);
// → ${result ? pretty({ valid: result.valid, errors: result.errors.slice(0, 3) }).replace(/\n/g, '\n// ') : 'not JSON'}`

  return (
    <PlaygroundShell
      title="FBR Invoice Validator"
      description="Check an FBR Digital Invoicing invoice offline against PRAL's DI API specification v1.12, with FBR's own error codes. Nothing is sent to FBR."
      input={
        <Card
          title="Invoice JSON"
          description="Edit the invoice. The example has three problems; load a valid one to compare."
        >
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setText(pretty(example))}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-accent"
            >
              Load valid invoice
            </button>
            <button
              type="button"
              onClick={() => setText(pretty(broken))}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-accent"
            >
              Load invoice with errors
            </button>
          </div>
          <label htmlFor="fbr-json" className="sr-only">
            Invoice JSON
          </label>
          <textarea
            id="fbr-json"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className={`${textareaClassName} min-h-96 text-xs`}
          />
        </Card>
      }
      output={
        <Card title="Result">
          {parsed.error ? (
            <p className="text-sm text-text-muted">Not valid JSON: {parsed.error}</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-text-muted">
                  {result?.valid ? 'No problems found' : `${result?.errors.length ?? 0} problem(s)`}
                </span>
                <ResultBadge valid={result?.valid ?? false} />
              </div>
              <ul className="space-y-2">
                {result?.errors.map((e, i) => (
                  <li key={i} className="rounded-md border border-border px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-brand">{e.code ?? '—'}</span>{' '}
                    <span className="font-mono text-xs text-text-muted">{e.field}</span>
                    <p className="mt-1 text-text-heading">{e.message}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            It cannot check what needs FBR's reference APIs, such as registration status or
            whether an HS code is in FBR's lists. A valid result means FBR's own validation is
            likely to pass, not that it will.
          </p>
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
