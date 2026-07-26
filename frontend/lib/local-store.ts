'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * Browser-persisted workspace state, namespaced under `teraform:`.
 *
 * The plan, the brand kit, workspaces, members and connected apps belong to the
 * *account*, not to any one form, and the API has no account tables — so they
 * live in localStorage.
 *
 * It is modelled as an external store rather than `useState` + an effect, which
 * buys two things React would otherwise make awkward: every mounted reader of a
 * key re-renders on a write (the navbar's plan pill and the sidebar's quota can
 * never drift apart), and server rendering falls back cleanly without a
 * hydration mismatch.
 */

const PREFIX = 'teraform:';
const SYNC_EVENT = 'teraform:store-change';

/** Last parsed value per key, so snapshots are referentially stable. */
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

function rawValue(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null; // private-browsing denial
  }
}

/**
 * `useSyncExternalStore` compares snapshots by identity, so parsing afresh on
 * every read would re-render forever. Re-parse only when the stored text moved.
 */
function snapshot<T>(key: string, fallback: T): T {
  const raw = rawValue(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback; // corrupt entry — behave as if unset
    }
  }
  snapshots.set(key, { raw, value });
  return value;
}

export function readStore<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  return snapshot(key, fallback);
}

export function writeStore<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify(value);
  try {
    window.localStorage.setItem(PREFIX + key, raw);
    // Seed the cache with the very object written, so readers keep its identity.
    snapshots.set(key, { raw, value });
  } catch {
    // Over quota (an oversized brand logo, typically). Leave the cache alone;
    // the next read re-syncs with whatever storage actually holds.
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
}

function subscribe(key: string, onStoreChange: () => void): () => void {
  const onLocal = (e: Event) => {
    if ((e as CustomEvent<string>).detail === key) onStoreChange();
  };
  window.addEventListener(SYNC_EVENT, onLocal); // this tab
  window.addEventListener('storage', onStoreChange); // other tabs
  return () => {
    window.removeEventListener(SYNC_EVENT, onLocal);
    window.removeEventListener('storage', onStoreChange);
  };
}

/**
 * `useState`, persisted. The setter takes a value or an updater, and writes
 * through — every other reader of the key sees it immediately.
 */
export function useStoredState<T>(
  key: string,
  initial: T
): [T, (next: T | ((prev: T) => T)) => void] {
  // Frozen on first render: callers pass object literals, whose identity would
  // otherwise change every render and destabilise the snapshot.
  const [fallback] = useState(initial);

  const value = useSyncExternalStore(
    useCallback((onStoreChange: () => void) => subscribe(key, onStoreChange), [key]),
    useCallback(() => snapshot(key, fallback), [key, fallback]),
    useCallback(() => fallback, [fallback])
  );

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: T) => T)(readStore(key, fallback))
          : next;
      writeStore(key, resolved);
    },
    [key, fallback]
  );

  return [value, update];
}
