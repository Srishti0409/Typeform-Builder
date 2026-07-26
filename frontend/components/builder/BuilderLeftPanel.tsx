'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight, ChevronDown, ChevronUp, Copy, Layers, Lightbulb, MoreVertical, Plus, Trash2,
} from 'lucide-react';
import type { Question } from '@/lib/types';
import { getTypeInfo } from '@/lib/question-types';
// The canvas owns the choice inputs, so it owns addressing them too.
import { focusChoice } from './CanvasEditor';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Where an open question menu sits, and which question it belongs to. */
type MenuState = { id: string; top: number; left: number };

/** Roughly how tall the four-item menu renders; used to keep it on screen. */
const MENU_HEIGHT = 176;
const MENU_WIDTH = 190;

/** A row in the question menu. */
function MenuItem({
  icon,
  label,
  onSelect,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
        danger
          ? 'text-[#c0392b] hover:bg-red-50'
          : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.06)]'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

/**
 * The builder's left rail, as a stack of cards: the mode selector, the Pages
 * list, the branching prompt, and Endings.
 *
 * Pages are drag-to-reorder — that order is the respondent's order. Each page
 * also carries a menu with the same move, plus duplicate and delete, so the
 * order can be changed without a pointer drag.
 */
export default function BuilderLeftPanel({
  questions,
  activeId,
  selection,
  onSelect,
  onSelectEnding,
  onOpenPicker,
  onReorder,
  onDuplicate,
  onDelete,
}: {
  questions: Question[];
  activeId: string | null;
  /** Which pane the canvas is showing, so the rail can mark it. */
  selection: 'question' | 'ending';
  onSelect: (id: string) => void;
  onSelectEnding: () => void;
  onOpenPicker: () => void;
  onReorder: (ids: string[]) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  /** Moves a question to a new slot. Shared by the drag and the menu's moves. */
  function moveTo(from: number, to: number) {
    if (to < 0 || to >= questions.length || from === to) return;
    const ids = questions.map(q => q.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    onReorder(ids);
  }

  function handleDrop(target: number) {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    moveTo(dragIndex, target);
    setDragIndex(null);
    setOverIndex(null);
  }

  /**
   * The menu is positioned in viewport coordinates rather than inside its row:
   * the rail scrolls, so a menu placed in the flow would be clipped by it.
   */
  function openMenu(id: string, trigger: HTMLElement) {
    const r = trigger.getBoundingClientRect();
    setMenu({
      id,
      top: Math.max(8, Math.min(r.top - 4, window.innerHeight - MENU_HEIGHT - 8)),
      left:
        r.right + 6 + MENU_WIDTH > window.innerWidth
          ? Math.max(8, r.left - MENU_WIDTH - 6)
          : r.right + 6,
    });
  }

  // A menu anchored to the viewport has to close when its anchor can move.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    // Capture: the rail's own scroll doesn't bubble.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  /** Runs a menu action and closes the menu. */
  const act = (fn: () => void) => () => { fn(); setMenu(null); };
  const menuIndex = menu ? questions.findIndex(q => q.id === menu.id) : -1;

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
              // The whole block is the drop target, choices included — a question
              // with a long choice list would otherwise leave only a thin strip
              // of its own row to aim at.
              <div
                key={q.id}
                onDragOver={e => { e.preventDefault(); setOverIndex(i); }}
                onDrop={e => { e.preventDefault(); handleDrop(i); }}
              >
              <div
                data-qa="q-item"
                data-type={q.question_type}
                draggable
                onDragStart={e => {
                  setDragIndex(i);
                  // Firefox refuses to start a drag with nothing on the transfer.
                  e.dataTransfer.setData('text/plain', q.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                onClick={() => onSelect(q.id)}
                title={q.title.trim() || 'Untitled'}
                className={`group/row flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2.5 transition-colors ${
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

                {/* Kept out of the row's click target, which selects the page. */}
                <button
                  data-qa="q-menu"
                  aria-label={`Options for question ${i + 1}`}
                  aria-haspopup="menu"
                  aria-expanded={menu?.id === q.id}
                  onClick={e => {
                    e.stopPropagation();
                    if (menu?.id === q.id) setMenu(null);
                    else openMenu(q.id, e.currentTarget);
                  }}
                  className={`flex h-6 w-5 flex-shrink-0 items-center justify-center rounded text-[#655d67] transition-opacity hover:text-[#3c323e] focus-visible:opacity-100 group-hover/row:opacity-100 ${
                    menu?.id === q.id ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <MoreVertical size={15} />
                </button>
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

      {/* The open page's menu. One instance, positioned over the rail — see
          openMenu() for why it isn't rendered inside its row. */}
      {menu && menuIndex >= 0 && (
        <>
          {/* Swallows the click that dismisses, so it can't also select a page. */}
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            role="menu"
            data-qa="q-menu-popover"
            aria-label={`Options for question ${menuIndex + 1}`}
            className="fixed z-50 rounded-xl border border-[rgba(81,76,84,0.12)] bg-white py-1 shadow-xl animate-fadeIn"
            style={{ top: menu.top, left: menu.left, width: MENU_WIDTH }}
          >
            <MenuItem
              icon={<ChevronUp size={15} />}
              label="Move up"
              disabled={menuIndex === 0}
              onSelect={act(() => moveTo(menuIndex, menuIndex - 1))}
            />
            <MenuItem
              icon={<ChevronDown size={15} />}
              label="Move down"
              disabled={menuIndex === questions.length - 1}
              onSelect={act(() => moveTo(menuIndex, menuIndex + 1))}
            />
            <MenuItem
              icon={<Copy size={15} />}
              label="Duplicate"
              onSelect={act(() => onDuplicate(menu.id))}
            />
            <MenuItem
              icon={<Trash2 size={15} />}
              label="Delete"
              danger
              onSelect={act(() => onDelete(menu.id))}
            />
          </div>
        </>
      )}
    </aside>
  );
}
