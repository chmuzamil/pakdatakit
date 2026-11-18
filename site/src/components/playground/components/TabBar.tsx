import { useRef, type KeyboardEvent } from 'react'

interface TabBarProps<T extends string> {
  tabs: readonly { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
  label?: string
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  label = 'Mode',
}: TabBarProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  // Arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern).
  function handleKeyDown(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1
    const next = (
      {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      } as Record<string, number>
    )[event.key]
    if (next === undefined) return
    event.preventDefault()
    onChange(tabs[next].id)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-raised p-1"
    >
      {tabs.map(({ id, label: tabLabel }, index) => {
        const selected = active === id
        return (
          <button
            key={id}
            ref={(el) => {
              buttons.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors lg:min-h-10 ${
              selected
                ? 'bg-surface-overlay text-text-heading shadow-sm ring-1 ring-border-strong/50'
                : 'text-text-muted hover:bg-surface-overlay/50 hover:text-text-heading'
            }`}
          >
            {tabLabel}
          </button>
        )
      })}
    </div>
  )
}
