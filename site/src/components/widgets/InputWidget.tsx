import { useId, useState } from 'react';
import {
  checkCNICInput,
  checkIBANInput,
  checkPhoneInput,
  formatCNICInput,
  formatIBANInput,
  formatPhoneInput,
  type InputState,
} from 'pakdatakit/input';
import { Badge, Rows } from './common';

type Kind = 'cnic' | 'phone' | 'iban';

const KINDS: Record<
  Kind,
  {
    label: string;
    format: (v: string) => string;
    check: (v: string) => InputState;
    fns: [string, string];
    initial: string;
    inputMode: 'numeric' | 'tel' | 'text';
    error: string;
  }
> = {
  cnic: {
    label: 'CNIC',
    format: formatCNICInput,
    check: checkCNICInput,
    fns: ['formatCNICInput()', 'checkCNICInput()'],
    initial: '35202-12',
    inputMode: 'numeric',
    error: 'This can’t become a valid CNIC: 13 digits starting with 1 to 8.',
  },
  phone: {
    label: 'Mobile number',
    format: formatPhoneInput,
    check: checkPhoneInput,
    fns: ['formatPhoneInput()', 'checkPhoneInput()'],
    initial: '0300-12',
    inputMode: 'tel',
    error: 'This can’t become a valid Pakistani mobile number.',
  },
  iban: {
    label: 'IBAN',
    format: formatIBANInput,
    check: checkIBANInput,
    fns: ['formatIBANInput()', 'checkIBANInput()'],
    initial: 'PK36 SCBL 0000',
    inputMode: 'text',
    error: 'This can’t become a valid Pakistani IBAN.',
  },
};

const STATE_TEXT: Record<InputState, string> = {
  empty: 'Empty: nothing typed yet',
  incomplete: 'Incomplete: keep typing',
  valid: 'Valid',
  invalid: 'Invalid',
};

export default function InputWidget() {
  const id = useId();
  const [kind, setKind] = useState<Kind>('cnic');
  const [value, setValue] = useState(KINDS.cnic.initial);
  const k = KINDS[kind];
  const state = k.check(value);
  const invalid = state === 'invalid';
  return (
    <div className="pdk-card" data-widget="input">
      <div className="pdk-field">
        <label htmlFor={`${id}-k`}>Field</label>
        <select
          id={`${id}-k`}
          className="pdk-select"
          value={kind}
          onChange={(e) => {
            const next = e.target.value as Kind;
            setKind(next);
            setValue(KINDS[next].initial);
          }}
        >
          {(Object.keys(KINDS) as Kind[]).map((key) => (
            <option key={key} value={key}>
              {KINDS[key].label}
            </option>
          ))}
        </select>
      </div>
      <div className="pdk-field">
        <label htmlFor={id}>Type a {k.label}</label>
        <input
          id={id}
          className="pdk-input mono"
          value={value}
          onChange={(e) => setValue(k.format(e.target.value))}
          inputMode={k.inputMode}
          autoComplete="off"
          autoCapitalize={kind === 'iban' ? 'characters' : undefined}
          spellCheck={false}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-err` : undefined}
        />
        {invalid ? (
          <p id={`${id}-err`} className="pdk-error">
            {k.error}
          </p>
        ) : null}
      </div>
      <p aria-live="polite">
        <code>{k.fns[1]}</code>{' '}
        {state === 'valid' || state === 'invalid' ? (
          <Badge valid={state === 'valid'} />
        ) : (
          STATE_TEXT[state]
        )}
      </p>
      <Rows
        rows={[
          [`${k.fns[0]} shows`, value],
          ['InputState', `'${state}'`],
        ]}
      />
    </div>
  );
}
