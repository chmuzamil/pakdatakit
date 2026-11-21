import { useEffect, useId, useRef, useState } from 'react';
import {
  FBR_DI_SPEC_VERSION,
  buildFbrInvoice,
  expectedSalesTax,
  validateFbrInvoice,
  type FbrInvoice,
} from 'pakdatakit/fbr-invoice';
import { Badge, PrivacyNote, rs, trackTool } from '../widgets/common';

// Synthetic samples (made-up NTNs and names): one line at 18%, 1000 × 18% = 180.
const LINE = {
  hsCode: '0101.2100',
  productDescription: 'Sample item',
  rate: '18%',
  uoM: 'Numbers, pieces, units',
  quantity: 1,
  totalValues: 0,
  valueSalesExcludingST: 1000,
  fixedNotifiedValueOrRetailPrice: 0,
  salesTaxApplicable: 180,
  salesTaxWithheldAtSource: 0,
  saleType: 'Goods at standard rate (default)',
};
const GOOD = {
  invoiceType: 'Sale Invoice',
  invoiceDate: '2026-11-18',
  sellerNTNCNIC: '1234567',
  sellerBusinessName: 'Example Traders',
  sellerProvince: 'Punjab',
  sellerAddress: 'Lahore',
  buyerNTNCNIC: '7654321',
  buyerBusinessName: 'Sample Store',
  buyerProvince: 'Sindh',
  buyerAddress: 'Karachi',
  buyerRegistrationType: 'Registered',
  invoiceRefNo: '',
  items: [LINE],
};
const BAD = {
  ...GOOD,
  invoiceDate: '18-11-2026',
  buyerNTNCNIC: '12345',
  items: [
    { ...LINE, salesTaxApplicable: 170 },
    { ...LINE, hsCode: '', rate: 'Rs.3', quantity: 12, salesTaxApplicable: 30 },
  ],
};
const json = (v: unknown) => JSON.stringify(v, null, 2);

function localToday(): string {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

type Parsed =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; invoice: FbrInvoice };

