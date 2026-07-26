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
  settings?: Record<string, unknown>;
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

export interface ResponseDetail {
  id: string;
  form_id: string;
  submitted_at: string;
  completion_time_seconds?: number;
  answers: AnswerOut[];
}
