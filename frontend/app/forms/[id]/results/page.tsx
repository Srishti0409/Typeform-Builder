'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, BarChart2, List } from 'lucide-react';
import { api } from '@/lib/api';
import type { Form, FormStats, ResponseListItem } from '@/lib/types';
import FormTopBar from '@/components/shared/FormTopBar';
import SummaryTab from '@/components/results/SummaryTab';
import ResponsesTable from '@/components/results/ResponsesTable';

type View = 'summary' | 'responses';

/**
 * Results view for one form: a per-question summary and the full submissions
 * table, plus CSV export.
 */
export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Form | null>(null);
  const [stats, setStats] = useState<FormStats | null>(null);
  const [responses, setResponses] = useState<ResponseListItem[]>([]);
  const [view, setView] = useState<View>('summary');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.forms.get(id),
      api.responses.stats(id),
      api.responses.list(id),
    ])
      .then(([f, s, r]) => {
        if (cancelled) return;
        setForm(f);
        setStats(s);
        setResponses(r);
      })
      .catch(() => {
        if (cancelled) return;
        // A missing form is the common case here; send them back to the list.
        setError('Could not load results for this form.');
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f7f7f8]">
        <p className="text-sm text-[#655d67]">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630]"
        >
          Back to forms
        </button>
      </div>
    );
  }

  if (!form || !stats) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f7f8]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3c323e] border-t-transparent" />
      </div>
    );
  }

  const views: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: 'Summary', icon: <BarChart2 size={13} /> },
    { key: 'responses', label: `Responses (${responses.length})`, icon: <List size={13} /> },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f7f8]">
      <FormTopBar form={form} active="results" />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sub-navigation + export */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[rgba(86,82,90,0.08)] bg-white px-4">
          <div className="flex items-center gap-1">
            {views.map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  view === v.key
                    ? 'border-[#3c323e] text-[#3c323e]'
                    : 'border-transparent text-[#655d67] hover:text-[#3c323e]'
                }`}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>

          <a
            href={api.responses.exportCsvUrl(form.id)}
            className={`flex items-center gap-1.5 rounded-lg border border-[rgba(81,76,84,0.15)] px-3 py-1.5 text-xs font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.04)] ${
              responses.length === 0 ? 'pointer-events-none opacity-50' : ''
            }`}
            aria-disabled={responses.length === 0}
          >
            <Download size={13} />
            Export CSV
          </a>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-[900px]">
            {view === 'summary' ? (
              <SummaryTab stats={stats} />
            ) : (
              <ResponsesTable form={form} responses={responses} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
