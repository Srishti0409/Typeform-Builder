import type {
  Form,
  FormListItem,
  Question,
  FormStats,
  ResponseListItem,
  ResponseDetail,
  SubmitFormRequest,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error?.detail ?? 'API error');
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

  responses: {
    list: (formId: string) => apiFetch<ResponseListItem[]>(`/forms/${formId}/responses`),

    get: (formId: string, responseId: string) =>
      apiFetch<ResponseDetail>(`/forms/${formId}/responses/${responseId}`),

    stats: (formId: string) => apiFetch<FormStats>(`/forms/${formId}/responses/stats/summary`),

    exportCsvUrl: (formId: string) => `${BASE_URL}/forms/${formId}/responses/export/csv`,
  },
};