function parse(text: string): Parsed {
  if (!text.trim()) return { kind: 'empty' };
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      return {
        kind: 'error',
        message: 'The JSON must be one invoice object, { … }.',
      };
    return { kind: 'ok', invoice: value as FbrInvoice };
  } catch (e) {
    return {
      kind: 'error',
      message: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

const num = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export default function FbrInvoiceTool() {
  const id = useId();
  const [text, setText] = useState('');
  const [today, setToday] = useState('');
  const tracked = useRef(false);
  useEffect(() => setToday(localToday()), []);
  useEffect(() => {
    if (text && !tracked.current) {
      tracked.current = true;
      trackTool('fbr-invoice-validator');
    }
  }, [text]);

  const parsed = parse(text);
  const result =
    parsed.kind === 'ok'
      ? validateFbrInvoice(parsed.invoice, today ? { today } : undefined)
      : null;
  const items =
    parsed.kind === 'ok' && Array.isArray(parsed.invoice.items)
      ? (parsed.invoice.items as unknown[])
      : [];
  const totals =
    parsed.kind === 'ok'
      ? (buildFbrInvoice(parsed.invoice)?.totals ?? null)
      : null;

  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-actions">
          <button
            type="button"
            className="pdk-button"
            onClick={() => setText(json(GOOD))}
          >
            Load a correct sample
          </button>
          <button
            type="button"
            className="pdk-button"
            onClick={() => setText(json(BAD))}
          >
            Load a sample with mistakes
          </button>
          <button
            type="button"
            className="pdk-button"
            onClick={() => setText('')}
          >
            Clear
          </button>
        </div>
        <div className="pdk-field">
          <label htmlFor={id}>
            Invoice JSON (the body for PRAL's postinvoicedata or
            validateinvoicedata)
          </label>
          <textarea
            id={id}
            className="pdk-input mono"
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={parsed.kind === 'error' || undefined}
            aria-describedby={`${id}-parse`}
          />
          <p id={`${id}-parse`} className="pdk-error" aria-live="polite">
            {parsed.kind === 'error' ? parsed.message : ''}
          </p>
        </div>
        <div className="pdk-field">
          <label htmlFor={`${id}-today`}>
            Today (to catch a future date, error 0043)
          </label>
          <input
            id={`${id}-today`}
            type="date"
            className="pdk-input mono"
            value={today}
            onChange={(e) => setToday(e.target.value)}
          />
        </div>
        <p className="pdk-result" aria-live="polite">
          {result === null ? (
            parsed.kind === 'empty' ? (
              'Paste an invoice or load a sample.'
            ) : (
              ''
            )
          ) : result.valid ? (
            <>
              <Badge valid labels={['No problems found', '']} /> by the offline
              checks
            </>
          ) : (
            <>
              <Badge valid={false} labels={['', 'Problems found']} />{' '}
              {result.errors.length} problem
              {result.errors.length === 1 ? '' : 's'}
            </>
          )}
        </p>
        {result && result.errors.length > 0 ? (
          <ul className="pdk-problems">
            {result.errors.map((e, i) => (
              <li key={i}>
                <span className="pdk-badge invalid mono">
                  {e.code ? `FBR ${e.code}` : 'No code'}
                </span>{' '}
                <code>{e.field}</code>
                <br />
                {e.message}
              </li>
            ))}
          </ul>
        ) : null}
        {items.length > 0 ? (
          <>
            <h2 className="pdk-subhead">Totals check</h2>
            <div
              className="pdk-table-wrap"
              tabIndex={0}
              aria-label="Sales tax on each line"
            >
              <table className="pdk-table">
                <caption className="sr-only">
                  Sales tax declared on each line against the tax for its rate
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Line</th>
                    <th scope="col">Rate</th>
                    <th scope="col">Value excl. tax</th>
                    <th scope="col">Tax declared</th>
                    <th scope="col">Tax for the rate</th>
                    <th scope="col">Check</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((raw, i) => {
                    const item = (
                      raw && typeof raw === 'object' ? raw : {}
                    ) as Record<string, unknown>;
                    const rate = typeof item.rate === 'string' ? item.rate : '';
                    const expected = rate
                      ? expectedSalesTax({
                          rate,
                          saleType:
                            typeof item.saleType === 'string'
                              ? item.saleType
                              : undefined,
                          quantity: num(item.quantity) ?? undefined,
                          valueSalesExcludingST:
                            num(item.valueSalesExcludingST) ?? undefined,
                          fixedNotifiedValueOrRetailPrice:
                            num(item.fixedNotifiedValueOrRetailPrice) ??
                            undefined,
                        })
                      : null;
                    const declared = num(item.salesTaxApplicable);
                    const ok =
                      expected === null || declared === null
                        ? null
                        : Math.abs(expected - declared) <= 0.01;
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="mono">{rate || '—'}</td>
                        <td>{rs(num(item.valueSalesExcludingST)) || '—'}</td>
                        <td>{rs(declared) || '—'}</td>
                        <td>{rs(expected) || '—'}</td>
                        <td>
                          {ok === null
                            ? 'Not a plain rate'
                            : ok
                              ? 'Matches'
                              : `Off by ${rs(Math.abs((expected ?? 0) - (declared ?? 0)))}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {totals ? (
                  <tfoot>
                    <tr>
                      <th scope="row" colSpan={2}>
                        Total
                      </th>
                      <td>{rs(totals.valueSalesExcludingST)}</td>
                      <td>{rs(totals.salesTaxApplicable)}</td>
                      <td colSpan={2}>
                        Total with tax:{' '}
                        {rs(
                          Math.round(
                            (totals.valueSalesExcludingST +
                              totals.salesTaxApplicable) *
                              100,
                          ) / 100,
                        )}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
            <p className="pdk-note">
              The tax for the rate is value × rate for a percentage (retail
              price × rate for Third Schedule goods) and quantity × amount for a
              per-unit rate, rounded half up to the paisa; within one paisa
              counts as matching. The specification gives no rounding rule, so
              this is the library's choice. It has no invoice-level totals:
              these are for your own records.
            </p>
          </>
        ) : null}
      </div>
      <p className="pdk-note">
        <strong>Nothing leaves your device.</strong> The invoice is checked in
        this tab and is not sent to FBR, PRAL or anyone else, and it is not kept
        in the page address. These are the checks that need no call to FBR,
        following PRAL's DI API specification version {FBR_DI_SPEC_VERSION}.
        Registration status, and whether a province, HS code, unit, rate, sale
        type or SRO is in FBR's lists, are not checked. The full wording of each
        code is in PRAL's{' '}
        <a href="https://dicrm.pral.com.pk/assets/docs/Manuals/Error%20Message%20Guide%20-%20(Sales).pdf">
          Error Message Guide (Sales)
        </a>
        . Not legal or tax advice.
      </p>
      <PrivacyNote />
    </div>
  );
}
