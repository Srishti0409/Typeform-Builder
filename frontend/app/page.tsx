'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Plus, Search, ChevronDown, ChevronUp, Grid3X3, HelpCircle,
  List, LayoutGrid, MoreHorizontal, Calendar, Users, Zap,
  Mic, ArrowRight, X, Star, FileText, BarChart2, Settings,
  Copy, Trash2, Globe, Eye, CheckSquare, Briefcase
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FormListItem } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function FormAvatar({ title, index }: { title: string; index: number }) {
  const palettes = [
    { bg: '#c0562a', text: '#ffffff' },
    { bg: '#3c73a5', text: '#ffffff' },
    { bg: '#177767', text: '#ffffff' },
    { bg: '#7c3aed', text: '#ffffff' },
    { bg: '#b45309', text: '#ffffff' },
    { bg: '#be185d', text: '#ffffff' },
  ];
  const p = palettes[index % palettes.length];
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
      style={{ backgroundColor: p.bg, color: p.text }}
    >
      {title.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Create Form Modal ──────────────────────────────────────────────────────

function CreateFormModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string) => void }) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] p-6 animate-fadeIn">
        <h2 className="text-xl font-semibold text-[#3c323e] mb-1">Create a new form</h2>
        <p className="text-sm text-[#655d67] mb-5">Give your form a name to get started.</p>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && title.trim() && onCreate(title.trim())}
          placeholder="e.g. Customer Satisfaction Survey"
          className="w-full border border-[rgba(81,76,84,0.2)] rounded-lg px-3 py-2 text-sm text-[#3c323e] placeholder:text-[#c4c1c5] outline-none focus:border-[#655d67] focus:ring-2 focus:ring-[rgba(101,93,103,0.12)] transition-all mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onCreate(title.trim())}
            disabled={!title.trim()}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#3c323e] text-white disabled:opacity-40 hover:bg-[#2e2630] transition-colors"
          >
            Create form
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Context Menu ───────────────────────────────────────────────────────────

