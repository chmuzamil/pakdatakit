/**
 * The home page's live demo: check a CNIC or an IBAN with the real library,
 * see the result at once, and the same call in the chosen language with its
 * result as a comment (rendered by the same code as the docs' examples). The
 * language choice is shared with the docs' code tabs (Starlight's synced
 * tabs key). Nothing typed leaves the browser.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { getCNICInfo, validateCNIC } from 'pakdatakit/cnic';
import { getBankFromIBAN, validateIBAN } from 'pakdatakit/iban';
import { LANGS, snippet, type Example, type Lang } from '../../lib/snippets';
import { Badge } from './common';

const TABS = {
  cnic: {
    label: 'CNIC',
    sample: '35202-1234567-1',
    field: 'A CNIC number',
    mode: 'numeric',
  },
  iban: {
    label: 'IBAN',
    sample: 'PK36SCBL0000001123456702',
    field: 'A Pakistani IBAN',
    mode: 'text',
  },
} as const;
type Tab = keyof typeof TABS;
const STORAGE = 'starlight-synced-tabs__lang';

function examples(tab: Tab, value: string): Example[] {
  if (tab === 'cnic')
    return [
      {
        id: 'v',
        title: '',
        fn: 'validateCNIC',
        args: [value],
        expected: validateCNIC(value),
      },
      {
        id: 'i',
        title: '',
        fn: 'getCNICInfo',
        args: [value],
        expected: getCNICInfo(value),
      },
    ];
  return [
    {
      id: 'v',
      title: '',
      fn: 'validateIBAN',
      args: [value],
      expected: validateIBAN(value),
    },
    {
      id: 'b',
      title: '',
      fn: 'getBankFromIBAN',
      args: [value],
      expected: getBankFromIBAN(value),
    },
  ];
}

export default function HeroDemo() {
  const id = useId();
  const [tab, setTab] = useState<Tab>('cnic');
  const [values, setValues] = useState({
    cnic: TABS.cnic.sample,
    iban: TABS.iban.sample,
  });
  const [lang, setLang] = useState<Lang>('ts');
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    cnic: null,
    iban: null,
  });

  // The language the visitor last picked anywhere on the site.
  useEffect(() => {
    try {
      const label = localStorage.getItem(STORAGE);
      const found = LANGS.find((l) => l.label === label);
      if (found) setLang(found.id);
    } catch {
      /* storage blocked: TypeScript */
    }
    return () => clearTimeout(timer.current);
  }, []);

  const value = values[tab];
  const exs = examples(tab, value.trim());
  const valid = exs[0].expected === true;
  const code = snippet(lang, exs);
  const empty = value.trim() === '';

  const chooseLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(STORAGE, LANGS.find((x) => x.id === l)!.label);
    } catch {
      /* ignore */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next: Tab = tab === 'cnic' ? 'iban' : 'cnic';
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const info = tab === 'cnic' ? getCNICInfo(value.trim()) : null;
  const bank = tab === 'iban' ? getBankFromIBAN(value.trim()) : null;
  const summary = empty
    ? `Type ${TABS[tab].field.toLowerCase()}.`
    : tab === 'cnic'
      ? valid && info
        ? `${info.province} · ${info.gender === 'male' ? 'Male' : 'Female'}`
        : 'Not in the CNIC format'
      : valid
        ? (bank ?? 'Bank code not in our list')
        : 'Length or check digits are wrong';

  return (
    <div className="pdk-demo not-content">
      <div
        className="pdk-demo-tabs"
        role="tablist"
        aria-label="What to check"
        onKeyDown={onTabKey}
      >
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[t] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${t}`}
            aria-controls={`${id}-panel`}
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
          >
            {TABS[t].label}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${tab}`}
        className="pdk-demo-body"
      >
        <label htmlFor={`${id}-input`} className="sr-only">
          {TABS[tab].field}
        </label>
        <input
          id={`${id}-input`}
          className="pdk-input mono"
          value={value}
          onChange={(e) => setValues({ ...values, [tab]: e.target.value })}
          inputMode={TABS[tab].mode}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${id}-result`}
        />
        <p id={`${id}-result`} className="pdk-demo-result" aria-live="polite">
          {!empty && <Badge valid={valid} />} <span>{summary}</span>
        </p>
        <div className="pdk-demo-code">
          <div className="pdk-demo-code-bar">
            <label htmlFor={`${id}-lang`} className="sr-only">
              Language
            </label>
            <select
              id={`${id}-lang`}
              className="pdk-demo-lang"
              value={lang}
              onChange={(e) => chooseLang(e.target.value as Lang)}
            >
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <button type="button" className="pdk-demo-copy" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span className="sr-only" role="status">
              {copied ? 'Code copied' : ''}
            </span>
          </div>
          <pre
            tabIndex={0}
            aria-label={`${LANGS.find((l) => l.id === lang)!.label} code`}
          >
            <code>{code}</code>
          </pre>
        </div>
        <p className="pdk-demo-note">
          Runs in your browser with the real library. Nothing you type is sent
          anywhere.
        </p>
      </div>
    </div>
  );
}
