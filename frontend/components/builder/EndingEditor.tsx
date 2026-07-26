'use client';

import { CheckCircle2 } from 'lucide-react';

/**
 * WYSIWYG editor for the form's ending, styled like the respondent's thank-you
 * screen so what you type is what they read.
 */
export default function EndingEditor({
  title,
  message,
  onChange,
}: {
  title: string;
  message: string;
  onChange: (patch: { thank_you_title?: string; thank_you_message?: string }) => void;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto px-6 py-12">
      <div className="w-full text-center" style={{ maxWidth: 'var(--tf-block-width)' }}>
        <CheckCircle2
          size={44}
          strokeWidth={1.5}
          className="mx-auto mb-6"
          style={{ color: 'var(--tf-primary)' }}
        />

        <input
          value={title}
          onChange={e => onChange({ thank_you_title: e.target.value })}
          placeholder="Thanks for completing this form!"
          aria-label="Ending headline"
          className="w-full border-0 bg-transparent text-center outline-none"
          style={{
            fontFamily: 'var(--tf-font)',
            fontSize: 'var(--tf-title-size)',
            lineHeight: 'var(--tf-title-line)',
            color: 'var(--tf-text)',
          }}
        />

        <textarea
          value={message}
          onChange={e => onChange({ thank_you_message: e.target.value })}
          placeholder="Add a closing message…"
          aria-label="Ending message"
          rows={2}
          className="mt-3 w-full resize-none border-0 bg-transparent text-center outline-none"
          style={{
            fontFamily: 'var(--tf-font)',
            fontSize: 'var(--tf-label-size)',
            color: `rgba(var(--tf-text-rgb), 0.65)`,
          }}
        />

        <p className="mt-8 text-[12px]" style={{ color: `rgba(var(--tf-text-rgb), 0.4)` }}>
          Respondents see this after submitting.
        </p>
      </div>
    </div>
  );
}
