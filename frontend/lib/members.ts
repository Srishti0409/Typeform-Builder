'use client';

import { useCallback } from 'react';
import { useStoredState } from './local-store';
import { useSubscription } from './plans';

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface Member {
  id: string;
  email: string;
  name: string;
  role: MemberRole;
  /** Invited people stay `pending` — nothing accepts the invitation in this build. */
  status: 'active' | 'pending';
  invitedAt: string;
}

export const ROLES: { id: MemberRole; label: string; blurb: string }[] = [
  { id: 'editor', label: 'Editor', blurb: 'Can build, publish and read results.' },
  { id: 'viewer', label: 'Viewer', blurb: 'Can read results only.' },
];

/** The signed-in creator. One account, no auth — see the README's assumptions. */
export const OWNER: Member = {
  id: 'owner',
  email: 'ssrishtigkp@teraform.app',
  name: 'ssrishtigkp',
  role: 'owner',
  status: 'active',
  invitedAt: '',
};

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `member-${Date.now().toString(36)}`;
}

/**
 * Workspace members, and the seat maths that gates inviting them.
 *
 * Seats come from the plan, so Invite is the one place the pricing page has
 * teeth: on Free there is exactly one seat and the dialog sends you to /plans.
 */
export function useMembers() {
  const [invited, setInvited] = useStoredState<Member[]>('members', []);
  const { plan } = useSubscription();

  const seatLimit = plan.seats; // null = unlimited
  const seatsUsed = 1 + invited.length; // the owner holds a seat
  const seatsLeft = seatLimit === null ? Infinity : Math.max(0, seatLimit - seatsUsed);

  const invite = useCallback(
    (email: string, role: MemberRole) => {
      const member: Member = {
        id: newId(),
        email,
        // No directory to look the person up in; the local-part is the best guess.
        name: email.split('@')[0],
        role,
        status: 'pending',
        invitedAt: new Date().toISOString(),
      };
      setInvited(prev => [...prev, member]);
    },
    [setInvited]
  );

  const revoke = useCallback(
    (id: string) => setInvited(prev => prev.filter(m => m.id !== id)),
    [setInvited]
  );

  return {
    members: [OWNER, ...invited],
    invited,
    seatLimit,
    seatsUsed,
    seatsLeft,
    canInvite: seatsLeft > 0,
    invite,
    revoke,
  };
}
