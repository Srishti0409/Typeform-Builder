'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, FileText, Grid3X3, MoreHorizontal } from 'lucide-react';
import type { FormListItem } from '@/lib/types';
import type { Workspace } from '@/lib/workspaces';

/** Column widths shared by the table header and its rows. */
export const COL = { responses: 108, completed: 108, updated: 120, integrations: 120, menu: 40 };

export function FormAvatar({ index }: { index: number }) {
  // Typeform tints each form's tile from a fixed rotation.
  const palette = ['#c0562a', '#3c73a5', '#177767', '#7c3aed', '#b45309', '#be185d'];
  return (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]"
      style={{ backgroundColor: palette[index % palette.length] }}
    >
      <FileText size={17} className="text-white/90" />
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function FormListRow({
  form,
  index,
  /** Apps connected to this form, shown as a badge on the Integrations cell. */
  connectedCount,
  onDelete,
  onDuplicate,
  onRename,
  onCopyLink,
  workspaces,
  currentWorkspaceId,
  onCopyTo,
  onMoveTo,
}: {
  form: FormListItem;
  index: number;
  connectedCount: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onCopyLink: () => void;
  /** Destinations offered by the Copy to / Move to submenus. */
  workspaces: Workspace[];
  currentWorkspaceId: string;
  onCopyTo: (workspaceId: string) => void;
  onMoveTo: (workspaceId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenu, setSubmenu] = useState<'copy' | 'move' | null>(null);
  /** Rows near the viewport bottom open the menu upward instead. */
  const [dropUp, setDropUp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /** Approximate menu height — 9 items plus three separators. */
  const MENU_H = 400;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  /**
   * Mirrors Typeform's row menu exactly: label-only items (no icons), grouped by
   * rule, with Copy to / Move to opening workspace submenus.
   *
   * Publish lives in the builder, not here — same as the real product.
   */
  type MenuItem =
    | { label: string; action: () => void; danger?: boolean; oos?: boolean }
    | { label: string; submenu: 'copy' | 'move' }
    | null;

  const items: MenuItem[] = [
    { label: 'Copy link', action: onCopyLink },
    null,
    { label: 'Content', action: () => { window.location.href = `/forms/${form.id}/edit`; } },
    // Branching/logic is out of scope for this build.
    { label: 'Workflow', action: () => {}, oos: true },
    { label: 'Connect', action: () => { window.location.href = `/integrations?form=${form.id}`; } },
    null,
    { label: 'Rename', action: onRename },
    { label: 'Duplicate', action: onDuplicate },
    { label: 'Copy to', submenu: 'copy' },
    { label: 'Move to', submenu: 'move' },
    null,
    { label: 'Delete', action: onDelete, danger: true },
  ];

  return (
    <div className="group relative border-b border-[rgba(86,82,90,0.06)]">
      <div className="flex items-center rounded-xl px-3 py-3 transition-colors hover:bg-[rgba(87,84,91,0.04)]">
        {/* Name */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FormAvatar index={index} />
          <div className="min-w-0">
            <Link href={`/forms/${form.id}/edit`} className="block">
              <span className="block truncate text-[15px] font-medium text-[#3c323e] transition-colors hover:text-[#177767]">
                {form.title}
              </span>
            </Link>
            <span
              className={`mt-0.5 inline-flex items-center gap-1 text-[12px] ${
                form.status === 'published' ? 'text-[#095145]' : 'text-[#847e85]'
              }`}
            >
              {form.status === 'published' && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#177767]" />
              )}
              {form.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>

        {/* The count is the way into results, as in Typeform. */}
        <div className="flex items-center justify-center" style={{ width: COL.responses }}>
          <Link
            href={`/forms/${form.id}/results`}
            title={`View results for ${form.title}`}
            className="rounded px-2 py-0.5 text-[15px] text-[#655d67] tabular-nums transition-colors hover:bg-[rgba(87,84,91,0.08)] hover:text-[#3c323e]"
          >
            {form.response_count > 0 ? form.response_count : '–'}
          </Link>
        </div>
        <div className="flex items-center justify-center text-[15px] text-[#655d67]" style={{ width: COL.completed }}>
          –
        </div>
        <div className="text-[15px] text-[#655d67]" style={{ width: COL.updated }}>
          {formatDate(form.updated_at)}
        </div>

        {/* Integrations for this form specifically */}
        <div style={{ width: COL.integrations }}>
          <Link
            href={`/integrations?form=${form.id}`}
            title={`Connect apps to ${form.title}`}
            aria-label={`Connect apps to ${form.title}`}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              connectedCount > 0
                ? 'border-[#c0e4de] bg-[#f4faf8] text-[#095145]'
                : 'border-[rgba(81,76,84,0.15)] text-[#655d67] hover:bg-[rgba(87,84,91,0.06)]'
            }`}
          >
            <Grid3X3 size={15} />
            {connectedCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#177767] px-1 text-[10px] font-semibold text-white">
                {connectedCount}
              </span>
            )}
          </Link>
        </div>

        <div className="relative" style={{ width: COL.menu }}>
          <button
            ref={triggerRef}
            onClick={e => {
              e.stopPropagation();
              const box = triggerRef.current?.getBoundingClientRect();
              if (box) setDropUp(box.bottom + MENU_H > window.innerHeight);
              setMenuOpen(v => !v);
            }}
            aria-label={`Actions for ${form.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#655d67] opacity-0 transition-colors hover:bg-[rgba(87,84,91,0.08)] hover:text-[#3c323e] group-hover:opacity-100"
          >
            <MoreHorizontal size={17} />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className={`absolute right-0 z-50 w-[232px] rounded-xl border border-[rgba(81,76,84,0.1)] bg-white py-2 shadow-xl animate-fadeIn ${
                dropUp ? 'bottom-9' : 'top-9'
              }`}
              role="menu"
              onMouseLeave={() => setSubmenu(null)}
            >
              {items.map((item, i) => {
                if (item === null) {
                  return <div key={i} className="my-2 border-t border-[rgba(86,82,90,0.08)]" />;
                }

                if ('submenu' in item) {
                  const open = submenu === item.submenu;
                  return (
                    <div key={i} className="relative">
                      <button
                        role="menuitem"
                        aria-haspopup="menu"
                        aria-expanded={open}
                        onMouseEnter={() => setSubmenu(item.submenu)}
                        onClick={() => setSubmenu(open ? null : item.submenu)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-[15px] text-[#3c323e] transition-colors ${
                          open ? 'bg-[rgba(87,84,91,0.06)]' : 'hover:bg-[rgba(87,84,91,0.06)]'
                        }`}
                      >
                        {item.label}
                        <ChevronRight size={15} className="text-[#847e85]" />
                      </button>

                      {open && (
                        <div
                          className="absolute right-full top-0 mr-1 w-[220px] rounded-xl border border-[rgba(81,76,84,0.1)] bg-white py-2 shadow-xl"
                          role="menu"
                        >
                          <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#847e85]">
                            {item.submenu === 'copy' ? 'Copy to workspace' : 'Move to workspace'}
                          </p>
                          {workspaces.map(w => {
                            const isCurrent = w.id === currentWorkspaceId;
                            return (
                              <button
                                key={w.id}
                                role="menuitem"
                                disabled={item.submenu === 'move' && isCurrent}
                                onClick={() => {
                                  if (item.submenu === 'copy') onCopyTo(w.id);
                                  else onMoveTo(w.id);
                                  setSubmenu(null);
                                  setMenuOpen(false);
                                }}
                                className="flex w-full items-center justify-between px-4 py-2 text-left text-[15px] text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.06)] disabled:opacity-40"
                              >
                                <span className="truncate">{w.name}</span>
                                {isCurrent && <Check size={14} className="flex-shrink-0 text-[#177767]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={i}
                    role="menuitem"
                    disabled={item.oos}
                    title={item.oos ? 'Not available in this build' : undefined}
                    onClick={() => { item.action(); setMenuOpen(false); }}
                    onMouseEnter={() => setSubmenu(null)}
                    className={`flex w-full items-center px-4 py-2 text-left text-[15px] transition-colors ${
                      item.oos
                        ? 'oos text-[#3c323e]'
                        : item.danger
                          ? 'text-[#c0392b] hover:bg-red-50'
                          : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.06)]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
