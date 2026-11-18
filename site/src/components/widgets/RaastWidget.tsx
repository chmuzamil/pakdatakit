import { useEffect, useId, useState } from 'react';
import QRCode from 'qrcode';
import { createRaastP2PQr, parseRaastQr } from 'pakdatakit/raast';
import { Rows } from './common';

export default function RaastWidget() {
  const id = useId();
  const [iban, setIban] = useState('PK36SCBL0000001123456702');
  const [amount, setAmount] = useState('');
  const [svg, setSvg] = useState('');
  let payload: string | null = null;
  let error = '';
  try {
    payload = createRaastP2PQr({
      iban,
      ...(amount ? { amount: Number(amount), expiresIn: '1d' } : {}),
    });
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid input';
  }
  const parsed = payload ? parseRaastQr(payload) : null;
  useEffect(() => {
    if (!payload) {
      setSvg('');
      return;
    }
    QRCode.toString(payload, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
    }).then(setSvg, () => setSvg(''));
  }, [payload]);
  return (
    <div className="pdk-card" data-widget="raast">
      <div className="pdk-grid two">
        <div>
          <div className="pdk-field">
            <label htmlFor={`${id}-i`}>IBAN</label>
            <input
              id={`${id}-i`}
              className="pdk-input mono"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-e`}
            />
          </div>
          <div className="pdk-field">
            <label htmlFor={`${id}-a`}>
              Amount (optional; the QR then expires in a day)
            </label>
            <input
              id={`${id}-a`}
              className="pdk-input mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              aria-describedby={`${id}-e`}
            />
          </div>
          <p id={`${id}-e`} className="pdk-error" role="alert">
            {error}
          </p>
          <Rows
            rows={[
              ['Bank', parsed?.bankName ?? null],
              ['Amount', parsed?.amount ?? null],
            ]}
          />
        </div>
        <div>
          <div className="pdk-qr">
            {svg ? (
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                alt="Raast QR code for the IBAN above"
                width={180}
                height={180}
              />
            ) : (
              <span className="pdk-note">
                {error ? 'No QR code' : 'Making the QR code…'}
              </span>
            )}
          </div>
          {payload ? <p className="pdk-note pdk-payload">{payload}</p> : null}
        </div>
      </div>
    </div>
  );
}
