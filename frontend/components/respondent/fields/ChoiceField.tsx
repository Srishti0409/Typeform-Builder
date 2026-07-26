'use client';

import { useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import type { Question } from '@/lib/types';
import type { AnswerValue } from '@/lib/validation';
import { resolveChoices } from '@/lib/choices';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Choice rows for multiple_choice and yes_no.
 *
 * Measured Typeform treatment: 44px rows, 8px gap, a 24px letter-key badge, and
 * a keyboard shortcut per row. Single-select auto-advances; multi-select waits
 * for OK so the respondent can finish choosing.
 */
export default function ChoiceField({
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
  const isYesNo = question.question_type === 'yes_no';
  const allowMultiple = !isYesNo && Boolean(question.settings?.allow_multiple);

  // Randomisation must settle once per respondent rather than reshuffling on
  // every re-render, so the order is memoised against the inputs that define it.
  const optionsKey = (question.options ?? []).join('|');
  const { randomize, other_option: otherOption, none_option: noneOption } = question.settings ?? {};
  const options = useMemo(
    () => (isYesNo ? ['Yes', 'No'] : resolveChoices(question)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id, isYesNo, optionsKey, randomize, otherOption, noneOption]
  );
  // yes_no persists lowercase 'yes'/'no' to match the backend's coercion.
  const valueOf = (opt: string) => (isYesNo ? opt.toLowerCase() : opt);

  const selected: string[] = Array.isArray(value)
    ? value
    : value === null || value === undefined || value === ''
      ? []
      : [String(value)];

  function pick(opt: string) {
    const v = valueOf(opt);
    if (allowMultiple) {
      const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v];
      onChange(next);
      return;
    }
    onChange(allowMultiple ? [v] : v);
    // Brief pause so the selected state is visible before the screen changes.
    setTimeout(onAdvance, 260);
  }

  // Letter shortcuts, the way Typeform lets you answer without the mouse.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      const idx = LETTERS.indexOf(e.key.toUpperCase());
      if (idx >= 0 && idx < options.length) {
        e.preventDefault();
        pick(options[idx]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // `selected` is read inside pick(), so the handler must see current state.
  }, [options, selected.join('|')]);

  return (
    <div
      className="flex flex-col"
      style={{ gap: 'var(--sp-100)', maxWidth: 'var(--tf-block-width)' }}
      role={allowMultiple ? 'group' : 'radiogroup'}
      aria-label={question.title}
    >
      {options.map((opt, i) => {
        const isSel = selected.includes(valueOf(opt));
        return (
          <button
            key={opt + i}
            type="button"
            role={allowMultiple ? 'checkbox' : 'radio'}
            aria-checked={isSel}
            onClick={() => pick(opt)}
            className="tf-interactive group flex items-center text-left border"
            style={{
              minHeight: 'var(--tf-choice-height)',
              minWidth: 256,
              maxWidth: '100%',
              borderRadius: 8,
              paddingInline: 'var(--sp-100)',
              gap: 'var(--sp-150)',
              backgroundColor: isSel ? `rgba(var(--tf-primary-rgb), 0.28)` : 'var(--tf-choice-bg)',
              borderColor: 'var(--tf-choice-border)',
              color: 'var(--tf-text)',
              fontFamily: 'var(--tf-font)',
            }}
            onMouseEnter={e => {
              if (!isSel) e.currentTarget.style.backgroundColor = 'var(--tf-choice-hover-bg)';
            }}
            onMouseLeave={e => {
              if (!isSel) e.currentTarget.style.backgroundColor = 'var(--tf-choice-bg)';
            }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0 font-semibold"
              style={{
                width: 'var(--tf-choice-key)',
                height: 'var(--tf-choice-key)',
                borderRadius: 4,
                fontSize: 12,
                backgroundColor: 'var(--tf-choice-key-bg)',
                color: 'var(--tf-text)',
              }}
            >
              {LETTERS[i] ?? i + 1}
            </span>
            <span className="flex-1 py-1" style={{ fontSize: 'var(--tf-choice-size)' }}>
              {opt}
            </span>
            {isSel && (
              <Check size={18} className="flex-shrink-0 mr-1" style={{ color: 'var(--tf-primary)' }} />
            )}
          </button>
        );
      })}
      {allowMultiple && (
        <p className="mt-1 text-sm" style={{ color: 'var(--tf-placeholder)' }}>
          Choose as many as you like
        </p>
      )}
    </div>
  );
}
