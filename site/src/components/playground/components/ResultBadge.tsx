interface ResultBadgeProps {
  valid: boolean;
  validLabel?: string;
  invalidLabel?: string;
}

export function ResultBadge({
  valid,
  validLabel = 'Valid',
  invalidLabel = 'Invalid',
}: ResultBadgeProps) {
  return (
    // Announced through the Result card's live region (Card `live`), which is
    // always on the page; a live region mounted with its content often isn't.
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ${
        valid
          ? 'border border-success/30 bg-success-muted text-success'
          : 'border border-error/30 bg-error-muted text-error'
      }`}
    >
      <svg
        key={String(valid)}
        className="pdk-pop"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d={valid ? 'M5 12l5 5L20 7' : 'M6 6l12 12M18 6L6 18'}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {valid ? validLabel : invalidLabel}
    </span>
  );
}
