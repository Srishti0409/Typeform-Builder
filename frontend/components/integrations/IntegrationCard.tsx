'use client';

import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import IntegrationMark from './IntegrationMark';
import type { Integration } from '@/lib/integrations';
import { planById, type PlanId } from '@/lib/plans';

export default function IntegrationCard({
  integration,
  connected,
  /** Absent when the current plan is high enough to connect. */
  requiresPlan,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  connected: boolean;
  requiresPlan?: PlanId;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border bg-white p-4 transition-all hover:shadow-sm ${
        connected ? 'border-[#c0e4de]' : 'border-[rgba(81,76,84,0.12)] hover:border-[rgba(81,76,84,0.22)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <IntegrationMark integration={integration} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-[#3c323e]">{integration.name}</p>
          <p className="mt-0.5 text-[13px] text-[#847e85]">{integration.category}</p>
        </div>
        {connected && (
          <span className="flex flex-shrink-0 items-center gap-1 rounded-md border border-[#c0e4de] bg-[#f4faf8] px-2 py-1 text-[11px] font-medium text-[#095145]">
            <Check size={11} />
            Connected
          </span>
        )}
      </div>

      <p className="mt-3 flex-1 text-[14px] leading-snug text-[#655d67]">{integration.blurb}</p>

      <div className="mt-4">
        {requiresPlan ? (
          <Link
            href="/plans"
            className="flex items-center justify-center gap-2 rounded-lg border border-[rgba(81,76,84,0.18)] py-2 text-[14px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
          >
            <Lock size={13} />
            Requires {planById(requiresPlan).name}
          </Link>
        ) : connected ? (
          <button
            onClick={onDisconnect}
            className="w-full rounded-lg border border-[rgba(81,76,84,0.18)] py-2 text-[14px] font-medium text-[#655d67] transition-colors hover:border-[rgba(190,24,93,0.35)] hover:bg-red-50 hover:text-[#be185d]"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="w-full rounded-lg bg-[#2b232d] py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#1f1922]"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
