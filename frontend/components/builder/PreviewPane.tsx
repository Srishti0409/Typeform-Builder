'use client';

import { useState, useEffect } from 'react';
import { Star, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { Question } from '@/lib/types';
import { getTypeInfo } from './FormBuilder';

interface Props {
  questions: Question[];
  activeIndex: number;
  formTitle: string;
}

// ── Individual field previews ──────────────────────────────────────────────

function ShortTextPreview({ q }: { q: Question }) {
  return (
    <input
      readOnly
      placeholder={q.placeholder || 'Type your answer here...'}
      className="w-full border-b-2 border-[rgba(255,255,255,0.4)] bg-transparent text-white text-lg outline-none placeholder:text-white/50 pb-2 cursor-text"
    />
  );
}

function LongTextPreview({ q }: { q: Question }) {
  return (
    <textarea
      readOnly
      placeholder={q.placeholder || 'Type your answer here...'}
      rows={3}
      className="w-full border-b-2 border-[rgba(255,255,255,0.4)] bg-transparent text-white text-lg outline-none placeholder:text-white/50 pb-2 resize-none cursor-text"
    />
  );
}

function EmailPreview({ q }: { q: Question }) {
  return (
    <input
      readOnly
      type="email"
      placeholder={q.placeholder || 'name@example.com'}
      className="w-full border-b-2 border-[rgba(255,255,255,0.4)] bg-transparent text-white text-lg outline-none placeholder:text-white/50 pb-2"
    />
  );
}

function NumberPreview({ q }: { q: Question }) {
  const settings = q.settings as any;
  return (
    <input
      readOnly
      type="number"
      placeholder={`Enter a number${settings?.min !== undefined ? ` (${settings.min}–${settings.max})` : ''}`}
      className="w-full border-b-2 border-[rgba(255,255,255,0.4)] bg-transparent text-white text-lg outline-none placeholder:text-white/50 pb-2"
    />
  );
}

function MultipleChoicePreview({ q }: { q: Question }) {
  const [selected, setSelected] = useState<string[]>([]);
  const options = q.options ?? [];
  return (
    <div className="space-y-2">
      {options.map((opt, i) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={i}
            onClick={() => setSelected(s => isSelected ? s.filter(x => x !== opt) : [...s, opt])}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left text-sm transition-all ${
              isSelected
                ? 'border-white bg-white/20 text-white'
                : 'border-white/30 text-white/80 hover:border-white/60 hover:bg-white/10'
            }`}
          >
            <span className="w-5 h-5 rounded flex items-center justify-center border border-current text-[10px] font-bold flex-shrink-0">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1">{opt || `Option ${i + 1}`}</span>
            {isSelected && <Check size={13} />}
          </button>
        );
      })}
    </div>
  );
}

function DropdownPreview({ q }: { q: Question }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const options = q.options ?? [];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-white/30 text-left text-sm text-white/80 hover:border-white/60 transition-colors"
      >
        <span>{selected || 'Select an option'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white/95 rounded-lg shadow-xl overflow-hidden z-10">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => { setSelected(opt); setOpen(false); }}
              className="w-full px-4 py-2 text-sm text-[#3c323e] text-left hover:bg-[rgba(87,84,91,0.06)] transition-colors"
            >
              {opt || `Option ${i + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function YesNoPreview() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="flex gap-3">
      {['Yes', 'No'].map(v => (
        <button
          key={v}
          onClick={() => setSelected(v)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border text-sm font-medium transition-all ${
            selected === v
              ? 'border-white bg-white/20 text-white'
              : 'border-white/30 text-white/80 hover:border-white/60 hover:bg-white/10'
          }`}
        >
          <span className="w-5 h-5 rounded border border-current flex items-center justify-center text-xs font-bold">
            {v === 'Yes' ? 'Y' : 'N'}
          </span>
          {v}
        </button>
      ))}
    </div>
  );
}

function RatingPreview({ q }: { q: Question }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const max = (q.settings as any)?.max_rating ?? 5;

  return (
    <div className="flex gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => setSelected(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            className="transition-colors"
            fill={(hovered || selected) >= n ? '#FCD34D' : 'transparent'}
            stroke={(hovered || selected) >= n ? '#FCD34D' : 'rgba(255,255,255,0.5)'}
          />
        </button>
      ))}
    </div>
  );
}

function QuestionPreview({ question }: { question: Question }) {
  switch (question.question_type) {
    case 'short_text': return <ShortTextPreview q={question} />;
    case 'long_text':  return <LongTextPreview q={question} />;
    case 'email':      return <EmailPreview q={question} />;
    case 'number':     return <NumberPreview q={question} />;
    case 'multiple_choice': return <MultipleChoicePreview q={question} />;
    case 'dropdown':   return <DropdownPreview q={question} />;
    case 'yes_no':     return <YesNoPreview />;
    case 'rating':     return <RatingPreview q={question} />;
    default:           return null;
  }
}

// ── Main PreviewPane ───────────────────────────────────────────────────────

export default function PreviewPane({ questions, activeIndex, formTitle }: Props) {
  const [previewIndex, setPreviewIndex] = useState(activeIndex);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('down');

  // Sync preview to active question in builder
  useEffect(() => {
    if (activeIndex !== previewIndex) {
      setDirection(activeIndex > previewIndex ? 'down' : 'up');
      setAnimating(true);
      const t = setTimeout(() => {
        setPreviewIndex(activeIndex);
        setAnimating(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [activeIndex]);

  if (questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#3c323e] to-[#2e2630] text-white/40 text-sm gap-2 p-6 text-center">
        <p className="text-lg">👈</p>
        <p>Add questions to see the live preview</p>
      </div>
    );
  }

  const question = questions[previewIndex] ?? questions[0];
  const progress = ((previewIndex + 1) / questions.length) * 100;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#3c323e] via-[#3c323e] to-[#2e2630] relative overflow-hidden">
      {/* Progress bar */}
      <div className="h-[3px] bg-white/10 flex-shrink-0">
        <div
          className="h-full bg-white/70 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question slide */}
      <div
        className={`flex-1 flex flex-col justify-center p-8 transition-all duration-200 ${
          animating
            ? direction === 'down' ? 'opacity-0 translate-y-4' : 'opacity-0 -translate-y-4'
            : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Question number + required */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-white/50 text-xs font-medium">{previewIndex + 1} →</span>
          {question.is_required && (
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Required *</span>
          )}
        </div>

        {/* Question title */}
        <h2 className="text-xl font-medium text-white mb-2 leading-snug">
          {question.title || <span className="text-white/30 italic">Untitled question</span>}
        </h2>

        {/* Description */}
        {question.description && (
          <p className="text-sm text-white/60 mb-6">{question.description}</p>
        )}

        {!question.description && <div className="mb-6" />}

        {/* Field input */}
        <QuestionPreview question={question} />

        {/* OK button */}
        <div className="mt-6 flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-[#3c323e] text-sm font-medium rounded-lg hover:bg-white/90 transition-colors shadow-md">
            OK
            <Check size={13} />
          </button>
          <span className="text-xs text-white/30">press Enter ↵</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-white/10">
        <span className="text-xs text-white/40">{previewIndex + 1} / {questions.length}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (previewIndex > 0) {
                setDirection('up');
                setAnimating(true);
                setTimeout(() => { setPreviewIndex(i => i - 1); setAnimating(false); }, 200);
              }
            }}
            disabled={previewIndex === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-white/60 disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => {
              if (previewIndex < questions.length - 1) {
                setDirection('down');
                setAnimating(true);
                setTimeout(() => { setPreviewIndex(i => i + 1); setAnimating(false); }, 200);
              }
            }}
            disabled={previewIndex === questions.length - 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-white/60 disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* "Preview" label */}
      <div className="absolute top-4 right-4 text-[10px] text-white/30 uppercase tracking-widest">Preview</div>
    </div>
  );
}
