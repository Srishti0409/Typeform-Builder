'use client';

import { useEffect } from 'react';

/**
 * The creator side's one dialog shell: dimmed backdrop, click-outside and
 * Escape to dismiss, centred card. Callers supply only the contents.
 */
export default function Modal({
  onClose,
  label,
  width = 460,
  children,
}: {
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  width?: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ width }}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-fadeIn"
      >
        {children}
      </div>
    </div>
  );
}
