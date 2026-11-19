/**
 * The home page's live demo: check a CNIC or an IBAN with the real library
 * and see the result at once. Below it, the same calls in the chosen
 * language with the visitor's value and the library's result, each on one
 * line; while the input is empty or invalid, the documented example
 * (site/examples/*.json, tested in every port) instead. The language
 * choice is shared with the docs' code tabs (Starlight's synced tabs key).
 * Nothing typed leaves the browser.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { getCNICInfo, validateCNIC } from 'pakdatakit/cnic';
import { getBankFromIBAN, validateIBAN } from 'pakdatakit/iban';
import { LANGS, snippet, type Example, type Lang } from '../../lib/snippets';
import cnicExamples from '../../../examples/cnic.json';
import ibanExamples from '../../../examples/iban.json';
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

/**
 * The same calls with the visitor's value, the results computed now by the
 * library. Every port gives the same results (the shared test vectors).
 */
function live(tab: Tab, v: string): Example[] {
  return EXAMPLES[tab].map((ex) => ({
    ...ex,
    args: [v],
    expected: FNS[ex.fn](v),
  }));
}
const FNS: Record<string, (v: string) => unknown> = {
  validateCNIC,
  getCNICInfo,
  validateIBAN,
  getBankFromIBAN,
};

const pick = (file: { examples: Example[] }, ids: string[]) =>
  ids.map((i) => file.examples.find((e) => e.id === i)!);

/** The documented examples (outputs tested in every port): shown when the
 * input is empty or invalid. */
const EXAMPLES: Record<Tab, Example[]> = {
  cnic: pick(cnicExamples as { examples: Example[] }, ['validate', 'info']),
  iban: pick(ibanExamples as { examples: Example[] }, ['validate', 'bank']),
};

/** Short tab labels; the stored choice uses the docs' full label. */
const SHORT: Record<Lang, string> = {
  ts: 'TS',
  py: 'Python',
  dart: 'Dart',
  cs: 'C#',
  php: 'PHP',
};

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
  const inputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    cnic: null,
    iban: null,
  });
  const langRefs = useRef<Partial<Record<Lang, HTMLButtonElement | null>>>({});

  // The language the visitor last picked anywhere on the site.
  useEffect(() => {
    // Keep anything typed before the demo hydrated (it loads when idle).
    const typed = inputRef.current?.value;
    if (typed !== undefined && typed !== TABS.cnic.sample)
      setValues((v) => ({ ...v, cnic: typed }));
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
  const empty = value.trim() === '';
  const valid =
    tab === 'cnic' ? validateCNIC(value.trim()) : validateIBAN(value.trim());
  const code = snippet(
    lang,
    valid ? live(tab, value.trim()) : EXAMPLES[tab],
    true,
  );

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
  const onLangKey = (e: React.KeyboardEvent) => {
    const i = LANGS.findIndex((l) => l.id === lang);
    const n = LANGS.length;
    const to =
      e.key === 'ArrowRight'
        ? (i + 1) % n
        : e.key === 'ArrowLeft'
          ? (i - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : -1;
    if (to < 0) return;
    e.preventDefault();
    chooseLang(LANGS[to].id);
    langRefs.current[LANGS[to].id]?.focus();
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
          ref={inputRef}
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
            <div
              className="pdk-demo-langs"
              role="tablist"
              aria-label="Language"
              onKeyDown={onLangKey}
            >
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  ref={(el) => {
                    langRefs.current[l.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${id}-lang-${l.id}`}
                  aria-controls={`${id}-code`}
                  aria-selected={lang === l.id}
                  title={l.label}
                  tabIndex={lang === l.id ? 0 : -1}
                  onClick={() => chooseLang(l.id)}
                >
                  {SHORT[l.id]}
                </button>
              ))}
            </div>
            <button type="button" className="pdk-demo-copy" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span className="sr-only" role="status">
              {copied ? 'Code copied' : ''}
            </span>
          </div>
          <pre
            id={`${id}-code`}
            role="tabpanel"
            aria-labelledby={`${id}-lang-${lang}`}
            tabIndex={0}
          >
            <code>
              {code.split('\n').map((line, i) => (
                <span key={i} className="pdk-demo-line">
                  {line
                    ? // Don't break short strings like '35202-1234567-1' at a hyphen.
                      line
                        .split(/('[^' ]{1,18}'|"[^" ]{1,18}")/)
                        .map((part, j) =>
                          j % 2 ? (
                            <span key={j} className="pdk-demo-str">
                              {part}
                            </span>
                          ) : (
                            part
                          ),
                        )
                    : '\u00a0'}
                </span>
              ))}
            </code>
          </pre>
        </div>
        <p className="pdk-demo-note">
          Runs in your browser with the real library; nothing you type is sent
          anywhere. The code uses your value once it's valid, and the documented
          example until then.
        </p>
      </div>
    </div>
  );
}
