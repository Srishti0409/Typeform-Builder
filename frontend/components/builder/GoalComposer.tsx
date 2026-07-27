'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Plus, MoreHorizontal, Send, Square } from 'lucide-react';
import { GOAL_TEMPLATES } from '@/lib/form-planner';
import { ENABLED, UNAVAILABLE } from '@/lib/scope';

/**
 * The "Explain the goal of your form" composer.
 *
 * Fully interactive: free typing, browser dictation via the Web Speech API, a
 * "+" menu that inserts starter goals, a "…" menu for editing actions, and a
 * send control that is live whenever there is text.
 */

/** Minimal shape of the vendor-prefixed SpeechRecognition API we rely on. */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Items in the "…" menu. Declared outside the component so the list is stable. */
const MORE_ACTIONS: { kind: 'form_title' | 'today' | 'clear'; label: string; hint: string }[] = [
  { kind: 'form_title', label: 'Insert form title', hint: 'Adds a {{form_title}} placeholder' },
  { kind: 'today', label: 'Insert today’s date', hint: 'Adds a {{today}} placeholder' },
  { kind: 'clear', label: 'Clear', hint: 'Empty the box' },
];

export default function GoalComposer({
  value,
  onChange,
  onSubmit,
  busy,
  onNotice,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  /** Surfaces transient messages (e.g. dictation unsupported) to the page. */
  onNotice: (message: string) => void;
}) {
  const [menu, setMenu] = useState<'none' | 'templates' | 'more'>('none');
  const [listening, setListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /**
   * Off in this build (see lib/scope). The composer stays on the "New form"
   * screen, dimmed and inert — "Start from scratch" alongside it is how a form
   * gets built.
   */
  const enabled = ENABLED.aiAssist;
  const canSend = enabled && value.trim().length > 0 && !busy;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu('none');
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Stop dictation if the composer goes away mid-session.
  useEffect(() => () => recognitionRef.current?.stop(), []);

  /** Inserts text at the caret rather than clobbering what's already typed. */
  function insertAtCaret(text: string) {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value} ${text}` : text);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const needsSpace = start > 0 && !/\s$/.test(value.slice(0, start));
    const insert = (needsSpace ? ' ' : '') + text;
    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + insert.length;
      el.setSelectionRange(caret, caret);
    });
  }

  function runMoreAction(kind: (typeof MORE_ACTIONS)[number]['kind']) {
    if (kind === 'clear') onChange('');
    else if (kind === 'form_title') insertAtCaret('{{form_title}}');
    else insertAtCaret('{{today}}');
  }

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      onNotice('Voice input isn’t supported in this browser — try Chrome, or type instead.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = e => {
      let heard = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        heard += e.results[i][0].transcript;
      }
      const trimmed = heard.trim();
      if (trimmed) insertAtCaret(trimmed);
    };
    recognition.onerror = () => {
      setListening(false);
      onNotice('Couldn’t hear anything — check microphone permission.');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-visible rounded-xl border border-[#ddb7f0] bg-white shadow-sm focus-within:border-[#c084fc] focus-within:ring-4 focus-within:ring-[#f5eafd] ${
        enabled ? '' : 'oos'
      }`}
      title={enabled ? undefined : UNAVAILABLE}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={!enabled}
        onKeyDown={e => {
          // Enter sends; Shift+Enter keeps a newline, as in a chat composer.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        placeholder="Explain the goal of your form."
        aria-label="Explain the goal of your form"
        rows={4}
        className="min-h-[100px] w-full resize-none bg-transparent px-4 pb-2 pt-4 text-sm text-[#3c323e] outline-none placeholder:text-[#c4c1c5]"
      />

      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <div className="flex items-center gap-3 text-[#847e85]">
          <button
            onClick={toggleDictation}
            disabled={!enabled}
            aria-label={listening ? 'Stop dictation' : 'Dictate your goal'}
            title={listening ? 'Stop dictation' : 'Dictate your goal'}
            className={`transition-colors ${listening ? 'text-[#c0392b]' : 'hover:text-[#3c323e]'}`}
          >
            {listening ? <Square size={13} fill="currentColor" /> : <Mic size={15} />}
          </button>

          <button
            onClick={() => setMenu(m => (m === 'templates' ? 'none' : 'templates'))}
            disabled={!enabled}
            aria-label="Insert a starter goal"
            title="Insert a starter goal"
            aria-expanded={menu === 'templates'}
            className="transition-colors hover:text-[#3c323e]"
          >
            <Plus size={15} />
          </button>

          <button
            onClick={() => setMenu(m => (m === 'more' ? 'none' : 'more'))}
            disabled={!enabled}
            aria-label="More options"
            title="More options"
            aria-expanded={menu === 'more'}
            className="transition-colors hover:text-[#3c323e]"
          >
            <MoreHorizontal size={15} />
          </button>

          {listening && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#c0392b]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c0392b]" />
              Listening…
            </span>
          )}
        </div>

        <button
          onClick={() => canSend && onSubmit()}
          disabled={!canSend}
          aria-label="Generate form from this goal"
          title={canSend ? 'Generate form' : 'Describe your form first'}
          className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
            canSend
              ? 'border-[#3c323e] bg-[#3c323e] text-white hover:bg-[#2e2630]'
              : 'cursor-not-allowed border-[rgba(86,82,90,0.12)] bg-[rgba(89,86,93,0.06)] text-[#c4c1c5]'
          }`}
        >
          {busy ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Send size={12} />
          )}
        </button>
      </div>

      {/* "+" — starter goals */}
      {menu === 'templates' && (
        <div className="absolute left-3 top-full z-20 mt-1 w-[280px] overflow-hidden rounded-xl border border-[rgba(81,76,84,0.12)] bg-white py-1 shadow-xl animate-fadeIn">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#847e85]">
            Start from a goal
          </p>
          {GOAL_TEMPLATES.map(t => (
            <button
              key={t.label}
              onClick={() => { onChange(t.goal); setMenu('none'); textareaRef.current?.focus(); }}
              className="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-[rgba(87,84,91,0.05)]"
            >
              <span className="text-sm font-medium text-[#3c323e]">{t.label}</span>
              <span className="text-xs text-[#847e85]">{t.goal}</span>
            </button>
          ))}
        </div>
      )}

      {/* "…" — editing actions */}
      {menu === 'more' && (
        <div className="absolute left-3 top-full z-20 mt-1 w-[240px] overflow-hidden rounded-xl border border-[rgba(81,76,84,0.12)] bg-white py-1 shadow-xl animate-fadeIn">
          {MORE_ACTIONS.map(item => (
            <button
              key={item.kind}
              onClick={() => { runMoreAction(item.kind); setMenu('none'); }}
              className="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-[rgba(87,84,91,0.05)]"
            >
              <span className="text-sm text-[#3c323e]">{item.label}</span>
              <span className="text-xs text-[#847e85]">{item.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
