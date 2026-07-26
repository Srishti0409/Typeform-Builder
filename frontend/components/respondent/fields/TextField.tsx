'use client';

import { useEffect, useRef } from 'react';
import type { Question } from '@/lib/types';
import { numberBounds, type AnswerValue } from '@/lib/validation';
import { effectivePlaceholder } from '@/lib/question-types';

/**
 * Text-ish inputs: short_text, long_text, email, number.
 *
 * Styling is the measured Typeform treatment — no box, just an underline, with
 * oversized 26px type and a 50px line box.
 */
export default function TextField({
  question,
  value,
  onChange,
  onEnter,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  onEnter: () => void;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Each question mounts fresh, so focusing on mount is what puts the caret in
  // the right place as the respondent advances.
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const isLong = question.question_type === 'long_text';

  // Read through the same helper validateAnswer() uses, so the native attributes
  // never advertise a limit the validator doesn't enforce (or vice versa).
  const bounds = question.question_type === 'number' ? numberBounds(question) : null;

  // Shared with the builder canvas, so the field the author sees while editing
  // is the field the respondent gets.
  const placeholder = effectivePlaceholder(question);

  const shared = {
    value: (value as string) ?? '',
    placeholder,
    'aria-label': question.title,
    className: 'tf-input w-full bg-transparent outline-none transition-colors duration-200',
    // Borders are set inline because globals.css resets `input { border: none }`,
    // which zeroes border-style and would otherwise hide the underline entirely.
    style: {
      fontSize: 'var(--tf-input-size)',
      color: 'var(--tf-text)',
      borderStyle: 'none',
      borderBottomStyle: 'solid',
      borderBottomWidth: 1,
      borderBottomColor: 'var(--tf-underline)',
      fontFamily: 'var(--tf-font)',
    } as React.CSSProperties,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderBottomColor = 'var(--tf-underline-focus)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderBottomColor = 'var(--tf-underline)';
    },
  };

  if (isLong) {
    return (
      <textarea
        {...shared}
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        rows={2}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          // Shift+Enter inserts a newline; plain Enter advances, as in Typeform.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onEnter();
          }
        }}
        className={`${shared.className} resize-none overflow-hidden leading-[1.4]`}
        style={{ ...shared.style, minHeight: 'var(--tf-input-height)' }}
        onInput={e => {
          // Grow with content rather than scrolling inside a fixed box.
          const el = e.currentTarget;
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
        }}
      />
    );
  }

  return (
    <input
      {...shared}
      ref={ref as React.RefObject<HTMLInputElement>}
      type={question.question_type === 'number' ? 'number' : question.question_type === 'email' ? 'email' : 'text'}
      inputMode={question.question_type === 'number' ? 'decimal' : undefined}
      min={bounds?.min ?? undefined}
      max={bounds?.max ?? undefined}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        }
      }}
      style={{ ...shared.style, height: 'var(--tf-input-height)' }}
    />
  );
}
