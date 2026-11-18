import { useRef, type ReactNode, type SyntheticEvent } from 'react'
import { track } from '../utils/track'

interface PlaygroundShellProps {
  /** Shown by the page (Starlight's title and description); kept for the tool's own code. */
  title: string
  description: string
  input: ReactNode
  output: ReactNode
  code: ReactNode
  /** Tool slug for analytics, from the page; never what was typed. */
  tool?: string
}

export function PlaygroundShell({ input, output, code, tool }: PlaygroundShellProps) {
  // Tools run live as the visitor types, so tool_run counts the first interaction
  // with a tool's inputs per visit, not every keystroke.
  const ranRef = useRef(false)

  function handleInteraction(event: SyntheticEvent) {
    const slug = tool ?? (typeof location !== 'undefined' ? location.pathname.split('/').filter(Boolean).pop() : undefined)
    if (ranRef.current || !slug) return
    if (event.type === 'click' && !(event.target as Element).closest('button')) return
    ranRef.current = true
    track('tool_run', { tool: slug })
  }

  return (
    <div className="pdk-pg not-content">
      {/* minmax(0, …) columns and min-w-0 let wide content (code, payloads) scroll
          inside its own box instead of widening the page. */}
      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
        <div
          className="flex min-w-0 flex-col gap-4"
          onInputCapture={handleInteraction}
          onClickCapture={handleInteraction}
        >
          {input}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {output}
          {code}
        </div>
      </div>
    </div>
  )
}
