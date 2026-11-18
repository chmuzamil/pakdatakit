import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function Card({ title, description, children, className = '' }: CardProps) {
  return (
    <section
      className={`rounded-lg border border-border bg-surface-overlay p-5 ${className}`}
    >
      {(title || description) && (
        <header className="mb-4">
          {title && (
            <h3 className="text-sm font-semibold tracking-wide text-text-heading uppercase">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
