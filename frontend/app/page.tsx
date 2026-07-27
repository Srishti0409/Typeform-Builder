'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText, Gem, LayoutGrid, List, MoreHorizontal,
  Plus, Sparkles, UserPlus, X,
} from 'lucide-react';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar';
import SortMenu, { type SortKey } from '@/components/workspace/SortMenu';
import FormListRow, { COL, FormAvatar } from '@/components/workspace/FormListRow';
import InviteDialog from '@/components/workspace/InviteDialog';
import NamePromptDialog from '@/components/shared/NamePromptDialog';
import { useToast } from '@/components/shared/Toast';
import { ApiError, api } from '@/lib/api';
import { applyKitToNewForm, useBrandKit } from '@/lib/brand-kit';
import { useConnections } from '@/lib/integrations';
import { useSubscription } from '@/lib/plans';
import { ENABLED, UNAVAILABLE } from '@/lib/scope';
import { DEFAULT_WORKSPACE, useWorkspaces } from '@/lib/workspaces';
import type { FormListItem } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** The suggestion the banner makes; it seeds Research Flow's goal field. */
const SUGGESTED_GOAL =
  'Gather expert opinions on recent studies to support comprehensive literature reviews';

export default function HomePage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<FormListItem | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<SortKey>('created');
  const [showBanner, setShowBanner] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(DEFAULT_WORKSPACE.id);

  /** The suggestion banner drafts a form for you, which this build doesn't do. */
  const aiOff = !ENABLED.aiAssist;

  const { showToast, toastNode } = useToast();
  const [kit] = useBrandKit();
  const { plan } = useSubscription();
  const { map: connections } = useConnections();
  const {
    workspaces, create: createWorkspace, rename: renameWorkspace,
    remove: removeWorkspace, assign: assignWorkspace, workspaceOf,
  } = useWorkspaces();

  useEffect(() => { void loadForms(); }, []);

  // Derived, not stored: deleting the selected workspace falls back to the
  // default one rather than leaving the list pointed at nothing.
  const activeWorkspaceId = workspaces.some(w => w.id === selectedWorkspaceId)
    ? selectedWorkspaceId
    : DEFAULT_WORKSPACE.id;

  async function loadForms() {
    try {
      setLoading(true);
      setForms(await api.forms.list());
      setError(null);
    } catch {
      setError('Failed to load forms. Is the backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Matches Typeform: creating a form asks for nothing. It provisions an
   * untitled form and drops you straight on the "New form" screen, where you
   * pick "Start from scratch". Renaming is a separate, explicit action.
   *
   * The form lands in the workspace you were looking at, themed to the brand kit.
   */
  async function handleCreate() {
    if (creating) return;
    try {
      setCreating(true);
      const form = await api.forms.create('New form');
      if (activeWorkspaceId !== DEFAULT_WORKSPACE.id) assignWorkspace(form.id, activeWorkspaceId);
      await applyKitToNewForm(kit, form.id);
      router.push(`/forms/${form.id}/edit`);
    } catch {
      showToast('Could not create the form.');
      setCreating(false);
    }
  }

  async function handleRename(title: string) {
    if (!renameTarget) return;
    try {
      setRenaming(true);
      await api.forms.update(renameTarget.id, { title });
      setForms(fs => fs.map(f => (f.id === renameTarget.id ? { ...f, title } : f)));
      setRenameTarget(null);
      showToast('Form renamed');
    } catch (err) {
      // The API explains why it refused (an empty or over-long name), which is
      // more use than a generic failure.
      showToast(err instanceof ApiError ? err.message : 'Could not rename the form.');
    } finally {
      setRenaming(false);
    }
  }

  async function handleCopyLink(form: FormListItem) {
    const url = `${window.location.origin}/f/${form.slug}`;
    // Drafts have a slug but the public route 404s until they're published, so
    // say so rather than handing over a link that looks broken.
    const note =
      form.status === 'published'
        ? 'Link copied to clipboard'
        : 'Link copied — publish the form to make it work';
    try {
      await navigator.clipboard.writeText(url);
      showToast(note);
    } catch {
      showToast(url);
    }
  }

  /** "Copy to" — duplicates the form, then files the copy in the chosen workspace. */
  async function handleCopyTo(form: FormListItem, workspaceId: string) {
    try {
      const copy = await api.forms.duplicate(form.id);
      assignWorkspace(copy.id, workspaceId);
      await loadForms();
      const name = workspaces.find(w => w.id === workspaceId)?.name ?? 'workspace';
      const n = copy.questions?.length ?? 0;
      showToast(`Copied to ${name} — ${n} question${n === 1 ? '' : 's'}`);
    } catch {
      showToast('Could not copy the form.');
    }
  }

  /** "Move to" — reassigns the form without duplicating it. */
  function handleMoveTo(form: FormListItem, workspaceId: string) {
    assignWorkspace(form.id, workspaceId);
    const name = workspaces.find(w => w.id === workspaceId)?.name ?? 'workspace';
    showToast(`Moved to ${name}`);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this form? This cannot be undone.')) return;
    try {
      await api.forms.delete(id);
      setForms(f => f.filter(x => x.id !== id));
      showToast('Form deleted');
    } catch {
      showToast('Could not delete the form.');
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const copy = await api.forms.duplicate(id);
      // The copy belongs beside its original.
      const workspaceId = workspaceOf(id);
      if (workspaceId !== DEFAULT_WORKSPACE.id) assignWorkspace(copy.id, workspaceId);
      await loadForms();
      // Say what came across, so the copy's contents don't have to be opened to
      // be believed.
      const n = copy.questions?.length ?? 0;
      showToast(`Form duplicated — ${n} question${n === 1 ? '' : 's'} copied`);
    } catch {
      showToast('Could not duplicate the form.');
    }
  }

  const formCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const workspace of workspaces) counts[workspace.id] = 0;
    for (const form of forms) {
      const id = workspaceOf(form.id);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [forms, workspaces, workspaceOf]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) ?? DEFAULT_WORKSPACE;

  const visibleForms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms
      .filter(f => workspaceOf(f.id) === activeWorkspaceId)
      .filter(f => !q || f.title.toLowerCase().includes(q))
      .sort((a, b) => {
        // Alphabetical keeps the ordering the "Name" option always used — only
        // the label changed. The two date orderings read the field they name:
        // "Date created" used to sort by updated_at, which is now its own option.
        if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
        const field = sortBy === 'created' ? 'created_at' : 'updated_at';
        return new Date(b[field]).getTime() - new Date(a[field]).getTime();
      });
  }, [forms, search, sortBy, activeWorkspaceId, workspaceOf]);

  // The quota counts every response in the account, as billing would.
  const responsesUsed = forms.reduce((sum, f) => sum + f.response_count, 0);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <WorkspaceHeader active="forms" />

      {/* Rounded content panel, inset from the shell */}
      <div className="flex flex-1 overflow-hidden bg-[#f7f7f8] pl-0">
        <WorkspaceSidebar
          search={search}
          onSearchChange={setSearch}
          onCreateForm={handleCreate}
          creatingForm={creating}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={setSelectedWorkspaceId}
          formCounts={formCounts}
          onCreateWorkspace={name => {
            setSelectedWorkspaceId(createWorkspace(name));
            showToast(`“${name}” created`);
          }}
          onRenameWorkspace={(id, name) => { renameWorkspace(id, name); showToast('Workspace renamed'); }}
          onDeleteWorkspace={id => { removeWorkspace(id); showToast('Workspace deleted'); }}
          responsesUsed={responsesUsed}
          responseLimit={plan.responseLimit}
          planName={plan.name}
        />

        <main className="flex flex-1 flex-col overflow-hidden bg-[#fbfbfc]">
          <div className="flex-1 overflow-auto px-7 py-6">
            {/* Workspace header */}
            <div className="flex items-center justify-between border-b border-[rgba(86,82,90,0.1)] pb-4">
              <div className="flex items-center gap-2 text-[#3c323e]">
                <h1 className="text-[30px] font-normal leading-none">{activeWorkspace.name}</h1>
                <button
                  className="rounded-lg p-1.5 text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
                  aria-label="Workspace options"
                >
                  <MoreHorizontal size={18} />
                </button>
                <button
                  onClick={() => setShowInvite(true)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[15px] text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
                >
                  <UserPlus size={16} />
                  Invite
                </button>
                <Link
                  href="/plans"
                  aria-label="View plans"
                  title={`You are on ${plan.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#177767] text-[#177767] transition-colors hover:bg-[#f4faf8]"
                >
                  <Gem size={13} />
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <SortMenu value={sortBy} onChange={setSortBy} />

                {/* Segmented list/grid toggle */}
                <div className="flex overflow-hidden rounded-lg border border-[rgba(81,76,84,0.18)] bg-white">
                  {([
                    { key: 'list' as const, label: 'List', icon: <List size={15} /> },
                    { key: 'grid' as const, label: 'Grid', icon: <LayoutGrid size={15} /> },
                  ]).map((v, i) => (
                    <button
                      key={v.key}
                      onClick={() => setViewMode(v.key)}
                      className={`flex items-center gap-2 px-3 py-2 text-[14px] transition-colors ${
                        i === 1 ? 'border-l border-[rgba(81,76,84,0.18)]' : ''
                      } ${
                        viewMode === v.key
                          ? 'bg-[rgba(87,84,91,0.08)] font-medium text-[#3c323e]'
                          : 'text-[#655d67] hover:bg-[rgba(87,84,91,0.04)]'
                      }`}
                    >
                      {v.icon}
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI suggestion banner — hands its goal to Research Flow */}
            {showBanner && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#ddb7f0] bg-white px-4 py-3.5 shadow-sm animate-fadeIn">
                <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f5eafd] ${aiOff ? 'oos' : ''}`}>
                  <Sparkles size={16} className="text-[#9333ea]" />
                </div>
                {/* Only the suggestion is dimmed — the dismiss button below stays
                    live, so a banner that can't act can still be closed. */}
                <div className={`min-w-0 flex-1 ${aiOff ? 'oos' : ''}`} title={aiOff ? UNAVAILABLE : undefined}>
                  <p className="text-[15px] text-[#3c323e]">
                    Create a <span className="font-medium">Gather expert opinions</span> on recent
                    studies to support comprehensive literature reviews.
                  </p>
                  {aiOff ? (
                    <span
                      aria-disabled
                      className="mt-2.5 inline-block rounded-lg border border-[rgba(81,76,84,0.18)] bg-white px-3 py-1.5 text-[14px] font-medium text-[#3c323e]"
                    >
                      Use this form
                    </span>
                  ) : (
                    <Link
                      href={`/research-flow?goal=${encodeURIComponent(SUGGESTED_GOAL)}`}
                      className="mt-2.5 inline-block rounded-lg border border-[rgba(81,76,84,0.18)] bg-white px-3 py-1.5 text-[14px] font-medium text-[#3c323e] transition-all hover:shadow-sm"
                    >
                      Use this form
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  aria-label="Dismiss"
                  className="flex-shrink-0 text-[#655d67] transition-colors hover:text-[#3c323e]"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {/* Forms */}
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3c323e] border-t-transparent" />
                <span className="text-sm text-[#655d67]">Loading forms…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="max-w-xs text-center text-sm text-[#655d67]">{error}</p>
                <button
                  onClick={loadForms}
                  className="rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630]"
                >
                  Retry
                </button>
              </div>
            ) : visibleForms.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(87,84,91,0.06)]">
                  <FileText size={24} className="text-[#847e85]" />
                </div>
                <div className="max-w-sm text-center">
                  <p className="text-base font-medium text-[#3c323e]">
                    {search ? 'No forms match that search' : 'No forms yet'}
                  </p>
                  <p className="mt-1 text-sm text-[#655d67]">
                    {search
                      ? `Nothing in ${activeWorkspace.name} matches “${search}”.`
                      : `Create your first form in ${activeWorkspace.name}`}
                  </p>
                </div>
                {search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="rounded-lg border border-[rgba(81,76,84,0.18)] bg-white px-4 py-2 text-sm font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
                  >
                    Clear search
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630]"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    Create form
                  </button>
                )}
              </div>
            ) : viewMode === 'list' ? (
              <div className="mt-6">
                {/* Column headers */}
                <div className="flex items-center px-3 pb-2.5 text-[14px] text-[#655d67]">
                  <div className="flex-1" />
                  <div className="text-center" style={{ width: COL.responses }}>Responses</div>
                  <div className="text-center" style={{ width: COL.completed }}>Completed</div>
                  <div style={{ width: COL.updated }}>Updated</div>
                  <div style={{ width: COL.integrations }}>Integrations</div>
                  <div style={{ width: COL.menu }} />
                </div>

                <div className="border-t border-[rgba(86,82,90,0.06)]">
                  {visibleForms.map((form, i) => (
                    <FormListRow
                      key={form.id}
                      form={form}
                      index={i}
                      connectedCount={connections[form.id]?.length ?? 0}
                      onDelete={() => handleDelete(form.id)}
                      onDuplicate={() => handleDuplicate(form.id)}
                      onRename={() => setRenameTarget(form)}
                      onCopyLink={() => handleCopyLink(form)}
                      workspaces={workspaces}
                      currentWorkspaceId={workspaceOf(form.id)}
                      onCopyTo={wsId => handleCopyTo(form, wsId)}
                      onMoveTo={wsId => handleMoveTo(form, wsId)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                <button
                  onClick={handleCreate}
                  className="group flex h-[150px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(81,76,84,0.2)] text-[#655d67] transition-all hover:border-[#655d67] hover:bg-white hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(87,84,91,0.06)] transition-colors group-hover:bg-[rgba(87,84,91,0.1)]">
                    <Plus size={17} />
                  </div>
                  <span className="text-[14px] font-medium">New form</span>
                </button>

                {visibleForms.map((form, i) => (
                  <Link key={form.id} href={`/forms/${form.id}/edit`}>
                    <div className="flex h-[150px] cursor-pointer flex-col justify-between rounded-xl border border-[rgba(81,76,84,0.1)] bg-white p-4 transition-all hover:border-[rgba(81,76,84,0.2)] hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <FormAvatar index={i} />
                        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                          form.status === 'published'
                            ? 'border border-[#c0e4de] bg-[#f4faf8] text-[#095145]'
                            : 'bg-[rgba(87,84,91,0.06)] text-[#655d67]'
                        }`}>
                          {form.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div>
                        <p className="truncate text-[15px] font-medium text-[#3c323e]">{form.title}</p>
                        <p className="mt-0.5 text-[13px] text-[#847e85]">
                          {form.response_count} response{form.response_count !== 1 ? 's' : ''} · {formatDate(form.updated_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {renameTarget && (
        <NamePromptDialog
          title="Rename form"
          description="This only changes the name — the shareable link stays the same."
          initialValue={renameTarget.title}
          cta="Rename"
          busy={renaming}
          onClose={() => setRenameTarget(null)}
          onSubmit={handleRename}
        />
      )}

      {showInvite && <InviteDialog onClose={() => setShowInvite(false)} onToast={showToast} />}


      {toastNode}
    </div>
  );
}
