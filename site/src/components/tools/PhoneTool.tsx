import { useEffect, useId, useRef } from 'react';
import { getNetwork } from 'pakdatakit/networks';
import { analyzeNumber, type NumberType } from 'pakdatakit/numbers';
import { phoneRiskSignals, type PhoneRiskFlag } from 'pakdatakit/quality';
import { createWhatsAppLink } from 'pakdatakit/whatsapp';
import {
  PrivacyNote,
  Rows,
  ShareButton,
  trackTool,
  useHashState,
} from '../widgets/common';
import { Batch } from './Batch';

const TYPE: Record<NumberType, string> = {
  mobile: 'Mobile',
  landline: 'Landline',
  uan: 'UAN (111 number)',
  'toll-free': 'Toll-free (0800)',
  premium: 'Premium rate (0900)',
  personal: 'Personal number (0122)',
};

/** From the phoneRiskSignals() reference on /docs/quality/. */
const FLAG: Record<PhoneRiskFlag, string> = {
  invalid: 'Not a Pakistani phone number',
  landline: 'A fixed-line number: no SMS, often unanswered',
  'not-mobile': 'A UAN, toll-free or other service number',
  'repeated-digits': 'The last 7 digits use at most two different digits',
  'sequential-digits': 'The last 7 digits are a run, such as 1234567',
  'test-number': 'A placeholder often typed into forms',
};

function check(phone: string) {
  const info = analyzeNumber(phone);
  const network = info?.type === 'mobile' ? getNetwork(phone) : null;
  return {
    info,
    network: network && network !== 'Unknown' ? network : null,
    flags: info ? phoneRiskSignals(phone) : [],
    whatsapp: info?.type === 'mobile' ? createWhatsAppLink(phone) : null,
  };
}

export default function PhoneTool() {
  const id = useId();
  const [state, set] = useHashState({ phone: '' }, false);
  const tracked = useRef(false);
  const value = state.phone;
  const digits = value.replace(/\D/g, '').length;
  const { info, network, flags, whatsapp } = check(value);
  // Only call it wrong once there are enough digits for a whole number.
  const invalid = value.trim() !== '' && info === null && digits >= 10;
  useEffect(() => {
    if (value && !tracked.current) {
      tracked.current = true;
      trackTool('phone');
    }
  }, [value]);
  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-field">
          <label htmlFor={id}>Phone number</label>
          <input
            id={id}
            className="pdk-input mono"
            value={value}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="0300 1234567 or 042-35761234"
            inputMode="tel"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            aria-describedby={`${id}-state`}
          />
          <p
            id={`${id}-state`}
            className={invalid ? 'pdk-error' : undefined}
            aria-live="polite"
          >
            {value.trim() === ''
              ? 'Type or paste a mobile, landline, UAN or toll-free number.'
              : info
                ? `${TYPE[info.type]}: ${info.formatted}`
                : invalid
                  ? 'This is not a Pakistani phone number. Check the digits and the area code or 03XX prefix.'
                  : 'Keep typing…'}
          </p>
        </div>
        <Rows
          rows={[
            ['Type', info ? TYPE[info.type] : null],
            ['Formatted', info?.formatted],
            ['International (E.164)', info?.e164],
            ['Original network', network],
            ['Area code', info?.areaCode],
            ['Area', info?.cities.length ? info.cities.join(', ') : null],
            [
              'WhatsApp link',
              whatsapp ? (
                <a href={whatsapp} rel="noopener noreferrer" target="_blank">
                  {whatsapp}
                </a>
              ) : null,
              'text',
            ],
          ]}
        />
        {info ? (
          <div>
            <h2 className="pdk-subhead">Risk signals</h2>
            {flags.length === 0 ? (
              <p>None: nothing unusual about this number.</p>
            ) : (
              <ul className="pdk-list">
                {flags.map((f) => (
                  <li key={f}>
                    <code>{f}</code>: {FLAG[f]}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        <ShareButton state={state} personal />
      </div>
      <p className="pdk-note">
        <strong>The network is the one the number was first issued on.</strong>{' '}
        Pakistan has mobile number portability, so the number may have moved to
        another operator since. Risk signals are heuristics on the number
        itself: no list of real numbers, no lookup.
      </p>
      <Batch
        noun="phone number"
        filename="phone-numbers-checked.csv"
        run={check}
        columns={[
          { header: 'valid', value: (r) => (r.info ? 'yes' : 'no') },
          { header: 'type', value: (r) => (r.info ? r.info.type : '') },
          { header: 'formatted', value: (r) => r.info?.formatted ?? '' },
          { header: 'e164', value: (r) => r.info?.e164 ?? '' },
          { header: 'original network', value: (r) => r.network ?? '' },
          { header: 'area code', value: (r) => r.info?.areaCode ?? '' },
          { header: 'risk signals', value: (r) => r.flags.join('; ') },
        ]}
        summary={(rows) => {
          const valid = rows.filter((r) => r.info).length;
          const flagged = rows.filter((r) => r.flags.length > 0).length;
          return `Checked ${rows.length}: ${valid} valid, ${rows.length - valid} not valid, ${flagged} with risk signals.`;
        }}
      />
      <PrivacyNote />
    </div>
  );
}
