'use client';

import { useEffect } from 'react';
import { Clock, CornerDownLeft } from 'lucide-react';

/**
 * Opening screen. Unlike the questions (which are left-aligned in the 720px
 * column) the welcome card is centred, matching the live renderer.
 */
export default function WelcomeScreen({
  title,
  description,
  questionCount,
  onStart,
}: {
  title: string;
  description?: string | null;
  questionCount: number;
  onStart: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onStart();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  // Typeform quotes a rough duration; ~4 questions a minute is its ballpark.
  const minutes = Math.max(1, Math.round(questionCount / 4));

  return (
    <div
      className="flex w-full items-center justify-center px-6"
      style={{ minHeight: 'var(--tf-screen-h)' }}
    >
      <div className="tf-enter-fwd flex w-full max-w-[720px] flex-col items-center text-center">
        <h1
          className="font-normal"
          style={{
            fontSize: 38,
            lineHeight: '44px',
            color: 'var(--tf-text)',
            fontFamily: 'var(--tf-font)',
          }}
        >
          {title}
        </h1>

        {description && (
          <p
            className="mt-3"
            style={{
              fontSize: 'var(--tf-label-size)',
              lineHeight: '28px',
              color: `rgba(var(--tf-text-rgb), 0.7)`,
              fontFamily: 'var(--tf-font)',
            }}
          >
            {description}
          </p>
        )}

        <div className="mt-8 flex items-center" style={{ gap: 'var(--sp-150)' }}>
          <button
            type="button"
            onClick={onStart}
            className="tf-interactive font-semibold"
            style={{
              height: 'var(--tf-ok-height)',
              paddingInline: 'var(--sp-300)',
              borderRadius: 8,
              fontSize: 'var(--tf-ok-size)',
              backgroundColor: 'var(--tf-primary)',
              color: 'var(--tf-primary-text)',
              fontFamily: 'var(--tf-font)',
            }}
          >
            Start
          </button>
          <span
            className="hidden items-center gap-1 text-xs sm:flex"
            style={{ color: `rgba(var(--tf-text-rgb), 0.55)` }}
          >
            press <strong className="font-semibold">Enter</strong>
            <CornerDownLeft size={12} />
          </span>
        </div>

        <p
          className="mt-4 flex items-center gap-1.5 text-sm"
          style={{ color: `rgba(var(--tf-text-rgb), 0.6)` }}
        >
          <Clock size={13} />
          Takes {minutes} minute{minutes > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
