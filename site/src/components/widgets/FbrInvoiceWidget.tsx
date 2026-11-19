import { useId, useState } from 'react';
import {
  validateFbrInvoice,
  type FbrInvoice,
  type FbrInvoiceValidation,
} from 'pakdatakit/fbr-invoice';
import { Badge, Rows } from './common';

// Synthetic sample: one line at 18%, tax 1000 × 18% = 180.
const SAMPLE = {
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
  items: [
    {
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
    },
  ],
};

function check(text: string): {
  result: FbrInvoiceValidation | null;
  parseError: string | null;
} {
  try {
    const invoice = JSON.parse(text) as FbrInvoice;
    return { result: validateFbrInvoice(invoice), parseError: null };
  } catch (e) {
    return {
      result: null,
      parseError: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export default function FbrInvoiceWidget() {
  const id = useId();
  const [text, setText] = useState(() => JSON.stringify(SAMPLE, null, 2));
  const { result, parseError } = check(text);
  return (
    <div className="pdk-card" data-widget="fbr-invoice">
      <div className="pdk-field">
        <label htmlFor={id}>Invoice JSON</label>
        <textarea
          id={id}
          className="pdk-input mono"
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={parseError ? true : undefined}
          aria-describedby={parseError ? `${id}-err` : `${id}-note`}
        />
        {parseError ? (
          <p id={`${id}-err`} className="pdk-error">
            {parseError}
          </p>
        ) : null}
      </div>
      <p className="pdk-note" id={`${id}-note`}>
        Try changing <code>salesTaxApplicable</code> to 170, or clearing{' '}
        <code>hsCode</code>.
      </p>
      <p aria-live="polite">
        <code>validateFbrInvoice()</code>{' '}
        {result ? (
          <>
            <Badge valid={result.valid} />{' '}
            {result.valid
              ? 'No problems found'
              : `${result.errors.length} problem${result.errors.length === 1 ? '' : 's'}`}
          </>
        ) : (
          'waiting for valid JSON'
        )}
      </p>
      {result && result.errors.length > 0 ? (
        <Rows
          rows={result.errors.map((e): [string, string, 'text'] => [
            e.field,
            e.code ? `${e.code}: ${e.message}` : e.message,
            'text',
          ])}
        />
      ) : null}
    </div>
  );
}
