import { useState } from 'react'
import { copyToClipboard } from '../utils/examples'

interface CopyButtonProps {
  value: string
  label?: string
  /** Show only the icon; `label` becomes the accessible name. */
  iconOnly?: boolean
  className?: string
  /** Called after a successful copy. */
  onCopied?: () => void
}

export function CopyButton({
  value,
  label = 'Copy',
  iconOnly = false,
  className = '',
  onCopied,
}: CopyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function handleCopy() {
    const copied = await copyToClipboard(value)
    setStatus(copied ? 'copied' : 'failed')
    if (copied) onCopied?.()
    window.setTimeout(() => setStatus('idle'), 1500)
  }

  const text = status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : label

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!value}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        className={
          iconOnly
            ? `grid size-8 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text-heading disabled:cursor-not-allowed disabled:opacity-40 ${
                status === 'copied' ? 'text-success' : ''
              } ${className}`
            : `inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2.5 text-xs font-medium text-text-muted transition-colors hover:border-accent/40 hover:text-text-heading disabled:cursor-not-allowed disabled:opacity-40 ${className}`
        }
      >
        {status === 'copied' ? <CheckIcon /> : <CopyIcon />}
        {!iconOnly && text}
      </button>
      <span role="status" className="sr-only">
        {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : ''}
      </span>
    </>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
