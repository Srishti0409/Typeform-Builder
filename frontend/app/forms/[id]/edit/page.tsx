'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Form, Question, QuestionType } from '@/lib/types';
import BuilderInitScreen from '@/components/builder/BuilderInitScreen';
import FormBuilder from '@/components/builder/FormBuilder';

export default function EditFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    api.forms.get(id).then(f => {
      setForm(f);
      // If form already has questions, go straight to builder
      if (f.questions.length > 0) setStarted(true);
      setLoading(false);
    }).catch(() => {
      router.push('/');
    });
  }, [id, router]);

  const handleFormUpdate = useCallback((updated: Form) => {
    setForm(updated);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f7f8]">
        <div className="w-5 h-5 border-2 border-[#3c323e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!form) return null;

  if (!started) {
    return (
      <BuilderInitScreen
        form={form}
        onStart={() => setStarted(true)}
      />
    );
  }

  return (
    <FormBuilder
      form={form}
      onFormUpdate={handleFormUpdate}
    />
  );
}
