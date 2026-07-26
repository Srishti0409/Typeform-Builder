// Core domain types mirroring backend schemas

export type FormStatus = 'draft' | 'published';

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'dropdown'
  | 'email'
  | 'number'
  | 'yes_no'
  | 'rating';

export interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  backgroundImage?: string;
}

/**
 * Type-specific question settings, stored as JSON on the question.
 * Only the keys relevant to a given question_type are present.
 */
export interface QuestionSettings {
  /**
   * number: the smallest and largest accepted value. Each bound is optional and
   * carries its own flag, so a bound left unset is no bound at all rather than
   * a bound of zero. Same flag-plus-value split as the character limit below:
   * switching a bound off keeps the number you typed for when you switch it
   * back on.
   */
  limit_min?: boolean;
  min?: number;
  limit_max?: boolean;
  max?: number;
  /** rating */
  max_rating?: number;
  shape?: 'star' | 'number';
  /** multiple_choice: allow more than one selection */
  allow_multiple?: boolean;
  /** choice types: present the options in a random order to each respondent */
  randomize?: boolean;
  /**
   * dropdown: sort the options A–Z rather than keeping the author's order.
   * Mutually exclusive with `randomize` — an ordering can only be one thing.
   */
  alphabetical_order?: boolean;
  /**
   * multiple_choice: append a free-text "Other" choice. Not a dropdown setting —
   * Typeform's Dropdown offers neither this nor "None".
   */
  other_option?: boolean;
  /** multiple_choice: append an opt-out "None of the above" choice */
  none_option?: boolean;
  /**
   * email: only accept a well-formed address. Absent means on — an Email
   * question validates by default, and this switches that off.
   */
  validate_email?: boolean;
  /**
   * text types: cap the answer's length. The flag is stored separately from the
   * number so switching the setting on, then off, doesn't lose the limit you
   * typed — and an enabled-but-empty limit survives a refresh.
   */
  limit_characters?: boolean;
  max_characters?: number;
  /**
   * text types: the answer must match this regular expression. Same
   * flag-plus-value split as the character limit.
   */
  validate_pattern?: boolean;
  answer_pattern?: string;
  /**
   * text and dropdown types: the answer field's ghost text is authored rather
   * than the type's default. Absent falls back to whether a placeholder is
   * stored.
   */
  custom_placeholder?: boolean;
  /**
   * email: fold answers into the creator's contact list. Absent means on,
   * since contacts are observed from every email answer by default.
   */
  map_to_contacts?: boolean;
}

/**
 * The extra choices the multiple-choice "Other"/"None" settings append, in
 * display order.
 */
export const OTHER_CHOICE = 'Other';
export const NONE_CHOICE = 'None of the above';

export interface Question {
  id: string;
  form_id: string;
  order_index: number;
  question_type: QuestionType;
  title: string;
  description?: string;
  is_required: boolean;
  placeholder?: string;
  options?: string[];
  settings?: QuestionSettings;
  created_at: string;
}

export interface FormListItem {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  response_count: number;
  created_at: string;
  updated_at: string;
}

export interface Form extends FormListItem {
  description?: string;
  creator_id: string;
  thank_you_title: string;
  thank_you_message?: string;
  theme_config?: ThemeConfig;
  questions: Question[];
}

export interface AnswerSubmit {
  question_id: string;
  answer_value: unknown;
}

export interface SubmitFormRequest {
  answers: AnswerSubmit[];
  completion_time_seconds?: number;
}

export interface ChoiceCount {
  label: string;
  count: number;
  percentage: number;
}

export interface QuestionStats {
  question_id: string;
  question_title: string;
  question_type: QuestionType;
  total_answers: number;
  choice_counts?: ChoiceCount[];
  average?: number;
  min_value?: number;
  max_value?: number;
  sample_answers?: string[];
}

export interface FormStats {
  form_id: string;
  total_responses: number;
  avg_completion_time_seconds?: number;
  question_stats: QuestionStats[];
}

export interface ResponseListItem {
  id: string;
  form_id: string;
  submitted_at: string;
  completion_time_seconds?: number;
  answer_count: number;
}

export interface AnswerOut {
  id: string;
  question_id?: string;
  answer_value: unknown;
}

/**
 * A respondent, folded across every form they have answered. Derived
 * server-side from `email` answers — there is no contacts table.
 */
export interface Contact {
  email: string;
  name?: string;
  response_count: number;
  first_response_at: string;
  last_response_at: string;
  forms: string[];
}

export interface ResponseDetail {
  id: string;
  form_id: string;
  submitted_at: string;
  completion_time_seconds?: number;
  answers: AnswerOut[];
}
