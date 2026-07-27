'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mic, Plus, Trash2, TriangleAlert } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import AutomationFlowArt from '@/components/workspace/AutomationFlowArt';
import Modal from '@/components/shared/Modal';
import Switch from '@/components/shared/Switch';
import { useToast } from '@/components/shared/Toast';
import IntegrationMark from '@/components/integrations/IntegrationMark';
import {
  ACTIONS, TRIGGERS, actionById, useAutomations, type Automation, type TriggerId,
} from '@/lib/automations';
import { WORKSPACE_SCOPE, integrationById, useConnections } from '@/lib/integrations';
import { api } from '@/lib/api';
import type { FormListItem } from '@/lib/types';

const ANY_FORM = 'any';

interface Draft {
  name: string;
  formId: string;
  trigger: TriggerId;
  actionId: string;
  target: string;
}

const EMPTY_DRAFT: Draft = {
  name: '',
  formId: ANY_FORM,
  trigger: 'response_submitted',
  actionId: ACTIONS[0].id,
  target: '',
};

/** One-click starting points, as Typeform's automation gallery offers. */
const TEMPLATES: { label: string; blurb: string; draft: Partial<Draft> }[] = [
  {
    label: 'Post new responses to Slack',
    blurb: 'Your team sees answers without opening Typeform.',
    draft: { name: 'Responses to Slack', actionId: 'slack-post', target: '#responses' },
  },
  {
    label: 'Append responses to a spreadsheet',
    blurb: 'Keep a running sheet for analysis.',
    draft: { name: 'Responses to Sheets', actionId: 'sheets-append', target: 'Responses' },
  },
  {
    label: 'Send a daily digest to a webhook',
    blurb: 'One POST each weekday morning.',
    draft: { name: 'Daily digest', actionId: 'webhook-post', trigger: 'daily_digest', target: 'https://api.example.com/hooks/teraform' },
  },
];

