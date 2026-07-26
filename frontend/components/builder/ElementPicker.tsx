'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, X, Lock, Grid3X3, PanelTop } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import {
  CATEGORY_TINT as TINT, ELEMENT_CATEGORIES, QUESTION_TYPES, UNSUPPORTED_ELEMENTS,
  type ElementCategory,
} from '@/lib/question-types';
import type { QuestionType } from '@/lib/types';

type Row =
  | { kind: 'type'; key: string; label: string; icon: React.ReactNode; category: ElementCategory; type: QuestionType; description: string }
  | { kind: 'locked'; key: string; label: string; icon: React.ReactNode; category: ElementCategory };

function buildRows(): Row[] {
  const supported: Row[] = QUESTION_TYPES.map(t => ({
    kind: 'type',
    key: `t:${t.type}`,
    label: t.label,
    icon: t.icon,
    category: t.category,
    type: t.type,
    description: t.description,
  }));
  const locked: Row[] = UNSUPPORTED_ELEMENTS.map(e => ({
    kind: 'locked',
    key: `l:${e.label}`,
    label: e.label,
    icon: e.icon,
    category: e.category,
  }));
  return [...supported, ...locked];
}

/** Words a row should match on when searching. */
function haystack(row: Row): string {
  const extra =
    row.kind === 'type'
      ? [row.description, ...(QUESTION_TYPES.find(t => t.type === row.type)?.keywords ?? [])]
      : ['coming soon'];
  return [row.label, row.category, ...extra].join(' ').toLowerCase();
}

/**
 * Typeform's "Add form elements" picker: search on the left, elements grouped by
 * category on the right.
 *
 * Elements this build doesn't implement are listed but inert — hiding them would
 * misrepresent the product, and the rest of the app treats out-of-scope features
 * the same way.
 */
export default function ElementPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (type: QuestionType) => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rows = useMemo(() => buildRows(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? rows.filter(r => haystack(r).includes(q)) : rows),
    [rows, q]
  );
  /** Only selectable rows participate in keyboard navigation. */
  const selectable = useMemo(() => matches.filter(r => r.kind === 'type'), [matches]);

  // Keyed by query so the highlight resets as you type, without an effect.
  const [activeState, setActive] = useState<{ q: string; i: number }>({ q, i: 0 });
  const active = activeState.q === q ? activeState.i : 0;
  const setActiveIndex = (next: number) => setActive({ q, i: next });

  function choose(row: Row) {
    if (row.kind !== 'type') return;
    onPick(row.type);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(Math.min(active + 1, selectable.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(active - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = selectable[active];
      if (row) choose(row);
    }
  }

  const byCategory = ELEMENT_CATEGORIES.map(category => ({
    category,
    items: matches.filter(r => r.category === category),
  })).filter(g => g.items.length > 0);

  return (
    <Modal onClose={onClose} label="Add form elements" width={940}>
      {/* Tabs */}
      <div className="-mx-6 -mt-6 mb-5 flex items-center gap-1 border-b border-[rgba(86,82,90,0.1)] px-4 py-3">
        <span className="rounded-lg border border-[#3c323e] px-3 py-1.5 text-sm font-medium text-[#3c323e]">
          Add form elements
        </span>
        <span className="oos rounded-lg px-3 py-1.5 text-sm font-medium text-[#655d67]">
          Import questions
        </span>
        <span className="oos rounded-lg px-3 py-1.5 text-sm font-medium text-[#655d67]">
          Create with AI
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
        >
          <X size={17} />
        </button>
      </div>

      <div className="flex gap-6" onKeyDown={onKeyDown}>
        {/* Left rail */}
        <div className="w-[230px] flex-shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2">
            <Search size={15} className="flex-shrink-0 text-[#847e85]" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search form elements"
              aria-label="Search form elements"
              className="min-w-0 flex-1 text-sm text-[#3c323e] placeholder:text-[#847e85]"
            />
          </div>

          <p className="mt-5 text-xs font-semibold text-[#847e85]">Recommended</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {(['short_text', 'multiple_choice', 'rating'] as QuestionType[]).map(t => {
              const info = QUESTION_TYPES.find(x => x.type === t)!;
              return (
                <button
                  key={t}
                  onClick={() => { onPick(t); onClose(); }}
                  className="flex items-center gap-2.5 rounded-lg border border-[rgba(81,76,84,0.14)] px-3 py-2 text-left text-sm text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
                >
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: TINT[info.category].bg, color: TINT[info.category].fg }}
                  >
                    {info.icon}
                  </span>
                  {info.label}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-xs font-semibold text-[#847e85]">Connect to apps</p>
          <Link
            href="/integrations"
            className="mt-2 flex items-center gap-2.5 rounded-lg border border-[rgba(81,76,84,0.14)] px-3 py-2 text-sm text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
          >
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[rgba(87,84,91,0.08)] text-[#655d67]">
              <Grid3X3 size={14} />
            </span>
            Browse all apps
          </Link>
        </div>

        {/* Element grid */}
        <div className="min-w-0 flex-1">
          {byCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <PanelTop size={22} className="text-[#c4c1c5]" />
              <p className="text-sm text-[#655d67]">
                No elements match “{query}”.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
              {byCategory.map(({ category, items }) => (
                <section key={category}>
                  <h3 className="mb-2 text-sm font-semibold text-[#3c323e]">{category}</h3>
                  <ul className="flex flex-col gap-0.5">
                    {items.map(row => {
                      const locked = row.kind === 'locked';
                      const idx = selectable.findIndex(r => r.key === row.key);
                      const isActive = !locked && idx === active;
                      return (
                        <li key={row.key}>
                          <button
                            onClick={() => choose(row)}
                            disabled={locked}
                            onMouseEnter={() => { if (!locked && idx >= 0) setActiveIndex(idx); }}
                            title={locked ? 'Not available in this build' : row.kind === 'type' ? row.description : undefined}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                              locked
                                ? 'oos text-[#655d67]'
                                : `text-[#3c323e] ${isActive ? 'bg-[rgba(87,84,91,0.07)]' : 'hover:bg-[rgba(87,84,91,0.05)]'}`
                            }`}
                          >
                            <span
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                              style={{ backgroundColor: TINT[row.category].bg, color: TINT[row.category].fg }}
                            >
                              {row.icon}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{row.label}</span>
                            {locked && <Lock size={12} className="flex-shrink-0 text-[#a8a3a9]" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <p className="mt-6 border-t border-[rgba(86,82,90,0.08)] pt-3 text-xs text-[#847e85]">
            Dimmed elements aren’t part of this build. Use ↑↓ and Enter to pick with the keyboard.
          </p>
        </div>
      </div>
    </Modal>
  );
}
