'use client';

import { useCallback } from 'react';
import { useStoredState } from './local-store';

export type TriggerId = 'response_submitted' | 'response_threshold' | 'daily_digest';

export const TRIGGERS: { id: TriggerId; label: string; blurb: string }[] = [
  { id: 'response_submitted', label: 'Form submissions', blurb: 'Runs the moment a response is submitted.' },
  { id: 'response_threshold', label: 'Response milestone', blurb: 'Runs when a form passes 25 responses.' },
  { id: 'daily_digest', label: 'Daily digest', blurb: 'Runs every weekday at 09:00 with the day before.' },
];

/**
 * Each action delivers through an integration, so an automation cannot be
 * enabled before its app is connected — the same coupling Typeform enforces.
 */
export const ACTIONS: {
  id: string;
  integrationId: string;
  label: string;
  targetLabel: string;
  targetPlaceholder: string;
}[] = [
  { id: 'slack-post', integrationId: 'slack', label: 'Post to a Slack channel', targetLabel: 'Channel', targetPlaceholder: '#responses' },
  { id: 'sheets-append', integrationId: 'google-sheets', label: 'Append a row in Google Sheets', targetLabel: 'Spreadsheet', targetPlaceholder: 'Q3 responses' },
  { id: 'notion-item', integrationId: 'notion', label: 'Create a Notion database item', targetLabel: 'Database', targetPlaceholder: 'Research inbox' },
  { id: 'webhook-post', integrationId: 'webhooks', label: 'POST to a webhook', targetLabel: 'Endpoint URL', targetPlaceholder: 'https://api.example.com/hooks/teraform' },
  { id: 'mailchimp-add', integrationId: 'mailchimp', label: 'Add to a Mailchimp audience', targetLabel: 'Audience', targetPlaceholder: 'Newsletter' },
  { id: 'hubspot-contact', integrationId: 'hubspot', label: 'Create a HubSpot contact', targetLabel: 'Pipeline', targetPlaceholder: 'Inbound leads' },
  { id: 'teams-post', integrationId: 'microsoft-teams', label: 'Notify a Teams channel', targetLabel: 'Channel', targetPlaceholder: 'Product feedback' },
];

export function actionById(id: string) {
  return ACTIONS.find(a => a.id === id);
}

export interface Automation {
  id: string;
  name: string;
  /** A form id, or `'any'` for every form in the workspace. */
  formId: string;
  trigger: TriggerId;
  actionId: string;
  /** Channel / spreadsheet / URL — whatever the action delivers to. */
  target: string;
  enabled: boolean;
  createdAt: string;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `auto-${Date.now().toString(36)}`;
}

export function useAutomations() {
  const [automations, setAutomations] = useStoredState<Automation[]>('automations', []);

  const create = useCallback(
    (draft: Omit<Automation, 'id' | 'createdAt'>) => {
      setAutomations(prev => [
        { ...draft, id: newId(), createdAt: new Date().toISOString() },
        ...prev,
      ]);
    },
    [setAutomations]
  );

  const toggle = useCallback(
    (id: string) =>
      setAutomations(prev => prev.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a))),
    [setAutomations]
  );

  const remove = useCallback(
    (id: string) => setAutomations(prev => prev.filter(a => a.id !== id)),
    [setAutomations]
  );

  return { automations, create, toggle, remove };
}
