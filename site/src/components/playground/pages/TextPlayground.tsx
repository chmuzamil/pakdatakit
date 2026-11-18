import { useId, useMemo, useRef, useState } from 'react';
import {
  normalizeRomanUrdu,
  normalizeText,
  toEnglishDigits,
  toUrduDigits,
} from 'pakdatakit';
import { Card } from '../components/Card';
import { CodePreview } from '../components/CodePreview';
import { OutputRow } from '../components/OutputRow';
import { PlaygroundShell } from '../components/PlaygroundShell';
import { TabBar, TabPanel } from '../components/TabBar';
import { escapeForCode, examples, inputClassName } from '../utils/examples';

type TextMode = 'normalize' | 'roman' | 'digits';

export function TextPlayground() {
  const panel = useId();
  const inputId = useId();
  // Once the visitor has typed, switching modes keeps their text.
  const edited = useRef(false);
  const [mode, setMode] = useState<TextMode>('normalize');
  const [input, setInput] = useState<string>(
    mode === 'roman'
      ? examples.romanUrdu
      : mode === 'digits'
        ? '0300 ۱۲۳۴۵۶۷'
        : examples.text,
  );

  const output = useMemo(() => {
    if (!input.trim()) return '';
    switch (mode) {
      case 'normalize':
        return normalizeText(input);
      case 'roman':
        return normalizeRomanUrdu(input);
      case 'digits':
        return toUrduDigits(input);
      default:
        return '';
    }
  }, [input, mode]);

  const englishDigits = useMemo(() => {
    if (!input.trim() || mode !== 'digits') return '';
    return toEnglishDigits(input);
  }, [input, mode]);

  const codeByMode: Record<TextMode, string> = {
    normalize: `import { normalizeText } from "pakdatakit";

normalizeText("${escapeForCode(input || examples.text)}"); // → "${escapeForCode(output || '')}"`,
    roman: `import { normalizeRomanUrdu } from "pakdatakit";

normalizeRomanUrdu("${escapeForCode(input || examples.romanUrdu)}"); // → "${escapeForCode(output || '')}"`,
    digits: `import { toUrduDigits, toEnglishDigits } from "pakdatakit";

toUrduDigits("${escapeForCode(input || '0300 ۱۲۳۴۵۶۷')}");    // → "${escapeForCode(output || '')}"
toEnglishDigits("${escapeForCode(input || '0300 ۱۲۳۴۵۶۷')}"); // → "${escapeForCode(englishDigits || '')}"`,
  };

  function handleModeChange(next: TextMode) {
    setMode(next);
    if (edited.current && input.trim()) return;
    if (next === 'normalize') setInput(examples.text);
    else if (next === 'roman') setInput(examples.romanUrdu);
    else setInput('0300 ۱۲۳۴۵۶۷');
  }

  return (
    <PlaygroundShell
      title="Text Utils"
      description="Normalize text, Roman Urdu spellings, and convert between English and Urdu digits."
      input={
        <Card title="Input">
          <TabBar
            tabs={[
              { id: 'normalize', label: 'Normalize' },
              { id: 'roman', label: 'Roman Urdu' },
              { id: 'digits', label: 'Digits' },
            ]}
            active={mode}
            onChange={handleModeChange}
            panelId={panel}
          />
          <TabPanel id={panel} active={mode}>
            <label htmlFor={inputId} className="sr-only">
              Text input
            </label>
            <input
              id={inputId}
              type="text"
              dir="auto"
              value={input}
              onChange={(e) => {
                edited.current = true;
                setInput(e.target.value);
              }}
              placeholder={
                mode === 'roman'
                  ? 'ap kia ker rhe ho'
                  : mode === 'digits'
                    ? '0300 ۱۲۳۴۵۶۷'
                    : '  Hello   World  '
              }
              className={`${inputClassName} mt-3`}
            />
          </TabPanel>
        </Card>
      }
      output={
        <Card title="Result">
          {!input.trim() ? (
            <p className="text-sm text-text-muted">Enter text to transform.</p>
          ) : mode === 'digits' ? (
            <>
              <OutputRow label="toUrduDigits()" value={output} dir="auto" />
              <OutputRow
                label="toEnglishDigits()"
                value={englishDigits}
                dir="auto"
              />
            </>
          ) : (
            <OutputRow
              label={
                mode === 'normalize'
                  ? 'normalizeText()'
                  : 'normalizeRomanUrdu()'
              }
              value={output}
              mono={false}
              dir="auto"
            />
          )}
        </Card>
      }
      code={<CodePreview code={codeByMode[mode]} />}
    />
  );
}
