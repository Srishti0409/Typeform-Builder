'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  HelpCircle, ChevronDown, Eye, Settings, BarChart2,
  Plus, GripVertical, Trash2, Copy, ChevronUp,
  Type, AlignLeft, CheckSquare, List, Mail, Hash,
  ToggleLeft, Star, X, Check, FileText, Save, Globe
} from 'lucide-react';
import type { Form, Question, QuestionType } from '@/lib/types';
import { api } from '@/lib/api';
import PreviewPane from './PreviewPane';

// ── Question type metadata ────────────────────────────────────────────────

export const QUESTION_TYPES: { type: QuestionType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'short_text',     label: 'Short text',      icon: <Type size={14} />,        description: 'Single-line text answer' },
  { type: 'long_text',      label: 'Long text',       icon: <AlignLeft size={14} />,   description: 'Multi-line text answer' },
  { type: 'multiple_choice',label: 'Multiple choice', icon: <CheckSquare size={14} />, description: 'Select one or more options' },
  { type: 'dropdown',       label: 'Dropdown',        icon: <List size={14} />,        description: 'Choose from a list' },
  { type: 'email',          label: 'Email',           icon: <Mail size={14} />,        description: 'Valid email address' },
  { type: 'number',         label: 'Number',          icon: <Hash size={14} />,        description: 'Numeric value' },
  { type: 'yes_no',         label: 'Yes / No',        icon: <ToggleLeft size={14} />,  description: 'Binary choice' },
  { type: 'rating',         label: 'Rating',          icon: <Star size={14} />,        description: 'Star rating scale' },
];

export function getTypeInfo(type: QuestionType) {
  return QUESTION_TYPES.find(t => t.type === type) ?? QUESTION_TYPES[0];
}

// ── Type Picker Dropdown ──────────────────────────────────────────────────

