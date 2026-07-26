'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ChevronDown, ChevronUp, FileText, LayoutGrid, Mic,
  MoreHorizontal, Pencil, Plus, Search, Trash2,
} from 'lucide-react';
import NamePromptDialog from '@/components/shared/NamePromptDialog';
import { DEFAULT_WORKSPACE, type Workspace } from '@/lib/workspaces';

export default function WorkspaceSidebar({
  search,
  onSearchChange,
  onCreateForm,
  creatingForm = false,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  formCounts,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  responsesUsed,
  responseLimit,
  planName,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onCreateForm: () => void;
  /** Creating a form provisions it server-side, so the button reports progress. */
  creatingForm?: boolean;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  /** Forms per workspace id, for the row counts. */
  formCounts: Record<string, number>;
  onCreateWorkspace: (name: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDeleteWorkspace: (id: string) => void;
  responsesUsed: number;
  /** `null` on Enterprise. */
  responseLimit: number | null;
  planName: string;
}) {
  const router = useRouter();
  const [privateExpanded, setPrivateExpanded] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Workspace | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [aiGoal, setAiGoal] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuFor) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuFor]);

  const overLimit = responseLimit !== null && responsesUsed > responseLimit;
  const usedPct =
    responseLimit === null ? 100 : Math.min(100, (responsesUsed / responseLimit) * 100);

  function askResearchFlow() {
    const goal = aiGoal.trim();
    router.push(goal ? `/research-flow?goal=${encodeURIComponent(goal)}` : '/research-flow');
  }

  return (
    <aside className="flex h-full w-[280px] flex-shrink-0 flex-col border-r border-[rgba(86,82,90,0.08)] bg-white">
      {/* Create form */}
      <div className="px-4 pt-4">
        <button
          onClick={onCreateForm}
          disabled={creatingForm}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2b232d] text-[15px] font-semibold text-white transition-colors hover:bg-[#1f1922] disabled:opacity-70"
        >
          {creatingForm ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Creating…
            </>
          ) : (
            <>
              <Plus size={17} strokeWidth={2.5} />
              Create form
            </>
          )}
        </button>
      </div>

      {/* Search — borderless, as in the real sidebar */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2.5 py-1.5">
          <Search size={17} className="flex-shrink-0 text-[#655d67]" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search"
            aria-label="Search forms"
            className="min-w-0 flex-1 text-[15px] text-[#3c323e] placeholder:text-[#655d67]"
          />
        </div>
      </div>

      <div className="mt-2 border-t border-[rgba(86,82,90,0.08)]" />

      {/* Workspaces */}
      <div className="flex-1 overflow-y-auto px-3 pt-4">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="flex items-center gap-2.5 text-[15px] font-medium text-[#3c323e]">
            <LayoutGrid size={17} className="text-[#655d67]" />
            Workspaces
          </span>
          <button
            onClick={() => setCreating(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(81,76,84,0.18)] text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
            aria-label="New workspace"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="mt-3">
          <button
            onClick={() => setPrivateExpanded(v => !v)}
            className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-[15px] text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
          >
            <span>Private</span>
            {privateExpanded
              ? <ChevronUp size={16} className="text-[#655d67]" />
              : <ChevronDown size={16} className="text-[#655d67]" />}
          </button>

          {privateExpanded && (
            <div className="mt-0.5 flex flex-col gap-0.5">
              {workspaces.map(workspace => {
                const active = workspace.id === activeWorkspaceId;
                const deletable = workspace.id !== DEFAULT_WORKSPACE.id;
                return (
                  <div key={workspace.id} className="group relative">
                    <button
                      onClick={() => onSelectWorkspace(workspace.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[15px] transition-colors ${
                        active
                          ? 'bg-[rgba(87,84,91,0.06)] font-medium text-[#3c323e]'
                          : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.04)]'
                      }`}
                    >
                      <FileText size={16} style={{ color: workspace.color }} className="flex-shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                      <span className="flex-shrink-0 text-[13px] text-[#847e85] tabular-nums">
                        {formCounts[workspace.id] ?? 0}
                      </span>
                    </button>

                    {deletable && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuFor(m => (m === workspace.id ? null : workspace.id)); }}
                          aria-label={`Options for ${workspace.name}`}
                          className="absolute right-1 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-[#655d67] opacity-0 transition-opacity hover:bg-[rgba(87,84,91,0.08)] group-hover:opacity-100"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {menuFor === workspace.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-1 top-9 z-40 w-40 rounded-xl border border-[rgba(81,76,84,0.1)] bg-white py-1 shadow-xl animate-fadeIn"
                            role="menu"
                          >
                            <button
                              role="menuitem"
                              onClick={() => { setRenaming(workspace); setMenuFor(null); }}
                              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
                            >
                              <Pencil size={14} />
                              Rename
                            </button>
                            <button
                              role="menuitem"
                              onClick={() => {
                                setMenuFor(null);
                                if (confirm(`Delete “${workspace.name}”? Its forms move back to ${DEFAULT_WORKSPACE.name}.`)) {
                                  onDeleteWorkspace(workspace.id);
                                }
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: usage + AI box */}
      <div className="border-t border-[rgba(86,82,90,0.08)] px-4 pb-4 pt-3">
        <p className="text-[14px] font-medium text-[#3c323e]">Responses collected</p>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#dedcde]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${usedPct}%`, backgroundColor: overLimit ? '#be185d' : '#3c323e' }}
            />
          </div>
          <span className="whitespace-nowrap text-[13px] text-[#655d67]">
            <span className={`font-medium ${overLimit ? 'text-[#be185d]' : 'text-[#3c323e]'}`}>
              {responsesUsed.toLocaleString('en-US')}
            </span>{' '}
            / {responseLimit === null ? '∞' : responseLimit.toLocaleString('en-US')}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-[#847e85]">
          {overLimit ? `Over the ${planName} cap` : `Included with ${planName}`}
        </p>
        <Link
          href="/plans"
          className="mt-3 block w-full rounded-lg border border-[rgba(81,76,84,0.18)] py-2 text-center text-[14px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
        >
          Increase response limit
        </Link>

        {/* Research Flow's entry point */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#ddb7f0] bg-white px-3 py-2.5 shadow-sm transition-colors focus-within:border-[#c98fe6]">
          <Mic size={17} className="flex-shrink-0 text-[#655d67]" />
          <input
            value={aiGoal}
            onChange={e => setAiGoal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askResearchFlow()}
            placeholder="Ask Teraform AI"
            aria-label="Describe a form to draft"
            className="min-w-0 flex-1 text-[15px] text-[#3c323e] placeholder:text-[#847e85]"
          />
          <button
            onClick={askResearchFlow}
            aria-label="Draft this form"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[rgba(86,82,90,0.1)] bg-[rgba(89,86,93,0.04)] text-[#655d67] transition-colors hover:bg-[rgba(89,86,93,0.1)] hover:text-[#3c323e]"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {creating && (
        <NamePromptDialog
          title="Create a workspace"
          description="Group related forms together. Only you can see private workspaces."
          placeholder="e.g. Customer research"
          cta="Create workspace"
          onClose={() => setCreating(false)}
          onSubmit={name => { onCreateWorkspace(name); setCreating(false); }}
        />
      )}
      {renaming && (
        <NamePromptDialog
          title="Rename workspace"
          initialValue={renaming.name}
          cta="Save name"
          onClose={() => setRenaming(null)}
          onSubmit={name => { onRenameWorkspace(renaming.id, name); setRenaming(null); }}
        />
      )}
    </aside>
  );
}
