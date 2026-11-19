import { useId, useState } from 'react';
import { isRTL, slugify, toEnglishDigits, toUrduDigits } from 'pakdatakit/text';
import { Rows } from './common';

/** Urdu (right-to-left) output is marked up so it gets the Urdu font. */
function Out({ text }: { text: string }) {
  if (text === '') return null;
  return isRTL(text) ? (
    <span lang="ur" dir="rtl">
      {text}
    </span>
  ) : (
    <>{text}</>
  );
}

export default function TextWidget({
  initial = 'لاہور قلعہ ۲۰۲۴',
}: {
  initial?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const rtl = isRTL(value);
  const slug = slugify(value);
  return (
    <div className="pdk-card" data-widget="text">
      <div className="pdk-field">
        <label htmlFor={id}>Try some Urdu or English text</label>
        <input
          id={id}
          className="pdk-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          dir="auto"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p aria-live="polite">
        <code>slugify()</code> → <Out text={slug} />
        {slug === '' ? "'' (nothing left)" : null}
      </p>
      <Rows
        rows={[
          ['Latin-only slug', slugify(value, { script: 'latin' })],
          ['Reads right to left', rtl ? 'Yes' : 'No', 'text'],
          ['Urdu digits', value ? <Out text={toUrduDigits(value)} /> : null],
          [
            'English digits',
            value ? <Out text={toEnglishDigits(value)} /> : null,
          ],
        ]}
      />
    </div>
  );
}
