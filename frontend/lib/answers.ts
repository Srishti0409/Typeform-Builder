/**
 * How a stored answer value is written for a reader.
 *
 * One formatter for every results surface: the responses table and its detail
 * drawer print an answer through this, and the summary's choice bars label their
 * options with it. Without that the same stored value reads two ways on one page
 * — a yes/no question counted as “yes” in the summary but shown as “Yes” in the
 * table.
 *
 * Values arrive as the API stored them: a string, a number, or a list for a
 * multi-select question.
 */
export function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  // yes_no answers persist lowercase, matching the backend's coercion.
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return String(value);
}
