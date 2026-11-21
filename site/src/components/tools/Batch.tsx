import { useId, useRef, useState } from 'react';

/** At most this many lines are checked in one go (it all runs in the tab). */
const MAX_LINES = 5000;
/** Rows shown on the page; the download has them all. */
const SHOWN = 100;

export interface BatchColumn<T> {
  header: string;
  value: (row: T) => string;
}

/** The first field of a CSV line, with "quoted, values" unquoted. */
export function firstField(line: string): string {
  const text = line.trim();
  if (text.startsWith('"')) {
    let out = '';
    for (let i = 1; i < text.length; i += 1) {
      if (text[i] === '"') {
        if (text[i + 1] === '"') {
          out += '"';
          i += 1;
        } else break;
      } else out += text[i];
    }
    return out.trim();
  }
  return text.split(/[,;\t]/)[0].trim();
}

/**
 * One CSV cell. Quotes cells with commas, quotes or line breaks, and puts an
 * apostrophe before text that a spreadsheet would run as a formula.
 */
export function csvCell(value: string, guard = false): string {
  let text = value;
  if (guard && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Check many values at once: paste them or open a CSV file (first column),
 * see the results, and download them as CSV. The file is read in the browser
 * (FileReader) and the download is made in the browser (a Blob): nothing is
 * uploaded.
 */
export function Batch<T>({
  noun,
  run,
  columns,
  filename,
  summary,
}: {
  /** What one line is, e.g. "phone number". */
  noun: string;
  run: (value: string) => T;
  columns: BatchColumn<T>[];
  filename: string;
  summary: (rows: T[]) => string;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [header, setHeader] = useState(false);
  const [rows, setRows] = useState<{ input: string; out: T }[] | null>(null);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const check = () => {
    let lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (header) lines = lines.slice(1);
    const cut = lines.length > MAX_LINES;
    const done = lines
      .slice(0, MAX_LINES)
      .map((line) => firstField(line))
      .map((input) => ({ input, out: run(input) }));
    setRows(done);
    setMessage(
      done.length === 0
        ? `Nothing to check: add one ${noun} per line.`
        : `${summary(done.map((r) => r.out))}${cut ? ` Only the first ${MAX_LINES} lines were checked.` : ''}`,
    );
  };

  const open = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ''));
      setRows(null);
      setMessage(`Opened ${file.name}. Press "Check all".`);
    };
    reader.onerror = () => setMessage(`Couldn't read ${file.name}.`);
    reader.readAsText(file);
  };

  const download = () => {
    if (!rows) return;
    const lines = [
      ['input', ...columns.map((c) => c.header)].map((c) => csvCell(c)),
      ...rows.map((r) => [
        csvCell(r.input, true),
        ...columns.map((c) => csvCell(c.value(r.out))),
      ]),
    ].map((cells) => cells.join(','));
    const blob = new Blob([`${lines.join('\r\n')}\r\n`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <details className="pdk-card pdk-batch">
      <summary>Check many at once (CSV)</summary>
      <div className="pdk-field">
        <label htmlFor={`${id}-text`}>
          One {noun} per line, or a CSV with it in the first column
        </label>
        <textarea
          id={`${id}-text`}
          className="pdk-input mono"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="pdk-batch-actions">
        <label className="pdk-check">
          <input
            type="checkbox"
            checked={header}
            onChange={(e) => setHeader(e.target.checked)}
          />
          First line is a header
        </label>
        <button
          type="button"
          className="pdk-button"
          onClick={() => fileRef.current?.click()}
        >
          Open a CSV file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          hidden
          onChange={(e) => {
            open(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button type="button" className="pdk-button" onClick={check}>
          Check all
        </button>
        {rows && rows.length > 0 ? (
          <button type="button" className="pdk-button" onClick={download}>
            Download results (CSV)
          </button>
        ) : null}
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {rows && rows.length > 0 ? (
        <div className="pdk-table-wrap" tabIndex={0} aria-label="Results">
          <table className="pdk-table">
            <thead>
              <tr>
                <th scope="col">Input</th>
                {columns.map((c) => (
                  <th key={c.header} scope="col">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, SHOWN).map((r, i) => (
                <tr key={i}>
                  <td className="mono">{r.input}</td>
                  {columns.map((c) => (
                    <td key={c.header}>{c.value(r.out) || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > SHOWN ? (
            <p className="pdk-note">
              Showing the first {SHOWN} of {rows.length}; the download has them
              all.
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="pdk-note">
        The file is read by your browser and the results are made there too:
        nothing is uploaded.
      </p>
    </details>
  );
}
