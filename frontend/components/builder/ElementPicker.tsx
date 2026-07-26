'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Info, Search, Sparkles, X, Lock, Grid3X3, PanelTop } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import {
  CATEGORY_TINT as TINT, ELEMENT_CATEGORIES, QUESTION_TYPES, UNSUPPORTED_ELEMENTS,
  type ElementCategory,
} from '@/lib/question-types';
import type { QuestionType } from '@/lib/types';

type Row =
  | { kind: 'type'; key: string; label: string; icon: React.ReactNode; category: ElementCategory; type: QuestionType; description: string }
  | { kind: 'locked'; key: string; label: string; icon: React.ReactNode; category: ElementCategory };

function buildRows(): Row[] {
  const supported: Row[] = QUESTION_TYPES.map(t => ({
    kind: 'type',
    key: `t:${t.type}`,
    label: t.label,
    icon: t.icon,
    category: t.category,
    type: t.type,
    description: t.description,
  }));
  const locked: Row[] = UNSUPPORTED_ELEMENTS.map(e => ({
    kind: 'locked',
    key: `l:${e.label}`,
    label: e.label,
    icon: e.icon,
    category: e.category,
  }));
  return [...supported, ...locked];
}

/** Words a row should match on when searching. */
function haystack(row: Row): string {
  const extra =
    row.kind === 'type'
      ? [row.description, ...(QUESTION_TYPES.find(t => t.type === row.type)?.keywords ?? [])]
      : ['coming soon'];
  return [row.label, row.category, ...extra].join(' ').toLowerCase();
}

/**
 * One pasted line becomes one question, in the order they were written.
 *
 * Blank lines are separators, not questions. A leading list marker is dropped
 * because the builder numbers questions itself — importing "1. Your name?"
 * verbatim would show as "1 1. Your name?". The pattern only matches a marker
 * followed by a space, so a title that genuinely opens with a number ("2024
 * revenue?") is left alone.
 */
export function parseImportedQuestions(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*(?:\d{1,3}[.)]|[-*•])\s+/, '').trim())
    .filter(Boolean);
}

const PANEL_LABEL = 'text-sm font-medium text-[#3c323e]';
const TEXTAREA =
  'mt-2 w-full resize-none rounded-xl border border-[rgba(81,76,84,0.18)] bg-[#fbfbfc] px-3.5 py-3 text-sm text-[#3c323e] outline-none transition-colors placeholder:text-[#847e85] focus:border-[#655d67]';
const PRIMARY =
  'rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630] disabled:cursor-not-allowed disabled:opacity-40';

/** The dialog's footer bar, bled to the card's edges. */
function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 -mb-6 mt-5 flex items-center justify-end gap-3 border-t border-[rgba(86,82,90,0.1)] bg-[#fbfbfc] px-6 py-4">
      {children}
    </div>
  );
}

/**
 * "Import questions": paste a list, get a question per line.
 *
 * A pasted line carries no type information, so every question lands as Short
 * Text for the author to change from — which is what Typeform does too.
 */
function ImportPanel({
  text,
  onTextChange,
  onImport,
  onSwitchToAI,
}: {
  text: string;
  onTextChange: (next: string) => void;
  onImport: (titles: string[]) => Promise<void>;
  onSwitchToAI: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const titles = parseImportedQuestions(text);

  async function submit() {
    if (!titles.length || busy) return;
    setBusy(true);
    try {
      await onImport(titles);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <label htmlFor="import-questions" className={PANEL_LABEL}>Form questions</label>
          <textarea
            id="import-questions"
            ref={ref}
            value={text}
            onChange={e => onTextChange(e.target.value)}
            placeholder="Copy and paste or type in your questions, and press enter after each one."
            spellCheck={false}
            className={`${TEXTAREA} h-[340px] leading-relaxed`}
          />
        </div>

        <aside className="w-[280px] flex-shrink-0">
          <div className="rounded-xl border border-[#bcdcf5] bg-[#f5fafe] p-4">
            <Info size={18} className="text-[#2b62c4]" />
            <ul className="mt-3 flex list-disc flex-col gap-2.5 pl-4 text-sm leading-snug text-[#3c323e]">
              <li>Paste or type your questions in the text field</li>
              {/* Typeform also offers a file or a URL here; this build takes a
                  description, so the card only promises what it can do. */}
              <li>Or try Create with AI to build your form from a description</li>
            </ul>
          </div>

          <button
            onClick={onSwitchToAI}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[rgba(81,76,84,0.2)] bg-white py-2.5 text-sm font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.04)]"
          >
            <Sparkles size={15} />
            Create with AI
          </button>
        </aside>
      </div>

      <Footer>
        <span className="mr-auto text-xs text-[#847e85]">
          {titles.length > 0
            ? `${titles.length} question${titles.length === 1 ? '' : 's'} ready to import`
            : 'One question per line. Each is added as Short Text.'}
        </span>
        <button onClick={submit} disabled={!titles.length || busy} className={PRIMARY}>
          {busy ? 'Importing…' : 'Import questions'}
        </button>
      </Footer>
    </>
  );
}

