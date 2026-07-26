'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Paired prev/next control pinned bottom-right.
 *
 * Measured: two 32px buttons, 2px apart, 32px from the bottom/right edges, with
 * the outer corners rounded 8px and the inner corners 2px so the pair reads as
 * one segmented control.
 */
export default function NavButtons({
  onPrev,
  onNext,
  canPrev,
  canNext,
  anchor = 'fixed',
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  /** 'absolute' keeps the pair inside a preview frame instead of the viewport. */
  anchor?: 'fixed' | 'absolute';
}) {
  const base = 'tf-interactive flex items-center justify-center';
  const box = {
    width: 'var(--tf-nav-size)',
    height: 'var(--tf-nav-size)',
    backgroundColor: `rgba(var(--tf-primary-rgb), 0.14)`,
  } as React.CSSProperties;

  return (
    <div className={`${anchor} bottom-8 right-8 z-30 flex`} style={{ gap: 2 }}>
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous question"
        className={base}
        style={{
          ...box,
          borderRadius: '8px 2px 2px 8px',
          color: 'var(--tf-primary)',
          opacity: canPrev ? 1 : 0.35,
          cursor: canPrev ? 'pointer' : 'not-allowed',
        }}
      >
        <ChevronUp size={18} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next question"
        className={base}
        style={{
          ...box,
          borderRadius: '2px 8px 8px 2px',
          color: 'var(--tf-primary)',
          opacity: canNext ? 1 : 0.35,
          cursor: canNext ? 'pointer' : 'not-allowed',
        }}
      >
        <ChevronDown size={18} />
      </button>
    </div>
  );
}
