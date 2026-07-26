'use client';

import { useEffect, useRef } from 'react';
import { ChevronDown, Star, X } from 'lucide-react';
import type { Question } from '@/lib/types';
import { NONE_CHOICE, OTHER_CHOICE } from '@/lib/types';
import { effectivePlaceholder } from '@/lib/question-types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Puts the caret in a choice row on the canvas.
 *
 * The canvas owns the `data-choice` contract, so addressing it lives here — the
 * left rail focuses a choice through this too. Two frames: selecting a different
 * question remounts the editor, so the input does not exist until React has
 * committed that render.
 */
export function focusChoice(questionId: string, index: number, select = true) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(
        `[data-choice="${questionId}:${index}"]`
      );
      if (!el) return;
      el.focus();
      // A rail click selects the whole label, ready to be replaced. Keyboard flow
      // through the list wants the caret at the end instead, so typing continues.
      if (select) el.select();
      else el.setSelectionRange(el.value.length, el.value.length);
    })
  );
}

/**
 * WYSIWYG question editor.
 *
 * This is the canvas *and* the preview: it renders the respondent's screen from
 * the same `--tf-*` tokens the public form uses, but every piece of copy is
 * edited in place. There is no second representation of a question to keep in
 * sync — what you type here is literally what gets asked.
 *
 * Answer affordances render at full fidelity; the ones that carry authored
 * content (choice labels, text placeholders) are editable, the rest are inert.
 */

/**
 * Transparent textarea that grows with its content.
 *
 * `suffix` renders immediately after the last character of the text — used for
 * the required asterisk. A textarea cannot contain inline siblings, so the suffix
 * rides on a hidden mirror of the same text: the mirror reserves an identical
 * box (same typography, same wrapping), which lands the visible suffix exactly
 * where the caret would be. Without this the asterisk becomes a block-level
 * sibling and drops onto the following line.
 */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  ariaLabel,
  style,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  style?: React.CSSProperties;
  suffix?: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  // Re-fit when the value changes from outside (e.g. switching questions).
  useEffect(resize, [value]);

  const typography: React.CSSProperties = { fontFamily: 'var(--tf-font)', ...style };

  const field = (
    <textarea
      ref={ref}
      value={value}
      onChange={e => { onChange(e.target.value); resize(); }}
      rows={1}
      placeholder={placeholder}
      aria-label={ariaLabel}
      spellCheck
      className="tf-canvas-field w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none"
      style={typography}
    />
  );

  if (!suffix) return field;

  return (
    <span className="relative block">
      {field}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words"
        style={typography}
      >
        {/* Mirrors what the field is showing so the suffix trails the last
            character — the placeholder when empty, the value otherwise. */}
        <span className="invisible">{value || placeholder}</span>
        {suffix}
      </span>
    </span>
  );
}

