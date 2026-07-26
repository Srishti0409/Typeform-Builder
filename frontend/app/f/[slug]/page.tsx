'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Form } from '@/lib/types';
import FormFill from '@/components/respondent/FormFill';

/**
 * Public form-fill route — the shareable link produced by publishing.
 *
 * No auth: the API only serves forms whose status is `published`, and a 404 here
 * means either no such slug or the form has been unpublished.
 */
export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.public
      .getForm(slug)
      .then(f => {
        if (!cancelled) setForm(f);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? 'notfound'
            : 'Something went wrong loading this form.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error === 'notfound') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <h1 className="text-2xl font-normal text-[#3c323e]">This form isn&apos;t available</h1>
        <p className="max-w-sm text-sm text-[#655d67]">
          The link may be incorrect, or the form may have been unpublished by its creator.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-[#655d67]">{error}</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3c323e] border-t-transparent" />
      </div>
    );
  }

  return <FormFill form={form} />;
}
