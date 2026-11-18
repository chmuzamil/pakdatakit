import { CopyButton } from './CopyButton'

interface ResultListProps {
  label: string
  items: string[]
  emptyText?: string
  maxHeight?: string
}

export function ResultList({
  label,
  items,
  emptyText = 'No matches found.',
  maxHeight = 'max-h-64',
}: ResultListProps) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-text-muted">
          {label} ({items.length})
        </span>
        {items.length > 0 && <CopyButton value={items.join(', ')} label="Copy all" />}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyText}</p>
      ) : (
        <ul
          tabIndex={0}
          aria-label={label}
          className={`${maxHeight} space-y-0.5 overflow-y-auto overscroll-contain rounded-md border border-border bg-surface/50 p-1`}
        >
          {items.map((item) => (
            <li
              key={item}
              className="flex min-w-0 items-center justify-between gap-2 rounded px-2 py-0.5 text-sm text-text-heading hover:bg-surface"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{item}</span>
              <CopyButton value={item} label={`Copy ${item}`} iconOnly />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