function TypePickerDropdown({
  current,
  onSelect,
  onClose,
}: {
  current: QuestionType;
  onSelect: (t: QuestionType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-[rgba(81,76,84,0.1)] py-1 w-[220px] animate-fadeIn">
      {QUESTION_TYPES.map(({ type, label, icon, description }) => (
        <button
          key={type}
          onClick={() => { onSelect(type); onClose(); }}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
            type === current ? 'bg-[rgba(87,84,91,0.06)] text-[#3c323e]' : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.04)]'
          }`}
        >
          <span className="text-[#655d67] flex-shrink-0">{icon}</span>
          <div>
            <div className="font-medium text-xs">{label}</div>
            <div className="text-[10px] text-[#847e85]">{description}</div>
          </div>
          {type === current && <Check size={12} className="ml-auto text-[#177767]" />}
        </button>
      ))}
    </div>
  );
}

// ── Question Editor Panel (center) ────────────────────────────────────────

function QuestionEditor({
  question,
  index,
  onUpdate,
  onDelete,
}: {
  question: Question;
  index: number;
  onUpdate: (q: Partial<Question>) => void;
  onDelete: () => void;
}) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDescription, setShowDescription] = useState(!!question.description);
  const [localOptions, setLocalOptions] = useState<string[]>(question.options ?? ['']);
  const typeInfo = getTypeInfo(question.question_type);

  const needsOptions = question.question_type === 'multiple_choice' || question.question_type === 'dropdown';

  function updateOption(i: number, val: string) {
    const next = [...localOptions];
    next[i] = val;
    setLocalOptions(next);
    onUpdate({ options: next });
  }

  function addOption() {
    const next = [...localOptions, ''];
    setLocalOptions(next);
    onUpdate({ options: next });
  }

  function removeOption(i: number) {
    const next = localOptions.filter((_, idx) => idx !== i);
    setLocalOptions(next);
    onUpdate({ options: next });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Question number + type picker */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-[#847e85] w-5">{index + 1}</span>
        <div className="relative">
          <button
            onClick={() => setShowTypePicker(!showTypePicker)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(87,84,91,0.06)] text-[#3c323e] text-xs font-medium hover:bg-[rgba(87,84,91,0.1)] transition-colors"
          >
            {typeInfo.icon}
            {typeInfo.label}
            <ChevronDown size={12} className="text-[#655d67]" />
          </button>
          {showTypePicker && (
            <TypePickerDropdown
              current={question.question_type}
              onSelect={type => onUpdate({ question_type: type, options: type === 'multiple_choice' || type === 'dropdown' ? (question.options ?? ['Option 1', 'Option 2']) : undefined })}
              onClose={() => setShowTypePicker(false)}
            />
          )}
        </div>
        <button
          onClick={onDelete}
          className="ml-auto p-1.5 rounded-lg text-[#847e85] hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Delete question"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Title */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#655d67] mb-1.5">Question</label>
        <textarea
          value={question.title}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="Write your question here..."
          className="w-full px-3 py-2.5 text-sm text-[#3c323e] border border-[rgba(81,76,84,0.18)] rounded-lg resize-none outline-none focus:border-[#655d67] focus:ring-2 focus:ring-[rgba(101,93,103,0.1)] transition-all placeholder:text-[#c4c1c5] min-h-[80px]"
          rows={3}
        />
      </div>

      {/* Description */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-[#655d67]">Description / Help text</label>
          <button
            onClick={() => {
              setShowDescription(!showDescription);
              if (showDescription) onUpdate({ description: undefined });
            }}
            className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
              showDescription ? 'bg-[rgba(87,84,91,0.06)] text-[#3c323e]' : 'text-[#847e85] hover:text-[#655d67]'
            }`}
          >
            {showDescription ? 'Remove' : '+ Add'}
          </button>
        </div>
        {showDescription && (
          <textarea
            value={question.description ?? ''}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Add a description or help text..."
            className="w-full px-3 py-2 text-sm text-[#3c323e] border border-[rgba(81,76,84,0.18)] rounded-lg resize-none outline-none focus:border-[#655d67] focus:ring-2 focus:ring-[rgba(101,93,103,0.1)] transition-all placeholder:text-[#c4c1c5]"
            rows={2}
          />
        )}
      </div>

      {/* Options (multiple choice / dropdown) */}
      {needsOptions && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-[#655d67] mb-2">Choices</label>
          <div className="space-y-1.5">
            {localOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-[#c4c1c5] w-4 text-right">{String.fromCharCode(65 + i)}</span>
                <input
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 px-3 py-1.5 text-sm text-[#3c323e] border border-[rgba(81,76,84,0.18)] rounded-lg outline-none focus:border-[#655d67] transition-colors placeholder:text-[#c4c1c5]"
                />
                {localOptions.length > 1 && (
                  <button onClick={() => removeOption(i)} className="text-[#c4c1c5] hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOption}
              className="flex items-center gap-1.5 text-xs text-[#655d67] hover:text-[#3c323e] transition-colors mt-1"
            >
              <Plus size={12} />
              Add choice
            </button>
          </div>
        </div>
      )}

      {/* Rating max */}
      {question.question_type === 'rating' && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-[#655d67] mb-1.5">Max rating</label>
          <select
            value={(question.settings as any)?.max_rating ?? 5}
            onChange={e => onUpdate({ settings: { ...question.settings, max_rating: Number(e.target.value) } })}
            className="px-3 py-1.5 text-sm text-[#3c323e] border border-[rgba(81,76,84,0.18)] rounded-lg outline-none focus:border-[#655d67] appearance-none bg-white transition-colors cursor-pointer"
          >
            {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} stars</option>)}
          </select>
        </div>
      )}

      {/* Number min/max */}
      {question.question_type === 'number' && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#655d67] mb-1.5">Min value</label>
            <input
              type="number"
              value={(question.settings as any)?.min ?? ''}
              onChange={e => onUpdate({ settings: { ...question.settings, min: e.target.value ? Number(e.target.value) : undefined } })}
              placeholder="No min"
              className="w-full px-3 py-1.5 text-sm text-[#3c323e] border border-[rgba(81,76,84,0.18)] rounded-lg outline-none focus:border-[#655d67] transition-colors placeholder:text-[#c4c1c5]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#655d67] mb-1.5">Max value</label>
            <input
              type="number"
              value={(question.settings as any)?.max ?? ''}
              onChange={e => onUpdate({ settings: { ...question.settings, max: e.target.value ? Number(e.target.value) : undefined } })}
              placeholder="No max"
              className="w-full px-3 py-1.5 text-sm text-[#3c323e] border border-[rgba(81,76,84,0.18)] rounded-lg outline-none focus:border-[#655d67] transition-colors placeholder:text-[#c4c1c5]"
            />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-[rgba(86,82,90,0.08)] pt-4 mt-1">
        <h3 className="text-xs font-semibold text-[#655d67] uppercase tracking-wide mb-3">Settings</h3>

        {/* Required toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#3c323e]">Required</div>
            <div className="text-xs text-[#847e85]">Respondents must answer this question</div>
          </div>
          <button
            onClick={() => onUpdate({ is_required: !question.is_required })}
            className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${
              question.is_required ? 'bg-[#177767]' : 'bg-[#dedcde]'
            }`}
            style={{ width: 40, height: 22 }}
          >
            <span
              className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                question.is_required ? 'translate-x-[20px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>

        {/* Placeholder for short/long text */}
        {(question.question_type === 'short_text' || question.question_type === 'long_text' || question.question_type === 'email') && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-[#655d67] mb-1.5">Placeholder text</label>
            <input
              value={question.placeholder ?? ''}
              onChange={e => onUpdate({ placeholder: e.target.value })}
              placeholder="e.g. Type your answer here..."
              className="w-full px-3 py-1.5 text-sm text-[#3c323e] border border-[rgba(81,76,84,0.18)] rounded-lg outline-none focus:border-[#655d67] transition-colors placeholder:text-[#c4c1c5]"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Question List (left sidebar) ──────────────────────────────────────────

function QuestionList({
  questions,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
}: {
  questions: Question[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: QuestionType) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDragStart(i: number) { setDragIndex(i); }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setOverIndex(i);
  }
  function handleDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    const next = [...questions];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    onReorder(next.map(q => q.id));
    setDragIndex(null);
    setOverIndex(null);
  }
  function handleDragEnd() { setDragIndex(null); setOverIndex(null); }

  return (
    <div className="w-[240px] flex-shrink-0 bg-white border-r border-[rgba(86,82,90,0.08)] flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-[rgba(86,82,90,0.06)]">
        <span className="text-xs font-semibold text-[#847e85] uppercase tracking-wide">Questions ({questions.length})</span>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {questions.map((q, i) => {
          const info = getTypeInfo(q.question_type);
          const isActive = q.id === activeId;
          const isDragging = dragIndex === i;
          const isOver = overIndex === i;

          return (
            <div
              key={q.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={e => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(q.id)}
              className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all ${
                isActive
                  ? 'bg-[rgba(87,84,91,0.08)] border border-[rgba(86,82,90,0.12)]'
                  : 'hover:bg-[rgba(87,84,91,0.04)] border border-transparent'
              } ${isDragging ? 'opacity-40' : ''} ${isOver ? 'border-t-2 border-t-[#177767]' : ''}`}
            >
              {/* Drag handle */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c4c1c5] cursor-grab active:cursor-grabbing flex-shrink-0">
                <GripVertical size={13} />
              </div>
              {/* Number */}
              <span className="text-xs text-[#847e85] w-4 text-center flex-shrink-0">{i + 1}</span>
              {/* Icon */}
              <span className="text-[#655d67] flex-shrink-0">{info.icon}</span>
              {/* Title */}
              <span className="flex-1 text-xs text-[#3c323e] truncate min-w-0">
                {q.title || <span className="text-[#c4c1c5] italic">Untitled</span>}
              </span>
              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); onDelete(q.id); }}
                className="opacity-0 group-hover:opacity-100 text-[#c4c1c5] hover:text-red-400 transition-all flex-shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}

        {questions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText size={20} className="text-[#c4c1c5] mb-2" />
            <p className="text-xs text-[#847e85]">No questions yet</p>
            <p className="text-[10px] text-[#c4c1c5]">Click + to add one</p>
          </div>
        )}
      </div>

      {/* Add question button */}
      <div className="p-2 border-t border-[rgba(86,82,90,0.08)] relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(87,84,91,0.06)] text-[#655d67] text-xs font-medium hover:bg-[rgba(87,84,91,0.1)] transition-colors"
        >
          <Plus size={13} />
          Add question
        </button>

        {showAddMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-white rounded-xl shadow-xl border border-[rgba(81,76,84,0.1)] py-1 z-50 animate-fadeIn max-h-[300px] overflow-y-auto">
            {QUESTION_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => { onAdd(type); setShowAddMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-[#3c323e] text-left hover:bg-[rgba(87,84,91,0.04)] transition-colors"
              >
                <span className="text-[#655d67]">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main FormBuilder ──────────────────────────────────────────────────────

export default function FormBuilder({
  form: initialForm,
  onFormUpdate,
}: {
  form: Form;
  onFormUpdate: (f: Form) => void;
}) {
  const [form, setForm] = useState<Form>(initialForm);
  const [questions, setQuestions] = useState<Question[]>(initialForm.questions);
  const [activeId, setActiveId] = useState<string | null>(initialForm.questions[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(initialForm.title);
  const [activeTab, setActiveTab] = useState<'build' | 'settings'>('build');
  const [showPreview, setShowPreview] = useState(true);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const activeQuestion = questions.find(q => q.id === activeId) ?? null;
  const activeIndex = questions.findIndex(q => q.id === activeId);

  // Auto-save with debounce
  const scheduleAutoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(), 1500);
  }, []);

  async function doSave() {
    setSaving(true);
    try {
      await api.forms.update(form.id, { title: titleValue });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  }

  async function handleTitleSave() {
    setEditingTitle(false);
    if (titleValue !== form.title) {
      await api.forms.update(form.id, { title: titleValue });
      setForm(f => ({ ...f, title: titleValue }));
    }
  }

  async function handleAddQuestion(type: QuestionType) {
    const defaults: Partial<Question> = {
      question_type: type,
      title: '',
      is_required: false,
      order_index: questions.length,
    };
    if (type === 'multiple_choice' || type === 'dropdown') {
      defaults.options = ['Option 1', 'Option 2', 'Option 3'];
    }
    if (type === 'rating') {
      defaults.settings = { max_rating: 5, shape: 'star' };
    }

    const newQ = await api.questions.add(form.id, defaults);
    setQuestions(prev => [...prev, newQ]);
    setActiveId(newQ.id);
  }

  async function handleUpdateQuestion(id: string, patch: Partial<Question>) {
    // Optimistic update
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
    scheduleAutoSave();

    // Persist to backend
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.questions.update(form.id, id, patch);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {}
    }, 800);
  }

  async function handleDeleteQuestion(id: string) {
    await api.questions.delete(form.id, id);
    setQuestions(prev => {
      const next = prev.filter(q => q.id !== id);
      // Select adjacent question
      if (activeId === id) {
        const wasIdx = prev.findIndex(q => q.id === id);
        setActiveId(next[Math.max(0, wasIdx - 1)]?.id ?? null);
      }
      return next;
    });
  }

  async function handleReorder(ids: string[]) {
    // Optimistic reorder
    const reordered = ids.map(id => questions.find(q => q.id === id)!).filter(Boolean);
    setQuestions(reordered);
    await api.forms.reorderQuestions(form.id, ids);
  }

  async function handlePublish() {
    if (form.status === 'published') {
      await api.forms.unpublish(form.id);
      setForm(f => ({ ...f, status: 'draft' }));
    } else {
      const res = await api.forms.publish(form.id);
      setForm(f => ({ ...f, status: 'published' }));
      await navigator.clipboard.writeText(res.share_url).catch(() => {});
      alert(`Published! Share link copied:\n${res.share_url}`);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#f7f7f8] overflow-hidden">
      {/* Builder top bar */}
      <header className="h-[48px] bg-white border-b border-[rgba(86,82,90,0.08)] flex items-center justify-between px-3 flex-shrink-0">
        {/* Left: breadcrumb + title */}
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <Link href="/" className="flex items-center gap-1 text-[#655d67] hover:text-[#3c323e] transition-colors flex-shrink-0">
            <FileText size={13} />
            Forms
          </Link>
          <span className="text-[#c4c1c5] flex-shrink-0">›</span>
          {editingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
              className="text-sm font-medium text-[#3c323e] outline-none border-b border-[#655d67] bg-transparent min-w-0 max-w-[200px]"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm font-medium text-[#3c323e] hover:text-[#655d67] truncate max-w-[200px] transition-colors"
            >
              {titleValue}
            </button>
          )}
        </div>

        {/* Center: tabs */}
        <div className="flex items-center gap-0.5 bg-[rgba(87,84,91,0.06)] rounded-lg p-0.5">
          {[
            { key: 'build', label: 'Build', icon: <FileText size={12} /> },
            { key: 'settings', label: 'Settings', icon: <Settings size={12} /> },
            { key: 'results', label: 'Results', icon: <BarChart2 size={12} /> },
          ].map(tab => (
            <Link
              key={tab.key}
              href={tab.key === 'results' ? `/forms/${form.id}/results` : tab.key === 'settings' ? `/forms/${form.id}/settings` : '#'}
              onClick={tab.key === 'build' ? e => { e.preventDefault(); setActiveTab('build'); } : undefined}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                (activeTab === tab.key && tab.key === 'build')
                  ? 'bg-white text-[#3c323e] shadow-sm'
                  : 'text-[#655d67] hover:text-[#3c323e]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Save status */}
          <span className="text-xs text-[#847e85]">
            {saving ? 'Saving…' : saved ? 'Saved ✓' : ''}
          </span>

          {/* Preview toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showPreview ? 'bg-[rgba(87,84,91,0.06)] text-[#3c323e]' : 'text-[#655d67] hover:bg-[rgba(87,84,91,0.06)]'
            }`}
          >
            <Eye size={13} />
            Preview
          </button>

          {/* Publish button */}
          <button
            onClick={handlePublish}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              form.status === 'published'
                ? 'bg-[#f4faf8] text-[#095145] border border-[#c0e4de] hover:bg-[#e8f5f2]'
                : 'bg-[#177767] text-white hover:bg-[#126057]'
            }`}
          >
            <Globe size={13} />
            {form.status === 'published' ? 'Published' : 'Publish'}
          </button>

          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
            <HelpCircle size={15} />
          </button>
          <button className="w-7 h-7 rounded-full bg-[#bdddf9] flex items-center justify-center text-[10px] font-semibold text-[#4c414e]">
            SG
          </button>
        </div>
      </header>

      {/* Builder body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: question list */}
        <QuestionList
          questions={questions}
          activeId={activeId}
          onSelect={setActiveId}
          onAdd={handleAddQuestion}
          onDelete={handleDeleteQuestion}
          onReorder={handleReorder}
        />

        {/* Center: editor */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f7f7f8]">
          {activeQuestion ? (
            <div className="flex-1 overflow-y-auto p-6 max-w-[640px] mx-auto w-full">
              <div className="bg-white rounded-xl border border-[rgba(81,76,84,0.1)] p-6 shadow-sm">
                <QuestionEditor
                  key={activeQuestion.id}
                  question={activeQuestion}
                  index={activeIndex}
                  onUpdate={patch => handleUpdateQuestion(activeQuestion.id, patch)}
                  onDelete={() => handleDeleteQuestion(activeQuestion.id)}
                />
              </div>

              {/* Navigation between questions */}
              <div className="flex items-center justify-between mt-4 px-1">
                <button
                  onClick={() => {
                    const i = questions.findIndex(q => q.id === activeId);
                    if (i > 0) setActiveId(questions[i - 1].id);
                  }}
                  disabled={activeIndex === 0}
                  className="flex items-center gap-1 text-xs text-[#655d67] disabled:text-[#c4c1c5] hover:text-[#3c323e] transition-colors disabled:cursor-not-allowed"
                >
                  <ChevronUp size={13} />
                  Previous
                </button>
                <span className="text-xs text-[#847e85]">{activeIndex + 1} / {questions.length}</span>
                <button
                  onClick={() => {
                    const i = questions.findIndex(q => q.id === activeId);
                    if (i < questions.length - 1) setActiveId(questions[i + 1].id);
                  }}
                  disabled={activeIndex === questions.length - 1}
                  className="flex items-center gap-1 text-xs text-[#655d67] disabled:text-[#c4c1c5] hover:text-[#3c323e] transition-colors disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[rgba(81,76,84,0.1)] flex items-center justify-center shadow-sm">
                <FileText size={22} className="text-[#847e85]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#3c323e]">No question selected</p>
                <p className="text-xs text-[#847e85] mt-1">Add a question to get started</p>
              </div>
              <button
                onClick={() => handleAddQuestion('short_text')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3c323e] text-white text-sm font-medium hover:bg-[#2e2630] transition-colors"
              >
                <Plus size={14} />
                Add first question
              </button>
            </div>
          )}
        </div>

        {/* Right: live preview */}
        {showPreview && (
          <div className="w-[360px] flex-shrink-0 border-l border-[rgba(86,82,90,0.08)] bg-white">
            <div className="h-full flex flex-col">
              <div className="px-4 py-2.5 border-b border-[rgba(86,82,90,0.06)] flex items-center gap-2">
                <Eye size={13} className="text-[#655d67]" />
                <span className="text-xs font-semibold text-[#655d67] uppercase tracking-wide">Live Preview</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <PreviewPane
                  questions={questions}
                  activeIndex={activeIndex}
                  formTitle={form.title}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
