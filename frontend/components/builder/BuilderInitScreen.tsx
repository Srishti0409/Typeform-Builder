'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, Mic, Plus, MoreHorizontal, Send, FileText, Zap } from 'lucide-react';
import type { Form } from '@/lib/types';

interface Props {
  form: Form;
  onStart: () => void;
}

export default function BuilderInitScreen({ form, onStart }: Props) {
  const [aiInput, setAiInput] = useState('');

  return (
    <div className="h-screen flex flex-col bg-[#f7f7f8] overflow-hidden">
      {/* Top bar */}
      <header className="h-[48px] bg-white border-b border-[rgba(86,82,90,0.08)] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-[#655d67]">
          <Link href="/" className="flex items-center gap-1.5 hover:text-[#3c323e] transition-colors">
            <FileText size={14} />
            Forms
          </Link>
          <span className="text-[#c4c1c5]">›</span>
          <span className="text-[#3c323e] font-medium truncate max-w-[200px]">{form.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#655d67] hover:bg-[rgba(87,84,91,0.06)] transition-colors">
            <HelpCircle size={16} />
          </button>
          <button className="w-8 h-8 rounded-full bg-[#bdddf9] flex items-center justify-center text-xs font-semibold text-[#4c414e] hover:opacity-80 transition-opacity">
            SG
          </button>
        </div>
      </header>

      {/* Main centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[560px] flex flex-col items-center gap-6">
          {/* Heading */}
          <div className="text-center">
            <p className="text-sm text-[#655d67] mb-1.5">Typeform AI</p>
            <h1 className="text-3xl font-light text-[#3c323e]">What would you like to create?</h1>
          </div>

          {/* AI input card */}
          <div className="w-full bg-white border border-[#ddb7f0] rounded-xl shadow-sm overflow-hidden">
            <textarea
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              placeholder=""
              className="w-full min-h-[100px] px-4 pt-4 pb-2 text-sm text-[#3c323e] placeholder:text-[#c4c1c5] resize-none outline-none bg-transparent"
              rows={4}
            />
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <div className="flex items-center gap-3 text-[#847e85]">
                <button className="hover:text-[#3c323e] transition-colors">
                  <Mic size={15} />
                </button>
                <button className="hover:text-[#3c323e] transition-colors">
                  <Plus size={15} />
                </button>
                <button className="hover:text-[#3c323e] transition-colors">
                  <MoreHorizontal size={15} />
                </button>
              </div>
              <button
                disabled={!aiInput.trim()}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-[rgba(89,86,93,0.06)] border border-[rgba(86,82,90,0.12)] text-[#c4c1c5] disabled:cursor-not-allowed enabled:text-[#655d67] enabled:hover:bg-[rgba(87,84,91,0.1)] transition-colors"
              >
                <Send size={12} />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-4">
            <div className="flex-1 h-px bg-[rgba(86,82,90,0.1)]" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onStart}
              className="px-6 py-2 rounded-lg bg-white border border-[rgba(81,76,84,0.18)] text-sm text-[#3c323e] font-medium shadow-sm hover:bg-[#f7f7f8] hover:shadow-md transition-all"
            >
              Start from scratch
            </button>
            <button
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white border border-[rgba(81,76,84,0.18)] text-sm text-[#3c323e] font-medium shadow-sm hover:bg-[#f7f7f8] hover:shadow-md transition-all"
            >
              Sync to CRM
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-[#ff5722] flex items-center justify-center text-white text-[9px] font-bold">H</span>
                <span className="w-5 h-5 rounded bg-[#00a1e0] flex items-center justify-center text-white">
                  <Zap size={10} fill="white" />
                </span>
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom purple accent bar */}
      <div className="h-1 bg-gradient-to-r from-[#ddb7f0] via-[#c084fc] to-[#ddb7f0] flex-shrink-0" />
    </div>
  );
}
