'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { Question } from '@/lib/types';
import type { AnswerValue } from '@/lib/validation';
import { resolveChoices } from '@/lib/choices';
import { effectivePlaceholder } from '@/lib/question-types';

/**
 * Dropdown. Typeform renders this as a type-to-filter combobox rather than a
 * native <select>, so the search field carries the same underline treatment as
 * the text inputs and the list filters as you type.
 */
export default function DropdownField({
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
  // Randomisation must settle once per respondent rather than reshuffling on
  // every keystroke, so the resolved order is memoised against the inputs that
  // define it — the same treatment the choice rows give it.
  const optionsKey = (question.options ?? []).join('|');
  const { randomize, alphabetical_order: alphabetical } = question.settings ?? {};
  const options = useMemo(
    () => resolveChoices(question),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id, optionsKey, randomize, alphabetical]
  );
  const [query, setQuery] = useState('');
  // A list with nothing in it has nothing to open onto.
  const [open, setOpen] = useState(options.length > 0);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = typeof value === 'string' ? value : '';
  /** An author can leave a dropdown empty, and an empty list never opens. */
  const expanded = open && options.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function choose(opt: string) {
    onChange(opt);
    setQuery('');
    setOpen(false);
    setTimeout(onAdvance, 260);
  }

  return (
    <div ref={boxRef} className="relative" style={{ maxWidth: 'var(--tf-block-width)' }}>
      <div
        className="flex items-center border-b"
        style={{ borderColor: 'var(--tf-underline)', height: 'var(--tf-input-height)' }}
      >
        <input
          ref={inputRef}
          value={open ? query : selected || query}
          // Shared with the builder canvas, so the ghost text an author sees on
          // the canvas is the one respondents get.
          placeholder={effectivePlaceholder(question)}
          aria-label={question.title}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={`dd-${question.id}`}
          className="tf-input flex-1 bg-transparent outline-none border-0"
          style={{
            fontSize: 'var(--tf-input-size)',
            color: 'var(--tf-text)',
            fontFamily: 'var(--tf-font)',
          }}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            // Reset the highlight here rather than in an effect — the filtered
            // list changes with the query, so index 0 is the only safe target.
            setActive(0);
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive(a => Math.min(a + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive(a => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (expanded && filtered[active]) choose(filtered[active]);
              else onAdvance();
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <ChevronDown
          size={22}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ color: 'var(--tf-primary)', transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
      </div>

      {expanded && (
        <ul
          id={`dd-${question.id}`}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-[260px] overflow-y-auto rounded-lg animate-fadeIn"
          style={{
            backgroundColor: 'var(--tf-bg)',
            border: '1px solid var(--tf-choice-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-base" style={{ color: 'var(--tf-placeholder)' }}>
              No matches
            </li>
          ) : (
            filtered.map((opt, i) => (
              <li key={opt + i} role="option" aria-selected={opt === selected}>
                <button
                  type="button"
                  onClick={() => choose(opt)}
                  onMouseEnter={() => setActive(i)}
                  className="tf-interactive flex w-full items-center justify-between px-3 text-left"
                  style={{
                    minHeight: 'var(--tf-choice-height)',
                    fontSize: 'var(--tf-choice-size)',
                    color: 'var(--tf-text)',
                    backgroundColor: i === active ? 'var(--tf-choice-hover-bg)' : 'transparent',
                  }}
                >
                  <span>{opt}</span>
                  {opt === selected && <Check size={16} style={{ color: 'var(--tf-primary)' }} />}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
