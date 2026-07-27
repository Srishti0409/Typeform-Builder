'use client';

import { useRef, useState } from 'react';
import { Eye, Globe, X } from 'lucide-react';
import type { Form, Question, QuestionType } from '@/lib/types';
import { api } from '@/lib/api';
import { QUESTION_TYPES, getTypeInfo } from '@/lib/question-types';
import { planFormFromGoal } from '@/lib/form-planner';
import { buildThemeVars } from '@/lib/theme';
import BuilderTopBar from './BuilderTopBar';
import BuilderToolbar from './BuilderToolbar';
import { useToast } from '@/components/shared/Toast';
import BuilderLeftPanel from './BuilderLeftPanel';
import BuilderRightPanel from './BuilderRightPanel';
import CanvasEditor from './CanvasEditor';
import EndingEditor from './EndingEditor';
import ChatToCreate from './ChatToCreate';
import ElementPicker from './ElementPicker';
import PreviewOverlay from './PreviewOverlay';

// Question type metadata is shared with the preview pane and results summary.
export { QUESTION_TYPES, getTypeInfo };

/**
 * The form builder.
 *
 * Four regions, as Typeform lays them out: the content rail on the left, the
 * WYSIWYG canvas in the middle, the selected question's inspector on the right,
 * and the "chat to create" composer along the bottom.
 *
 * The canvas doubles as the live preview — it renders from the same `--tf-*`
 * theme tokens as the public form, so there is no second representation of a
 * question to keep in sync.
 */

/** Canvas sizing. The respondent tokens are tuned for a full viewport. */
const CANVAS_TOKENS = {
  '--tf-block-width': '620px',
  '--tf-title-size': '30px',
  '--tf-title-line': '38px',
  '--tf-label-size': '17px',
  '--tf-input-size': '22px',
  '--tf-input-height': '44px',
  '--tf-ok-height': '40px',
  '--tf-ok-size': '15px',
  '--tf-choice-height': '40px',
  '--tf-choice-size': '15px',
  '--tf-choice-key': '20px',
  '--tf-badge-gutter': '30px',
  /* How far the answer body sits in from the headline's number badge. */
  '--tf-answer-indent': '32px',
  /* Text inputs stop short of the full column, as Typeform's do. */
  '--tf-choice-width': '420px',
  /* Choice rows are narrower still — the compact block Typeform authors in. */
  '--tf-choice-row-width': '240px',
} as React.CSSProperties;

