import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /**
   * Announce changes to the card's content to screen readers (polite). The
   * card is always on the page, so the first result is announced too.
   */
  live?: boolean;
}

export function Card({
  title,
  description,
  children,
  className = '',
  live = false,
}: CardProps) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface-raised p-5 ${className}`}
    >
      {(title || description) && (
        <header className="mb-4">
          {title && (
            <h2 className="text-base font-semibold text-text-heading">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          )}
        </header>
      )}
      {live ? <div aria-live="polite">{children}</div> : children}
    </section>
  );
}
