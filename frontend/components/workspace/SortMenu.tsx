'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownAZ, Calendar, ChevronDown, Pencil } from 'lucide-react';

/** How a workspace's forms are ordered. */
export type SortKey = 'created' | 'updated' | 'alphabetical';

/**
 * The orderings Typeform offers, in its order. The icon doubles as the trigger's
 * icon, which is how the closed control says what it is sorted by.
 */
export const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'created', label: 'Date created', icon: <Calendar size={15} /> },
  { key: 'updated', label: 'Last updated', icon: <Pencil size={15} /> },
  { key: 'alphabetical', label: 'Alphabetical', icon: <ArrowDownAZ size={15} /> },
];

/**
 * The workspace list's sort control.
 *
 * A menu rather than a cycling toggle: three orderings can't be stepped through
 * one click at a time without hiding two of them. Dismissal follows the rest of
 * the app's menus — outside click or Escape.
 */
export default function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (next: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = SORT_OPTIONS.find(o => o.key === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort by ${active.label}`}
        className="flex items-center gap-2 rounded-lg border border-[rgba(81,76,84,0.18)] bg-white px-3 py-2 text-[14px] text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.04)]"
      >
        <span className="text-[#655d67]">{active.icon}</span>
        {active.label}
        <ChevronDown size={14} className="text-[#655d67]" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Sort forms by"
          data-qa="sort-menu"
          className="absolute left-0 top-full z-30 mt-1 min-w-[200px] rounded-xl border border-[rgba(81,76,84,0.12)] bg-white p-1 shadow-xl animate-fadeIn"
        >
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              role="menuitemradio"
              aria-checked={o.key === value}
              onClick={() => { onChange(o.key); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors ${
                o.key === value
                  ? 'bg-[rgba(87,84,91,0.08)] font-medium text-[#3c323e]'
                  : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.04)]'
              }`}
            >
              <span className="flex-shrink-0 text-[#655d67]">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
