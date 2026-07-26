'use client';

import Link from 'next/link';
import { FileText, Settings, BarChart2, HelpCircle, Globe } from 'lucide-react';
import type { Form } from '@/lib/types';

export type FormTab = 'build' | 'settings' | 'results';

const TABS: { key: FormTab; label: string; icon: React.ReactNode }[] = [
  { key: 'build', label: 'Build', icon: <FileText size={12} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={12} /> },
  { key: 'results', label: 'Results', icon: <BarChart2 size={12} /> },
];

/**
 * Shared builder/results chrome: breadcrumb + inline-editable title, the
 * segmented tab switcher, and the publish state. Both the builder and the
 * results view render this so the two pages stay visually identical.
 */
export default function FormTopBar({
  form,
  active,
  onTitleChange,
  children,
}: {
  form: Form;
  active: FormTab;
  /** Omitted on read-only pages, which then render the title as static text. */
  onTitleChange?: (title: string) => void;
  /** Extra actions rendered before the publish state. */
  children?: React.ReactNode;
}) {
  function hrefFor(tab: FormTab) {
    if (tab === 'build') return `/forms/${form.id}/edit`;
    return `/forms/${form.id}/${tab}`;
  }

  return (
    <header className="h-[48px] bg-white border-b border-[rgba(86,82,90,0.08)] flex items-center justify-between px-3 flex-shrink-0">
      {/* Left: breadcrumb + title */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <Link
          href="/"
          className="flex items-center gap-1 text-[#655d67] hover:text-[#3c323e] transition-colors flex-shrink-0"
        >
          <FileText size={13} />
          Forms
        </Link>
        <span className="text-[#c4c1c5] flex-shrink-0">›</span>
        {onTitleChange ? (
          <input
            value={form.title}
            onChange={e => onTitleChange(e.target.value)}
            aria-label="Form title"
            className="text-sm font-medium text-[#3c323e] outline-none bg-transparent min-w-0 max-w-[220px] border-b border-transparent focus:border-[#655d67] transition-colors"
          />
        ) : (
          <span className="text-sm font-medium text-[#3c323e] truncate max-w-[220px]">
            {form.title}
          </span>
        )}
      </div>

      {/* Center: tabs */}
      <div className="flex items-center gap-0.5 bg-[rgba(87,84,91,0.06)] rounded-lg p-0.5">
        {TABS.map(tab => (
          <Link
            key={tab.key}
            href={hrefFor(tab.key)}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              active === tab.key
                ? 'bg-white text-[#3c323e] shadow-sm'
                : 'text-[#655d67] hover:text-[#3c323e]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {children}
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            form.status === 'published'
              ? 'bg-[#f4faf8] text-[#095145] border border-[#c0e4de]'
              : 'bg-[rgba(87,84,91,0.06)] text-[#655d67]'
          }`}
        >
          <Globe size={13} />
          {form.status === 'published' ? 'Published' : 'Draft'}
        </span>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
          <HelpCircle size={15} />
        </button>
        <button className="w-7 h-7 rounded-full bg-[#bdddf9] flex items-center justify-center text-[10px] font-semibold text-[#4c414e]">
          SG
        </button>
      </div>
    </header>
  );
}
