'use client';

import type { ChoiceCount } from '@/lib/types';
import { formatAnswer } from '@/lib/answers';

/**
 * Counts per option for a choice question.
 *
 * This is ONE measure (count) compared across categories, so every bar takes the
 * same single hue — colour here encodes magnitude, not identity, which is why
 * there is no categorical palette and no legend. Values sit in ink tokens beside
 * the mark rather than being coloured themselves.
 */

/** Single sequential hue, from the admin palette. */
const BAR = '#177767';
const TRACK = 'rgba(87,84,91,0.08)';

export default function ChoiceBars({
  counts,
  total,
}: {
  counts: ChoiceCount[];
  /** Answer count used to scale the bars; percentages come from the API. */
  total: number;
}) {
  // Scale to the most-picked option so the longest bar fills the track.
  const max = Math.max(1, ...counts.map(c => c.count));

  return (
    <ul className="flex flex-col gap-2">
      {counts.map(c => {
        const pct = total > 0 ? c.percentage : 0;
        // The API keys counts by the value it stored, which is not always how the
        // option is written for a reader — a yes/no question stores 'yes'.
        const label = formatAnswer(c.label);
        return (
          <li key={c.label} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-[#3c323e]">{label}</span>
              {/* Direct labels — the set is small enough to label every bar. */}
              <span className="flex-shrink-0 text-xs tabular-nums text-[#655d67]">
                {c.count} · {pct.toFixed(0)}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: TRACK }}
              title={`${label}: ${c.count} of ${total} (${pct.toFixed(0)}%)`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${(c.count / max) * 100}%`,
                  backgroundColor: BAR,
                  opacity: c.count === 0 ? 0.25 : 1,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
