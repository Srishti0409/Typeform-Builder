'use client';

import { useState } from 'react';
import { Check, FileText } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import type { Workspace } from '@/lib/workspaces';

export default function MoveToWorkspaceDialog({
  formTitle,
  workspaces,
  currentWorkspaceId,
  onClose,
  onMove,
}: {
  formTitle: string;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  onClose: () => void;
  onMove: (workspaceId: string) => void;
}) {
  const [selected, setSelected] = useState(currentWorkspaceId);

  return (
    <Modal onClose={onClose} label={`Move ${formTitle}`}>
      <h2 className="text-[17px] font-semibold text-[#3c323e]">Move form</h2>
      <p className="mt-0.5 truncate text-sm text-[#655d67]">{formTitle}</p>

      <div className="mt-4 flex flex-col gap-1">
        {workspaces.map(workspace => (
          <button
            key={workspace.id}
            onClick={() => setSelected(workspace.id)}
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
              selected === workspace.id
                ? 'border-[#3c323e] bg-[rgba(87,84,91,0.05)]'
                : 'border-[rgba(81,76,84,0.15)] hover:bg-[rgba(87,84,91,0.03)]'
            }`}
          >
            <FileText size={16} style={{ color: workspace.color }} className="flex-shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[#3c323e]">{workspace.name}</span>
            {selected === workspace.id && <Check size={15} className="text-[#177767]" />}
          </button>
        ))}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
        >
          Cancel
        </button>
        <button
          onClick={() => onMove(selected)}
          disabled={selected === currentWorkspaceId}
          className="rounded-lg bg-[#3c323e] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2e2630] disabled:opacity-40"
        >
          Move form
        </button>
      </div>
    </Modal>
  );
}