export default function AutomationsPage() {
  const { automations, create, toggle, remove } = useAutomations();
  const { connectedIn } = useConnections();
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [triggerFilter, setTriggerFilter] = useState<TriggerId | null>(null);
  const [showLearn, setShowLearn] = useState(false);
  const { showToast, toastNode } = useToast();

  useEffect(() => {
    let cancelled = false;
    api.forms
      .list()
      .then(f => !cancelled && setForms(f))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const formTitles = useMemo(
    () => Object.fromEntries(forms.map(f => [f.id, f.title])),
    [forms]
  );

  /** An app counts as connected for a rule if the workspace or that form has it. */
  function isConnected(automation: Pick<Automation, 'actionId' | 'formId'>) {
    const integrationId = actionById(automation.actionId)?.integrationId;
    if (!integrationId) return false;
    if (connectedIn(WORKSPACE_SCOPE).includes(integrationId)) return true;
    return automation.formId !== ANY_FORM && connectedIn(automation.formId).includes(integrationId);
  }

  function describe(automation: Automation) {
    const trigger = TRIGGERS.find(t => t.id === automation.trigger);
    const action = actionById(automation.actionId);
    const scope =
      automation.formId === ANY_FORM
        ? 'any form'
        : formTitles[automation.formId] ?? 'a deleted form';
    return { triggerLabel: `${trigger?.label ?? 'Trigger'} · ${scope}`, action };
  }

  function submit() {
    if (!draft) return;
    const action = actionById(draft.actionId);
    if (!action || !draft.target.trim()) return;
    const connected = isConnected(draft);
    create({
      name: draft.name.trim() || action.label,
      formId: draft.formId,
      trigger: draft.trigger,
      actionId: draft.actionId,
      target: draft.target.trim(),
      // Never switch on a rule whose app is not connected yet.
      enabled: connected,
    });
    const appName = integrationById(action.integrationId)?.name ?? 'that app';
    showToast(connected ? 'Automation created' : `Saved — connect ${appName} to switch it on`);
    setDraft(null);
  }

  const draftAction = draft ? actionById(draft.actionId) : undefined;
  const draftIntegration = draftAction ? integrationById(draftAction.integrationId) : undefined;

  /** Sidebar counts: how many saved rules use each trigger. */
  const triggerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of TRIGGERS) counts[t.id] = 0;
    for (const a of automations) counts[a.trigger] = (counts[a.trigger] ?? 0) + 1;
    return counts;
  }, [automations]);

  const shown = useMemo(
    () => (triggerFilter ? automations.filter(a => a.trigger === triggerFilter) : automations),
    [automations, triggerFilter]
  );

  const sidebar = (
    <>
      <div className="p-3">
        <button
          onClick={() => setDraft(EMPTY_DRAFT)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2b232d] text-[15px] font-semibold text-white transition-colors hover:bg-[#1f1922]"
        >
          <Plus size={17} strokeWidth={2.5} />
          Create automation
        </button>
      </div>

      {/* Triggers, doubling as filters for the saved rules */}
      <div className="flex-1 overflow-y-auto border-t border-[rgba(86,82,90,0.08)] px-3 pt-3">
        {TRIGGERS.map(trigger => {
          const on = triggerFilter === trigger.id;
          return (
            <button
              key={trigger.id}
              onClick={() => setTriggerFilter(on ? null : trigger.id)}
              title={trigger.blurb}
              className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-[15px] transition-colors ${
                on ? 'bg-[rgba(87,84,91,0.08)] text-[#3c323e]' : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.05)]'
              }`}
            >
              <span className="truncate">{trigger.label}</span>
              <span className="ml-2 flex-shrink-0 text-[#847e85] tabular-nums">
                {triggerCounts[trigger.id] ?? 0}
              </span>
            </button>
          );
        })}

        {/* Date-based triggers aren't part of this build. */}
        <div className="mt-1 flex items-center justify-between rounded-lg px-3 py-3">
          <span className="oos truncate text-[15px] text-[#3c323e]">Specific date</span>
          <span className="flex-shrink-0 rounded-full border border-[#bdddf9] bg-[#f6fafd] px-2.5 py-1 text-[12px] font-medium text-[#01487f]">
            Coming soon
          </span>
        </div>
      </div>

      {/* Same AI entry point the forms sidebar carries */}
      <div className="border-t border-[rgba(86,82,90,0.08)] p-3">
        <div className="oos flex items-center gap-2 rounded-xl border border-[#ddb7f0] bg-white px-3 py-2.5 shadow-sm">
          <Mic size={17} className="flex-shrink-0 text-[#655d67]" />
          <span className="min-w-0 flex-1 truncate text-[15px] text-[#847e85]">Ask Typeform AI</span>
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[rgba(86,82,90,0.1)] bg-[rgba(89,86,93,0.04)] text-[#655d67]">
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </>
  );

  return (
    <WorkspaceShell active="automations" sidebar={sidebar}>
      {automations.length === 0 ? (
        /* Empty state: the pitch on the left, the flow it produces on the right */
        <div className="grid items-center gap-10 px-10 py-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div>
            <h1 className="text-[34px] font-normal leading-[1.15] text-[#3c323e]">
              Keep the conversation going
            </h1>
            <p className="mt-4 max-w-[380px] text-[17px] leading-[1.5] text-[#655d67]">
              Follow up with emails, text messages, and more actions when someone
              completes a form.
            </p>
            <button
              onClick={() => setDraft(EMPTY_DRAFT)}
              className="mt-7 flex items-center gap-2 rounded-xl bg-[#2b232d] px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#1f1922]"
            >
              <Plus size={17} strokeWidth={2.5} />
              Create automation
            </button>
            <p className="mt-6 text-[15px] text-[#655d67]">
              Or,{' '}
              <button
                onClick={() => setShowLearn(true)}
                className="underline decoration-[rgba(101,93,103,0.5)] underline-offset-2 transition-colors hover:text-[#3c323e]"
              >
                learn about automations.
              </button>
            </p>
          </div>

          <div className="w-full max-w-[720px]">
            <AutomationFlowArt />
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[1000px] flex-col gap-3 px-8 py-8">
          <div className="flex items-end justify-between gap-4 border-b border-[rgba(86,82,90,0.1)] pb-4">
            <div>
              <h1 className="text-[26px] font-normal leading-none text-[#3c323e]">Automations</h1>
              <p className="mt-2 text-[15px] text-[#655d67]">
                {triggerFilter
                  ? `Filtered by ${TRIGGERS.find(t => t.id === triggerFilter)?.label}`
                  : 'When something happens in a form, do something in another app.'}
              </p>
            </div>
            {triggerFilter && (
              <button
                onClick={() => setTriggerFilter(null)}
                className="rounded-lg px-3 py-1.5 text-[14px] font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
              >
                Clear filter
              </button>
            )}
          </div>

          {shown.length === 0 && (
            <p className="py-10 text-center text-[15px] text-[#847e85]">
              No automations use this trigger yet.
            </p>
          )}

          {shown.map(automation => {
            const { triggerLabel, action } = describe(automation);
            const integration = action ? integrationById(action.integrationId) : undefined;
            const connected = isConnected(automation);
            return (
              <div
                key={automation.id}
                className="flex items-center gap-4 rounded-xl border border-[rgba(81,76,84,0.12)] bg-white px-4 py-3.5"
              >
                <Switch
                  label={`Enable ${automation.name}`}
                  checked={automation.enabled && connected}
                  onChange={() => {
                    if (!connected) {
                      showToast(`Connect ${integration?.name ?? 'the app'} first`);
                      return;
                    }
                    toggle(automation.id);
                  }}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[#3c323e]">{automation.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-[#655d67]">
                    <span className="rounded-md bg-[rgba(87,84,91,0.06)] px-2 py-0.5">{triggerLabel}</span>
                    <ArrowRight size={12} className="text-[#847e85]" />
                    <span className="rounded-md bg-[rgba(87,84,91,0.06)] px-2 py-0.5">
                      {action?.label ?? 'Unknown action'}
                    </span>
                    <span className="truncate font-medium text-[#3c323e]">{automation.target}</span>
                  </p>
                </div>

                {!connected && integration && (
                  <Link
                    href="/integrations"
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#f3d1a7] bg-[#fdf8f1] px-2.5 py-1.5 text-[12px] font-medium text-[#8a5a12] transition-colors hover:bg-[#fbf1e4]"
                  >
                    <TriangleAlert size={12} />
                    Connect {integration.name}
                  </Link>
                )}
                {integration && <IntegrationMark integration={integration} size={32} />}

                <button
                  onClick={() => { remove(automation.id); showToast('Automation deleted'); }}
                  aria-label={`Delete ${automation.name}`}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#655d67] transition-colors hover:bg-red-50 hover:text-[#be185d]"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => setDraft(EMPTY_DRAFT)}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(81,76,84,0.2)] py-3 text-[14px] font-medium text-[#655d67] transition-colors hover:border-[#655d67] hover:bg-white"
          >
            <Plus size={15} />
            Add another automation
          </button>
        </div>
      )}

      {/* "learn about automations" — also where the ready-made rules live */}
      {showLearn && (
        <Modal onClose={() => setShowLearn(false)} label="About automations" width={560}>
          <h2 className="text-[17px] font-semibold text-[#3c323e]">How automations work</h2>
          <p className="mt-1 text-sm text-[#655d67]">
            An automation watches a form for a trigger, then performs an action in a
            connected app. Rules are saved to this account and each one stays switched
            off until its app is connected.
          </p>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-[#847e85]">
            Start from a ready-made rule
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {TEMPLATES.map(template => {
              const action = actionById(template.draft.actionId ?? '');
              const integration = action ? integrationById(action.integrationId) : undefined;
              return (
                <button
                  key={template.label}
                  onClick={() => { setShowLearn(false); setDraft({ ...EMPTY_DRAFT, ...template.draft }); }}
                  className="flex items-center gap-3 rounded-xl border border-[rgba(81,76,84,0.12)] bg-white p-3 text-left transition-all hover:border-[rgba(81,76,84,0.25)] hover:shadow-sm"
                >
                  {integration && <IntegrationMark integration={integration} size={32} />}
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-[#3c323e]">{template.label}</span>
                    <span className="block text-[13px] text-[#847e85]">{template.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-[13px] text-[#847e85]">
            Dispatching payloads to live third-party accounts is not part of this build.
          </p>
        </Modal>
      )}

      {draft && (
        <Modal onClose={() => setDraft(null)} label="Create an automation" width={520}>
          <h2 className="text-[17px] font-semibold text-[#3c323e]">Create an automation</h2>
          <p className="mt-0.5 text-sm text-[#655d67]">Pick a trigger, then where it should land.</p>

          <label className="mt-5 block text-xs font-medium text-[#655d67]">Name</label>
          <input
            value={draft.name}
            onChange={e => setDraft(d => d && { ...d, name: e.target.value })}
            placeholder={draftAction?.label ?? 'Automation name'}
            className="mt-1 w-full rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
          />

          <label className="mt-4 block text-xs font-medium text-[#655d67]">Applies to</label>
          <select
            value={draft.formId}
            onChange={e => setDraft(d => d && { ...d, formId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
          >
            <option value={ANY_FORM}>Any form in this workspace</option>
            {forms.map(f => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>

          <p className="mt-4 text-xs font-medium text-[#655d67]">When</p>
          <div className="mt-1 flex flex-col gap-1.5">
            {TRIGGERS.map(trigger => (
              <button
                key={trigger.id}
                onClick={() => setDraft(d => d && { ...d, trigger: trigger.id })}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  draft.trigger === trigger.id
                    ? 'border-[#3c323e] bg-[rgba(87,84,91,0.05)]'
                    : 'border-[rgba(81,76,84,0.18)] hover:bg-[rgba(87,84,91,0.03)]'
                }`}
              >
                <span className="block text-sm font-medium text-[#3c323e]">{trigger.label}</span>
                <span className="block text-[12px] text-[#847e85]">{trigger.blurb}</span>
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs font-medium text-[#655d67]">Then</label>
          <select
            value={draft.actionId}
            onChange={e => setDraft(d => d && { ...d, actionId: e.target.value, target: '' })}
            className="mt-1 w-full rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
          >
            {ACTIONS.map(action => (
              <option key={action.id} value={action.id}>{action.label}</option>
            ))}
          </select>

          {draftAction && (
            <>
              <label className="mt-4 block text-xs font-medium text-[#655d67]">
                {draftAction.targetLabel}
              </label>
              <input
                value={draft.target}
                onChange={e => setDraft(d => d && { ...d, target: e.target.value })}
                placeholder={draftAction.targetPlaceholder}
                className="mt-1 w-full rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
              />
            </>
          )}

          {draftIntegration && !isConnected(draft) && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#fdf8f1] px-3 py-2.5 text-[13px] text-[#8a5a12]">
              <TriangleAlert size={14} className="mt-0.5 flex-shrink-0" />
              {draftIntegration.name} is not connected yet — the rule will be saved switched off.
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDraft(null)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!draft.target.trim()}
              className="rounded-lg bg-[#3c323e] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2e2630] disabled:opacity-40"
            >
              Create automation
            </button>
          </div>
        </Modal>
      )}
      {toastNode}
    </WorkspaceShell>
  );
}
