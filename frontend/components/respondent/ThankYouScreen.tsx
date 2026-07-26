'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

/**
 * Terminal screen after a successful submit. Content comes from the form's
 * configurable thank_you_title / thank_you_message.
 */
export default function ThankYouScreen({
  title,
  message,
}: {
  title: string;
  message?: string | null;
}) {
  return (
    <div
      className="flex w-full items-center justify-center px-6"
      style={{ minHeight: 'var(--tf-screen-h)' }}
    >
      <div className="tf-enter-fwd flex w-full max-w-[720px] flex-col items-center text-center">
        <div
          className="mb-6 flex items-center justify-center rounded-full"
          style={{
            width: 64,
            height: 64,
            backgroundColor: `rgba(var(--tf-primary-rgb), 0.12)`,
            color: 'var(--tf-primary)',
          }}
        >
          <Check size={30} strokeWidth={2.5} />
        </div>

        <h1
          className="font-normal"
          style={{
            fontSize: 34,
            lineHeight: '40px',
            color: 'var(--tf-text)',
            fontFamily: 'var(--tf-font)',
          }}
        >
          {title}
        </h1>

        {message && (
          <p
            className="mt-3"
            style={{
              fontSize: 'var(--tf-label-size)',
              lineHeight: '28px',
              color: `rgba(var(--tf-text-rgb), 0.7)`,
              fontFamily: 'var(--tf-font)',
            }}
          >
            {message}
          </p>
        )}

        <Link
          href="/"
          className="tf-interactive mt-10 text-sm underline"
          style={{ color: `rgba(var(--tf-text-rgb), 0.6)` }}
        >
          Create your own form
        </Link>
      </div>
    </div>
  );
}
