interface ResultBadgeProps {
  valid: boolean;
  validLabel?: string;
  invalidLabel?: string;
}

export function ResultBadge({
  valid,
  validLabel = 'valid',
  invalidLabel = 'invalid',
}: ResultBadgeProps) {
  return (
    // Announced through the Result card's live region (Card `live`), which is
    // always on the page; a live region mounted with its content often isn't.
    // A test-runner line, as on the rest of the site: "✓ valid".
    <span
      key={String(valid)}
      className={`pdk-badge pdk-pop ${valid ? 'valid' : 'invalid'}`}
    >
      <span aria-hidden="true">{valid ? '\u2713 ' : '\u2717 '}</span>
      {valid ? validLabel : invalidLabel}
    </span>
  );
}
