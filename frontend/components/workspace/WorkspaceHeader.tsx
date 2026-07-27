'use client';

import Link from 'next/link';
import {
  BarChart2, Briefcase, ChevronDown, FileText, Gem, Grid3X3, HelpCircle, Users, Zap,
} from 'lucide-react';
import { useBrandKit } from '@/lib/brand-kit';
import { useSubscription } from '@/lib/plans';
import { ENABLED, UNAVAILABLE } from '@/lib/scope';

/** Which account-level destination the current page is. */
export type WorkspaceSection =
  | 'forms'
  | 'contacts'
  | 'automations'
  | 'research-flow'
  | 'integrations'
  | 'brand-kit'
  | 'plans';

const TABS: {
  section: WorkspaceSection;
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  /** Off in this build: the tab is shown, dimmed, and doesn't navigate. */
  oos?: boolean;
}[] = [
  { section: 'forms', href: '/', label: 'Forms', icon: <FileText size={17} /> },
  { section: 'contacts', href: '/contacts', label: 'Contacts', icon: <Users size={17} /> },
  { section: 'automations', href: '/automations', label: 'Automations', icon: <Zap size={17} />, oos: !ENABLED.automations },
  { section: 'research-flow', href: '/research-flow', label: 'Research Flow', icon: <BarChart2 size={17} />, badge: 'Demo', oos: !ENABLED.researchFlow },
];

/**
 * The chrome above every workspace page: account bar + workspace tabs.
 *
 * Shared rather than per-page so that Integrations, Brand kit, Plans, Contacts,
 * Automations and Research Flow are destinations *within* the app — which is
 * what makes the top bar navigable instead of decorative.
 */
export default function WorkspaceHeader({ active }: { active: WorkspaceSection }) {
  const [kit] = useBrandKit();
  const { plan, planId } = useSubscription();

  /** Account-bar links read as pressed on their own page. */
  function navClass(section: WorkspaceSection) {
    return `flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium text-[#3c323e] transition-colors ${
      active === section ? 'bg-[rgba(87,84,91,0.08)]' : 'hover:bg-[rgba(87,84,91,0.06)]'
    }`;
  }

  return (
    <>
      <header className="flex h-14 flex-shrink-0 items-center justify-between bg-white pl-3 pr-4">
        {/* Left: product tile + workspace switcher */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Typeform home"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1c1a1e]"
          >
            <span className="flex items-center gap-[2px]">
              <span className="h-[13px] w-[3px] rounded-[1px] bg-white" />
              <span className="h-[13px] w-[3px] rounded-[1px] bg-white" />
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-[rgba(87,84,91,0.06)]"
          >
            {/* The brand kit's logo takes over the account mark once one is set. */}
            {kit.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local data URL; nothing for the image optimiser to fetch
              <img
                src={kit.logo}
                alt={kit.name}
                className="h-7 w-7 flex-shrink-0 rounded-lg border border-[rgba(86,82,90,0.12)] bg-white object-contain"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c0562a] text-[13px] font-semibold text-white">
                S
              </span>
            )}
            <span className="text-[15px] font-medium text-[#3c323e]">ssrishtigkp</span>
            <ChevronDown size={15} className="text-[#655d67]" />
          </Link>
        </div>

        {/* Right: account-level destinations */}
        <div className="flex items-center gap-1">
          <Link href="/integrations" className={navClass('integrations')}>
            <Grid3X3 size={17} />
            Integrations
          </Link>
          <Link href="/brand-kit" className={navClass('brand-kit')}>
            <Briefcase size={17} />
            Brand kit
          </Link>

          {/* Free accounts get the upsell; paying ones see what they pay for. */}
          {planId === 'free' ? (
            <Link
              href="/plans"
              className="ml-1 rounded-lg bg-[#127a63] px-4 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-[#0f6552]"
            >
              View plans
            </Link>
          ) : (
            <Link
              href="/plans"
              className={`ml-1 flex items-center gap-2 rounded-lg border border-[#c0e4de] bg-[#f4faf8] px-3 py-1.5 text-[15px] font-medium text-[#095145] transition-colors hover:bg-[#eaf6f3] ${
                active === 'plans' ? 'ring-2 ring-[rgba(23,119,103,0.18)]' : ''
              }`}
            >
              <Gem size={15} />
              {plan.name}
            </Link>
          )}

          <button
            className="oos flex h-9 w-9 items-center justify-center rounded-full text-[#3c323e]"
            aria-label="Help"
          >
            <HelpCircle size={19} />
          </button>
          <button className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#f6d8b8] text-[13px] font-semibold text-[#7a4a25] transition-opacity hover:opacity-80">
            SG
          </button>
        </div>
      </header>

      {/* Workspace-level tabs */}
      <nav className="flex-shrink-0 bg-white px-3">
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const cls = `flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[15px] font-medium text-[#3c323e] transition-colors ${
              active === tab.section
                ? 'border-[#3c323e]'
                : 'border-transparent hover:border-[rgba(60,50,62,0.25)]'
            }`;
            const contents = (
              <>
                {tab.icon}
                {tab.label}
                {tab.badge && (
                  <span className="rounded-md border border-[#bdddf9] bg-[#f6fafd] px-1.5 py-0.5 text-[11px] font-medium text-[#01487f]">
                    {tab.badge}
                  </span>
                )}
              </>
            );
            // A span rather than a dimmed Link: pointer-events alone would still
            // leave the tab reachable by keyboard.
            return tab.oos ? (
              <span key={tab.section} className={`${cls} oos`} aria-disabled title={UNAVAILABLE}>
                {contents}
              </span>
            ) : (
              <Link key={tab.section} href={tab.href} className={cls}>
                {contents}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
