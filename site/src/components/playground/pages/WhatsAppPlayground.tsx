import { useMemo, useState } from 'react'
import { createWhatsAppLink } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { ResultBadge } from '../components/ResultBadge'
import {
  escapeForCode,
  examples,
  inputClassName,
  monoInputClassName,
} from '../utils/examples'

export function WhatsAppPlayground() {
  const [phone, setPhone] = useState<string>(examples.phone)
  const [message, setMessage] = useState<string>(examples.whatsappMessage)

  const link = useMemo(() => {
    if (!phone.trim()) return ''
    return createWhatsAppLink(phone, message.trim() || undefined) ?? ''
  }, [phone, message])

  const isValid = link.length > 0

  const code = `import { createWhatsAppLink } from "pakdatakit";

createWhatsAppLink("${escapeForCode(phone || examples.phone)}"${message.trim() ? `, "${escapeForCode(message)}"` : ''});
// → ${link ? `"${link}"` : 'null'}`

  return (
    <PlaygroundShell
      title="WhatsApp Link"
      description="Generate wa.me click-to-chat links for Pakistani mobile numbers."
      input={
        <>
          <Card title="Phone" description="Any supported Pakistani mobile format.">
            <label htmlFor="wa-phone" className="sr-only">
              Phone number
            </label>
            <input
              id="wa-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03001234567"
              spellCheck={false}
              className={monoInputClassName}
            />
          </Card>
          <Card title="Message" description="Optional pre-filled chat message.">
            <label htmlFor="wa-message" className="sr-only">
              Message
            </label>
            <textarea
              id="wa-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Assalamualaikum"
              className={inputClassName + ' min-h-20 resize-y'}
            />
          </Card>
        </>
      }
      output={
        <Card title="Result">
          {!phone.trim() ? (
            <p className="text-sm text-text-muted">Enter a phone number to generate a link.</p>
          ) : (
            <>
              <div className="mb-4">
                <ResultBadge valid={isValid} validLabel="Valid link" invalidLabel="Invalid phone" />
              </div>
              <OutputRow label="Link" value={link} />
              {isValid && (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm text-accent hover:underline"
                >
                  Open in WhatsApp →
                </a>
              )}
            </>
          )}
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
