'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Search, Users, X } from 'lucide-react';
import WorkspaceShell, { PageHeading } from '@/components/workspace/WorkspaceShell';
import StatTile from '@/components/results/StatTile';
import { useToast } from '@/components/shared/Toast';
import { api } from '@/lib/api';
import type { Contact } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function initials(contact: Contact) {
  const source = contact.name || contact.email;
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
}

/** Quoted so addresses and form titles containing commas survive Excel. */
function toCsv(contacts: Contact[]): string {
  const head = ['Name', 'Email', 'Responses', 'First response', 'Last response', 'Forms'];
  const rows = contacts.map(c => [
    c.name ?? '',
    c.email,
    String(c.response_count),
    c.first_response_at,
    c.last_response_at,
    c.forms.join('; '),
  ]);
  return [head, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
}

const COL = { responses: 110, last: 140, first: 140 };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { showToast, toastNode } = useToast();

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setContacts(await api.contacts.list());
      setError(null);
    } catch {
      setError('Failed to load contacts. Is the backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      c =>
        c.email.toLowerCase().includes(q) ||
        (c.name ?? '').toLowerCase().includes(q) ||
        c.forms.some(f => f.toLowerCase().includes(q))
    );
  }, [contacts, query]);

  const totalResponses = contacts.reduce((sum, c) => sum + c.response_count, 0);
  const repeatCount = contacts.filter(c => c.response_count > 1).length;

  function exportCsv() {
    const blob = new Blob([`﻿${toCsv(visible)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teraform-contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${visible.length} ${visible.length === 1 ? 'contact' : 'contacts'}`);
  }

  return (
    <WorkspaceShell active="contacts" maxWidth={1120}>
      <PageHeading
        title="Contacts"
        subtitle="Everyone who has left an email address in one of your forms."
      >
        <button
          onClick={exportCsv}
          disabled={visible.length === 0}
          className="flex items-center gap-2 rounded-lg border border-[rgba(81,76,84,0.18)] bg-white px-3 py-2 text-[14px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.05)] disabled:opacity-40"
        >
          <Download size={15} />
          Export CSV
        </button>
      </PageHeading>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3c323e] border-t-transparent" />
          <span className="text-sm text-[#655d67]">Loading contacts…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <X size={20} className="text-red-500" />
          </div>
          <p className="max-w-xs text-center text-sm text-[#655d67]">{error}</p>
          <button
            onClick={load}
            className="rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630]"
          >
            Retry
          </button>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(87,84,91,0.06)]">
            <Users size={24} className="text-[#847e85]" />
          </div>
          <div className="max-w-sm text-center">
            <p className="text-base font-medium text-[#3c323e]">No contacts yet</p>
            <p className="mt-1 text-sm text-[#655d67]">
              A contact appears as soon as someone answers an email question. Add one to a form
              and share it.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-[#3c323e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2e2630]"
          >
            Go to forms
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Contacts" value={contacts.length} />
            <StatTile label="Responses" value={totalResponses} hint="Across every form" />
            <StatTile
              label="Repeat respondents"
              value={repeatCount}
              hint={`${Math.round((repeatCount / contacts.length) * 100)}% answered more than once`}
            />
          </div>

          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-[rgba(81,76,84,0.18)] bg-white px-3.5 py-2.5 transition-colors focus-within:border-[#655d67]">
            <Search size={17} className="flex-shrink-0 text-[#655d67]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, email or form"
              aria-label="Search contacts"
              className="min-w-0 flex-1 text-[15px] text-[#3c323e] placeholder:text-[#847e85]"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="text-[#655d67] hover:text-[#3c323e]">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="mt-5">
            <div className="flex items-center px-3 pb-2.5 text-[14px] text-[#655d67]">
              <div className="flex-1">Contact</div>
              <div className="text-center" style={{ width: COL.responses }}>Responses</div>
              <div style={{ width: COL.last }}>Last response</div>
              <div style={{ width: COL.first }}>First seen</div>
            </div>

            <div className="border-t border-[rgba(86,82,90,0.06)]">
              {visible.map(contact => (
                <div
                  key={contact.email}
                  className="flex items-center border-b border-[rgba(86,82,90,0.06)] px-3 py-3 transition-colors hover:bg-[rgba(87,84,91,0.04)]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#f6d8b8] text-[12px] font-semibold text-[#7a4a25]">
                      {initials(contact)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-[#3c323e]">
                        {contact.name ?? contact.email}
                      </p>
                      <p className="truncate text-[13px] text-[#847e85]">
                        {contact.name ? contact.email : contact.forms.join(' · ')}
                      </p>
                    </div>
                    <div className="hidden flex-wrap gap-1 lg:flex">
                      {contact.forms.slice(0, 2).map(title => (
                        <span
                          key={title}
                          className="max-w-[160px] truncate rounded-md bg-[rgba(87,84,91,0.06)] px-2 py-0.5 text-[11px] text-[#655d67]"
                        >
                          {title}
                        </span>
                      ))}
                      {contact.forms.length > 2 && (
                        <span className="rounded-md bg-[rgba(87,84,91,0.06)] px-2 py-0.5 text-[11px] text-[#655d67]">
                          +{contact.forms.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-center text-[15px] text-[#655d67] tabular-nums" style={{ width: COL.responses }}>
                    {contact.response_count}
                  </div>
                  <div className="text-[15px] text-[#655d67]" style={{ width: COL.last }}>
                    {formatDate(contact.last_response_at)}
                  </div>
                  <div className="text-[15px] text-[#655d67]" style={{ width: COL.first }}>
                    {formatDate(contact.first_response_at)}
                  </div>
                </div>
              ))}
            </div>

            {visible.length === 0 && (
              <p className="py-12 text-center text-sm text-[#655d67]">
                No contact matches “{query}”.
              </p>
            )}
          </div>

          <p className="mt-6 text-[13px] text-[#847e85]">
            Contacts are derived from responses to <span className="font-medium">email</span>{' '}
            questions; names come from a question that asks for one.
          </p>
        </>
      )}
      {toastNode}
    </WorkspaceShell>
  );
}
