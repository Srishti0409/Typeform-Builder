'use client';

import { useCallback } from 'react';
import { useStoredState } from './local-store';

export interface Workspace {
  id: string;
  name: string;
  /** Tint for the workspace's tile in the sidebar. */
  color: string;
}

/** Every account has this one, and it cannot be deleted. */
export const DEFAULT_WORKSPACE: Workspace = {
  id: 'default',
  name: 'My workspace',
  color: '#c0562a',
};

export const WORKSPACE_COLORS = ['#c0562a', '#3c73a5', '#177767', '#7c3aed', '#b45309', '#be185d'];

interface WorkspaceStore {
  /** Additional workspaces; the default one is always prepended. */
  extra: Workspace[];
  /** form id -> workspace id. Anything unlisted lives in the default workspace. */
  assignments: Record<string, string>;
}

const EMPTY: WorkspaceStore = { extra: [], assignments: {} };

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `ws-${Date.now().toString(36)}`;
}

/**
 * Workspaces are a client-side grouping over the same form list.
 *
 * `forms` has no workspace column and adding one would change the API contract
 * for a purely organisational feature, so membership is a browser-side mapping:
 * every form belongs to the default workspace until it is filed elsewhere.
 */
export function useWorkspaces() {
  const [store, setStore] = useStoredState<WorkspaceStore>('workspaces', EMPTY);

  const workspaces: Workspace[] = [DEFAULT_WORKSPACE, ...store.extra];

  const create = useCallback(
    (name: string) => {
      const id = newId();
      setStore(prev => ({
        ...prev,
        extra: [
          ...prev.extra,
          {
            id,
            name,
            // Walk the palette so two new workspaces never look alike.
            color: WORKSPACE_COLORS[(prev.extra.length + 1) % WORKSPACE_COLORS.length],
          },
        ],
      }));
      return id;
    },
    [setStore]
  );

  const rename = useCallback(
    (id: string, name: string) =>
      setStore(prev => ({
        ...prev,
        extra: prev.extra.map(w => (w.id === id ? { ...w, name } : w)),
      })),
    [setStore]
  );

  /** Deleting a workspace files its forms back into the default one. */
  const remove = useCallback(
    (id: string) =>
      setStore(prev => ({
        extra: prev.extra.filter(w => w.id !== id),
        assignments: Object.fromEntries(
          Object.entries(prev.assignments).filter(([, wsId]) => wsId !== id)
        ),
      })),
    [setStore]
  );

  const assign = useCallback(
    (formId: string, workspaceId: string) =>
      setStore(prev => {
        const assignments = { ...prev.assignments };
        if (workspaceId === DEFAULT_WORKSPACE.id) delete assignments[formId];
        else assignments[formId] = workspaceId;
        return { ...prev, assignments };
      }),
    [setStore]
  );

  const workspaceOf = useCallback(
    (formId: string) => store.assignments[formId] ?? DEFAULT_WORKSPACE.id,
    [store.assignments]
  );

  return { workspaces, create, rename, remove, assign, workspaceOf };
}
