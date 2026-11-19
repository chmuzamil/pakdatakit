import { useId, useState } from 'react';
import { createWhatsAppLink } from 'pakdatakit/whatsapp';
import { Badge, Rows } from './common';

export default function WhatsAppWidget() {
  const id = useId();
  const [phone, setPhone] = useState('0300 1234567');
  const [message, setMessage] = useState('Is this still available?');
  const link = createWhatsAppLink(phone, message);
  return (
    <div className="pdk-card" data-widget="whatsapp">
      <div className="pdk-field">
        <label htmlFor={`${id}-phone`}>Mobile number</label>
        <input
          id={`${id}-phone`}
          className="pdk-input mono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="off"
        />
      </div>
      <div className="pdk-field">
        <label htmlFor={`${id}-message`}>Message (optional)</label>
        <input
          id={`${id}-message`}
          className="pdk-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoComplete="off"
        />
      </div>
      <p aria-live="polite">
        <code>createWhatsAppLink()</code> <Badge valid={link !== null} />
      </p>
      <Rows rows={[['Link', link ? <code>{link}</code> : null]]} />
    </div>
  );
}