/**
 * "Create with AI": plans a set of questions from a description.
 *
 * Deliberately the same deterministic planner the New form screen and the
 * "Chat to create" bar use — this build ships no model, and the copy says so
 * rather than implying one.
 */
function AiPanel({
  text,
  onTextChange,
  onGenerate,
}: {
  text: string;
  onTextChange: (next: string) => void;
  onGenerate: (prompt: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const prompt = text.trim();

  async function submit() {
    if (!prompt || busy) return;
    setBusy(true);
    try {
      await onGenerate(prompt);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <label htmlFor="ai-goal" className={PANEL_LABEL}>What is this form for?</label>
          <textarea
            id="ai-goal"
            ref={ref}
            value={text}
            onChange={e => onTextChange(e.target.value)}
            placeholder="e.g. Collect RSVPs for a launch event — name, email, how many guests, and dietary requirements"
            className={`${TEXTAREA} h-[340px] leading-relaxed`}
          />
        </div>

        <aside className="w-[280px] flex-shrink-0">
          <div className="rounded-xl border border-[#e3cdf2] bg-[#fbf6fe] p-4">
            <Sparkles size={18} className="text-[#9333ea]" />
            <p className="mt-3 text-sm leading-snug text-[#3c323e]">
              Describe the form and its questions get added for you, each with the
              type that fits — email fields validate, ratings get stars, choice
              questions come with options.
            </p>
            <p className="mt-3 text-xs leading-snug text-[#655d67]">
              Plans from the words in your description; no AI service is involved.
              Building from a file or a URL isn’t part of this build.
            </p>
          </div>
        </aside>
      </div>

      <Footer>
        <span className="mr-auto text-xs text-[#847e85]">
          Questions are appended to this form.
        </span>
        <button onClick={submit} disabled={!prompt || busy} className={PRIMARY}>
          {busy ? 'Creating…' : 'Create with AI'}
        </button>
      </Footer>
    </>
  );
}

/** The original tab: search on the left, elements grouped by category. */
function ElementsPanel({
  onPick,
  onClose,
}: {
  onPick: (type: QuestionType) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rows = useMemo(() => buildRows(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? rows.filter(r => haystack(r).includes(q)) : rows),
    [rows, q]
  );
  /** Only selectable rows participate in keyboard navigation. */
  const selectable = useMemo(() => matches.filter(r => r.kind === 'type'), [matches]);

  // Keyed by query so the highlight resets as you type, without an effect.
  const [activeState, setActive] = useState<{ q: string; i: number }>({ q, i: 0 });
  const active = activeState.q === q ? activeState.i : 0;
  const setActiveIndex = (next: number) => setActive({ q, i: next });

  function choose(row: Row) {
    if (row.kind !== 'type') return;
    onPick(row.type);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(Math.min(active + 1, selectable.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(active - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = selectable[active];
      if (row) choose(row);
    }
  }

  const byCategory = ELEMENT_CATEGORIES.map(category => ({
    category,
    items: matches.filter(r => r.category === category),
  })).filter(g => g.items.length > 0);

  return (
    <div className="flex gap-6" onKeyDown={onKeyDown}>
      {/* Left rail */}
      <div className="w-[230px] flex-shrink-0">
        <div className="flex items-center gap-2 rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2">
          <Search size={15} className="flex-shrink-0 text-[#847e85]" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search form elements"
            aria-label="Search form elements"
            className="min-w-0 flex-1 text-sm text-[#3c323e] placeholder:text-[#847e85]"
          />
        </div>

        <p className="mt-5 text-xs font-semibold text-[#847e85]">Recommended</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {(['short_text', 'multiple_choice', 'rating'] as QuestionType[]).map(t => {
            const info = QUESTION_TYPES.find(x => x.type === t)!;
            return (
              <button
                key={t}
                onClick={() => { onPick(t); onClose(); }}
                className="flex items-center gap-2.5 rounded-lg border border-[rgba(81,76,84,0.14)] px-3 py-2 text-left text-sm text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
              >
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: TINT[info.category].bg, color: TINT[info.category].fg }}
                >
                  {info.icon}
                </span>
                {info.label}
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-xs font-semibold text-[#847e85]">Connect to apps</p>
        <Link
          href="/integrations"
          className="mt-2 flex items-center gap-2.5 rounded-lg border border-[rgba(81,76,84,0.14)] px-3 py-2 text-sm text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
        >
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[rgba(87,84,91,0.08)] text-[#655d67]">
            <Grid3X3 size={14} />
          </span>
          Browse all apps
        </Link>
      </div>

      {/* Element grid */}
      <div className="min-w-0 flex-1">
        {byCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <PanelTop size={22} className="text-[#c4c1c5]" />
            <p className="text-sm text-[#655d67]">
              No elements match “{query}”.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
            {byCategory.map(({ category, items }) => (
              <section key={category}>
                <h3 className="mb-2 text-sm font-semibold text-[#3c323e]">{category}</h3>
                <ul className="flex flex-col gap-0.5">
                  {items.map(row => {
                    const locked = row.kind === 'locked';
                    const idx = selectable.findIndex(r => r.key === row.key);
                    const isActive = !locked && idx === active;
                    return (
                      <li key={row.key}>
                        <button
                          onClick={() => choose(row)}
                          disabled={locked}
                          onMouseEnter={() => { if (!locked && idx >= 0) setActiveIndex(idx); }}
                          title={locked ? 'Not available in this build' : row.kind === 'type' ? row.description : undefined}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                            locked
                              ? 'oos text-[#655d67]'
                              : `text-[#3c323e] ${isActive ? 'bg-[rgba(87,84,91,0.07)]' : 'hover:bg-[rgba(87,84,91,0.05)]'}`
                          }`}
                        >
                          <span
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: TINT[row.category].bg, color: TINT[row.category].fg }}
                          >
                            {row.icon}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{row.label}</span>
                          {locked && <Lock size={12} className="flex-shrink-0 text-[#a8a3a9]" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-6 border-t border-[rgba(86,82,90,0.08)] pt-3 text-xs text-[#847e85]">
          Dimmed elements aren’t part of this build. Use ↑↓ and Enter to pick with the keyboard.
        </p>
      </div>
    </div>
  );
}

type Tab = 'elements' | 'import' | 'ai';

const TABS: { key: Tab; label: string }[] = [
  { key: 'elements', label: 'Add form elements' },
  { key: 'import', label: 'Import questions' },
  { key: 'ai', label: 'Create with AI' },
];

/**
 * The builder's "Add content" dialog, with Typeform's three ways in: pick an
 * element, paste a list of questions, or describe the form.
 *
 * Draft text lives here rather than in the panels, so switching tabs to read the
 * other one doesn't throw away what you had typed.
 */
export default function ElementPicker({
  onClose,
  onPick,
  onImport,
  onGenerate,
}: {
  onClose: () => void;
  onPick: (type: QuestionType) => void;
  /** Adds one Short Text question per line, in order. */
  onImport: (titles: string[]) => Promise<void>;
  /** Plans a set of questions from a description. */
  onGenerate: (prompt: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>('elements');
  const [importText, setImportText] = useState('');
  const [aiText, setAiText] = useState('');

  return (
    <Modal onClose={onClose} label="Add content" width={940}>
      {/* Tabs */}
      <div className="-mx-6 -mt-6 mb-5 flex items-center gap-1 border-b border-[rgba(86,82,90,0.1)] px-4 py-3">
        <div role="tablist" aria-label="Add content" className="flex items-center gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border border-[#3c323e] text-[#3c323e]'
                  : 'text-[#655d67] hover:bg-[rgba(87,84,91,0.06)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
        >
          <X size={17} />
        </button>
      </div>

      {tab === 'elements' && <ElementsPanel onPick={onPick} onClose={onClose} />}

      {tab === 'import' && (
        <ImportPanel
          text={importText}
          onTextChange={setImportText}
          onImport={async titles => { await onImport(titles); onClose(); }}
          onSwitchToAI={() => setTab('ai')}
        />
      )}

      {tab === 'ai' && (
        <AiPanel
          text={aiText}
          onTextChange={setAiText}
          onGenerate={async prompt => { await onGenerate(prompt); onClose(); }}
        />
      )}
    </Modal>
  );
}
