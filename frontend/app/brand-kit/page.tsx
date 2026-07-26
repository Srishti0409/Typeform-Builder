'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ImageUp, Trash2 } from 'lucide-react';
import WorkspaceShell, { PageHeading } from '@/components/workspace/WorkspaceShell';
import Switch from '@/components/shared/Switch';
import { useToast } from '@/components/shared/Toast';
import {
  BRAND_FONTS, BRAND_PALETTES, DEFAULT_BRAND_KIT, MAX_LOGO_BYTES,
  brandKitTheme, useBrandKit, type BrandKit,
} from '@/lib/brand-kit';
import { buildThemeVars } from '@/lib/theme';
import { api } from '@/lib/api';
import type { FormListItem } from '@/lib/types';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[rgba(81,76,84,0.1)] bg-white p-5">
      <h2 className="text-[15px] font-semibold text-[#3c323e]">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-[#655d67]">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Swatch + hex field. Half-typed hex is held locally so typing is free, and
 * only committed once it parses; blurring snaps back to the canonical value.
 */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);

  return (
    <label className="flex flex-1 items-center gap-3 rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2">
      <input
        type="color"
        value={HEX.test(value) ? value : '#000000'}
        onChange={e => onChange(e.target.value.toUpperCase())}
        aria-label={label}
        className="h-8 w-8 flex-shrink-0 cursor-pointer rounded-md border border-black/10 bg-transparent"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium text-[#655d67]">{label}</span>
        <input
          value={typed ?? value}
          onChange={e => {
            const next = e.target.value;
            setTyped(next);
            if (HEX.test(next.trim())) onChange(next.trim().toUpperCase());
          }}
          onBlur={() => setTyped(null)}
          onKeyDown={e => e.key === 'Enter' && setTyped(null)}
          spellCheck={false}
          className="w-full text-[14px] uppercase text-[#3c323e] outline-none"
        />
      </span>
    </label>
  );
}

