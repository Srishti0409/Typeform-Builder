'use client';

import { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import IntegrationMark from './IntegrationMark';
import type { Integration } from '@/lib/integrations';

/**
 * The authorisation step. Real providers put a consent screen between the
 * click and the connection, and the delay it implies is worth keeping: it is
 * why a "Connecting…" state exists at all.
 */
export default function ConnectDialog({
  integration,
  scopeLabel,
  onCancel,
  onConnected,
}: {
  integration: Integration;
  /** What the connection will apply to — a form title, or the workspace. */
  scopeLabel: string;
  onCancel: () => void;
  onConnected: () => void;
}) {
  const [authorizing, setAuthorizing] = useState(false);

  const scopes = [
    `See the forms in ${scopeLabel}`,
    integration.scope,
    'Send new responses as they are submitted',
  ];

  function authorize() {
    setAuthorizing(true);
    // Stands in for the provider round-trip.
    window.setTimeout(onConnected, 700);
  }

  return (
    <Modal onClose={authorizing ? () => {} : onCancel} label={`Connect ${integration.name}`}>
      <div className="flex items-center gap-3">
        <IntegrationMark integration={integration} size={44} />
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-[#3c323e]">
            Connect {integration.name}
          </h2>
          <p className="text-sm text-[#655d67]">{scopeLabel}</p>
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-[#3c323e]">
        Teraform will be able to:
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {scopes.map(scope => (
          <li key={scope} className="flex items-start gap-2 text-sm text-[#655d67]">
            <Check size={15} className="mt-0.5 flex-shrink-0 text-[#177767]" />
            {scope}
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-[rgba(87,84,91,0.05)] px-3 py-2.5 text-[13px] text-[#655d67]">
        <ShieldCheck size={15} className="mt-0.5 flex-shrink-0" />
        You can revoke this from the Integrations page at any time.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={authorizing}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)] disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={authorize}
          disabled={authorizing}
          className="flex items-center gap-2 rounded-lg bg-[#3c323e] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2e2630] disabled:opacity-60"
        >
          {authorizing && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {authorizing ? 'Connecting…' : 'Allow access'}
        </button>
      </div>
    </Modal>
  );
}
