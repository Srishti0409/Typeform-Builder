'use client';

import type { FormStats, QuestionStats } from '@/lib/types';
import { getTypeInfo } from '@/lib/question-types';
import ChoiceBars from './ChoiceBars';
import StatTile from './StatTile';

/** How many open-text answers the summary previews before deferring to the table. */
const TEXT_SAMPLE_LIMIT = 5;

function QuestionCard({ stat, index }: { stat: QuestionStats; index: number }) {
  const info = getTypeInfo(stat.question_type);

  return (
    <section className="rounded-xl border border-[rgba(81,76,84,0.1)] bg-white p-4">
      <header className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[rgba(87,84,91,0.08)] text-[10px] font-semibold text-[#655d67]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-[#3c323e]">{stat.question_title}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#847e85]">
            <span className="text-[#655d67]">{info.icon}</span>
            {info.label}
            <span className="text-[#c4c1c5]">·</span>
            {stat.total_answers} answer{stat.total_answers === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      {stat.total_answers === 0 ? (
        <p className="text-sm text-[#847e85]">No answers yet.</p>
      ) : stat.choice_counts && stat.choice_counts.length > 0 ? (
        <ChoiceBars counts={stat.choice_counts} total={stat.total_answers} />
      ) : stat.average !== undefined && stat.average !== null ? (
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Average" value={stat.average.toFixed(1)} />
          <StatTile label="Lowest" value={stat.min_value ?? '–'} />
          <StatTile label="Highest" value={stat.max_value ?? '–'} />
        </div>
      ) : stat.sample_answers && stat.sample_answers.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {/* A summary shows a taste of the open text, not the whole column —
              the Responses tab is where the full set lives. */}
          {stat.sample_answers.slice(0, TEXT_SAMPLE_LIMIT).map((a, i) => (
            <li
              key={i}
              className="rounded-lg bg-[rgba(87,84,91,0.04)] px-3 py-2 text-sm text-[#3c323e]"
            >
              {a}
            </li>
          ))}
          {stat.total_answers > TEXT_SAMPLE_LIMIT && (
            <li className="px-1 pt-0.5 text-xs text-[#847e85]">
              + {stat.total_answers - TEXT_SAMPLE_LIMIT} more — see the Responses tab
            </li>
          )}
        </ul>
      ) : (
        <p className="text-sm text-[#847e85]">No summary available for this type.</p>
      )}
    </section>
  );
}

/**
 * Per-question summary. Choice questions get count bars; numeric questions get
 * headline stats; open text shows a sample with a pointer to the full table.
 */
export default function SummaryTab({ stats }: { stats: FormStats }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Responses" value={stats.total_responses} />
        <StatTile label="Questions" value={stats.question_stats.length} />
        <StatTile
          label="Avg. time"
          value={
            stats.avg_completion_time_seconds != null
              ? `${Math.round(stats.avg_completion_time_seconds)}s`
              : '–'
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        {stats.question_stats.map((s, i) => (
          <QuestionCard key={s.question_id} stat={s} index={i} />
        ))}
      </div>
    </div>
  );
}
