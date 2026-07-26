'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase, Check, GitBranch, Plug, Users, CreditCard, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Form, ThemeConfig } from '@/lib/types';
import FormTopBar from '@/components/shared/FormTopBar';
import IntegrationMark from '@/components/integrations/IntegrationMark';
import { brandKitTheme, useBrandKit } from '@/lib/brand-kit';
import { integrationById, useConnections } from '@/lib/integrations';
import { buildThemeVars } from '@/lib/theme';

/** Typeform-flavoured theme presets: a light surface with one accent. */
const PRESETS: { name: string; primaryColor: string; backgroundColor: string }[] = [
  { name: 'Default', primaryColor: '#0445AF', backgroundColor: '#FFFFFF' },
  { name: 'Forest', primaryColor: '#177767', backgroundColor: '#F4FAF8' },
  { name: 'Violet', primaryColor: '#4B3F9E', backgroundColor: '#F7F2FD' },
  { name: 'Ember', primaryColor: '#C0562A', backgroundColor: '#FDF5EF' },
  { name: 'Ink', primaryColor: '#E8E3DA', backgroundColor: '#2B232D' },
];

/** Features the assignment scopes out — present, but visibly inert. */
const COMING_SOON: { icon: React.ReactNode; title: string; blurb: string }[] = [
  { icon: <GitBranch size={16} />, title: 'Logic jumps & branching', blurb: 'Route respondents based on their answers.' },
  { icon: <Plug size={16} />, title: 'Webhook delivery & retries', blurb: 'Connections are configurable; dispatch to live accounts is not.' },
  { icon: <Users size={16} />, title: 'Real-time co-editing', blurb: 'Teammates can be invited, but not yet co-edit a form live.' },
  { icon: <CreditCard size={16} />, title: 'Payment & file upload', blurb: 'Collect payments and file attachments.' },
];

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

