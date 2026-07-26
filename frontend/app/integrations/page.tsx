'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Sparkles, X } from 'lucide-react';
import WorkspaceShell, { PageHeading } from '@/components/workspace/WorkspaceShell';
import IntegrationCard from '@/components/integrations/IntegrationCard';
import ConnectDialog from '@/components/integrations/ConnectDialog';
import { useToast } from '@/components/shared/Toast';
import {
  INTEGRATIONS, INTEGRATION_CATEGORIES, WORKSPACE_SCOPE, useConnections,
  type Integration,
} from '@/lib/integrations';
import { planAtLeast, useSubscription } from '@/lib/plans';
import { api } from '@/lib/api';

type Filter = 'all' | 'popular' | 'connected' | string;

export default function IntegrationsPage({
  searchParams,
}: {
  /** `?form=<id>` scopes the page to one form, as the form list's link does. */
  searchParams: Promise<{ form?: string }>;
}) {
  const formId = use(searchParams).form;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pending, setPending] = useState<Integration | null>(null);
  const [formTitle, setFormTitle] = useState<string | null>(null);

  const { connectedIn, connect, disconnect } = useConnections();
  const { planId } = useSubscription();
  const { showToast, toastNode } = useToast();

  const scope = formId ?? WORKSPACE_SCOPE;
  const connected = connectedIn(scope);
  const scopeLabel = formId ? formTitle ?? 'this form' : 'your workspace';

  useEffect(() => {
    if (!formId) return;
    let cancelled = false;
    api.forms
      .get(formId)
      .then(f => !cancelled && setFormTitle(f.title))
      .catch(() => !cancelled && setFormTitle(null));
    return () => { cancelled = true; };
  }, [formId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATIONS.filter(i => {
      if (filter === 'popular' && !i.popular) return false;
      if (filter === 'connected' && !connected.includes(i.id)) return false;
      if (filter !== 'all' && filter !== 'popular' && filter !== 'connected' && i.category !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.blurb.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    });
  }, [query, filter, connected]);

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'popular', label: 'Popular' },
    { key: 'connected', label: `Connected${connected.length ? ` (${connected.length})` : ''}` },
    ...INTEGRATION_CATEGORIES.map(c => ({ key: c as Filter, label: c })),
  ];

  return (
    <WorkspaceShell active="integrations" maxWidth={1120}>
      <PageHeading
        title="Integrations"
        subtitle={`Send responses to the tools ${formId ? 'this form' : 'your team'} already works in.`}
      >
        <span className="text-[14px] text-[#655d67]">
          {connected.length} connected in {formId ? 'this form' : 'this workspace'}
        </span>
      </PageHeading>

      {/* Scope banner — reached from a form's Integrations cell in the form list. */}
      {formId && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#bdddf9] bg-[#f6fafd] px-4 py-3">
          <Sparkles size={16} className="flex-shrink-0 text-[#01487f]" />
          <p className="min-w-0 flex-1 text-[14px] text-[#01487f]">
            Connecting <span className="font-medium">{formTitle ?? 'this form'}</span>. Apps you
            connect here receive only this form’s responses.
          </p>
          <Link
            href="/integrations"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#bdddf9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#01487f] transition-colors hover:bg-[#eff7fd]"
          >
            <ArrowLeft size={13} />
            Whole workspace
          </Link>
        </div>
      )}

      {/* Search + category filter */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-[rgba(81,76,84,0.18)] bg-white px-3.5 py-2.5 transition-colors focus-within:border-[#655d67]">
          <Search size={17} className="flex-shrink-0 text-[#655d67]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search apps"
            aria-label="Search integrations"
            className="min-w-0 flex-1 text-[15px] text-[#3c323e] placeholder:text-[#847e85]"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="text-[#655d67] hover:text-[#3c323e]">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {chips.map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                filter === chip.key
                  ? 'border-[#3c323e] bg-[#3c323e] font-medium text-white'
                  : 'border-[rgba(81,76,84,0.18)] bg-white text-[#655d67] hover:bg-[rgba(87,84,91,0.05)]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Catalogue */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(87,84,91,0.06)]">
            <Search size={20} className="text-[#847e85]" />
          </div>
          <p className="text-[15px] font-medium text-[#3c323e]">No apps match that</p>
          <p className="text-[14px] text-[#655d67]">Try a different search or clear the filters.</p>
          <button
            onClick={() => { setQuery(''); setFilter('all'); }}
            className="mt-1 rounded-lg border border-[rgba(81,76,84,0.18)] bg-white px-3 py-1.5 text-[14px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(integration => {
            const isConnected = connected.includes(integration.id);
            return (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                connected={isConnected}
                // Gate only what is not already connected, so a downgrade never
                // strands a live connection behind a paywall.
                requiresPlan={
                  !isConnected && integration.minPlan && !planAtLeast(planId, integration.minPlan)
                    ? integration.minPlan
                    : undefined
                }
                onConnect={() => setPending(integration)}
                onDisconnect={() => {
                  disconnect(scope, integration.id);
                  showToast(`${integration.name} disconnected`);
                }}
              />
            );
          })}
        </div>
      )}

      <p className="mt-8 text-[13px] text-[#847e85]">
        Connections are stored for this account. Response delivery to live third-party
        accounts is not part of this build.
      </p>

      {pending && (
        <ConnectDialog
          integration={pending}
          scopeLabel={scopeLabel}
          onCancel={() => setPending(null)}
          onConnected={() => {
            connect(scope, pending.id);
            showToast(`${pending.name} connected`);
            setPending(null);
          }}
        />
      )}
      {toastNode}
    </WorkspaceShell>
  );
}
