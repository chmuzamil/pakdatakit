import { useMemo, useState } from 'react'
import { isRTL, slugify, type SlugScript } from 'pakdatakit'
import { Card } from '../components/Card'
import { CodePreview } from '../components/CodePreview'
import { OutputRow } from '../components/OutputRow'
import { PlaygroundShell } from '../components/PlaygroundShell'
import { escapeForCode, inputClassName } from '../utils/examples'

const scripts: { value: SlugScript; label: string }[] = [
  { value: 'any', label: 'Any (keep Urdu and Latin)' },
  { value: 'latin', label: 'Latin only' },
  { value: 'urdu', label: 'Urdu only' },
]

export function SlugifyPlayground() {
  const [text, setText] = useState('لاہور کا قلعہ Fort')
  const [script, setScript] = useState<SlugScript>('any')

  const slug = useMemo(() => slugify(text, { script }), [text, script])
  const rtl = useMemo(() => isRTL(text), [text])

  const code = `import { slugify } from "pakdatakit";

slugify("${escapeForCode(text)}"${script === 'any' ? '' : `, { script: "${script}" }`}); // → "${slug}"`

  return (
    <PlaygroundShell
      title="Urdu Slugify"
      description="URL slugs that keep Urdu letters instead of dropping them, with the option to keep only Latin or only Urdu words."
      input={
        <Card title="Text">
          <label htmlFor="slug-text" className="sr-only">
            Text
          </label>
          <input
            id="slug-text"
            type="text"
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClassName}
          />
          <label htmlFor="slug-script" className="mt-3 mb-1 block text-xs text-text-muted">
            Script
          </label>
          <select
            id="slug-script"
            value={script}
            onChange={(e) => setScript(e.target.value as SlugScript)}
            className={inputClassName}
          >
            {scripts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-text-muted">Try: کراچی میں بارش · Pakistan Zindabad ۲۰۲۶</p>
        </Card>
      }
      output={
        <Card title="Result">
          <OutputRow label="Slug" value={slug} />
          <OutputRow label="Right-to-left" value={rtl ? 'Yes' : 'No'} mono={false} />
          <OutputRow label="Example URL" value={slug ? `https://example.pk/news/${slug}` : ''} />
        </Card>
      }
      code={<CodePreview code={code} />}
    />
  )
}