function FormContextMenu({
  form,
  onClose,
  onDelete,
  onDuplicate,
  onPublish,
}: {
  form: FormListItem;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPublish: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { icon: <Eye size={14} />, label: 'Preview', action: () => window.open(`/f/${form.slug}`, '_blank') },
    { icon: <FileText size={14} />, label: 'Edit', action: () => window.location.href = `/forms/${form.id}/edit` },
    { icon: <BarChart2 size={14} />, label: 'Results', action: () => window.location.href = `/forms/${form.id}/results` },
    { icon: <Settings size={14} />, label: 'Settings', action: () => window.location.href = `/forms/${form.id}/settings` },
    null,
    { icon: <Copy size={14} />, label: 'Duplicate', action: onDuplicate },
    {
      icon: <Globe size={14} />,
      label: form.status === 'published' ? 'Unpublish' : 'Publish',
      action: onPublish,
    },
    null,
    { icon: <Trash2 size={14} />, label: 'Delete', action: onDelete, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl shadow-xl border border-[rgba(81,76,84,0.1)] py-1 animate-fadeIn"
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} className="my-1 border-t border-[rgba(86,82,90,0.08)]" />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors ${
              item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-[#3c323e] hover:bg-[rgba(87,84,91,0.06)]'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

// ── Top Navbar ─────────────────────────────────────────────────────────────

function Navbar({ onCreateForm }: { onCreateForm: () => void }) {
  return (
    <header className="h-[56px] bg-white flex items-center justify-between px-0 flex-shrink-0 border-b border-[rgba(86,82,90,0.08)]">
      {/* Left: Logo + Workspace */}
      <div className="flex items-center pl-4">
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[rgba(87,84,91,0.06)] transition-colors">
          {/* Typeform-style double-bar logo */}
          <div className="flex items-center gap-[3px]">
            <div className="w-[5px] h-[20px] bg-[#3c323e] rounded-[2px]" />
            <div className="w-[5px] h-[20px] bg-[#3c323e] rounded-[2px]" />
          </div>
          <span className="text-sm font-medium text-[#3c323e] ml-1">ssrishtigkp</span>
          <ChevronDown size={14} className="text-[#655d67]" />
        </button>
      </div>

      {/* Right: Nav actions */}
      <div className="flex items-center gap-1 pr-4">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
          <Grid3X3 size={15} />
          Integrations
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
          <Briefcase size={15} />
          Brand kit
        </button>
        <button
          onClick={onCreateForm}
          className="flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-sm font-medium bg-[#177767] text-white hover:bg-[#126057] transition-colors ml-1"
        >
          View plans
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
          <HelpCircle size={16} />
        </button>
        {/* User avatar */}
        <button className="w-8 h-8 rounded-full bg-[#bdddf9] flex items-center justify-center text-xs font-semibold text-[#4c414e] hover:opacity-80 transition-opacity ml-1">
          SG
        </button>
      </div>
    </header>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ onCreateForm }: { onCreateForm: () => void }) {
  const [search, setSearch] = useState('');
  const [privateExpanded, setPrivateExpanded] = useState(true);
  const [aiQuery, setAiQuery] = useState('');

  return (
    <aside className="w-[220px] flex-shrink-0 bg-white flex flex-col h-full border-r border-[rgba(86,82,90,0.08)]">
      {/* Create form button */}
      <div className="px-2 pt-2">
        <button
          onClick={onCreateForm}
          className="w-full flex items-center gap-2 px-3 py-[7px] rounded-lg bg-[#3c323e] text-white text-sm font-medium hover:bg-[#2e2630] transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          Create form
        </button>
      </div>

      {/* Search */}
      <div className="px-2 pt-2">
        <div className="flex items-center gap-2 px-3 py-[6px] rounded-lg border border-[rgba(81,76,84,0.12)] bg-white hover:border-[rgba(81,76,84,0.22)] transition-colors">
          <Search size={13} className="text-[#847e85] flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="flex-1 text-sm text-[#3c323e] placeholder:text-[#847e85] min-w-0"
          />
        </div>
      </div>

      {/* Workspaces */}
      <div className="px-2 pt-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs font-medium text-[#847e85] uppercase tracking-wide">Workspaces</span>
          <button className="w-5 h-5 flex items-center justify-center rounded text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
            <Plus size={13} />
          </button>
        </div>

        {/* Private section */}
        <div>
          <button
            onClick={() => setPrivateExpanded(!privateExpanded)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-[#3c323e] hover:bg-[rgba(87,84,91,0.06)] transition-colors"
          >
            <span className="font-medium">Private</span>
            {privateExpanded ? <ChevronUp size={13} className="text-[#655d67]" /> : <ChevronDown size={13} className="text-[#655d67]" />}
          </button>

          {privateExpanded && (
            <div className="mt-0.5 ml-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-[#3c323e] bg-[rgba(87,84,91,0.06)] font-medium"
              >
                <FileText size={13} className="text-[#655d67]" />
                My workspace
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-2 pb-2 border-t border-[rgba(86,82,90,0.08)] pt-2">
        {/* Responses collected */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#655d67] font-medium">Responses collected</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            {/* Progress bar */}
            <div className="flex-1 h-[5px] bg-[#dedcde] rounded-full overflow-hidden">
              <div className="h-full bg-[#3c323e] rounded-full" style={{ width: '0%' }} />
            </div>
            <span className="text-xs text-[#655d67] whitespace-nowrap">0 / 10</span>
          </div>
          <button className="w-full text-xs text-[#655d67] border border-[rgba(81,76,84,0.15)] rounded-lg py-1.5 hover:bg-[rgba(87,84,91,0.04)] transition-colors">
            Increase response limit
          </button>
        </div>

        {/* Ask Typeform AI */}
        <div className="mt-1 border border-[#ddb7f0] rounded-xl shadow-sm overflow-hidden bg-white">
          <div className="grid px-2 py-2 gap-1" style={{ gridTemplateColumns: '28px 1fr 28px', gridTemplateRows: '28px' }}>
            {/* Mic icon */}
            <button className="flex items-center justify-center text-[#655d67] hover:text-[#3c323e] transition-colors">
              <Mic size={14} />
            </button>
            {/* Input */}
            <div className="flex items-center overflow-hidden">
              <span className="text-sm text-[#847e85] truncate">Ask Typeform AI</span>
            </div>
            {/* Send */}
            <button className="flex items-center justify-center rounded-md bg-[rgba(89,86,93,0.04)] border border-[rgba(86,82,90,0.08)] text-[#c4c1c5] cursor-not-allowed">
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Forms Table ────────────────────────────────────────────────────────────

function FormRow({
  form,
  index,
  onDelete,
  onDuplicate,
  onPublish,
}: {
  form: FormListItem;
  index: number;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPublish: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative group">
      <div className="flex items-center gap-7 px-2 py-2 rounded-xl hover:bg-[rgba(87,84,91,0.04)] transition-colors cursor-pointer"
        style={{ gridTemplateColumns: '1fr 76px 76px 90px 108px 32px' }}>

        {/* Form name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FormAvatar title={form.title} index={index} />
          <div className="min-w-0">
            <Link href={`/forms/${form.id}/edit`} className="block">
              <span className="text-sm font-medium text-[#3c323e] truncate block hover:text-[#177767] transition-colors">
                {form.title}
              </span>
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              {form.status === 'published' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#f4faf8] text-[#095145] border border-[#c0e4de]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#177767]" />
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[rgba(87,84,91,0.06)] text-[#655d67]">
                  Draft
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Responses */}
        <div className="w-[76px] flex items-center justify-center">
          <span className="text-sm text-[#847e85]">
            {form.response_count > 0 ? form.response_count : '–'}
          </span>
        </div>

        {/* Completed */}
        <div className="w-[76px] flex items-center justify-center">
          <span className="text-sm text-[#847e85]">–</span>
        </div>

        {/* Updated */}
        <div className="w-[90px] flex items-center">
          <span className="text-sm text-[#847e85]">{formatDate(form.updated_at)}</span>
        </div>

        {/* Integrations icon */}
        <div className="w-[108px] flex items-center">
          <button className="text-[#847e85] hover:text-[#655d67] transition-colors opacity-0 group-hover:opacity-100">
            <Grid3X3 size={16} />
          </button>
        </div>

        {/* More menu */}
        <div className="w-8 relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#847e85] hover:bg-[rgba(87,84,91,0.06)] hover:text-[#3c323e] transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <FormContextMenu
              form={form}
              onClose={() => setMenuOpen(false)}
              onDelete={() => onDelete(form.id)}
              onDuplicate={() => onDuplicate(form.id)}
              onPublish={() => onPublish(form.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [showBanner, setShowBanner] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  async function loadForms() {
    try {
      setLoading(true);
      const data = await api.forms.list();
      setForms(data);
    } catch {
      setError('Failed to load forms. Is the backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(title: string) {
    try {
      setCreating(true);
      const form = await api.forms.create(title);
      setShowCreateModal(false);
      window.location.href = `/forms/${form.id}/edit`;
    } catch {
      alert('Failed to create form');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this form? This cannot be undone.')) return;
    await api.forms.delete(id);
    setForms(f => f.filter(x => x.id !== id));
  }

  async function handleDuplicate(id: string) {
    const newForm = await api.forms.duplicate(id);
    await loadForms();
  }

  async function handlePublish(id: string) {
    const form = forms.find(f => f.id === id);
    if (!form) return;
    if (form.status === 'published') {
      await api.forms.unpublish(id);
    } else {
      await api.forms.publish(id);
    }
    await loadForms();
  }

  const sortedForms = [...forms].sort((a, b) => {
    if (sortBy === 'date') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f7f7f8]">
      <Navbar onCreateForm={() => setShowCreateModal(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateForm={() => setShowCreateModal(true)} />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="bg-white border-b border-[rgba(86,82,90,0.08)] px-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
              {[
                { label: 'Forms', icon: <FileText size={14} />, active: true },
                { label: 'Contacts', icon: <Users size={14} />, active: false },
                { label: 'Automations', icon: <Zap size={14} />, active: false },
                { label: 'Research Flow', icon: <BarChart2 size={14} />, active: false, badge: 'Demo' },
              ].map(tab => (
                <button
                  key={tab.label}
                  className={`flex items-center gap-1.5 px-3 py-[10px] text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    tab.active
                      ? 'text-[#3c323e] border-[#3c323e]'
                      : 'text-[#655d67] border-transparent hover:text-[#3c323e] hover:border-[rgba(86,82,90,0.2)]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium text-[#01487f] bg-[#f6fafd] border border-[#bdddf9] rounded-md">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-6">
            {/* Workspace header */}
            <div className="flex items-center justify-between pb-5 border-b-2 border-[rgba(86,82,90,0.08)] mb-0">
              <div className="flex items-center gap-2 text-[#3c323e]">
                <h1 className="text-2xl font-normal">My workspace</h1>
                <button className="p-1 rounded-lg text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
                  <MoreHorizontal size={16} />
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
                  <Users size={14} />
                  Invite
                </button>
                <button className="p-1 rounded-lg text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
                  <Star size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Sort dropdown */}
                <button
                  onClick={() => setSortBy(s => s === 'date' ? 'name' : 'date')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#655d67] border border-[rgba(81,76,84,0.15)] rounded-lg bg-[rgba(255,255,255,0.8)] hover:bg-white transition-colors"
                >
                  <Calendar size={13} />
                  {sortBy === 'date' ? 'Date created' : 'Name'}
                  <ChevronDown size={12} />
                </button>

                {/* View toggle */}
                <div className="flex rounded-lg border border-[rgba(81,76,84,0.15)] overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                      viewMode === 'list'
                        ? 'bg-[rgba(87,84,91,0.06)] text-[#4c414e] font-medium'
                        : 'text-[#655d67] bg-[rgba(255,255,255,0.8)] hover:bg-[rgba(87,84,91,0.04)]'
                    }`}
                  >
                    <List size={14} />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-l border-[rgba(81,76,84,0.15)] transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-[rgba(87,84,91,0.06)] text-[#4c414e] font-medium'
                        : 'text-[#655d67] bg-[rgba(255,255,255,0.8)] hover:bg-[rgba(87,84,91,0.04)]'
                    }`}
                  >
                    <LayoutGrid size={14} />
                    Grid
                  </button>
                </div>
              </div>
            </div>

            {/* AI Banner */}
            {showBanner && (
              <div className="flex items-center gap-3 mt-4 mb-2 px-4 py-3 bg-white border border-[#ddb7f0]/60 rounded-xl shadow-sm animate-fadeIn">
                <div className="w-8 h-8 rounded-lg bg-[#f5eafd] flex items-center justify-center flex-shrink-0">
                  <Star size={15} className="text-[#9333ea]" />
                </div>
                <p className="flex-1 text-sm text-[#655d67]">
                  Create a <span className="font-medium text-[#3c323e]">Gather expert opinions</span> on recent studies to support comprehensive literature reviews.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1.5 text-sm font-medium text-[#655d67] border border-[rgba(81,76,84,0.15)] rounded-lg bg-[rgba(255,255,255,0.8)] hover:bg-white hover:shadow-sm transition-all whitespace-nowrap"
                >
                  Use this form
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="text-[#847e85] hover:text-[#3c323e] transition-colors flex-shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Forms list */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 border-2 border-[#3c323e] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#655d67]">Loading forms…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <X size={20} className="text-red-500" />
                </div>
                <p className="text-sm text-[#655d67] text-center max-w-xs">{error}</p>
                <button onClick={loadForms} className="px-4 py-2 text-sm font-medium bg-[#3c323e] text-white rounded-lg hover:bg-[#2e2630] transition-colors">
                  Retry
                </button>
              </div>
            ) : viewMode === 'list' ? (
              <div className="mt-5">
                {/* Table header */}
                <div
                  className="flex items-center gap-7 px-2 pb-2 text-sm text-[#655d67]"
                >
                  <div className="flex-1" />
                  <div className="w-[76px] text-center">Responses</div>
                  <div className="w-[76px] text-center">Completed</div>
                  <div className="w-[90px]">Updated</div>
                  <div className="w-[108px]">Integrations</div>
                  <div className="w-8" />
                </div>

                {/* Rows */}
                {sortedForms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[rgba(87,84,91,0.06)] flex items-center justify-center">
                      <FileText size={24} className="text-[#847e85]" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-medium text-[#3c323e]">No forms yet</p>
                      <p className="text-sm text-[#655d67] mt-1">Create your first form to get started</p>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3c323e] text-white text-sm font-medium hover:bg-[#2e2630] transition-colors"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      Create form
                    </button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {sortedForms.map((form, i) => (
                      <FormRow
                        key={form.id}
                        form={form}
                        index={i}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                        onPublish={handlePublish}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Grid view */
              <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {/* Create new card */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="h-[140px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(81,76,84,0.2)] text-[#655d67] hover:border-[#655d67] hover:bg-white hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[rgba(87,84,91,0.06)] flex items-center justify-center group-hover:bg-[rgba(87,84,91,0.1)] transition-colors">
                    <Plus size={16} />
                  </div>
                  <span className="text-sm font-medium">New form</span>
                </button>

                {sortedForms.map((form, i) => (
                  <Link key={form.id} href={`/forms/${form.id}/edit`}>
                    <div className="h-[140px] bg-white rounded-xl border border-[rgba(81,76,84,0.1)] p-4 flex flex-col justify-between hover:shadow-md hover:border-[rgba(81,76,84,0.2)] transition-all cursor-pointer group">
                      <div className="flex items-start justify-between">
                        <FormAvatar title={form.title} index={i} />
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                          form.status === 'published'
                            ? 'bg-[#f4faf8] text-[#095145] border border-[#c0e4de]'
                            : 'bg-[rgba(87,84,91,0.06)] text-[#655d67]'
                        }`}>
                          {form.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#3c323e] truncate">{form.title}</p>
                        <p className="text-xs text-[#847e85] mt-0.5">
                          {form.response_count} response{form.response_count !== 1 ? 's' : ''} · {formatDate(form.updated_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Form Modal */}
      {showCreateModal && (
        <CreateFormModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
