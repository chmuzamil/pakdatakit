import { toolFor, track } from '../utils/track';
import { CopyButton } from './CopyButton';

interface CodePreviewProps {
  code: string;
  title?: string;
}

export function CodePreview({ code, title = 'Usage' }: CodePreviewProps) {
  const tool =
    typeof location !== 'undefined' ? toolFor(location.pathname) : undefined;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-code">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium text-text-muted">{title}</span>
        <CopyButton
          value={code}
          label="Copy snippet"
          onCopied={() => tool && track('code_copy', { tool })}
        />
      </div>
      <pre
        tabIndex={0}
        aria-label={`${title} code`}
        className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-text-heading"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
