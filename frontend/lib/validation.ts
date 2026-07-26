/**
 * Client-side answer validation.
 *
 * Deliberately mirrors backend/app/services/validation.py rule for rule, so a
 * respondent gets instant feedback while the server stays the authority. Any
 * change here needs the same change there.
 */
import type { Question } from './types';

// Same shape as the backend's EMAIL_RE.
const EMAIL_RE = /^[^@]+@[^@]+\.[^@]+$/;

export type AnswerValue = string | number | string[] | null | undefined;

export function isEmpty(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * The author-configurable rules a text answer must satisfy: a character cap and
 * a regular expression, each gated by its own switch in the inspector.
 *
 * A half-typed pattern is not a reason to reject the respondent's answer, so an
 * un-compilable expression is skipped rather than treated as a failure.
 */
function textRules(question: Question, s: string): string | null {
  const settings = question.settings ?? {};

  if (settings.limit_characters && settings.max_characters != null) {
    const max = Number(settings.max_characters);
    if (Number.isFinite(max) && max > 0 && s.length > max) {
      return `Answer must be ${max} characters or fewer.`;
    }
  }

  if (settings.validate_pattern && settings.answer_pattern) {
    let re: RegExp | null = null;
    try {
      re = new RegExp(settings.answer_pattern);
    } catch {
      re = null;
    }
    if (re && !re.test(s)) return 'Answer doesn’t match the required format.';
  }

  return null;
}

/**
 * The bounds a Number question actually enforces.
 *
 * Each bound is optional and gated by its own switch in the inspector, so a
 * switched-off or blank bound is no constraint at all — not a bound of zero.
 * Questions authored before the switches existed fall back to whatever they
 * stored, which is how the inspector reads them too.
 *
 * Shared with the respondent's field so the native min/max attributes can't
 * disagree with the message this module produces. Mirrored by _number_bound()
 * in backend/app/services/validation.py.
 */
export function numberBounds(question: Question): { min: number | null; max: number | null } {
  const settings = question.settings ?? {};

  function bound(key: 'min' | 'max', enabled: boolean | undefined): number | null {
    const raw: unknown = settings[key];
    if (!(enabled ?? raw != null)) return null;
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  return {
    min: bound('min', settings.limit_min),
    max: bound('max', settings.limit_max),
  };
}

/**
 * Returns an error message, or null when the answer is acceptable.
 */
export function validateAnswer(question: Question, value: AnswerValue): string | null {
  if (isEmpty(value)) {
    return question.is_required ? 'This field is required.' : null;
  }

  switch (question.question_type) {
    case 'short_text': {
      const s = String(value);
      if (s.length > 500) return 'Answer must be 500 characters or fewer.';
      return textRules(question, s);
    }

    case 'long_text': {
      const s = String(value);
      if (s.length > 5000) return 'Answer must be 5000 characters or fewer.';
      return textRules(question, s);
    }

    case 'email': {
      // "Answer validation" off means the field accepts any text.
      if (question.settings?.validate_email === false) return null;
      if (!EMAIL_RE.test(String(value).trim().toLowerCase())) {
        return 'Please enter a valid email address.';
      }
      return null;
    }

    case 'number': {
      const n = Number(value);
      if (Number.isNaN(n)) return 'Answer must be a number.';
      const { min, max } = numberBounds(question);
      if (min !== null && n < min) return `Value must be at least ${min}.`;
      if (max !== null && n > max) return `Value must be at most ${max}.`;
      return null;
    }

    case 'rating': {
      const n = Number(value);
      if (!Number.isInteger(n)) return 'Rating must be an integer.';
      const max = Number(question.settings?.max_rating ?? 5);
      if (n < 1 || n > max) return `Rating must be between 1 and ${max}.`;
      return null;
    }

    case 'yes_no': {
      return value === 'yes' || value === 'no' ? null : "Answer must be 'yes' or 'no'.";
    }

    case 'multiple_choice': {
      const list = Array.isArray(value) ? value : [String(value)];
      const options = question.options ?? [];
      for (const choice of list) {
        if (options.length && !options.includes(choice)) {
          return `'${choice}' is not a valid option.`;
        }
      }
      return null;
    }

    case 'dropdown': {
      const options = question.options ?? [];
      if (options.length && !options.includes(String(value))) {
        return `'${value}' is not a valid option.`;
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Normalises a value into the shape the API expects for its type, matching the
 * coercion the backend performs on submit.
 */
export function coerceAnswer(question: Question, value: AnswerValue): unknown {
  switch (question.question_type) {
    case 'email':
      return String(value).trim().toLowerCase();
    case 'short_text':
    case 'long_text':
      return String(value).trim();
    case 'number':
      return Number(value);
    case 'rating':
      return Number(value);
    case 'multiple_choice':
      return Array.isArray(value) ? value : [String(value)];
    default:
      return value;
  }
}
