'use client';

/**
 * Top progress indicator: the measured bar, plus the respondent's position in
 * words.
 *
 * Measured from the live renderer: an 11px band at the top of the viewport
 * holding a 3px track inset 6px horizontally and 4px from the top, fully
 * rounded, with the fill animating `width 0.2s ease-in-out`. The count sits just
 * under it, right-aligned, so it reads as part of the same indicator without
 * displacing any of the question layout.
 */
export default function ProgressBar({
  value,
  anchor = 'fixed',
  current,
  total,
}: {
  value: number;
  /** 'absolute' keeps the bar inside a preview frame instead of the viewport. */
  anchor?: 'fixed' | 'absolute';
  /** 1-based position among the form's questions. Omit to show the bar alone. */
  current?: number;
  /** How many questions the form has — the welcome and ending are not among them. */
  total?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const showCount = typeof current === 'number' && typeof total === 'number' && total > 0;
  const label = showCount ? `${current} of ${total}` : undefined;

  return (
    <div
      className={`${anchor} left-0 right-0 top-0 z-30`}
      style={{ height: 11 }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Form progress"
      // Screen readers announce the position rather than a bare percentage.
      aria-valuetext={label ? `Question ${label}` : undefined}
    >
      <div
        className="absolute overflow-hidden"
        style={{
          left: 'var(--tf-progress-inset, 6px)',
          right: 'var(--tf-progress-inset, 6px)',
          top: 4,
          height: 'var(--tf-progress-height)',
          borderRadius: 32,
          backgroundColor: `rgba(var(--tf-text-rgb), 0.25)`,
        }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            borderRadius: 32,
            backgroundColor: 'var(--tf-primary)',
            transition: `width var(--tf-progress-dur) ease-in-out`,
          }}
        />
      </div>

      {showCount && (
        <span
          data-qa="progress-count"
          className="pointer-events-none absolute select-none text-xs font-medium tabular-nums"
          style={{
            right: 'var(--tf-progress-inset, 6px)',
            top: 12,
            color: `rgba(var(--tf-text-rgb), 0.55)`,
            fontFamily: 'var(--tf-font)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
