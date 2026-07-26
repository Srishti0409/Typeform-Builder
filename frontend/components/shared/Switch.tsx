'use client';

/** Small on/off switch, styled to the creator-side palette. */
export default function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name — the visible text usually sits beside the switch. */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] flex-shrink-0 rounded-full transition-colors ${
        checked ? 'bg-[#177767]' : 'bg-[#dedcde]'
      }`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          checked ? 'left-[19px]' : 'left-[3px]'
        }`}
      />
    </button>
  );
}
