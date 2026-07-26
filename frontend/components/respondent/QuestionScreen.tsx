'use client';

import { CornerDownLeft } from 'lucide-react';
import type { Question } from '@/lib/types';
import type { AnswerValue } from '@/lib/validation';
import AnswerField from './fields/AnswerField';

/**
 * One full-screen question: number badge in the gutter, headline, optional help
 * text, the input, then the OK affordance.
 *
 * Geometry is the measured Typeform layout — a 720px column centred in the
 * viewport with the badge sitting 26px into the left gutter.
 */
export default function QuestionScreen({
  question,
  index,
  value,
  error,
  onChange,
  onAdvance,
  isLast,
  submitting,
  animationClass,
}: {
  question: Question;
  index: number;
  value: AnswerValue;
  error: string | null;
  onChange: (v: AnswerValue) => void;
  onAdvance: () => void;
  isLast: boolean;
  submitting: boolean;
  animationClass: string;
}) {
  // Choice-style inputs advance themselves on selection, so a persistent OK
  // button would be redundant — Typeform only shows it once something is picked.
  const autoAdvances =
    question.question_type === 'multiple_choice' ||
    question.question_type === 'yes_no' ||
    question.question_type === 'rating' ||
    question.question_type === 'dropdown';
  const hasValue = Array.isArray(value) ? value.length > 0 : value !== '' && value != null;
  // An optional choice question still needs a way past it without answering;
  // hiding OK until something was picked left the tiny nav arrows as the only
  // way to skip one.
  const showOk = !autoAdvances || hasValue || !question.is_required;

  return (
    <div
      className="flex w-full items-center justify-center px-6"
      style={{ minHeight: 'var(--tf-screen-h)' }}
    >
      <div className={`relative w-full ${animationClass}`} style={{ maxWidth: 'var(--tf-block-width)' }}>
        {/* Question number, in the gutter to the left of the column */}
        <span
          className="absolute flex select-none items-center justify-center font-bold"
          style={{
            left: 'calc(var(--tf-badge-gutter) * -1)',
            top: 6,
            width: 16,
            height: 19,
            borderRadius: 3,
            fontSize: 11,
            backgroundColor: 'var(--tf-primary)',
            color: 'var(--tf-primary-text)',
          }}
          aria-hidden
        >
          {index + 1}
        </span>

        <h2
          className="font-normal"
          style={{
            fontSize: 'var(--tf-title-size)',
            lineHeight: 'var(--tf-title-line)',
            color: 'var(--tf-text)',
            fontFamily: 'var(--tf-font)',
          }}
        >
          {question.title}
          {question.is_required && (
            <span aria-hidden style={{ color: 'var(--tf-primary)' }}> *</span>
          )}
        </h2>

        {question.description && (
          <p
            className="mt-2"
            style={{
              fontSize: 'var(--tf-label-size)',
              color: `rgba(var(--tf-text-rgb), 0.65)`,
              fontFamily: 'var(--tf-font)',
            }}
          >
            {question.description}
          </p>
        )}

        {/* Measured gap from headline to answer body */}
        <div style={{ marginTop: 'var(--sp-450)' }}>
          <AnswerField
            question={question}
            value={value}
            onChange={onChange}
            onAdvance={onAdvance}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-center gap-1.5 text-sm font-medium animate-fadeIn"
            style={{ color: '#d92d20' }}
          >
            {error}
          </p>
        )}

        {showOk && (
          <div className="flex items-center animate-fadeIn" style={{ marginTop: 'var(--sp-400)', gap: 'var(--sp-150)' }}>
            <button
              type="button"
              onClick={onAdvance}
              disabled={submitting}
              className="tf-interactive flex items-center justify-center font-semibold disabled:opacity-60"
              style={{
                height: 'var(--tf-ok-height)',
                paddingInline: 'var(--sp-250)',
                borderRadius: 8,
                fontSize: 'var(--tf-ok-size)',
                backgroundColor: 'var(--tf-primary)',
                color: 'var(--tf-primary-text)',
                fontFamily: 'var(--tf-font)',
              }}
            >
              {submitting ? 'Submitting…' : isLast ? 'Submit' : 'OK'}
            </button>
            <span
              className="tf-key-hint hidden items-center gap-1 text-xs sm:flex"
              style={{ color: `rgba(var(--tf-text-rgb), 0.55)` }}
            >
              press <strong className="font-semibold">Enter</strong>
              <CornerDownLeft size={12} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
