'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, BarChart2, Settings, ArrowLeft } from 'lucide-react';

export default function FormSettingsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="h-screen flex flex-col bg-[#f7f7f8]">
      <header className="h-[48px] bg-white border-b border-[rgba(86,82,90,0.08)] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-[#655d67] hover:text-[#3c323e] transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-sm font-medium text-[#3c323e]">Form Settings</span>
        </div>
        <div className="flex items-center gap-1 bg-[rgba(87,84,91,0.06)] rounded-lg p-0.5">
          {[
            { key: 'edit', label: 'Build', icon: <FileText size={12} />, href: `/forms/${id}/edit` },
            { key: 'settings', label: 'Settings', icon: <Settings size={12} />, href: `/forms/${id}/settings` },
            { key: 'results', label: 'Results', icon: <BarChart2 size={12} />, href: `/forms/${id}/results` },
          ].map(tab => (
            <Link key={tab.key} href={tab.href}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab.key === 'settings' ? 'bg-white text-[#3c323e] shadow-sm' : 'text-[#655d67] hover:text-[#3c323e]'
              }`}>
              {tab.icon}{tab.label}
            </Link>
          ))}
        </div>
        <div className="w-8" />
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[rgba(81,76,84,0.1)] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Settings size={24} className="text-[#847e85]" />
          </div>
          <h2 className="text-lg font-medium text-[#3c323e] mb-1">Form Settings</h2>
          <p className="text-sm text-[#655d67]">Theme, thank-you screen, and more — coming soon.</p>
          <Link href={`/forms/${id}/edit`} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3c323e] text-white text-sm font-medium hover:bg-[#2e2630] transition-colors">
            <ArrowLeft size={13} /> Back to builder
          </Link>
        </div>
      </main>
    </div>
  );
}
