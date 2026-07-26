'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Form } from '@/lib/types';
import BuilderInitScreen from '@/components/builder/BuilderInitScreen';
import FormBuilder from '@/components/builder/FormBuilder';

export default function EditFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  /**
   * The fetched form, tagged with the id it was fetched for.
   *
   * Tagged rather than bare because this page stays mounted across an id change
   * — same route, same component. Anything fetched for another form is stale by
   * definition, and rendering it would hand the builder (and so the canvas, the
   * rail and the preview) a different form's questions.
   */
  const [loaded, setLoaded] = useState<{ id: string; form: Form } | null>(null);
  /** The form the creator pressed Start on, when it had nothing in it yet. */
  const [startedFor, setStartedFor] = useState<string | null>(null);
  /**
   * Set when the creator picked "Start from scratch". The form is empty and they
   * have not told us anything about it, so the builder opens the element picker
   * on arrival rather than showing a blank canvas.
   */
  const [scratchFor, setScratchFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.forms.get(id)
      .then(f => { if (!cancelled) setLoaded({ id, form: f }); })
      // A slower response for the form we navigated away from must not land.
      .catch(() => { if (!cancelled) router.push('/'); });
    return () => { cancelled = true; };
  }, [id, router]);

  const handleFormUpdate = useCallback((updated: Form) => {
    // PATCH /forms answers without the questions, so keep the ones already in
    // hand — otherwise the form momentarily looks like it has none.
    setLoaded(prev => ({
      id: updated.id,
      form: { ...updated, questions: updated.questions ?? prev?.form.questions ?? [] },
    }));
  }, []);

  /**
   * Re-fetches after the goal composer generates questions, so the builder mounts
   * with them already in place.
   */
  const reload = useCallback(async () => {
    const fresh = await api.forms.get(id).catch(() => null);
    if (fresh) setLoaded({ id, form: fresh });
  }, [id]);

  const form = loaded?.id === id ? loaded.form : null;

  // Covers both the first load and the gap after switching forms.
  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f7f8]">
        <div className="w-5 h-5 border-2 border-[#3c323e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // A form that already has questions goes straight to the builder.
  const started = (form.questions?.length ?? 0) > 0 || startedFor === id;

  if (!started) {
    return (
      <BuilderInitScreen
        form={form}
        onStart={entry => {
          setScratchFor(entry === 'scratch' ? id : null);
          setStartedFor(id);
        }}
        onGenerated={reload}
      />
    );
  }

  return (
    // Keyed by form: the builder's questions, selection and preview are its own
    // state, seeded from this prop on mount, so a different form has to start
    // fresh. Keying by id rather than identity leaves ordinary updates in place.
    <FormBuilder
      key={form.id}
      form={form}
      onFormUpdate={handleFormUpdate}
      openPickerOnMount={scratchFor === id}
    />
  );
}
