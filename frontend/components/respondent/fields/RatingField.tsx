'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import type { Question } from '@/lib/types';
import type { AnswerValue } from '@/lib/validation';

/**
 * Rating scale. Supports Typeform's two shapes — a star row, or numbered
 * segments — and answers to number-key presses.
 */
export default function RatingField({
  question,
  value,
  onChange,
  onAdvance,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  onAdvance: () => void;
}) {
  const max = Number(question.settings?.max_rating ?? 5);
  const shape = (question.settings?.shape as string) ?? 'star';
  const [hover, setHover] = useState<number | null>(null);
  const current = Number(value ?? 0);

  function pick(n: number) {
    onChange(n);
    setTimeout(onAdvance, 260);
  }

  // Number keys pick a rating directly.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= max) {
        e.preventDefault();
        pick(n);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [max]);

  const values = Array.from({ length: max }, (_, i) => i + 1);

  if (shape === 'number') {
    return (
      <div className="flex flex-wrap" style={{ gap: 'var(--sp-100)' }} role="radiogroup" aria-label={question.title}>
        {values.map(n => {
          const active = current === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(n)}
              className="tf-interactive flex items-center justify-center border font-medium"
              style={{
                width: 'var(--tf-choice-height)',
                height: 'var(--tf-choice-height)',
                borderRadius: 8,
                fontSize: 'var(--tf-choice-size)',
                backgroundColor: active ? 'rgba(var(--tf-primary-rgb), 0.28)' : 'var(--tf-choice-bg)',
                borderColor: 'var(--tf-choice-border)',
                color: 'var(--tf-text)',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.backgroundColor = 'var(--tf-choice-hover-bg)';
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.backgroundColor = 'var(--tf-choice-bg)';
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    );
  }

  const lit = hover ?? current;

  return (
    <div
      className="flex items-center"
      style={{ gap: 'var(--sp-100)' }}
      role="radiogroup"
      aria-label={question.title}
      onMouseLeave={() => setHover(null)}
    >
      {values.map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={current === n}
          aria-label={`${n} of ${max}`}
          onClick={() => pick(n)}
          onMouseEnter={() => setHover(n)}
          className="tf-interactive p-1"
          style={{ color: 'var(--tf-primary)' }}
        >
          <Star
            size={34}
            strokeWidth={1.5}
            fill={n <= lit ? 'currentColor' : 'none'}
            style={{ opacity: n <= lit ? 1 : 0.45 }}
          />
        </button>
      ))}
      <span className="ml-3 text-base" style={{ color: 'var(--tf-placeholder)' }}>
        {current > 0 ? `${current} of ${max}` : ''}
      </span>
    </div>
  );
}