export default function FormBuilder({
  form: initialForm,
  onFormUpdate,
  openPickerOnMount = false,
}: {
  form: Form;
  onFormUpdate: (f: Form) => void;
  /**
   * Opens the element picker on the builder's first paint. Used by the
   * "Start from scratch" path, where the next step is always to add an element.
   */
  openPickerOnMount?: boolean;
}) {
  const [form, setForm] = useState<Form>(initialForm);
  const [questions, setQuestions] = useState<Question[]>(initialForm.questions);
  const [activeId, setActiveId] = useState<string | null>(initialForm.questions[0]?.id ?? null);
  /** Whether the canvas is editing a question or the form's ending. */
  const [selection, setSelection] = useState<'question' | 'ending'>('question');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { showToast, toastNode } = useToast();
  /** Non-null while the share panel is open. */
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  // Initial state rather than an effect, so the picker is already up on the first
  // paint instead of flashing an empty builder behind it.
  const [pickerOpen, setPickerOpen] = useState(openPickerOnMount);
  const [chatBusy, setChatBusy] = useState(false);
  /** Canvas width preview, driven by the toolbar's device toggle. */
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewOpen, setPreviewOpen] = useState(false);
  /** Questions whose description field has been revealed by hand. */
  const [descOpen, setDescOpen] = useState<Set<string>>(new Set());
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const titleTimer = useRef<NodeJS.Timeout | null>(null);
  /** Question edits waiting on the debounce, merged per question id. */
  const pendingPatches = useRef<Map<string, Partial<Question>>>(new Map());

  const activeQuestion = questions.find(q => q.id === activeId) ?? null;
  const activeIndex = questions.findIndex(q => q.id === activeId);
  const themeVars = buildThemeVars(form.theme_config);

  function markSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function selectQuestion(id: string) {
    setActiveId(id);
    setSelection('question');
  }

  /**
   * Title edits apply locally at once (so the field stays responsive) and persist
   * on a short debounce, matching how question edits are saved.
   */
  function handleTitleChange(title: string) {
    setForm(f => ({ ...f, title }));
    if (titleTimer.current) clearTimeout(titleTimer.current);
    // Clearing the field to retype is not a request to make the form nameless,
    // and the API refuses a blank name — so hold the last saved one until there
    // is something to save.
    if (!title.trim()) return;
    titleTimer.current = setTimeout(() => {
      setSaving(true);
      api.forms
        .update(form.id, { title })
        .then(updated => { markSaved(); onFormUpdate(updated); })
        .catch(() => showToast('Could not save the title.'))
        .finally(() => setSaving(false));
    }, 700);
  }

  /** Defaults that make a freshly added question answerable straight away. */
  function defaultsFor(type: QuestionType): Partial<Question> {
    const defaults: Partial<Question> = { question_type: type, title: '', is_required: false };
    if (type === 'multiple_choice') {
      // One empty choice, as Typeform starts: the list grows through "Add
      // choice", not from placeholder options the author has to clear out.
      defaults.options = [''];
    }
    // A dropdown deliberately gets none: Typeform opens it empty, reading
    // "0 options in list" until the author uses "Add choices".
    if (type === 'rating') {
      defaults.settings = { max_rating: 5, shape: 'star' };
    }
    return defaults;
  }

  async function handleAddQuestion(type: QuestionType) {
    // order_index is left to the server, which appends — deriving it from local
    // state would collide if two picks land before the first response returns.
    try {
      const newQ = await api.questions.add(form.id, defaultsFor(type));
      setQuestions(prev => [...prev, newQ]);
      selectQuestion(newQ.id);
    } catch {
      showToast(`Could not add a ${getTypeInfo(type).label} question.`);
    }
  }

  /**
   * "Import questions": one pasted line becomes one question.
   *
   * A pasted line says nothing about how it should be answered, so each lands as
   * Short Text for the author to change from.
   *
   * Added one at a time on purpose — the server appends by counting what is
   * already there, so firing them together would land several at the same index.
   * Whatever arrived before a failure is already saved, so those are kept rather
   * than leaving the canvas out of step with the server.
   */
  async function handleImportQuestions(titles: string[]) {
    const added: Question[] = [];
    try {
      for (const title of titles) {
        added.push(await api.questions.add(form.id, { question_type: 'short_text', title }));
      }
      showToast(`Imported ${added.length} question${added.length === 1 ? '' : 's'}`);
    } catch {
      showToast(
        added.length
          ? `Imported ${added.length} of ${titles.length} — the rest didn’t save.`
          : 'Could not import those questions.'
      );
    } finally {
      if (added.length) {
        setQuestions(prev => [...prev, ...added]);
        selectQuestion(added[0].id);
      }
    }
  }

  /**
   * "Create with AI": the server plans the questions from the description and
   * saves them, so this only has to show what came back.
   *
   * Errors are re-thrown for the dialog to display — an unconfigured key or a
   * provider failure needs explaining next to the description, not in a toast
   * that disappears.
   */
  async function handleGenerateQuestions(prompt: string) {
    const added = await api.forms.generateQuestions(form.id, prompt);
    setQuestions(prev => [...prev, ...added]);
    if (added[0]) selectQuestion(added[0].id);
    showToast(`Added ${added.length} question${added.length === 1 ? '' : 's'}`);
  }

  async function handleUpdateQuestion(id: string, patch: Partial<Question>) {
    // Show the change straight away, then persist on a debounce so typing on the
    // canvas doesn't fire a request per keystroke.
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)));
    setSaving(true);

    // Edits accumulate per question while the debounce runs. Without this, a
    // second edit inside the window (flipping two switches, say) would replace
    // the first one's patch and the first change would never reach the server.
    pendingPatches.current.set(id, { ...pendingPatches.current.get(id), ...patch });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const batch = [...pendingPatches.current.entries()];
      pendingPatches.current.clear();
      try {
        await Promise.all(batch.map(([qid, p]) => api.questions.update(form.id, qid, p)));
        markSaved();
      } catch {
        // Leave the optimistic edits in place; the next save will retry them.
      } finally {
        setSaving(false);
      }
    }, 700);
  }

  /** Ending copy lives on the form, so it saves through the form endpoint. */
  function handleEndingChange(patch: { thank_you_title?: string; thank_you_message?: string }) {
    setForm(f => ({ ...f, ...patch }));
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      setSaving(true);
      api.forms
        .update(form.id, patch)
        .then(updated => { markSaved(); onFormUpdate(updated); })
        .catch(() => showToast('Could not save the ending.'))
        .finally(() => setSaving(false));
    }, 700);
  }

  async function handleDeleteQuestion(id: string) {
    try {
      await api.questions.delete(form.id, id);
    } catch {
      showToast('Could not delete that question.');
      return;
    }
    setQuestions(prev => {
      const next = prev.filter(q => q.id !== id);
      if (activeId === id) {
        const wasIdx = prev.findIndex(q => q.id === id);
        setActiveId(next[Math.max(0, wasIdx - 1)]?.id ?? null);
      }
      return next;
    });
  }

  /**
   * Copies a question and puts the copy directly beneath its original.
   *
   * There is no duplicate endpoint, so this is an add followed by a reorder — the
   * API appends, and the copy belongs next to what it was copied from. The
   * payload is read from local state, so edits still inside the save debounce are
   * carried into the copy rather than lost.
   */
  async function handleDuplicateQuestion(id: string) {
    const source = questions.find(q => q.id === id);
    if (!source) return;
    setSaving(true);
    try {
      const copy = await api.questions.add(form.id, {
        question_type: source.question_type,
        title: source.title,
        description: source.description,
        is_required: source.is_required,
        placeholder: source.placeholder,
        options: source.options,
        settings: source.settings,
      });
      const ids = questions.map(q => q.id);
      ids.splice(questions.findIndex(q => q.id === id) + 1, 0, copy.id);
      // Renumber for the same reason a drag does: the preview and public form
      // order by `order_index`, so the copy would otherwise show up last there.
      setQuestions(
        ids.map((qid, i) => ({
          ...(qid === copy.id ? copy : questions.find(q => q.id === qid)!),
          order_index: i,
        }))
      );
      selectQuestion(copy.id);
      await api.forms.reorderQuestions(form.id, ids);
      markSaved();
    } catch {
      showToast('Could not duplicate that question.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReorder(ids: string[]) {
    // Renumber as we go. The rail and canvas read array order, but the preview and
    // the public form both order by `order_index` — leaving the old numbers on the
    // moved questions showed the previous order there while the rail showed the new.
    const reordered = ids
      .map(id => questions.find(q => q.id === id)!)
      .filter(Boolean)
      .map((q, i) => ({ ...q, order_index: i }));
    setQuestions(reordered);
    try {
      await api.forms.reorderQuestions(form.id, ids);
    } catch {
      showToast('Could not save the new order.');
    }
  }

  /**
   * "Chat to create": appends the questions the request implies. Uses the same
   * deterministic planner as the New form screen — no AI service is involved.
   */
  async function handleChat(prompt: string) {
    setChatBusy(true);
    try {
      const plan = planFormFromGoal(prompt);
      const added: Question[] = [];
      for (const q of plan.questions) {
        added.push(await api.questions.add(form.id, q));
      }
      setQuestions(prev => [...prev, ...added]);
      if (added[0]) selectQuestion(added[0].id);
      showToast(`Added ${added.length} question${added.length === 1 ? '' : 's'}`);
    } catch {
      showToast('Could not add questions from that request.');
    } finally {
      setChatBusy(false);
    }
  }

  async function handlePublish() {
    try {
      if (form.status === 'published') {
        await api.forms.unpublish(form.id);
        setForm(f => ({ ...f, status: 'draft' }));
        showToast('Unpublished — the share link no longer works');
        return;
      }
      const res = await api.forms.publish(form.id);
      setForm(f => ({ ...f, status: 'published' }));
      setShareUrl(res.share_url);
    } catch (err) {
      // The API refuses to publish a form with no questions.
      showToast(err instanceof Error ? err.message : 'Could not publish this form.');
    }
  }

  /** Reopens the share panel for an already-published form. */
  function handleShowShare() {
    setShareUrl(`${window.location.origin}/f/${form.slug}`);
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied to clipboard');
    } catch {
      showToast('Copy failed — select the link and copy manually');
    }
  }

  function setDescriptionOpen(id: string, next: boolean) {
    setDescOpen(prev => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f7f8]">
      <BuilderTopBar
        form={form}
        active="content"
        onTitleChange={handleTitleChange}
        onShare={form.status === 'published' ? handleShowShare : handlePublish}
      >
        <span className="text-xs text-[#847e85]">
          {saving ? 'Saving…' : saved ? 'Saved ✓' : ''}
        </span>
        <button
          onClick={handlePublish}
          disabled={questions.length === 0 && form.status !== 'published'}
          title={
            questions.length === 0 && form.status !== 'published'
              ? 'Add at least one question before publishing'
              : undefined
          }
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            form.status === 'published'
              ? 'border border-[#c0e4de] bg-[#f4faf8] text-[#095145] hover:bg-[#e8f5f2]'
              : 'bg-[#177767] text-white enabled:hover:bg-[#126057]'
          }`}
        >
          <Globe size={15} />
          {form.status === 'published' ? 'Published' : 'Publish'}
        </button>
      </BuilderTopBar>

      <div className="flex flex-1 overflow-hidden">
        <BuilderLeftPanel
          questions={questions}
          activeId={activeId}
          selection={selection}
          onSelect={selectQuestion}
          onSelectEnding={() => setSelection('ending')}
          onOpenPicker={() => setPickerOpen(true)}
          onReorder={handleReorder}
          onDuplicate={handleDuplicateQuestion}
          onDelete={handleDeleteQuestion}
        />

        {/* Canvas column: its own toolbar, then the framed screen */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-3">
          <BuilderToolbar
            formId={form.id}
            device={device}
            onDeviceChange={setDevice}
            onAddContent={() => setPickerOpen(true)}
            onPreview={() => setPreviewOpen(true)}
          />

          <div
            data-qa="canvas"
            className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-xl border border-[rgba(86,82,90,0.08)]"
            style={{
              ...themeVars,
              ...CANVAS_TOKENS,
              maxWidth: device === 'mobile' ? 420 : undefined,
              backgroundColor: 'var(--tf-bg)',
              fontFamily: 'var(--tf-font)',
            }}
          >
          {selection === 'ending' ? (
            <EndingEditor
              title={form.thank_you_title ?? ''}
              message={form.thank_you_message ?? ''}
              onChange={handleEndingChange}
            />
          ) : activeQuestion ? (
            <CanvasEditor
              key={activeQuestion.id}
              question={activeQuestion}
              index={activeIndex}
              showDescription={descOpen.has(activeQuestion.id) || Boolean(activeQuestion.description)}
              onToggleDescription={next => setDescriptionOpen(activeQuestion.id, next)}
              onUpdate={patch => handleUpdateQuestion(activeQuestion.id, patch)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <p className="text-[15px]" style={{ color: `rgba(var(--tf-text-rgb), 0.6)` }}>
                This form has no questions yet.
              </p>
              <button
                onClick={() => setPickerOpen(true)}
                className="rounded-lg px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: 'var(--tf-primary)', color: 'var(--tf-primary-text)' }}
              >
                Add your first question
              </button>
            </div>
          )}
          </div>
        </main>

        {selection === 'question' && activeQuestion && (
          <BuilderRightPanel
            question={activeQuestion}
            onUpdate={patch => handleUpdateQuestion(activeQuestion.id, patch)}
            onDelete={() => handleDeleteQuestion(activeQuestion.id)}
          />
        )}
      </div>

      <ChatToCreate onSubmit={handleChat} busy={chatBusy} />

      {/* Preview runs on the live draft — `questions` is the builder's own state,
          so unsaved edits show up and no publish is needed. */}
      {previewOpen && (
        <PreviewOverlay
          form={{ ...form, questions }}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {pickerOpen && (
        <ElementPicker
          onClose={() => setPickerOpen(false)}
          onPick={type => { void handleAddQuestion(type); }}
          onImport={handleImportQuestions}
          onGenerate={handleGenerateQuestions}
        />
      )}

      {/* Share panel — reopenable, unlike the clipboard-only publish it replaced */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShareUrl(null)} />
          <div
            className="relative w-[480px] rounded-2xl bg-white p-6 shadow-2xl animate-fadeIn"
            role="dialog"
            aria-label="Share form"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#f4faf8] text-[#177767]">
                <Globe size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-[#3c323e]">Your form is live</h2>
                <p className="mt-0.5 text-sm text-[#655d67]">
                  Anyone with this link can fill it in — no account needed.
                </p>
              </div>
              <button
                onClick={() => setShareUrl(null)}
                aria-label="Close"
                className="text-[#847e85] transition-colors hover:text-[#3c323e]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={e => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-[rgba(81,76,84,0.18)] bg-[#f7f7f8] px-3 py-2 text-sm text-[#3c323e]"
              />
              <button
                onClick={copyShareUrl}
                className="flex-shrink-0 rounded-lg bg-[#3c323e] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630]"
              >
                Copy
              </button>
            </div>

            <div className="mt-3 flex justify-end">
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
              >
                <Eye size={14} />
                Open form
              </a>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
}
