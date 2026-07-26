/**
 * Resolves the choices a respondent actually sees for a choice question.
 *
 * The builder's ordering settings ("Randomize", the dropdown's "Alphabetical
 * order") and multiple choice's "Other" / "None" are applied here rather than
 * stored as options, so toggling them never mutates the author's own list. Both
 * the respondent field and the builder canvas read through this, so the two
 * can't drift.
 */
import { NONE_CHOICE, OTHER_CHOICE, type Question } from './types';

/** Fisher–Yates, on a copy. */
function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * @param randomize pass false to keep the author's order (the builder canvas
 *        always does, so the editor stays stable while you type). Alphabetical
 *        ordering is deterministic, so it applies either way.
 */
export function resolveChoices(question: Question, randomize = true): string[] {
  const base = question.options ?? [];
  const settings = question.settings ?? {};

  // Ordering covers only the author's own options — the opt-out choices stay
  // pinned to the bottom, which is what makes them readable as opt-outs.
  // A–Z wins over randomising: the two settings are exclusive in the inspector,
  // but stored settings from before that could hold both.
  const body = settings.alphabetical_order
    ? [...base].sort((a, b) => a.localeCompare(b))
    : randomize && settings.randomize
      ? shuffled(base)
      : [...base];

  // "Other" and "None" belong to multiple choice alone: Typeform's Dropdown has
  // neither, so a flag left on a question that used to be one is ignored rather
  // than honoured.
  if (question.question_type === 'dropdown') return body;

  if (settings.other_option) body.push(OTHER_CHOICE);
  if (settings.none_option) body.push(NONE_CHOICE);
  return body;
}
