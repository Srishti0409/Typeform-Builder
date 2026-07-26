'use client';

import { useCallback, useEffect, useState } from 'react';

const VISIBLE_MS = 2600;

/**
 * The single transient-confirmation pattern for the creator side: one dark pill,
 * bottom centre, self-dismissing.
 *
 * `useToast` returns the node ready to render, so a page adds feedback with two
 * lines rather than a state field, an effect and a block of markup.
 */
export function useToast() {
  // Counted, not just the text: showing the same message twice in a row must
  // restart the timer, and identical state would not re-run the effect.
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((text: string) => {
    setToast(prev => ({ id: (prev?.id ?? 0) + 1, text }));
  }, []);

  return {
    showToast,
    toastNode: toast ? <Toast text={toast.text} /> : null,
  };
}

export function Toast({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-[#2b232d] px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-fadeIn"
    >
      {text}
    </div>
  );
}
