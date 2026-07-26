'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, FileText, Zap } from 'lucide-react';
import type { Form } from '@/lib/types';
import { api } from '@/lib/api';
import { planFormFromGoal } from '@/lib/form-planner';
import { useToast } from '@/components/shared/Toast';
import GoalComposer from './GoalComposer';

/**
 * How the creator left this screen. `'scratch'` means the form is still empty,
 * which the builder uses to decide whether to open the element picker for them.
 */
export type BuilderEntry = 'scratch' | 'generated';

interface Props {
  form: Form;
  /** Enters the builder with whatever questions the form now has. */
  onStart: (entry: BuilderEntry) => void;
  /** Called after questions are generated so the builder can reload them. */
  onGenerated?: () => Promise<void> | void;
}

export default function BuilderInitScreen({ form, onStart, onGenerated }: Props) {
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast, toastNode } = useToast();

  /**
   * Turns the goal into real questions.
   *
   * The plan comes from deterministic keyword rules (lib/form-planner) — there is
   * no AI service in this build — but every question it yields is created through
   * the normal questions API, so the result is a genuine, editable form.
   */
  async function generate() {
    const text = goal.trim();
    if (!text || busy) return;

    setBusy(true);
    try {
      const plan = planFormFromGoal(text);

      // Sequential, so order_index follows the plan's order.
      for (const q of plan.questions) {
        await api.questions.add(form.id, q);
      }
      // Name the form after the goal unless the creator already renamed it.
      if (form.title === 'New form' && plan.title) {
        await api.forms.update(form.id, { title: plan.title });
      }

      await onGenerated?.();
      showToast(`Added ${plan.questions.length} question${plan.questions.length === 1 ? '' : 's'}`);
      onStart('generated');
    } catch {
      showToast('Could not build the form from that goal.');
      setBusy(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#f7f7f8] overflow-hidden">
      {/* Top bar */}
      <header className="h-[48px] bg-white border-b border-[rgba(86,82,90,0.08)] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-[#655d67]">
          <Link href="/" className="flex items-center gap-1.5 hover:text-[#3c323e] transition-colors">
            <FileText size={14} />
            Forms
          </Link>
          <span className="text-[#c4c1c5]">›</span>
          <span className="text-[#3c323e] font-medium truncate max-w-[200px]">{form.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="oos w-8 h-8 flex items-center justify-center rounded-lg text-[#655d67]">
            <HelpCircle size={16} />
          </button>
          <button className="w-8 h-8 rounded-full bg-[#f6d8b8] flex items-center justify-center text-xs font-semibold text-[#7a4a25] hover:opacity-80 transition-opacity">
            SG
          </button>
        </div>
      </header>

      {/* Main centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[560px] flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-sm text-[#655d67] mb-1.5">Typeform AI</p>
            <h1 className="text-3xl font-light text-[#3c323e]">What would you like to create?</h1>
          </div>

          <GoalComposer
            value={goal}
            onChange={setGoal}
            onSubmit={generate}
            busy={busy}
            onNotice={showToast}
          />

          <div className="w-full flex items-center gap-4">
            <div className="flex-1 h-px bg-[rgba(86,82,90,0.1)]" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onStart('scratch')}
              disabled={busy}
              className="px-6 py-2 rounded-lg bg-white border border-[rgba(81,76,84,0.18)] text-sm text-[#3c323e] font-medium shadow-sm hover:bg-[#f7f7f8] hover:shadow-md transition-all disabled:opacity-60"
            >
              Start from scratch
            </button>
            <button
              className="oos flex items-center gap-2 px-5 py-2 rounded-lg bg-white border border-[rgba(81,76,84,0.18)] text-sm text-[#3c323e] font-medium shadow-sm"
            >
              Sync to CRM
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-[#ff5722] flex items-center justify-center text-white text-[9px] font-bold">H</span>
                <span className="w-5 h-5 rounded bg-[#00a1e0] flex items-center justify-center text-white">
                  <Zap size={10} fill="white" />
                </span>
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom purple accent bar */}
      <div className="h-1 bg-gradient-to-r from-[#ddb7f0] via-[#c084fc] to-[#ddb7f0] flex-shrink-0" />

      {toastNode}
    </div>
  );
}
