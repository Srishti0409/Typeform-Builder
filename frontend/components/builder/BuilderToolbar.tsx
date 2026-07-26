'use client';

import Link from 'next/link';
import {
  Accessibility, Languages, Palette, Play, Plus, RotateCcw, Settings, Smartphone,
} from 'lucide-react';

/**
 * The toolbar above the canvas: adding content, then the view/util cluster.
 *
 * Live controls are the ones this build implements — add content, the device
 * width toggle, preview, and settings. The rest are Typeform features that are
 * out of scope, so they are shown inert rather than omitted.
 */
export default function BuilderToolbar({
  formId,
  device,
  onDeviceChange,
  onAddContent,
  onPreview,
}: {
  formId: string;
  device: 'desktop' | 'mobile';
  onDeviceChange: (next: 'desktop' | 'mobile') => void;
  onAddContent: () => void;
  /** Opens the draft preview; no publishing required. */
  onPreview: () => void;
}) {
  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-lg text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.08)]';

  return (
    <div className="flex flex-shrink-0 justify-center px-4 pb-2">
      <div className="flex w-full items-center gap-1 rounded-xl bg-[#f2f1f3] px-2 py-2">
        <button
          onClick={onAddContent}
          className="flex items-center gap-2 rounded-lg border-[1.5px] border-[#3c323e] bg-white px-3.5 py-2 text-[15px] font-semibold text-[#3c323e] transition-colors hover:bg-[#f7f7f8]"
        >
          <Plus size={17} strokeWidth={2.5} />
          Add content
        </button>

        {/* Theme editing lives on the Settings page in this build. */}
        <Link
          href={`/forms/${formId}/settings`}
          className="ml-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium text-[#3c323e] transition-colors hover:bg-[rgba(87,84,91,0.08)]"
        >
          <Palette size={17} />
          Design
        </Link>

        <span className="mx-1.5 h-6 w-px bg-[rgba(86,82,90,0.16)]" />

        <button
          onClick={() => onDeviceChange(device === 'mobile' ? 'desktop' : 'mobile')}
          aria-pressed={device === 'mobile'}
          title={device === 'mobile' ? 'Switch to desktop width' : 'Preview at mobile width'}
          className={`${iconBtn} ${device === 'mobile' ? 'bg-[rgba(87,84,91,0.12)]' : ''}`}
        >
          <Smartphone size={17} />
        </button>

        <button
          onClick={onPreview}
          title="Preview this draft"
          aria-label="Preview this draft"
          className={iconBtn}
        >
          <Play size={17} />
        </button>

        <button className={`${iconBtn} oos`} title="Not available in this build">
          <Accessibility size={17} />
        </button>
        <button className={`${iconBtn} oos`} title="Not available in this build">
          <RotateCcw size={17} />
        </button>
        <button className={`${iconBtn} oos`} title="Not available in this build">
          <Languages size={17} />
        </button>

        <Link href={`/forms/${formId}/settings`} title="Form settings" className={iconBtn}>
          <Settings size={17} />
        </Link>
      </div>
    </div>
  );
}
