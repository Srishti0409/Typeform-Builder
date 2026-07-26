'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useToast } from '@/components/shared/Toast';
import { getTypeInfo } from '@/lib/question-types';
import {
  RESEARCH_TEMPLATES, matchTemplate, titleFor,
  type DraftQuestion, type ResearchTemplate,
} from '@/lib/research-templates';
import { applyKitToNewForm, useBrandKit } from '@/lib/brand-kit';
import { api } from '@/lib/api';

export default function ResearchFlowPage({
  searchParams,
}: {
  /** `?goal=` prefills from the dashboard's suggestion banner. */
  searchParams: Promise<{ goal?: string }>;
}) {
  const initialGoal = use(searchParams).goal ?? '';
  const router = useRouter();
  const [kit] = useBrandKit();
  const { showToast, toastNode } = useToast();

  const [goal, setGoal] = useState(initialGoal);
  const [drafting, setDrafting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{
    template: ResearchTemplate;
    title: string;
    questions: DraftQuestion[];
  } | null>(null);

  function drawUp(text: string) {
    const goalText = text.trim();
    if (!goalText) return;
    setDrafting(true);
    // A beat of latency: the draft is worth reading, so it should not just blink in.
    window.setTimeout(() => {
      const template = matchTemplate(goalText);
      setDraft({
        template,
        title: titleFor(goalText, template),
        questions: template.questions,
      });
      setDrafting(false);
    }, 550);
  }

  /** Creates the form and its questions for real, then hands over to the builder. */
  async function createForm() {
    if (!draft) return;
    setCreating(true);
    try {
      const form = await api.forms.create(draft.title);
      // Sequential: the API derives `order_index` from insertion order.
      for (const question of draft.questions) {
        await api.questions.add(form.id, question);
      }
      await applyKitToNewForm(kit, form.id);
      router.push(`/forms/${form.id}/edit`);
    } catch {
      showToast('Could not create that form.');
      setCreating(false);
    }
  }

  return (
    <WorkspaceShell active="research-flow" maxWidth={1000}>
      <div className="flex items-center gap-2">
        <h1 className="text-[30px] font-normal leading-none text-[#3c323e]">Research Flow</h1>
        <span className="rounded-md border border-[#bdddf9] bg-[#f6fafd] px-1.5 py-0.5 text-[11px] font-medium text-[#01487f]">
          Demo
        </span>
      </div>
      <p className="mt-2 max-w-[620px] text-[15px] text-[#655d67]">
        Say what you need to learn. Research Flow drafts a form with question types picked to
        suit it — then you edit, publish and share it like any other.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          {/* Step 1 — the goal */}
          <section className="rounded-xl border border-[#ddb7f0] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5eafd]">
                <Sparkles size={15} className="text-[#9333ea]" />
              </span>
              <h2 className="text-[15px] font-semibold text-[#3c323e]">What do you want to learn?</h2>
            </div>

            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={3}
              placeholder="e.g. Gather expert opinions on recent studies to support a literature review"
              className="mt-3 w-full resize-none rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2.5 text-[15px] text-[#3c323e] outline-none transition-colors focus:border-[#655d67]"
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {RESEARCH_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => { setGoal(template.blurb); drawUp(template.blurb); }}
                  className="rounded-full border border-[rgba(81,76,84,0.18)] px-3 py-1.5 text-[13px] text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
                >
                  {template.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => drawUp(goal)}
              disabled={!goal.trim() || drafting}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[#2b232d] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#1f1922] disabled:opacity-40"
            >
              {drafting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Wand2 size={15} />
              )}
              {drafting ? 'Reading your goal…' : draft ? 'Draft again' : 'Draft my form'}
            </button>
          </section>

          {/* Step 2 — the draft */}
          {draft && !drafting && (
            <section className="rounded-xl border border-[rgba(81,76,84,0.12)] bg-white p-5 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label className="block text-xs font-medium text-[#655d67]">Form title</label>
                  <input
                    value={draft.title}
                    onChange={e => setDraft(d => d && { ...d, title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-[15px] font-medium text-[#3c323e] outline-none focus:border-[#655d67]"
                  />
                </div>
                <span className="mt-5 rounded-md bg-[rgba(87,84,91,0.06)] px-2 py-1 text-[12px] text-[#655d67]">
                  {draft.template.label}
                </span>
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[#847e85]">
                {draft.questions.length} questions drafted
              </p>
              <ol className="mt-2 flex flex-col gap-1.5">
                {draft.questions.map((question, i) => {
                  const info = getTypeInfo(question.question_type);
                  return (
                    <li
                      key={`${question.title}-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-[rgba(81,76,84,0.1)] px-3 py-2.5"
                    >
                      <span className="w-4 flex-shrink-0 text-[13px] text-[#847e85] tabular-nums">
                        {i + 1}
                      </span>
                      <span className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-[rgba(87,84,91,0.06)] px-2 py-1 text-[11px] font-medium text-[#655d67]">
                        {info.icon}
                        {info.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] text-[#3c323e]">
                        {question.title}
                      </span>
                      {question.is_required && (
                        <span className="flex-shrink-0 text-[11px] font-medium text-[#be185d]">
                          Required
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setDraft(d => d && { ...d, questions: d.questions.filter((_, j) => j !== i) })
                        }
                        aria-label={`Remove “${question.title}”`}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[#847e85] transition-colors hover:bg-red-50 hover:text-[#be185d]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={createForm}
                  disabled={creating || draft.questions.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-[#127a63] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#0f6552] disabled:opacity-40"
                >
                  {creating ? 'Creating…' : 'Create this form'}
                  {!creating && <ArrowRight size={15} />}
                </button>
                <button
                  onClick={() => setDraft(d => d && { ...d, questions: d.template.questions })}
                  className="flex items-center gap-2 rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-[14px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
                >
                  <RefreshCw size={14} />
                  Restore removed questions
                </button>
                <button
                  onClick={() => { setDraft(null); setGoal(''); }}
                  className="rounded-lg px-3 py-2 text-[14px] font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
                >
                  Start over
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Aside */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
          <div className="rounded-xl border border-[rgba(81,76,84,0.12)] bg-white p-4">
            <h2 className="text-[14px] font-semibold text-[#3c323e]">How this works</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {[
                'State the research goal in your own words.',
                'Teraform matches it to a question set and drafts the form.',
                'Trim what you do not need, then create it for real.',
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5 text-[13px] text-[#655d67]">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(87,84,91,0.08)] text-[11px] font-semibold text-[#3c323e]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="text-[13px] text-[#847e85]">
            Drafting matches your goal against a curated question bank; it does not call a
            language model in this build. The form it creates is a real form.
          </p>
        </aside>
      </div>
      {toastNode}
    </WorkspaceShell>
  );
}
