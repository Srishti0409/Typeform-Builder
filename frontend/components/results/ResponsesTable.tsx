'use client';

import { useEffect, useState } from 'react';
import { X, ChevronRight, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { Form, ResponseListItem, ResponseDetail } from '@/lib/types';

/** Renders a stored answer value, which may be a string, number or list. */
export function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return String(value);
}

function formatWhen(iso: string): string {
  // Stored as naive UTC by the API; treat it as such so times aren't shifted.
  const d = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Slide-over showing one submission in full. */
function ResponseDrawer({
  form,
  responseId,
  onClose,
}: {
  form: Form;
  responseId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.responses
      .get(form.id, responseId)
      .then(d => !cancelled && setDetail(d))
      .catch(() => !cancelled && setError('Could not load this response.'));
    return () => {
      cancelled = true;
    };
  }, [form.id, responseId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const byQuestion = new Map(detail?.answers.map(a => [a.question_id, a.answer_value]) ?? []);
  const questions = [...form.questions].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <aside
        className="relative flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl animate-fadeIn"
        role="dialog"
        aria-label="Response detail"
      >
        <header className="flex items-center justify-between border-b border-[rgba(86,82,90,0.08)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#3c323e]">Response</h2>
            {detail && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#847e85]">
                {formatWhen(detail.submitted_at)}
                {detail.completion_time_seconds != null && (
                  <>
                    <span className="text-[#c4c1c5]">·</span>
                    <Clock size={11} />
                    {detail.completion_time_seconds}s
                  </>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {error ? (
            <p className="text-sm text-[#655d67]">{error}</p>
          ) : !detail ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3c323e] border-t-transparent" />
            </div>
          ) : (
            <ol className="flex flex-col gap-4">
              {questions.map((q, i) => (
                <li key={q.id}>
                  <p className="flex gap-1.5 text-xs text-[#847e85]">
                    <span className="font-semibold">{i + 1}.</span>
                    <span>{q.title}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words border-l-2 border-[rgba(86,82,90,0.12)] pl-2.5 text-sm text-[#3c323e]">
                    {formatAnswer(byQuestion.get(q.id))}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

/**
 * Table of submissions — also the accessible table view for the summary charts.
 * Each row opens the full response in a slide-over.
 */
export default function ResponsesTable({
  form,
  responses,
}: {
  form: Form;
  responses: ResponseListItem[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[rgba(81,76,84,0.1)] bg-white py-16">
        <p className="text-base font-medium text-[#3c323e]">No responses yet</p>
        <p className="text-sm text-[#655d67]">
          {form.status === 'published'
            ? 'Share your form link to start collecting responses.'
            : 'Publish this form to start collecting responses.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[rgba(81,76,84,0.1)] bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[rgba(86,82,90,0.08)] text-xs text-[#655d67]">
              <th scope="col" className="px-4 py-2.5 font-medium">#</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Submitted</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Answers</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Time</th>
              <th scope="col" className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {responses.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="group cursor-pointer border-b border-[rgba(86,82,90,0.05)] transition-colors last:border-0 hover:bg-[rgba(87,84,91,0.04)]"
              >
                <td className="px-4 py-2.5 text-sm tabular-nums text-[#847e85]">{i + 1}</td>
                <td className="px-4 py-2.5 text-sm text-[#3c323e]">{formatWhen(r.submitted_at)}</td>
                <td className="px-4 py-2.5 text-sm tabular-nums text-[#655d67]">{r.answer_count}</td>
                <td className="px-4 py-2.5 text-sm tabular-nums text-[#655d67]">
                  {r.completion_time_seconds != null ? `${r.completion_time_seconds}s` : '–'}
                </td>
                <td className="px-4 py-2.5">
                  <ChevronRight
                    size={15}
                    className="text-[#c4c1c5] opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId && (
        <ResponseDrawer form={form} responseId={openId} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}
