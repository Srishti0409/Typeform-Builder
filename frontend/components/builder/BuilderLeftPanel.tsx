'use client';

import { useState } from 'react';
import { ArrowRight, ChevronDown, Layers, Lightbulb, Plus } from 'lucide-react';
import type { Question } from '@/lib/types';
import { getTypeInfo } from '@/lib/question-types';
// The canvas owns the choice inputs, so it owns addressing them too.
import { focusChoice } from './CanvasEditor';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * The builder's left rail, as a stack of cards: the mode selector, the Pages
 * list, the branching prompt, and Endings.
 *
 * Pages are drag-to-reorder — that order is the respondent's order.
 */
export default function BuilderLeftPanel({
  questions,
  activeId,
  selection,
  onSelect,
  onSelectEnding,
  onOpenPicker,
  onReorder,
}: {
  questions: Question[];
  activeId: string | null;
  /** Which pane the canvas is showing, so the rail can mark it. */
  selection: 'question' | 'ending';
  onSelect: (id: string) => void;
  onSelectEnding: () => void;
  onOpenPicker: () => void;
  onReorder: (ids: string[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop(target: number) {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const ids = questions.map(q => q.id);
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(target, 0, moved);
    onReorder(ids);
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <aside className="flex h-full w-[264px] flex-shrink-0 flex-col gap-2 overflow-y-auto px-4 pb-3">
      {/* Mode — this build has the one universal flow, no per-device variants. */}
      <div className="oos flex items-center gap-2.5 rounded-xl bg-[#f2f1f3] px-3.5 py-3">
        <Layers size={17} className="flex-shrink-0 text-[#3c323e]" />
        <span className="flex-1 text-[15px] font-medium text-[#3c323e]">Universal mode</span>
        <ChevronDown size={16} className="text-[#655d67]" />
      </div>

      {/* Pages */}
      <div className="rounded-xl bg-[#f2f1f3] p-2">
        <h2 className="px-1.5 pb-1.5 pt-1 text-[15px] font-semibold text-[#3c323e]">Pages</h2>

        <div className="flex flex-col gap-1">
          {questions.map((q, i) => {
            const info = getTypeInfo(q.question_type);
            const isActive = selection === 'question' && q.id === activeId;
            const isOver = overIndex === i && dragIndex !== null && dragIndex !== i;
            // Choice questions list their choices beneath them, lettered as the
            // respondent sees them.
            const choices =
              q.question_type === 'multiple_choice' || q.question_type === 'dropdown'
                ? q.options ?? []
                : [];
            return (
              <div key={q.id}>
              <div
                data-qa="q-item"
                data-type={q.question_type}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={e => { e.preventDefault(); setOverIndex(i); }}
                onDrop={e => { e.preventDefault(); handleDrop(i); }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                onClick={() => onSelect(q.id)}
                title={q.title.trim() || 'Untitled'}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2.5 transition-colors ${
                  isActive ? 'bg-white shadow-sm' : 'hover:bg-[rgba(255,255,255,0.6)]'
                } ${dragIndex === i ? 'opacity-40' : ''} ${
                  isOver ? 'border-t-2 border-[#3c323e]' : 'border-t-2 border-transparent'
                }`}
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#e6e0fb] text-[#4b3f9e]">
                  {info.icon}
                </span>
                <span className="text-[15px] font-medium text-[#3c323e] tabular-nums">{i + 1}</span>
                <span
                  className={`min-w-0 flex-1 truncate text-[13px] ${
                    q.title.trim() ? 'text-[#655d67]' : 'italic text-[#a8a3a9]'
                  }`}
                >
                  {q.title.trim() || 'Untitled'}
                </span>
              </div>

              {/* The question's choices, nested under it */}
              {choices.length > 0 && (
                <div className="mt-0.5 flex flex-col gap-0.5 pl-5">
                  {choices.map((choice, ci) => (
                    <button
                      key={ci}
                      data-qa="choice-item"
                      onClick={() => { onSelect(q.id); focusChoice(q.id, ci); }}
                      title={choice.trim() || `Choice ${LETTERS[ci] ?? ci + 1}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.7)]"
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[#e6e0fb] text-[11px] font-bold text-[#4b3f9e]">
                        {LETTERS[ci] ?? ci + 1}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] ${
                          choice.trim() ? 'text-[#655d67]' : 'italic text-[#a8a3a9]'
                        }`}
                      >
                        {choice.trim() || 'choice'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onOpenPicker}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-[15px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(255,255,255,0.7)]"
        >
          <Plus size={17} />
          Add content
        </button>
      </div>

      {/* Branching — out of scope, shown as Typeform's prompt card */}
      <div className="oos flex items-center gap-2.5 rounded-xl bg-[#f2f1f3] px-3.5 py-3">
        <Lightbulb size={17} className="flex-shrink-0 text-[#b45309]" />
        <span className="flex-1 text-[15px] font-medium leading-snug text-[#3c323e]">
          Personalize with branching
        </span>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(81,76,84,0.2)] bg-white text-[#3c323e]">
          <ArrowRight size={15} />
        </span>
      </div>

      {/* Endings */}
      <div className="mt-auto rounded-xl bg-[#f2f1f3] p-2">
        <div className="flex items-center justify-between px-1.5 pb-1.5 pt-1">
          <h2 className="text-[15px] font-semibold text-[#3c323e]">Endings</h2>
          <button
            onClick={onSelectEnding}
            aria-label="Edit the ending"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#3c323e] transition-colors hover:bg-white"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          onClick={onSelectEnding}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left transition-colors ${
            selection === 'ending' ? 'bg-white shadow-sm' : 'hover:bg-[rgba(255,255,255,0.6)]'
          }`}
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#d9f0e8] text-[#177767] text-[12px] font-bold">
            ✓
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-[#655d67]">Thank-you screen</span>
        </button>
      </div>
    </aside>
  );
}
