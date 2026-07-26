'use client';

import { useEffect, useState } from 'react';
import { Monitor, RotateCcw, Smartphone, X } from 'lucide-react';
import type { Form } from '@/lib/types';
import FormFill from '@/components/respondent/FormFill';

/**
 * Typeform's preview: the respondent experience over the top of the builder,
 * running against the current draft.
 *
 * It renders the same `FormFill` the public page does, in preview mode — so the
 * flow, transitions and validation on show are literally the respondent's code
 * path, and nothing here can drift from it. No publishing is involved and no
 * response is recorded.
 */

/** iPhone-ish logical viewport, so the mobile view wraps the way a phone does. */
const MOBILE = { width: 390, height: 720 };

export default function PreviewOverlay({
  form,
  onClose,
}: {
  form: Form;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  /** Bumping this remounts FormFill, which restarts the run from the top. */
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The preview owns the keyboard while it is open; stop the page behind it from
  // scrolling underneath.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const toolBtn =
    'flex h-9 w-9 items-center justify-center rounded-lg text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.1)]';

  return (
    <div
      data-qa="preview"
      role="dialog"
      aria-modal="true"
      aria-label="Form preview"
      className="fixed inset-0 z-[70] flex flex-col bg-[rgba(24,20,26,0.55)] backdrop-blur-[2px]"
    >
      {/* Toolbar */}
      <div className="flex flex-shrink-0 items-center justify-center gap-2 px-4 py-3">
        <div className="flex items-center gap-1 rounded-xl bg-white/95 px-2 py-1.5 shadow-lg">
          <button onClick={onClose} className={toolBtn} aria-label="Close preview" title="Close preview (Esc)">
            <X size={17} />
          </button>

          <span className="mx-0.5 h-6 w-px bg-[rgba(86,82,90,0.16)]" />

          <button
            onClick={() => setDevice('desktop')}
            aria-pressed={device === 'desktop'}
            aria-label="Desktop preview"
            title="Desktop preview"
            className={`${toolBtn} ${device === 'desktop' ? 'bg-[rgba(87,84,91,0.12)]' : ''}`}
          >
            <Monitor size={17} />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            aria-pressed={device === 'mobile'}
            aria-label="Mobile preview"
            title="Mobile preview"
            className={`${toolBtn} ${device === 'mobile' ? 'bg-[rgba(87,84,91,0.12)]' : ''}`}
          >
            <Smartphone size={17} />
          </button>

          <span className="mx-0.5 h-6 w-px bg-[rgba(86,82,90,0.16)]" />

          <button
            onClick={() => setRunId(n => n + 1)}
            className={toolBtn}
            aria-label="Restart preview"
            title="Restart from the first question"
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-5">
        {device === 'mobile' ? (
          <div
            className="flex max-h-full flex-col overflow-hidden rounded-[2rem] border-[10px] border-[#1c1a1e] bg-white shadow-2xl"
            style={{ width: MOBILE.width, height: MOBILE.height }}
          >
            <div className="min-h-0 flex-1">
              <FormFill key={runId} form={form} preview />
            </div>
          </div>
        ) : (
          <div className="h-full w-full max-w-[1200px] overflow-hidden rounded-xl bg-white shadow-2xl">
            <FormFill key={runId} form={form} preview />
          </div>
        )}
      </div>

      <p className="flex-shrink-0 pb-3 text-center text-[12px] text-white/70">
        Preview of your draft — answers aren’t recorded.
      </p>
    </div>
  );
}
