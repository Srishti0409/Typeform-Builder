'use client';

import { useCallback } from 'react';
import { useStoredState } from './local-store';
import type { PlanId } from './plans';

export type IntegrationCategory =
  | 'Automation'
  | 'Analytics'
  | 'CRM'
  | 'Communication'
  | 'Developer'
  | 'Marketing'
  | 'Payments'
  | 'Productivity'
  | 'Scheduling'
  | 'Storage'
  | 'Support';

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  /** One line, in the catalogue's voice: what connecting actually does. */
  blurb: string;
  /** Brand colour behind the monogram. */
  color: string;
  /** 1–2 characters — stands in for the app's logo. */
  mark: string;
  /** Shown in the authorisation dialog, after the two generic scopes. */
  scope: string;
  /** Lowest plan allowed to connect. Absent means every plan can. */
  minPlan?: PlanId;
  popular?: boolean;
}

/** Ordered as Typeform's catalogue is: the ones most people want, first. */
export const INTEGRATIONS: Integration[] = [
  { id: 'google-sheets', name: 'Google Sheets', category: 'Productivity', blurb: 'Append every response to a spreadsheet row.', color: '#0f9d58', mark: 'GS', scope: 'Create and update spreadsheets in your Drive', popular: true },
  { id: 'slack', name: 'Slack', category: 'Communication', blurb: 'Post new responses to a channel as they land.', color: '#4a154b', mark: 'Sl', scope: 'Post messages to channels you choose', popular: true },
  { id: 'notion', name: 'Notion', category: 'Productivity', blurb: 'Add a database item for each response.', color: '#191919', mark: 'N', scope: 'Insert pages into a database you select', popular: true },
  { id: 'zapier', name: 'Zapier', category: 'Automation', blurb: 'Wire responses into 6,000+ apps, no code.', color: '#ff4f00', mark: 'Za', scope: 'Trigger Zaps when a response is submitted', popular: true },
  { id: 'mailchimp', name: 'Mailchimp', category: 'Marketing', blurb: 'Add respondents to an audience automatically.', color: '#ffe01b', mark: 'Mc', scope: 'Add and tag contacts in your audiences', popular: true },
  { id: 'google-analytics', name: 'Google Analytics 4', category: 'Analytics', blurb: 'Track form views, starts and completions.', color: '#e8710a', mark: 'GA', scope: 'Send events to your measurement ID', popular: true },
  { id: 'webhooks', name: 'Webhooks', category: 'Developer', blurb: 'POST every response to your own endpoint.', color: '#3c323e', mark: '{}', scope: 'Deliver signed payloads to your URL', popular: true },
  { id: 'calendly', name: 'Calendly', category: 'Scheduling', blurb: 'Let respondents book a slot on submit.', color: '#006bff', mark: 'Cy', scope: 'Read your event types and create invitees', popular: true },
  { id: 'stripe', name: 'Stripe', category: 'Payments', blurb: 'Collect a payment inside the form.', color: '#635bff', mark: 'St', scope: 'Create payment intents on your account', minPlan: 'plus', popular: true },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', blurb: 'Create or update contacts from responses.', color: '#ff7a59', mark: 'Hs', scope: 'Write contacts, companies and deals', minPlan: 'plus', popular: true },
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', blurb: 'Push qualified responses in as leads.', color: '#00a1e0', mark: 'Sf', scope: 'Create leads and log activities', minPlan: 'business' },
  { id: 'airtable', name: 'Airtable', category: 'Productivity', blurb: 'Append responses to a base of your choice.', color: '#18bfff', mark: 'At', scope: 'Create records in a table you select' },
  { id: 'monday', name: 'monday.com', category: 'Productivity', blurb: 'Add an item to a board per response.', color: '#ff3d57', mark: 'mo', scope: 'Create items and updates on a board' },
  { id: 'trello', name: 'Trello', category: 'Productivity', blurb: 'Open a card for every response.', color: '#0052cc', mark: 'Tr', scope: 'Create cards in a list you choose' },
  { id: 'asana', name: 'Asana', category: 'Productivity', blurb: 'Turn each response into a task.', color: '#f06a6a', mark: 'As', scope: 'Create tasks in a project you select' },
  { id: 'make', name: 'Make', category: 'Automation', blurb: 'Route responses through a scenario.', color: '#6d00cc', mark: 'Mk', scope: 'Trigger scenarios on new responses' },
  { id: 'microsoft-teams', name: 'Microsoft Teams', category: 'Communication', blurb: 'Notify a Teams channel on submission.', color: '#4b53bc', mark: 'MT', scope: 'Send messages to a channel you choose' },
  { id: 'discord', name: 'Discord', category: 'Communication', blurb: 'Announce responses in a server.', color: '#5865f2', mark: 'Dc', scope: 'Post to a channel via webhook' },
  { id: 'google-calendar', name: 'Google Calendar', category: 'Scheduling', blurb: 'Create an event from a response.', color: '#1a73e8', mark: 'GC', scope: 'Create events on a calendar you pick' },
  { id: 'activecampaign', name: 'ActiveCampaign', category: 'Marketing', blurb: 'Start an automation for each respondent.', color: '#356ae6', mark: 'AC', scope: 'Add contacts and trigger automations' },
  { id: 'klaviyo', name: 'Klaviyo', category: 'Marketing', blurb: 'Sync respondents into a list or segment.', color: '#232426', mark: 'Kl', scope: 'Add profiles to your lists' },
  { id: 'intercom', name: 'Intercom', category: 'Support', blurb: 'Attach responses to a user profile.', color: '#1f8ded', mark: 'Ic', scope: 'Read and update contacts' },
  { id: 'zendesk', name: 'Zendesk', category: 'Support', blurb: 'Raise a ticket from a response.', color: '#03363d', mark: 'Zd', scope: 'Create tickets on your subdomain' },
  { id: 'segment', name: 'Segment', category: 'Analytics', blurb: 'Stream response events downstream.', color: '#52bd95', mark: 'Sg', scope: 'Send track calls to a source' },
  { id: 'dropbox', name: 'Dropbox', category: 'Storage', blurb: 'Save exports and uploads to a folder.', color: '#0061ff', mark: 'Db', scope: 'Write files to a folder you choose' },
];

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  ...new Set(INTEGRATIONS.map(i => i.category)),
].sort();

export function integrationById(id: string): Integration | undefined {
  return INTEGRATIONS.find(i => i.id === id);
}

/**
 * Connections are scoped: workspace-wide, or to a single form (Typeform
 * connects an app to one typeform at a time, reached from the Integrations
 * column in the form list). The store is `{ [scope]: integrationId[] }`.
 */
export const WORKSPACE_SCOPE = 'workspace';

type ConnectionMap = Record<string, string[]>;

export function useConnections() {
  const [map, setMap] = useStoredState<ConnectionMap>('integrations', {});

  const connect = useCallback(
    (scope: string, id: string) =>
      setMap(prev => ({ ...prev, [scope]: [...new Set([...(prev[scope] ?? []), id])] })),
    [setMap]
  );

  const disconnect = useCallback(
    (scope: string, id: string) =>
      setMap(prev => ({ ...prev, [scope]: (prev[scope] ?? []).filter(x => x !== id) })),
    [setMap]
  );

  const connectedIn = useCallback((scope: string) => map[scope] ?? [], [map]);

  return { map, connect, disconnect, connectedIn };
}
