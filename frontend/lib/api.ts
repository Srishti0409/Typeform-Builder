import type {
  Contact,
  Form,
  FormListItem,
  Question,
  FormStats,
  ResponseListItem,
  ResponseDetail,
  SubmitFormRequest,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

/**
 * Error carrying the parsed response body, so callers can act on structured
 * failures — notably the submit endpoint's 422 `{validation_errors: {qid: msg}}`,
 * which the respondent flow maps back onto individual questions.
 */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** Per-question server validation messages, when the API returned any. */
  get validationErrors(): Record<string, string> | null {
    const detail = (this.body as { detail?: unknown })?.detail;
    const errors = (detail as { validation_errors?: unknown })?.validation_errors;
    return errors && typeof errors === 'object' ? (errors as Record<string, string>) : null;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    // Every one of these reads is live editor state — a form, its questions, its
    // responses. Never serve one from a cache.
    cache: 'no-store',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = (body as { detail?: unknown })?.detail;
    // `detail` is a string for simple errors but an object for validation
    // failures, which would otherwise stringify to "[object Object]".
    const message = typeof detail === 'string' ? detail : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Forms ──────────────────────────────────────────────────────────────────

export const api = {
  forms: {
    list: () => apiFetch<FormListItem[]>('/forms'),

    create: (title: string, description?: string) =>
      apiFetch<Form>('/forms', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      }),

    get: (id: string) => apiFetch<Form>(`/forms/${id}`),

    update: (id: string, data: Partial<{ title: string; description: string; thank_you_title: string; thank_you_message: string; theme_config: Record<string, unknown> }>) =>
      apiFetch<Form>(`/forms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) => apiFetch<void>(`/forms/${id}`, { method: 'DELETE' }),

    publish: (id: string) => apiFetch<{ id: string; slug: string; status: string; share_url: string }>(`/forms/${id}/publish`, { method: 'POST' }),

    unpublish: (id: string) => apiFetch<{ id: string; slug: string; status: string; share_url: string }>(`/forms/${id}/unpublish`, { method: 'POST' }),

    duplicate: (id: string) => apiFetch<{ id: string; title: string; slug: string; status: string }>(`/forms/${id}/duplicate`, { method: 'POST' }),

    reorderQuestions: (id: string, questionIds: string[]) =>
      apiFetch<Question[]>(`/forms/${id}/reorder-questions`, {
        method: 'POST',
        body: JSON.stringify({ question_ids: questionIds }),
      }),
  },

  questions: {
    add: (formId: string, data: Partial<Question>) =>
      apiFetch<Question>(`/forms/${formId}/questions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (formId: string, questionId: string, data: Partial<Question>) =>
      apiFetch<Question>(`/forms/${formId}/questions/${questionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (formId: string, questionId: string) =>
      apiFetch<void>(`/forms/${formId}/questions/${questionId}`, { method: 'DELETE' }),
  },

  public: {
    getForm: (slug: string) => apiFetch<Form>(`/f/${slug}`),

    submit: (slug: string, data: SubmitFormRequest) =>
      apiFetch<{ id: string; form_id: string; submitted_at: string; message: string }>(`/f/${slug}/submit`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  contacts: {
    list: () => apiFetch<Contact[]>('/contacts'),
  },

  responses: {
    list: (formId: string) => apiFetch<ResponseListItem[]>(`/forms/${formId}/responses`),

    get: (formId: string, responseId: string) =>
      apiFetch<ResponseDetail>(`/forms/${formId}/responses/${responseId}`),

    stats: (formId: string) => apiFetch<FormStats>(`/forms/${formId}/responses/stats/summary`),

    exportCsvUrl: (formId: string) => `${BASE_URL}/forms/${formId}/responses/export/csv`,
  },
};
