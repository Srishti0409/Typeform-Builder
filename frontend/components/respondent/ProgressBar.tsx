'use client';

/**
 * Top progress indicator.
 *
 * Measured from the live renderer: an 11px band at the top of the viewport
 * holding a 3px track inset 6px horizontally and 4px from the top, fully
 * rounded, with the fill animating `width 0.2s ease-in-out`.
 */
export default function ProgressBar({
  value,
  anchor = 'fixed',
}: {
  value: number;
  /** 'absolute' keeps the bar inside a preview frame instead of the viewport. */
  anchor?: 'fixed' | 'absolute';
}) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`${anchor} left-0 right-0 top-0 z-30`}
      style={{ height: 11 }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Form progress"
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
    </div>
  );
}
