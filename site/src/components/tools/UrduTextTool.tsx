import { useEffect, useId, useRef, useState } from 'react';
import {
  compareUrdu,
  normalizeRomanUrdu,
  slugify,
  toEnglishDigits,
  toUrduDigits,
  wrapBidi,
  type BidiDirection,
  type SlugScript,
} from 'pakdatakit/text';
import {
  PrivacyNote,
  ShareButton,
  trackTool,
  useHashState,
} from '../widgets/common';

const OPS = {
  slug: 'Slug for a URL',
  sort: 'Sort lines in Urdu order',
  'to-urdu': 'Digits to Urdu',
  'to-english': 'Digits to English (0–9)',
  bidi: 'Wrap for mixed Urdu and English (bidi isolate)',
  roman: 'Normalize Roman Urdu spelling',
} as const;
type Op = keyof typeof OPS;

const SAMPLES: Record<Op, string> = {
  slug: 'لاہور کی بہترین بریانی 2026',
  sort: 'ے\nبھائی\nآم\nباغ\nاب',
  'to-urdu': 'آرڈر 1042 کی قیمت 2450 روپے',
  'to-english': 'آرڈر ۱۰۴۲ کی قیمت ۲۴۵۰ روپے',
  bidi: 'PDK-1042',
  roman: 'mujhy ap ka order nai mila',
};

/** Code points of the invisible bidi controls, so they can be seen. */
const CONTROL: Record<string, string> = {
  '\u2066': '[LRI]',
  '\u2067': '[RLI]',
  '\u2068': '[FSI]',
  '\u2069': '[PDI]',
};

function run(
  op: Op,
  text: string,
  script: SlugScript,
  dir: BidiDirection,
): string {
  switch (op) {
    case 'slug':
      return slugify(text, { script });
    case 'sort':
      return text
        .split(/\r?\n/)
        .filter((l) => l.trim() !== '')
        .sort(compareUrdu)
        .join('\n');
    case 'to-urdu':
      return toUrduDigits(text);
    case 'to-english':
      return toEnglishDigits(text);
    case 'bidi':
      return wrapBidi(text, dir);
    case 'roman':
      return normalizeRomanUrdu(text);
  }
}

export default function UrduTextTool() {
  const id = useId();
  const [state, set] = useHashState(
    { op: 'slug', text: '', script: 'any', dir: 'auto' },
    false,
  );
  const [copied, setCopied] = useState('');
  const tracked = useRef(false);
  const op = (state.op in OPS ? state.op : 'slug') as Op;
  const script = (
    ['any', 'latin', 'urdu'].includes(state.script) ? state.script : 'any'
  ) as SlugScript;
  const dir = (
    ['auto', 'rtl', 'ltr'].includes(state.dir) ? state.dir : 'auto'
  ) as BidiDirection;
  const output = state.text ? run(op, state.text, script, dir) : '';
  const visible = output.replace(/[\u2066-\u2069]/g, (c) => CONTROL[c]);
  useEffect(() => {
    if (state.text && !tracked.current) {
      tracked.current = true;
      trackTool('urdu-text');
    }
  }, [state.text]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied('Result copied to the clipboard');
    } catch {
      setCopied("Couldn't copy: select the result and copy it by hand");
    }
    window.setTimeout(() => setCopied(''), 2500);
  };
  return (
    <div>
      <div className="pdk-card">
        <fieldset className="pdk-fieldset">
          <legend>What to do</legend>
          {(Object.keys(OPS) as Op[]).map((k) => (
            <label key={k} className="pdk-check">
              <input
                type="radio"
                name={`${id}-op`}
                value={k}
                checked={op === k}
                onChange={() => set({ op: k })}
              />
              {OPS[k]}
              {k === 'to-urdu' ? (
                <>
                  {' '}
                  (<span lang="ur">۰–۹</span>)
                </>
              ) : null}
            </label>
          ))}
        </fieldset>
        {op === 'slug' ? (
          <div className="pdk-field">
            <label htmlFor={`${id}-script`}>Letters to keep</label>
            <select
              id={`${id}-script`}
              className="pdk-select"
              value={script}
              onChange={(e) => set({ script: e.target.value })}
            >
              <option value="any">Urdu and Latin</option>
              <option value="latin">Latin only (a-z)</option>
              <option value="urdu">Urdu only</option>
            </select>
          </div>
        ) : null}
        {op === 'bidi' ? (
          <div className="pdk-field">
            <label htmlFor={`${id}-dir`}>Direction of the wrapped text</label>
            <select
              id={`${id}-dir`}
              className="pdk-select"
              value={dir}
              onChange={(e) => set({ dir: e.target.value })}
            >
              <option value="auto">Auto (first strong letter)</option>
              <option value="rtl">Right to left</option>
              <option value="ltr">Left to right</option>
            </select>
          </div>
        ) : null}
        <div className="pdk-field">
          <label htmlFor={`${id}-text`}>
            {op === 'sort' ? 'Words or lines to sort, one per line' : 'Text'}
          </label>
          <textarea
            id={`${id}-text`}
            className="pdk-input"
            rows={op === 'sort' ? 6 : 3}
            dir="auto"
            lang="ur"
            value={state.text}
            onChange={(e) => set({ text: e.target.value })}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="pdk-actions">
          <button
            type="button"
            className="pdk-button"
            onClick={() => set({ text: SAMPLES[op] })}
          >
            Try a sample
          </button>
          <button
            type="button"
            className="pdk-button"
            onClick={copy}
            disabled={!output}
          >
            Copy result
          </button>
          <span role="status" className="sr-only">
            {copied}
          </span>
        </div>
        <h2 className="pdk-subhead" id={`${id}-out`}>
          Result
        </h2>
        <p
          className="pdk-output pdk-card"
          dir="auto"
          lang={op === 'slug' && script === 'latin' ? undefined : 'ur'}
          aria-labelledby={`${id}-out`}
          aria-live="polite"
        >
          {output || '—'}
        </p>
        {op === 'bidi' && output ? (
          <p className="pdk-note">
            With the invisible controls shown: <code dir="ltr">{visible}</code>.
            Put the wrapped text inside a sentence in the other direction, for
            example an order number in an Urdu message.
          </p>
        ) : null}
        {op === 'sort' ? (
          <p className="pdk-note">
            Follows the Unicode CLDR collation for Urdu. Pakistan's National
            Language Promotion Department does not publish a sort order online.
          </p>
        ) : null}
        <ShareButton state={state} personal />
      </div>
      <PrivacyNote />
    </div>
  );
}