export default function CanvasEditor({
  question,
  index,
  showDescription,
  onUpdate,
  onToggleDescription,
}: {
  question: Question;
  index: number;
  showDescription: boolean;
  onUpdate: (patch: Partial<Question>) => void;
  onToggleDescription: (next: boolean) => void;
}) {
  const type = question.question_type;
  const isMultipleChoice = type === 'multiple_choice';
  const isDropdown = type === 'dropdown';
  const isText = type === 'short_text' || type === 'long_text' || type === 'email' || type === 'number';
  const options = question.options ?? [];
  const settings = question.settings ?? {};

  function setOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    onUpdate({ options: next });
  }

  const addOption = () => onUpdate({ options: [...options, ''] });
  const removeOption = (i: number) => onUpdate({ options: options.filter((_, idx) => idx !== i) });

  /** Appends a choice and puts the caret in it, so typing can just continue. */
  function addChoiceAndFocus(at = options.length) {
    const next = [...options];
    next.splice(at, 0, '');
    onUpdate({ options: next });
    focusChoice(question.id, at, false);
  }

  /**
   * A multi-line paste becomes one choice per line, starting at the pasted row —
   * how a list of countries or products actually arrives. Single-line pastes fall
   * through to the browser so ordinary editing is untouched.
   */
  function pasteChoices(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    if (!/[\n\r]/.test(text)) return;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    e.preventDefault();
    if (lines.length === 0) return;
    const next = [...options];
    next.splice(i, 1, ...lines);
    onUpdate({ options: next });
    focusChoice(question.id, i + lines.length - 1, false);
  }

  const maxRating = Number(settings.max_rating ?? 5);
  const ratingShape = (settings.shape as string) ?? 'star';

  /**
   * Rows the multiple-choice Other/None settings append. Author's list stays in
   * order while editing.
   */
  const appended = [
    ...(settings.other_option ? [OTHER_CHOICE] : []),
    ...(settings.none_option ? [NONE_CHOICE] : []),
  ];

  /** A choice row, shared by the editable options and the appended ones. */
  const row = (key: string, badge: string, body: React.ReactNode) => (
    <div
      key={key}
      className="group/opt flex w-full items-center"
      style={{
        minHeight: 'var(--tf-choice-height)',
        maxWidth: 'var(--tf-choice-row-width, var(--tf-choice-width))',
        borderRadius: 8,
        paddingInline: 'var(--sp-100)',
        gap: 'var(--sp-150)',
        backgroundColor: 'var(--tf-choice-bg)',
        border: '1px solid var(--tf-choice-border)',
      }}
    >
      <span
        className="flex flex-shrink-0 items-center justify-center font-semibold"
        style={{
          width: 'var(--tf-choice-key)',
          height: 'var(--tf-choice-key)',
          borderRadius: 4,
          fontSize: 12,
          backgroundColor: 'var(--tf-choice-key-bg)',
          color: 'var(--tf-text)',
        }}
      >
        {badge}
      </span>
      {body}
    </div>
  );

  return (
    <div className="flex h-full w-full items-center overflow-y-auto px-10 py-10 sm:px-16">
      <div className="w-full" style={{ maxWidth: 'var(--tf-block-width)' }}>
        {/* Headline, with the question number inline as Typeform shows it */}
        <div className="flex items-start" style={{ gap: 'var(--sp-150)' }}>
          <span
            className="flex flex-shrink-0 select-none items-center justify-center font-bold"
            style={{
              width: 20,
              height: 20,
              marginTop: 'calc((var(--tf-title-line) - 20px) / 2)',
              borderRadius: 4,
              fontSize: 12,
              backgroundColor: 'var(--tf-primary)',
              color: 'var(--tf-primary-text)',
            }}
            aria-hidden
          >
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <AutoTextarea
              value={question.title}
              onChange={title => onUpdate({ title })}
              placeholder="Your question here."
              ariaLabel="Question title"
              style={{
                fontSize: 'var(--tf-title-size)',
                lineHeight: 'var(--tf-title-line)',
                color: 'var(--tf-text)',
              }}
              // Belongs to the headline, never the description below it.
              suffix={
                question.is_required
                  ? <span style={{ color: 'var(--tf-primary)' }}> *</span>
                  : undefined
              }
            />

            {/* Help text */}
            {showDescription ? (
              <div className="group/desc relative">
                <AutoTextarea
                  value={question.description ?? ''}
                  onChange={description => onUpdate({ description })}
                  placeholder="Description (optional)"
                  ariaLabel="Question description"
                  style={{
                    fontSize: 'var(--tf-label-size)',
                    color: `rgba(var(--tf-text-rgb), 0.6)`,
                  }}
                />
                <button
                  onClick={() => { onToggleDescription(false); onUpdate({ description: '' }); }}
                  aria-label="Remove description"
                  className="absolute -right-7 top-1 rounded p-1 opacity-0 transition-opacity group-hover/desc:opacity-100"
                  style={{ color: `rgba(var(--tf-text-rgb), 0.45)` }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onToggleDescription(true)}
                className="tf-canvas-field text-left italic"
                style={{
                  fontSize: 'var(--tf-label-size)',
                  color: `rgba(var(--tf-text-rgb), 0.38)`,
                  fontFamily: 'var(--tf-font)',
                }}
              >
                Description (optional)
              </button>
            )}
          </div>
        </div>

        {/* Answer */}
        <div style={{ marginTop: 'var(--sp-400)', paddingLeft: 'var(--tf-answer-indent)' }}>
          {isText && (
            /* The answer field itself, ghost text and all. Its placeholder is
               authored from the inspector ("Custom placeholder text"), not by
               typing into the respondent's field — as in Typeform. */
            <div
              aria-hidden
              className="flex w-full items-end border-b"
              style={{
                fontFamily: 'var(--tf-font)',
                fontSize: 'var(--tf-input-size)',
                minHeight: 'var(--tf-input-height)',
                maxWidth: 'var(--tf-choice-width)',
                paddingBottom: 'var(--sp-100)',
                color: 'var(--tf-placeholder)',
                borderBottomColor: 'var(--tf-underline)',
              }}
            >
              {effectivePlaceholder(question)}
            </div>
          )}

          {isMultipleChoice && (
            <div className="flex flex-col" style={{ gap: 'var(--sp-100)' }}>
              {options.map((opt, i) =>
                row(
                  `opt-${i}`,
                  LETTERS[i] ?? String(i + 1),
                  <>
                    <input
                      value={opt}
                      onChange={e => setOption(i, e.target.value)}
                      placeholder="choice"
                      aria-label={`Choice ${i + 1}`}
                      // Addressed by the left rail, which focuses a choice when
                      // its row there is clicked.
                      data-choice={`${question.id}:${i}`}
                      onKeyDown={e => {
                        // Enter deliberately does not append a row — "Add choice"
                        // is the only way to grow the list.
                        if (e.key === 'Enter') e.preventDefault();
                        if (e.key === 'Backspace' && opt === '' && options.length > 1) {
                          e.preventDefault();
                          removeOption(i);
                        }
                      }}
                      className="tf-canvas-field min-w-0 flex-1 border-0 bg-transparent py-1 outline-none"
                      style={{
                        fontFamily: 'var(--tf-font)',
                        fontSize: 'var(--tf-choice-size)',
                        color: 'var(--tf-text)',
                      }}
                    />
                    {options.length > 1 && (
                      <button
                        onClick={() => removeOption(i)}
                        aria-label={`Remove choice ${i + 1}`}
                        className="flex-shrink-0 rounded p-1 opacity-0 transition-opacity group-hover/opt:opacity-100"
                        style={{ color: `rgba(var(--tf-text-rgb), 0.5)` }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </>
                )
              )}

              {/* Appended by the Other/None settings — not part of the author's list */}
              {appended.map((label, i) =>
                row(
                  `extra-${label}`,
                  LETTERS[options.length + i] ?? '?',
                  <span
                    className="flex-1 py-1"
                    style={{
                      fontSize: 'var(--tf-choice-size)',
                      color: `rgba(var(--tf-text-rgb), 0.75)`,
                    }}
                  >
                    {label}
                  </span>
                )
              )}

              <button
                onClick={addOption}
                className="mt-1 self-start underline underline-offset-2"
                style={{
                  fontSize: 'var(--tf-choice-size)',
                  color: `rgba(var(--tf-text-rgb), 0.7)`,
                  fontFamily: 'var(--tf-font)',
                }}
              >
                Add choice
              </button>
            </div>
          )}

          {/* Dropdown. Nothing like the choice rows above: the respondent gets a
              single combobox, so the canvas shows that field and the author's
              choices live in a list under it — "Add choices" and the count of
              what's in the list, as Typeform reads. */}
          {isDropdown && (
            <div style={{ maxWidth: 'var(--tf-choice-width)' }}>
              {/* The respondent's field, ghost text and all. Its placeholder is
                  authored from the inspector ("Custom placeholder text"). */}
              <div
                aria-hidden
                className="flex w-full items-end border-b"
                style={{
                  fontFamily: 'var(--tf-font)',
                  fontSize: 'var(--tf-input-size)',
                  minHeight: 'var(--tf-input-height)',
                  paddingBottom: 'var(--sp-100)',
                  gap: 'var(--sp-100)',
                  color: 'var(--tf-placeholder)',
                  borderBottomColor: 'var(--tf-underline)',
                }}
              >
                <span className="min-w-0 flex-1 truncate">{effectivePlaceholder(question)}</span>
                <ChevronDown
                  size={20}
                  className="flex-shrink-0"
                  style={{ marginBottom: 3, color: `rgba(var(--tf-text-rgb), 0.5)` }}
                />
              </div>

              {/* The author's list, in the order it was typed — "Randomize" and
                  "Alphabetical order" are applied when the form is filled, so
                  editing here never reshuffles under the caret. */}
              {options.length > 0 && (
                <div className="mt-3 flex flex-col" style={{ gap: 'var(--sp-50)' }}>
                  {options.map((opt, i) => (
                    <div
                      key={`opt-${i}`}
                      className="group/opt flex w-full items-center"
                      style={{
                        minHeight: 'calc(var(--tf-choice-height) - 8px)',
                        borderRadius: 6,
                        paddingInline: 'var(--sp-100)',
                        gap: 'var(--sp-100)',
                        backgroundColor: `rgba(var(--tf-text-rgb), 0.04)`,
                      }}
                    >
                      <input
                        value={opt}
                        onChange={e => setOption(i, e.target.value)}
                        placeholder="choice"
                        aria-label={`Choice ${i + 1}`}
                        // Addressed by the left rail, which focuses a choice when
                        // its row there is clicked.
                        data-choice={`${question.id}:${i}`}
                        onPaste={e => pasteChoices(i, e)}
                        onKeyDown={e => {
                          // A dropdown list runs to dozens of entries, so Enter
                          // carries on to the next one rather than doing nothing.
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addChoiceAndFocus(i + 1);
                          }
                          // Backspace on an empty row removes it. A dropdown may
                          // hold no options at all, so this goes all the way down.
                          if (e.key === 'Backspace' && opt === '') {
                            e.preventDefault();
                            removeOption(i);
                            if (i > 0) focusChoice(question.id, i - 1, false);
                          }
                        }}
                        className="tf-canvas-field min-w-0 flex-1 border-0 bg-transparent py-1 outline-none"
                        style={{
                          fontFamily: 'var(--tf-font)',
                          fontSize: 'var(--tf-choice-size)',
                          color: 'var(--tf-text)',
                        }}
                      />
                      <button
                        onClick={() => removeOption(i)}
                        aria-label={`Remove choice ${i + 1}`}
                        className="flex-shrink-0 rounded p-1 opacity-0 transition-opacity group-hover/opt:opacity-100"
                        style={{ color: `rgba(var(--tf-text-rgb), 0.5)` }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="mt-3 flex items-center justify-between"
                style={{ gap: 'var(--sp-150)', fontFamily: 'var(--tf-font)' }}
              >
                <button
                  onClick={() => addChoiceAndFocus()}
                  className="underline underline-offset-2"
                  style={{
                    fontSize: 'var(--tf-choice-size)',
                    color: `rgba(var(--tf-text-rgb), 0.7)`,
                  }}
                >
                  Add choices
                </button>
                <span
                  style={{
                    fontSize: 'var(--tf-choice-size)',
                    color: `rgba(var(--tf-text-rgb), 0.45)`,
                  }}
                >
                  {options.length} option{options.length === 1 ? '' : 's'} in list
                </span>
              </div>
            </div>
          )}

          {type === 'yes_no' && (
            <div className="flex flex-col" style={{ gap: 'var(--sp-100)' }}>
              {['Yes', 'No'].map((label, i) =>
                row(
                  label,
                  LETTERS[i],
                  <span className="flex-1 py-1" style={{ fontSize: 'var(--tf-choice-size)', color: 'var(--tf-text)' }}>
                    {label}
                  </span>
                )
              )}
            </div>
          )}

          {type === 'rating' && (
            ratingShape === 'number' ? (
              <div className="flex flex-wrap" style={{ gap: 'var(--sp-100)' }}>
                {Array.from({ length: maxRating }, (_, i) => i + 1).map(n => (
                  <span
                    key={n}
                    className="flex items-center justify-center font-medium"
                    style={{
                      width: 'var(--tf-choice-height)',
                      height: 'var(--tf-choice-height)',
                      borderRadius: 8,
                      fontSize: 'var(--tf-choice-size)',
                      backgroundColor: 'var(--tf-choice-bg)',
                      border: '1px solid var(--tf-choice-border)',
                      color: 'var(--tf-text)',
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center" style={{ gap: 'var(--sp-100)' }}>
                {Array.from({ length: maxRating }, (_, i) => i + 1).map(n => (
                  <Star
                    key={n}
                    size={30}
                    strokeWidth={1.5}
                    fill="none"
                    style={{ color: 'var(--tf-primary)', opacity: 0.45 }}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
