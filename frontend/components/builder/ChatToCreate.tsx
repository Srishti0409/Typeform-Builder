'use client';

import { useState } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';

/**
 * The builder's bottom composer.
 *
 * Describing what you want appends real questions to the form, using the same
 * deterministic planner as the "New form" screen (lib/form-planner) — there is no
 * AI service in this build, so it reads the request for recognisable intents
 * rather than generating freely.
 */
export default function ChatToCreate({
  onSubmit,
  busy,
}: {
  onSubmit: (prompt: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState('');
  const canSend = value.trim().length > 0 && !busy;

  function send() {
    if (!canSend) return;
    onSubmit(value.trim());
    setValue('');
  }

  return (
    <div className="flex flex-shrink-0 justify-center border-t border-[rgba(86,82,90,0.08)] bg-white px-4 py-3">
      <div className="flex w-full max-w-[620px] items-center gap-2 rounded-xl border border-[#ddb7f0] bg-white px-3 py-2 shadow-sm transition-colors focus-within:border-[#c084fc] focus-within:ring-4 focus-within:ring-[#f5eafd]">
        <Sparkles size={16} className="flex-shrink-0 text-[#9333ea]" />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          placeholder="Chat to create — describe the questions you want to add"
          aria-label="Chat to create"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[#3c323e] outline-none placeholder:text-[#a8a3a9]"
        />
        <button
          onClick={send}
          disabled={!canSend}
          aria-label="Add these questions"
          title={canSend ? 'Add these questions' : 'Describe what to add first'}
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
            canSend
              ? 'border-[#3c323e] bg-[#3c323e] text-white hover:bg-[#2e2630]'
              : 'cursor-not-allowed border-[rgba(86,82,90,0.12)] bg-[rgba(89,86,93,0.06)] text-[#c4c1c5]'
          }`}
        >
          {busy ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <ArrowUp size={14} />
          )}
        </button>
      </div>
    </div>
  );
}