export default function BrandKitPage() {
  const [kit, setKit] = useBrandKit();
  // Unsaved changes are an overlay on the stored kit rather than a copy of it,
  // so the editor picks up the persisted values without an adopt-on-load effect.
  const [edits, setEdits] = useState<Partial<BrandKit> | null>(null);
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [applyTo, setApplyTo] = useState('');
  const [applying, setApplying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast, toastNode } = useToast();

  const draft: BrandKit = edits ? { ...kit, ...edits } : kit;

  useEffect(() => {
    let cancelled = false;
    api.forms
      .list()
      .then(f => !cancelled && setForms(f))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const dirty = edits !== null && JSON.stringify(draft) !== JSON.stringify(kit);
  const themeVars = buildThemeVars(brandKitTheme(draft));
  const fontStack =
    BRAND_FONTS.find(f => f.name === draft.fontFamily)?.stack ?? draft.fontFamily;

  function pickLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('That file is not an image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast('Logos must be under 512 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEdits(d => ({ ...d, logo: String(reader.result) }));
    reader.onerror = () => showToast('Could not read that file.');
    reader.readAsDataURL(file);
  }

  /** Writes the kit's colour and type onto a real form's `theme_config`. */
  async function applyToForm() {
    const form = forms.find(f => f.id === applyTo);
    if (!form) return;
    setApplying(true);
    try {
      await api.forms.update(form.id, {
        theme_config: brandKitTheme(draft) as unknown as Record<string, unknown>,
      });
      showToast(`Brand applied to “${form.title}”`);
    } catch {
      showToast('Could not apply the brand to that form.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <WorkspaceShell active="brand-kit" maxWidth={1120}>
      <PageHeading
        title="Brand kit"
        subtitle="One set of colours, type and logo, reused by every form you build."
      >
        {dirty && (
          <button
            onClick={() => setEdits(null)}
            className="rounded-lg px-3 py-2 text-[14px] font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
          >
            Discard
          </button>
        )}
        <button
          onClick={() => { setKit(draft); setEdits(null); showToast('Brand kit saved'); }}
          disabled={!dirty}
          className="rounded-lg bg-[#177767] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#126057] disabled:opacity-40"
        >
          {dirty ? 'Save changes' : 'Saved'}
        </button>
      </PageHeading>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Editor ── */}
        <div className="flex flex-col gap-4">
          <Section title="Kit name" description="How this kit is referred to across the workspace.">
            <input
              value={draft.name}
              onChange={e => setEdits(d => ({ ...d, name: e.target.value }))}
              placeholder="My brand"
              className="w-full rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
            />
          </Section>

          <Section title="Logo" description="Shown on the account bar. PNG, JPG or SVG up to 512 KB.">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[rgba(81,76,84,0.25)] bg-[rgba(87,84,91,0.03)]">
                {draft.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local data URL; nothing for the image optimiser to fetch
                  <img src={draft.logo} alt="Brand logo" className="h-full w-full object-contain p-1.5" />
                ) : (
                  <ImageUp size={22} className="text-[#847e85]" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={e => { pickLogo(e.target.files?.[0]); e.target.value = ''; }}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-1.5 text-[14px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
                >
                  {draft.logo ? 'Replace logo' : 'Upload logo'}
                </button>
                {draft.logo && (
                  <button
                    onClick={() => setEdits(d => ({ ...d, logo: null }))}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] font-medium text-[#655d67] transition-colors hover:bg-red-50 hover:text-[#be185d]"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </Section>

          <Section title="Colours" description="The accent respondents click, and the surface behind it.">
            <div className="flex flex-wrap gap-2">
              {BRAND_PALETTES.map(p => {
                const active =
                  p.primaryColor.toLowerCase() === draft.primaryColor.toLowerCase() &&
                  p.backgroundColor.toLowerCase() === draft.backgroundColor.toLowerCase();
                return (
                  <button
                    key={p.name}
                    onClick={() =>
                      setEdits(d => ({
                        ...d,
                        primaryColor: p.primaryColor,
                        backgroundColor: p.backgroundColor,
                      }))
                    }
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'border-[#3c323e] bg-[rgba(87,84,91,0.06)] text-[#3c323e]'
                        : 'border-[rgba(81,76,84,0.18)] text-[#655d67] hover:bg-[rgba(87,84,91,0.04)]'
                    }`}
                  >
                    <span
                      className="h-5 w-5 overflow-hidden rounded-full border border-black/10"
                      style={{ backgroundColor: p.backgroundColor }}
                    >
                      <span
                        className="block h-full w-full"
                        style={{ background: `linear-gradient(135deg, transparent 50%, ${p.primaryColor} 50%)` }}
                      />
                    </span>
                    {p.name}
                    {active && <Check size={14} />}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <ColorField
                label="Primary"
                value={draft.primaryColor}
                onChange={v => setEdits(d => ({ ...d, primaryColor: v }))}
              />
              <ColorField
                label="Background"
                value={draft.backgroundColor}
                onChange={v => setEdits(d => ({ ...d, backgroundColor: v }))}
              />
            </div>
          </Section>

          <Section
            title="Typography"
            description="Only typefaces that resolve without a webfont request, so forms never flash a fallback."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BRAND_FONTS.map(font => (
                <button
                  key={font.name}
                  onClick={() => setEdits(d => ({ ...d, fontFamily: font.name }))}
                  style={{ fontFamily: font.stack }}
                  className={`rounded-lg border px-3 py-3 text-[15px] transition-colors ${
                    draft.fontFamily === font.name
                      ? 'border-[#3c323e] bg-[rgba(87,84,91,0.06)] text-[#3c323e]'
                      : 'border-[rgba(81,76,84,0.18)] text-[#655d67] hover:bg-[rgba(87,84,91,0.04)]'
                  }`}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Where it applies" description="Colour and type are written to a form's theme.">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#3c323e]">Apply to new forms</p>
                <p className="text-[13px] text-[#847e85]">
                  Forms created from now on start with this brand instead of the default theme.
                </p>
              </div>
              <Switch
                label="Apply to new forms"
                checked={draft.applyToNewForms}
                onChange={v => setEdits(d => ({ ...d, applyToNewForms: v }))}
              />
            </div>

            <div className="mt-4 border-t border-[rgba(86,82,90,0.08)] pt-4">
              <p className="text-sm font-medium text-[#3c323e]">Apply to an existing form</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={applyTo}
                  onChange={e => setApplyTo(e.target.value)}
                  className="min-w-[220px] flex-1 rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
                >
                  <option value="">Choose a form…</option>
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
                <button
                  onClick={applyToForm}
                  disabled={!applyTo || applying}
                  className="rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630] disabled:opacity-40"
                >
                  {applying ? 'Applying…' : 'Apply brand'}
                </button>
              </div>
            </div>
          </Section>

          <button
            onClick={() => setEdits(DEFAULT_BRAND_KIT)}
            className="self-start rounded-lg px-1 py-1 text-[13px] text-[#847e85] underline decoration-dotted transition-colors hover:text-[#655d67]"
          >
            Reset to the default theme
          </button>
        </div>

        {/* ── Live preview: the respondent's view of this brand ── */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <p className="mb-2 text-[13px] font-medium text-[#655d67]">Preview</p>
          <div
            className="overflow-hidden rounded-xl border border-[rgba(81,76,84,0.12)] shadow-sm"
            style={{ ...themeVars, backgroundColor: 'var(--tf-bg)', fontFamily: fontStack }}
          >
            <div className="flex flex-col gap-4 px-5 py-6">
              {draft.logo && (
                // eslint-disable-next-line @next/next/no-img-element -- a local data URL; nothing for the image optimiser to fetch
                <img src={draft.logo} alt="" className="h-8 w-auto self-start object-contain" />
              )}
              <p style={{ color: 'var(--tf-text)', fontSize: 20, lineHeight: '26px' }}>
                How likely are you to recommend us?
              </p>
              <div className="flex flex-col gap-2">
                {['Very likely', 'Somewhat likely', 'Not likely'].map((choice, i) => (
                  <span
                    key={choice}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px]"
                    style={{
                      backgroundColor: 'var(--tf-choice-bg)',
                      border: '1px solid var(--tf-choice-border)',
                      color: 'var(--tf-text)',
                    }}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded text-[12px] font-medium"
                      style={{ backgroundColor: 'var(--tf-choice-key-bg)' }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {choice}
                  </span>
                ))}
              </div>
              <span
                className="inline-flex w-fit items-center rounded-lg px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: 'var(--tf-primary)', color: 'var(--tf-primary-text)' }}
              >
                OK
              </span>
            </div>
            <div className="h-[3px] w-full" style={{ backgroundColor: 'var(--tf-choice-key-bg)' }}>
              <div className="h-full w-1/3" style={{ backgroundColor: 'var(--tf-primary)' }} />
            </div>
          </div>
          <p className="mt-2 text-[13px] text-[#847e85]">
            Exactly the colour, type and radius the respondent flow renders from a form’s theme.
          </p>
        </div>
      </div>
      {toastNode}
    </WorkspaceShell>
  );
}
