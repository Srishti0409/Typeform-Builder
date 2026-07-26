'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

/**
 * "Give this a name" dialog — used to create forms and workspaces, and to
 * rename them. Enter submits; the field is focused and pre-selected on open.
 */
export default function NamePromptDialog({
  title,
  description,
  placeholder,
  cta,
  initialValue = '',
  busy = false,
  onClose,
  onSubmit,
}: {
  title: string;
  description?: string;
  placeholder?: string;
  cta: string;
  /** Pre-filled and pre-selected. Submitting it unchanged is a no-op. */
  initialValue?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== initialValue && !busy;
  const submit = () => {
    if (canSubmit) onSubmit(trimmed);
  };

  return (
    <Modal onClose={onClose} label={title}>
      <h2 className="mb-1 text-xl font-semibold text-[#3c323e]">{title}</h2>
      {description && <p className="mb-5 text-sm text-[#655d67]">{description}</p>}
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        className="mb-4 w-full rounded-lg border border-[rgba(81,76,84,0.2)] px-3 py-2 text-sm text-[#3c323e] outline-none transition-all placeholder:text-[#c4c1c5] focus:border-[#655d67] focus:ring-2 focus:ring-[rgba(101,93,103,0.12)]"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-lg bg-[#3c323e] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2e2630] disabled:opacity-40"
        >
          {busy ? 'Working…' : cta}
        </button>
      </div>
    </Modal>
  );
}
