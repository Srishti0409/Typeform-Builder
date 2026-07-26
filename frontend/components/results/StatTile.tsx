'use client';

/**
 * Headline metric. No plot — a single number's job is to be read, not compared,
 * so it gets a hero number rather than a chart.
 */
export default function StatTile({
  label,
  value,
  hint,
  className = '',
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border border-[rgba(81,76,84,0.1)] bg-white px-4 py-3 ${className}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-[#847e85]">{label}</span>
      <span className="text-2xl font-semibold leading-tight text-[#3c323e] tabular-nums">
        {value}
      </span>
      {hint && <span className="text-xs text-[#847e85]">{hint}</span>}
    </div>
  );
}
