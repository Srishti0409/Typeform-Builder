'use client';

import Link from 'next/link';
import { BarChart2, HelpCircle, PanelsTopLeft, Send } from 'lucide-react';
import type { Form } from '@/lib/types';

export type BuilderTab = 'content' | 'workflow' | 'connect';

/**
 * Builder navigation, matching Typeform's: breadcrumb on the left, the
 * Content / Workflow / Connect switcher in the centre, and account actions right.
 *
 * Workflow covers branching, which this build scopes out, so it is inert.
 * Results and Settings keep their own entry points (Results here, Settings on the
 * toolbar's gear) — they are core features and must stay reachable.
 */
export default function BuilderTopBar({
  form,
  active = 'content',
  onTitleChange,
  onShare,
  children,
}: {
  form: Form;
  active?: BuilderTab;
  onTitleChange: (title: string) => void;
  onShare: () => void;
  /** Save state and the publish control, rendered before the account actions. */
  children?: React.ReactNode;
}) {
  const TABS: { key: BuilderTab; label: string; href?: string; oos?: boolean }[] = [
    { key: 'content', label: 'Content' },
    { key: 'workflow', label: 'Workflow', oos: true },
    { key: 'connect', label: 'Connect', href: `/integrations?form=${form.id}` },
  ];

  /*
   * The action column's minimum is its content rather than zero, so a narrow
   * window shrinks the title column instead of crushing the controls into it.
   * Both side columns are still 1fr once there is room, which keeps the tabs
   * centred at the widths where everything fits.
   */
  return (
    <header className="grid h-14 flex-shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(auto,1fr)] items-center gap-3 bg-white px-4">
      {/* Left: breadcrumb + inline-editable title */}
      <div className="flex min-w-0 items-center gap-1.5 justify-self-start text-[15px]">
        <Link
          href="/"
          className="flex flex-shrink-0 items-center gap-1.5 text-[#3c323e] transition-colors hover:text-[#655d67]"
        >
          <PanelsTopLeft size={17} />
          Forms
        </Link>
        <span className="flex-shrink-0 text-[#c4c1c5]">›</span>
        <input
          value={form.title}
          onChange={e => onTitleChange(e.target.value)}
          aria-label="Form title"
          className="min-w-0 max-w-[240px] border-b border-transparent bg-transparent font-semibold text-[#3c323e] outline-none transition-colors focus:border-[#655d67]"
        />
      </div>

      {/* Centre: the builder's three sections */}
      <nav className="flex items-center gap-1 justify-self-center">
        {TABS.map(tab => {
          const isActive = tab.key === active;
          const cls = `rounded-lg px-4 py-1.5 text-[15px] font-medium transition-colors ${
            isActive
              ? 'bg-[rgba(87,84,91,0.08)] text-[#3c323e]'
              : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.05)]'
          }`;
          if (tab.oos) {
            return (
              <button key={tab.key} className={`${cls} oos`} title="Not available in this build">
                {tab.label}
              </button>
            );
          }
          return tab.href ? (
            <Link key={tab.key} href={tab.href} className={cls}>{tab.label}</Link>
          ) : (
            <button key={tab.key} className={cls}>{tab.label}</button>
          );
        })}
      </nav>

      {/* Right: save state, share, results, account */}
      <div className="flex items-center gap-2 justify-self-end">
        {children}

        <button
          onClick={onShare}
          className="flex items-center gap-2 rounded-lg border border-[rgba(81,76,84,0.2)] px-3.5 py-1.5 text-[15px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
        >
          <Send size={15} />
          Share
        </button>

        <Link
          href={`/forms/${form.id}/results`}
          aria-label="Results"
          title="Results"
          className="flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[15px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
        >
          <BarChart2 size={15} />
          {/* Label drops on narrower windows so the cluster can't crowd the tabs. */}
          <span className="hidden 2xl:inline">Results</span>
        </Link>

        <span className="mx-1 h-6 w-px bg-[rgba(86,82,90,0.14)]" />

        {/* Two words, so it needs nowrap: wrapped, it outgrows the header row. */}
        <Link
          href="/plans"
          className="whitespace-nowrap rounded-lg bg-[#127a63] px-4 py-1.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0f6552]"
        >
          View plans
        </Link>
        <button className="oos flex h-9 w-9 items-center justify-center rounded-full text-[#3c323e]">
          <HelpCircle size={19} />
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6d8b8] text-[13px] font-semibold text-[#7a4a25]">
          SG
        </span>
      </div>
    </header>
  );
}