export default function FormSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Local draft so typing stays responsive; persisted on Save.
  const [thankYouTitle, setThankYouTitle] = useState('');
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [theme, setTheme] = useState<ThemeConfig | null>(null);

  const [kit] = useBrandKit();
  const { connectedIn } = useConnections();
  const connectedApps = connectedIn(id)
    .map(integrationById)
    .filter((app): app is NonNullable<typeof app> => Boolean(app));

  useEffect(() => {
    let cancelled = false;
    api.forms
      .get(id)
      .then(f => {
        if (cancelled) return;
        setForm(f);
        setThankYouTitle(f.thank_you_title ?? '');
        setThankYouMessage(f.thank_you_message ?? '');
        setTheme(f.theme_config ?? null);
      })
      .catch(() => !cancelled && setError('Could not load this form.'));
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await api.forms.update(form.id, {
        thank_you_title: thankYouTitle,
        thank_you_message: thankYouMessage,
        ...(theme ? { theme_config: theme as unknown as Record<string, unknown> } : {}),
      });
      setForm(updated);
      setToast('Settings saved');
    } catch {
      setToast('Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f7f7f8]">
        <p className="text-sm text-[#655d67]">{error}</p>
        <button onClick={() => router.push('/')} className="rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white">
          Back to forms
        </button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f7f8]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3c323e] border-t-transparent" />
      </div>
    );
  }

  const activePreset = PRESETS.find(
    p => p.primaryColor.toLowerCase() === theme?.primaryColor?.toLowerCase()
      && p.backgroundColor.toLowerCase() === theme?.backgroundColor?.toLowerCase()
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f7f8]">
      <FormTopBar form={form} active="settings">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#177767] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#126057] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </FormTopBar>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex max-w-[760px] flex-col gap-4">
          {/* Thank-you screen */}
          <Section
            title="Thank-you screen"
            description="Shown once a respondent submits the form."
          >
            <label className="block text-xs font-medium text-[#655d67]">Headline</label>
            <input
              value={thankYouTitle}
              onChange={e => setThankYouTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
              placeholder="Thanks for completing this form!"
            />
            <label className="mt-3 block text-xs font-medium text-[#655d67]">Message</label>
            <textarea
              value={thankYouMessage}
              onChange={e => setThankYouMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-2 text-sm text-[#3c323e] outline-none focus:border-[#655d67]"
              placeholder="Your response has been recorded."
            />
          </Section>

          {/* Theme */}
          <Section title="Theme" description="Applies to the public form respondents see.">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => {
                const active = activePreset?.name === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() =>
                      setTheme({
                        primaryColor: p.primaryColor,
                        backgroundColor: p.backgroundColor,
                        fontFamily: theme?.fontFamily ?? 'Inter',
                      })
                    }
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'border-[#3c323e] bg-[rgba(87,84,91,0.06)] text-[#3c323e]'
                        : 'border-[rgba(81,76,84,0.18)] text-[#655d67] hover:bg-[rgba(87,84,91,0.04)]'
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ backgroundColor: p.backgroundColor }}
                    >
                      <span
                        className="block h-full w-full rounded-full"
                        style={{
                          background: `linear-gradient(135deg, transparent 50%, ${p.primaryColor} 50%)`,
                        }}
                      />
                    </span>
                    {p.name}
                    {active && <Check size={14} />}
                  </button>
                );
              })}

              {/* The workspace brand kit, applied to this one form. */}
              <button
                onClick={() => setTheme(brandKitTheme(kit))}
                title="Apply the workspace brand kit"
                className="flex items-center gap-2 rounded-lg border border-dashed border-[rgba(81,76,84,0.3)] px-3 py-2 text-sm text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.04)]"
              >
                <Briefcase size={14} />
                {kit.name}
              </button>
            </div>

            {/* Live swatch of the chosen theme */}
            <div
              className="mt-4 rounded-xl border border-[rgba(81,76,84,0.1)] p-5"
              style={{ ...buildThemeVars(theme), backgroundColor: 'var(--tf-bg)' }}
            >
              <p style={{ color: 'var(--tf-text)', fontSize: 20 }}>What is your name?</p>
              <div
                className="mt-3 w-2/3"
                style={{ borderBottom: '1px solid var(--tf-underline)', height: 28 }}
              />
              <span
                className="mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: 'var(--tf-primary)', color: 'var(--tf-primary-text)' }}
              >
                OK
              </span>
            </div>
          </Section>

          {/* Per-form integrations, shared with the workspace catalogue */}
          <Section title="Integrations" description="Apps that receive this form's responses.">
            {connectedApps.length === 0 ? (
              <p className="text-sm text-[#655d67]">Nothing connected to this form yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {connectedApps.map(app => (
                  <li
                    key={app.id}
                    className="flex items-center gap-2 rounded-lg border border-[#c0e4de] bg-[#f4faf8] py-1.5 pl-1.5 pr-3 text-sm text-[#095145]"
                  >
                    <IntegrationMark integration={app} size={24} />
                    {app.name}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/integrations?form=${id}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[rgba(81,76,84,0.18)] px-3 py-1.5 text-sm font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)]"
            >
              <Plug size={14} />
              {connectedApps.length === 0 ? 'Connect an app' : 'Manage integrations'}
            </Link>
          </Section>

          {/* Out-of-scope placeholders */}
          <Section title="Coming soon" description="Outside the scope of this build.">
            <ul className="flex flex-col gap-2">
              {COMING_SOON.map(f => (
                <li
                  key={f.title}
                  className="oos flex items-center gap-3 rounded-lg border border-[rgba(81,76,84,0.12)] bg-white px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(87,84,91,0.06)] text-[#655d67]">
                    {f.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[#3c323e]">{f.title}</span>
                    <span className="block text-xs text-[#847e85]">{f.blurb}</span>
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-1 rounded-md bg-[rgba(87,84,91,0.06)] px-2 py-1 text-[11px] font-medium text-[#655d67]">
                    <Lock size={11} />
                    Coming soon
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#2b232d] px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-fadeIn"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
