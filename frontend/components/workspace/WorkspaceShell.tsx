'use client';

import WorkspaceHeader, { type WorkspaceSection } from './WorkspaceHeader';

/**
 * Page frame for the workspace pages: fixed chrome on top, then either one
 * scrolling content column or — when `sidebar` is supplied — a fixed left rail
 * beside it, as Automations uses.
 */
export default function WorkspaceShell({
  active,
  maxWidth = 1080,
  sidebar,
  children,
}: {
  active: WorkspaceSection;
  maxWidth?: number;
  /** Optional left rail. Given one, the content column fills the remainder. */
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (sidebar) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-white">
        <WorkspaceHeader active={active} />
        <div className="flex flex-1 overflow-hidden border-t border-[rgba(86,82,90,0.08)]">
          {/* Same width as the forms sidebar, so the rail doesn't jump between tabs. */}
          <aside className="flex w-[280px] flex-shrink-0 flex-col border-r border-[rgba(86,82,90,0.08)] bg-white">
            {sidebar}
          </aside>
          <div className="flex-1 overflow-auto bg-[#fbfbfc]">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <WorkspaceHeader active={active} />
      <div className="flex-1 overflow-auto border-t border-[rgba(86,82,90,0.08)] bg-[#fbfbfc]">
        <div className="mx-auto px-8 py-8" style={{ maxWidth }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Shared page title + subtitle + optional actions, so the pages line up. */
export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgba(86,82,90,0.1)] pb-5">
      <div className="min-w-0">
        <h1 className="text-[30px] font-normal leading-none text-[#3c323e]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-[#655d67]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
