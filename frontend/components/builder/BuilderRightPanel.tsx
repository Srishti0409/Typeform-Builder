'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlignLeft, Check, ChevronDown, Gem, HelpCircle, Plus, Trash2, Video,
} from 'lucide-react';
import type { Question, QuestionType } from '@/lib/types';
import {
  QUESTION_TYPES, defaultPlaceholder, getTypeInfo, getTypeTint,
} from '@/lib/question-types';
import Switch from '@/components/shared/Switch';

/** A card in the inspector stack. */
function Card({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: boolean;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-[#f2f1f3] p-3.5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-[#3c323e]">
          {title}
          {hint && <HelpCircle size={14} className="text-[#847e85]" />}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Label + switch row, the inspector's main control shape. */
function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
  note,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  note?: string;
  /** Explains the setting on hover, the way Typeform's row hints do. */
  hint?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'oos' : ''}`}>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[15px] text-[#3c323e]">
          {label}
          {hint && (
            // The tooltip hangs off the span: browsers ignore `title` on an SVG.
            <span title={hint} aria-label={hint} role="note" className="flex-shrink-0">
              <HelpCircle size={13} className="text-[#847e85]" />
            </span>
          )}
        </span>
        {note && <span className="block text-[12px] text-[#847e85]">{note}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

const INPUT =
  'w-full rounded-lg border border-[rgba(81,76,84,0.18)] bg-white px-2.5 py-2 text-[14px] text-[#3c323e] outline-none transition-colors focus:border-[#655d67]';

/** The answer-type dropdown. */
function TypeSelect({
  current,
  onSelect,
}: {
  current: QuestionType;
  onSelect: (t: QuestionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const info = getTypeInfo(current);
  const tint = getTypeTint(current);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Question type"
        className="flex w-full items-center gap-2.5 rounded-lg border border-[rgba(81,76,84,0.18)] bg-white px-2.5 py-2.5 text-left transition-colors hover:bg-[#fbfbfc]"
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: tint.bg, color: tint.fg }}
        >
          {info.icon}
        </span>
        <span className="flex-1 text-[15px] font-medium text-[#3c323e]">{info.label}</span>
        <ChevronDown size={16} className="text-[#655d67]" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[300px] overflow-y-auto rounded-xl border border-[rgba(81,76,84,0.12)] bg-white py-1 shadow-xl animate-fadeIn"
        >
          {QUESTION_TYPES.map(t => (
            <button
              key={t.type}
              role="option"
              aria-selected={t.type === current}
              onClick={() => { onSelect(t.type); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] transition-colors ${
                t.type === current
                  ? 'bg-[rgba(87,84,91,0.06)] text-[#3c323e]'
                  : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.04)]'
              }`}
            >
              <span className="flex-shrink-0 text-[#655d67]">{t.icon}</span>
              <span className="flex-1">{t.label}</span>
              {t.type === current && <Check size={13} className="text-[#177767]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The inspector for the selected question: how it is asked, how it is answered,
 * and what happens next.
 */
export default function BuilderRightPanel({
  question,
  onUpdate,
  onDelete,
}: {
  question: Question;
  onUpdate: (patch: Partial<Question>) => void;
  onDelete: () => void;
}) {
  const type = question.question_type;
  const settings = question.settings ?? {};
  const isDropdown = type === 'dropdown';
  const isText = type === 'short_text' || type === 'long_text' || type === 'email' || type === 'number';
  /** Questions authored before the switch existed fall back to what's stored. */
  const customPlaceholder = settings.custom_placeholder ?? Boolean(question.placeholder);

  /** The length cap and format rule apply to the free-text types only. */
  const isFreeText = type === 'short_text' || type === 'long_text';
  const limitCharacters = settings.limit_characters ?? settings.max_characters != null;
  const validatePattern = settings.validate_pattern ?? Boolean(settings.answer_pattern);

  /**
   * A Number question's bounds are independent options: each is off unless the
   * author turns it on, so a question with no Max accepts any value rather than
   * capping at zero. Questions authored before the switches existed fall back to
   * whatever they stored, matching how validation reads them.
   */
  const limitMin = settings.limit_min ?? settings.min != null;
  const limitMax = settings.limit_max ?? settings.max != null;

  /** Flags a half-typed expression, which validation skips rather than enforces. */
  const patternError = (() => {
    if (!validatePattern || !settings.answer_pattern) return false;
    try {
      new RegExp(settings.answer_pattern);
      return false;
    } catch {
      return true;
    }
  })();

  function setSetting(patch: Record<string, unknown>) {
    onUpdate({ settings: { ...settings, ...patch } });
  }

  /**
   * The switch that authors the answer field's ghost text, plus the field it
   * reveals. Shared because the text types show it directly under "Required"
   * while the dropdown shows it below its ordering settings, as Typeform does.
   */
  const placeholderRow = (
    <div>
      <ToggleRow
        label="Custom placeholder text"
        hint={`Replace the field's default — “${defaultPlaceholder(type)}”.`}
        checked={customPlaceholder}
        onChange={next =>
          onUpdate({
            settings: { ...settings, custom_placeholder: next },
            // Switching off restores the type's default ghost text.
            placeholder: next ? (question.placeholder ?? '') : '',
          })
        }
      />
      {customPlaceholder && (
        <input
          value={question.placeholder ?? ''}
          onChange={e => onUpdate({ placeholder: e.target.value })}
          placeholder={defaultPlaceholder(type)}
          // Distinct from the switch's name, so the two controls don't present as
          // one to assistive tech.
          aria-label="Placeholder text shown in the field"
          className={`${INPUT} mb-2`}
        />
      )}
    </div>
  );

  return (
    <aside className="flex h-full w-[300px] flex-shrink-0 flex-col gap-2 overflow-y-auto px-4 pb-3">
      {/* How the question is presented. Video prompts are out of scope. */}
      <Card title="Question" hint>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-white p-1">
          <span className="flex items-center justify-center gap-2 rounded-md bg-[rgba(87,84,91,0.08)] py-1.5 text-[15px] font-medium text-[#3c323e]">
            <AlignLeft size={15} />
            Text
          </span>
          <span
            className="oos flex items-center justify-center gap-2 rounded-md py-1.5 text-[15px] font-medium text-[#3c323e]"
            title="Not available in this build"
          >
            <Video size={15} />
            Video
          </span>
        </div>
      </Card>

      <Card title="Answer">
        <TypeSelect
          current={type}
          onSelect={next =>
            onUpdate({
              question_type: next,
              // Any list already authored carries over. Multiple choice needs a
              // row to be answerable at all, where a dropdown is legitimately
              // empty until choices are added.
              options:
                next === 'multiple_choice'
                  ? (question.options?.length ? question.options : [''])
                  : next === 'dropdown'
                    ? (question.options ?? [])
                    : undefined,
              settings: next === 'rating' ? { max_rating: 5, shape: 'star' } : {},
            })
          }
        />

        <div className="mt-1 divide-y divide-[rgba(86,82,90,0.08)]">
          <ToggleRow
            label="Required"
            checked={question.is_required}
            onChange={next => onUpdate({ is_required: next })}
          />

          {/* An Email question validates the address by default; this relaxes it
              to plain text, on the client and on submit alike. */}
          {type === 'email' && (
            <ToggleRow
              label="Answer validation"
              hint="Only accept a well-formed email address."
              checked={settings.validate_email !== false}
              onChange={next => setSetting({ validate_email: next })}
            />
          )}

          {/* A Number question's bounds, each its own opt-in setting, so a
              question without a Max isn't a question capped at zero. Enforced in
              preview and on submit (lib/validation.ts and its backend mirror). */}
          {type === 'number' && (
            <>
              <div>
                <ToggleRow
                  label="Min number"
                  hint="Reject answers below this value."
                  checked={limitMin}
                  onChange={next => setSetting({ limit_min: next })}
                />
                {limitMin && (
                  <input
                    type="number"
                    value={settings.min == null ? '' : String(settings.min)}
                    onChange={e =>
                      setSetting({ min: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    placeholder="0-999999999"
                    // Distinct from the switch's name, so the two controls don't
                    // present as one to assistive tech.
                    aria-label="Minimum number allowed"
                    className={`${INPUT} mb-2`}
                  />
                )}
              </div>
              <div>
                <ToggleRow
                  label="Max number"
                  hint="Reject answers above this value."
                  checked={limitMax}
                  onChange={next => setSetting({ limit_max: next })}
                />
                {limitMax && (
                  <input
                    type="number"
                    value={settings.max == null ? '' : String(settings.max)}
                    onChange={e =>
                      setSetting({ max: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    placeholder="1-999999999"
                    aria-label="Maximum number allowed"
                    className={`${INPUT} mb-2`}
                  />
                )}
              </div>
            </>
          )}

          {isText && placeholderRow}

          {/* Length cap and format rule for the free-text types. Both are
              enforced in preview and on submit (lib/validation.ts and its
              mirror in the backend's validation service). */}
          {isFreeText && (
            <div>
              <ToggleRow
                label="Max characters"
                checked={limitCharacters}
                onChange={next => setSetting({ limit_characters: next })}
              />
              {limitCharacters && (
                <input
                  type="number"
                  min={1}
                  max={type === 'long_text' ? 5000 : 500}
                  value={settings.max_characters == null ? '' : String(settings.max_characters)}
                  onChange={e =>
                    setSetting({
                      max_characters: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="0-999999999"
                  // Distinct from the switch's name, so the two controls don't
                  // present as one to assistive tech.
                  aria-label="Maximum characters allowed"
                  className={`${INPUT} mb-2`}
                />
              )}
            </div>
          )}

          {isFreeText && (
            <div>
              <ToggleRow
                label="Answer validation"
                hint="Only accept answers matching this regular expression."
                checked={validatePattern}
                onChange={next => setSetting({ validate_pattern: next })}
              />
              {validatePattern && (
                <>
                  <input
                    value={settings.answer_pattern ?? ''}
                    onChange={e => setSetting({ answer_pattern: e.target.value })}
                    placeholder="[A-Za-z]{2}\s\d{5}"
                    aria-label="Answer validation pattern"
                    spellCheck={false}
                    className={`${INPUT} mb-1 font-mono text-[13px]`}
                  />
                  {patternError && (
                    <p className="mb-2 text-[12px] text-[#c0392b]">
                      That isn’t a valid expression yet — it won’t be applied.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Contacts are observed from email answers — this opts a field out. */}
          {type === 'email' && (
            <ToggleRow
              label="Map to contacts"
              hint="Save each address to your contacts list."
              checked={settings.map_to_contacts !== false}
              onChange={next => setSetting({ map_to_contacts: next })}
            />
          )}

          {type === 'multiple_choice' && (
            <>
              <ToggleRow
                label="Multiple selection"
                checked={Boolean(settings.allow_multiple)}
                onChange={next => setSetting({ allow_multiple: next })}
              />
              <ToggleRow
                label="Randomize"
                checked={Boolean(settings.randomize)}
                onChange={next => setSetting({ randomize: next })}
              />
              <ToggleRow
                label="“Other” option"
                checked={Boolean(settings.other_option)}
                onChange={next => setSetting({ other_option: next })}
              />
              <ToggleRow
                label="“None” option"
                checked={Boolean(settings.none_option)}
                onChange={next => setSetting({ none_option: next })}
              />
            </>
          )}

          {/* The dropdown's own set, in Typeform's order. It has no "Other" or
              "None" — the two orderings and the placeholder are the whole list.
              Turning one ordering on turns the other off: a list can only be in
              one order, and letting both stand would make A–Z silently win. */}
          {isDropdown && (
            <>
              <ToggleRow
                label="Randomize"
                hint="Show the options in a different order to each respondent."
                checked={Boolean(settings.randomize)}
                onChange={next =>
                  setSetting(next ? { randomize: true, alphabetical_order: false } : { randomize: false })
                }
              />
              <ToggleRow
                label="Alphabetical order"
                hint="Sort the options A–Z rather than keeping the order you typed."
                checked={Boolean(settings.alphabetical_order)}
                onChange={next =>
                  setSetting(next ? { alphabetical_order: true, randomize: false } : { alphabetical_order: false })
                }
              />
              {placeholderRow}
            </>
          )}
        </div>

        {/* Type-specific fields */}
        {type === 'rating' && (
          <div className="mt-3 flex gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[13px] font-medium text-[#655d67]">Steps</span>
              <select
                value={String(settings.max_rating ?? 5)}
                onChange={e => setSetting({ max_rating: Number(e.target.value) })}
                aria-label="Steps"
                className={INPUT}
              >
                {/* Every step count from 1 to 10 — a one- or two-shape scale is
                    a legitimate choice, and the canvas and respondent field both
                    render exactly as many shapes as this says. */}
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[13px] font-medium text-[#655d67]">Shape</span>
              <select
                value={(settings.shape as string) ?? 'star'}
                onChange={e => setSetting({ shape: e.target.value })}
                aria-label="Shape"
                className={INPUT}
              >
                <option value="star">Stars</option>
                <option value="number">Numbers</option>
              </select>
            </label>
          </div>
        )}
      </Card>

      {/* Branching is scoped out, so this states the rule in force. */}
      <Card
        title="Logic"
        action={
          <span
            className="oos flex h-7 w-7 items-center justify-center rounded-lg text-[#3c323e]"
            title="Not available in this build"
          >
            <Plus size={16} />
          </span>
        }
      >
        <p className="mt-2 text-[13px] text-[#847e85]">
          Every respondent continues to the next question in order.
        </p>
      </Card>

      <Card
        title="Comments"
        action={<Gem size={15} className="text-[#177767]" />}
      >
        <p className="oos mt-2 text-[13px] text-[#847e85]">
          Collaboration is not part of this build.
        </p>
      </Card>

      <button
        onClick={onDelete}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(81,76,84,0.16)] py-2.5 text-[14px] font-medium text-[#c0392b] transition-colors hover:bg-red-50"
      >
        <Trash2 size={15} />
        Delete question
      </button>
    </aside>
  );
}
