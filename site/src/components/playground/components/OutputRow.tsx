import { CopyButton } from './CopyButton'

interface OutputRowProps {
  label: string
  value: string
  mono?: boolean
  emptyText?: string
}

export function OutputRow({ label, value, mono = true, emptyText = '—' }: OutputRowProps) {
  const display = value || emptyText

  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="shrink-0 text-sm text-text-muted sm:pt-1.5">{label}</span>
      <div className="flex min-w-0 items-start gap-1 sm:justify-end">
        {/* Long values (IBANs, payloads) wrap instead of being cut off. */}
        <span
          className={`min-w-0 pt-1.5 text-sm text-text-heading [overflow-wrap:anywhere] sm:text-right ${
            mono ? 'font-mono' : ''
          }`}
        >
          {display}
        </span>
        {value && <CopyButton value={value} label={`Copy ${label}`} iconOnly />}
      </div>
    </div>
  )
}
