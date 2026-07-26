'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Gem, Link2, Mail, Trash2 } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import { ROLES, useMembers, type MemberRole } from '@/lib/members';
import { useSubscription } from '@/lib/plans';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invite teammates to the workspace.
 *
 * Seats come from the plan, which is what makes this dialog more than a form:
 * on Free there is one seat and the only way forward is the pricing page.
 */
export default function InviteDialog({
  onClose,
  onToast,
}: {
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const { members, invited, seatLimit, seatsUsed, canInvite, invite, revoke } = useMembers();
  const { plan } = useSubscription();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [error, setError] = useState<string | null>(null);

  function send() {
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) {
      setError('Enter a valid email address.');
      return;
    }
    if (members.some(m => m.email.toLowerCase() === value)) {
      setError('That person is already on the workspace.');
      return;
    }
    invite(value, role);
    setEmail('');
    setError(null);
    onToast(`Invitation sent to ${value}`);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      onToast('Workspace link copied');
    } catch {
      onToast('Could not copy the link.');
    }
  }

  return (
    <Modal onClose={onClose} label="Invite to My workspace" width={520}>
      <h2 className="text-[17px] font-semibold text-[#3c323e]">Invite to My workspace</h2>
      <p className="mt-0.5 text-sm text-[#655d67]">
        {seatLimit === null
          ? 'Unlimited seats on Enterprise.'
          : `${seatsUsed} of ${seatLimit} ${seatLimit === 1 ? 'seat' : 'seats'} used on ${plan.name}.`}
      </p>

      {canInvite ? (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 transition-colors focus-within:border-[#655d67]">
              <Mail size={15} className="flex-shrink-0 text-[#655d67]" />
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="teammate@company.com"
                aria-label="Email to invite"
                className="min-w-0 flex-1 text-sm text-[#3c323e]"
              />
            </div>
            <select
              value={role}
              onChange={e => setRole(e.target.value as MemberRole)}
              aria-label="Role"
              className="rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
            >
              {ROLES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={send}
              className="rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630]"
            >
              Send invite
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-[13px] text-[#be185d]">{error}</p>
          ) : (
            <p className="mt-2 text-[13px] text-[#847e85]">
              {ROLES.find(r => r.id === role)?.blurb}
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#c0e4de] bg-[#f4faf8] px-4 py-3.5">
          <Gem size={16} className="mt-0.5 flex-shrink-0 text-[#177767]" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-[#095145]">
              {plan.name} includes {seatLimit} {seatLimit === 1 ? 'seat' : 'seats'}
            </p>
            <p className="mt-0.5 text-[13px] text-[#095145]">
              Move up a plan to bring your team into this workspace.
            </p>
            <Link
              href="/plans"
              onClick={onClose}
              className="mt-2 inline-block rounded-lg bg-[#127a63] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0f6552]"
            >
              View plans
            </Link>
          </div>
        </div>
      )}

      {/* Who is on the workspace */}
      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-[#847e85]">
        {members.length} {members.length === 1 ? 'person' : 'people'}
      </p>
      <ul className="mt-2 flex flex-col divide-y divide-[rgba(86,82,90,0.08)]">
        {members.map(member => (
          <li key={member.id} className="flex items-center gap-3 py-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f6d8b8] text-[12px] font-semibold text-[#7a4a25]">
              {member.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[#3c323e]">
                {member.name}
                {member.role === 'owner' && <span className="ml-1.5 text-[12px] text-[#847e85]">(you)</span>}
              </span>
              <span className="block truncate text-[12px] text-[#847e85]">{member.email}</span>
            </span>
            <span className="flex-shrink-0 text-[12px] capitalize text-[#655d67]">{member.role}</span>
            {member.status === 'pending' && (
              <span className="flex-shrink-0 rounded-md bg-[rgba(87,84,91,0.06)] px-2 py-0.5 text-[11px] text-[#655d67]">
                Pending
              </span>
            )}
            {member.role !== 'owner' && (
              <button
                onClick={() => { revoke(member.id); onToast('Invitation revoked'); }}
                aria-label={`Revoke ${member.email}`}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[#655d67] transition-colors hover:bg-red-50 hover:text-[#be185d]"
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[rgba(86,82,90,0.08)] pt-4">
        <button
          onClick={copyLink}
          className="flex items-center gap-2 text-sm font-medium text-[#3c323e] transition-colors hover:text-[#177767]"
        >
          <Link2 size={15} />
          Copy workspace link
          <Copy size={13} className="text-[#847e85]" />
        </button>
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
        >
          Done
        </button>
      </div>

      {invited.length > 0 && (
        <p className="mt-3 text-[13px] text-[#847e85]">
          Invitations stay pending — no mail is sent in this build.
        </p>
      )}
    </Modal>
  );
}
