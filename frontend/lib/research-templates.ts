import type { QuestionType } from './types';

export interface DraftQuestion {
  question_type: QuestionType;
  title: string;
  description?: string;
  is_required: boolean;
  placeholder?: string;
  options?: string[];
  settings?: Record<string, unknown>;
}

export interface ResearchTemplate {
  id: string;
  label: string;
  blurb: string;
  /** Matched against the stated goal, lower-cased. */
  keywords: string[];
  formTitle: string;
  questions: DraftQuestion[];
}

/**
 * Research Flow's question bank.
 *
 * Drafting is keyword matching over these templates rather than a model call:
 * the value on show is the hand-off — a stated goal becomes a real form, with
 * question types chosen to suit what is being asked, ready to edit and publish.
 */
export const RESEARCH_TEMPLATES: ResearchTemplate[] = [
  {
    id: 'expert-opinions',
    label: 'Gather expert opinions',
    blurb: 'Collect structured views from specialists to support a literature review.',
    keywords: ['expert', 'opinion', 'literature', 'review', 'study', 'studies', 'academic', 'panel'],
    formTitle: 'Expert opinion panel',
    questions: [
      { question_type: 'short_text', title: 'What is your name?', is_required: true, placeholder: 'Dr. Jane Okafor' },
      { question_type: 'email', title: 'What email should we use to follow up?', is_required: true, placeholder: 'name@institution.edu' },
      { question_type: 'short_text', title: 'What is your field of expertise?', is_required: true, placeholder: 'Health economics' },
      { question_type: 'number', title: 'How many years have you worked in this field?', is_required: false, settings: { limit_min: true, min: 0, limit_max: true, max: 60 } },
      { question_type: 'long_text', title: 'Which findings in the recent literature do you consider most robust?', description: 'Cite the studies if you can.', is_required: true },
      { question_type: 'long_text', title: 'Where do you see the biggest gap in the current evidence?', is_required: false },
      { question_type: 'rating', title: 'How confident are you in the current consensus?', is_required: true, settings: { max_rating: 5, shape: 'star' } },
      { question_type: 'yes_no', title: 'May we quote you in the published review?', is_required: true },
    ],
  },
  {
    id: 'discovery',
    label: 'Customer discovery',
    blurb: 'Understand the problem before you build the fix.',
    keywords: ['discovery', 'interview', 'problem', 'customer', 'audience', 'jobs', 'pain'],
    formTitle: 'Customer discovery',
    questions: [
      { question_type: 'short_text', title: 'What is your name?', is_required: true, placeholder: 'Jane' },
      { question_type: 'email', title: 'Where can we reach you?', is_required: true, placeholder: 'jane@company.com' },
      { question_type: 'multiple_choice', title: 'Which best describes your role?', is_required: true, options: ['Founder', 'Product', 'Engineering', 'Marketing', 'Operations', 'Something else'] },
      { question_type: 'long_text', title: 'Walk us through the last time you ran into this problem.', is_required: true },
      { question_type: 'multiple_choice', title: 'How do you handle it today?', is_required: true, options: ['A spreadsheet', 'A paid tool', 'An internal build', 'Nothing yet'] },
      { question_type: 'rating', title: 'How painful is this problem for you?', is_required: true, settings: { max_rating: 5, shape: 'star' } },
      { question_type: 'yes_no', title: 'Would you join a 30-minute follow-up call?', is_required: false },
    ],
  },
  {
    id: 'product-feedback',
    label: 'Product feedback',
    blurb: 'Find out what is working and what to fix next.',
    keywords: ['feedback', 'product', 'feature', 'improve', 'release', 'beta', 'usab'],
    formTitle: 'Product feedback',
    questions: [
      { question_type: 'email', title: 'What is your email?', is_required: true, placeholder: 'you@company.com' },
      { question_type: 'rating', title: 'How would you rate your experience so far?', is_required: true, settings: { max_rating: 5, shape: 'star' } },
      { question_type: 'multiple_choice', title: 'Which part do you use most?', is_required: true, options: ['Building forms', 'Sharing forms', 'Reading results', 'Exporting data'] },
      { question_type: 'long_text', title: 'What is the one thing we should improve first?', is_required: true },
      { question_type: 'multiple_choice', title: 'What almost stopped you from finishing?', is_required: false, options: ['Too many steps', 'Unclear wording', 'Something was slow', 'Nothing at all'] },
      { question_type: 'yes_no', title: 'Would you recommend us to a colleague?', is_required: true },
    ],
  },
  {
    id: 'market-sizing',
    label: 'Market sizing',
    blurb: 'Size the demand, the budget and who decides.',
    keywords: ['market', 'sizing', 'pricing', 'price', 'budget', 'willingness', 'demand', 'competitor'],
    formTitle: 'Market sizing survey',
    questions: [
      { question_type: 'multiple_choice', title: 'How large is your company?', is_required: true, options: ['Just me', '2–10', '11–50', '51–200', '200+'] },
      { question_type: 'dropdown', title: 'Which industry are you in?', is_required: true, options: ['Software', 'Education', 'Healthcare', 'Retail', 'Finance', 'Non-profit', 'Other'] },
      { question_type: 'number', title: 'What do you spend on tools like this each month, in dollars?', is_required: false, settings: { limit_min: true, min: 0, limit_max: true, max: 100000 } },
      { question_type: 'multiple_choice', title: 'Who signs off on a purchase like this?', is_required: true, options: ['I do', 'My manager', 'A committee', 'Procurement'] },
      { question_type: 'rating', title: 'How urgent is solving this in the next quarter?', is_required: true, settings: { max_rating: 5, shape: 'number' } },
      { question_type: 'email', title: 'Where should we send the results?', is_required: false, placeholder: 'you@company.com' },
    ],
  },
  {
    id: 'nps',
    label: 'Satisfaction check',
    blurb: 'A short pulse you can send on a schedule.',
    keywords: ['nps', 'satisfaction', 'loyalty', 'recommend', 'churn', 'pulse', 'csat'],
    formTitle: 'Satisfaction pulse',
    questions: [
      { question_type: 'rating', title: 'How likely are you to recommend us?', description: '1 is not at all, 10 is enthusiastically.', is_required: true, settings: { max_rating: 10, shape: 'number' } },
      { question_type: 'long_text', title: 'What is the main reason for your score?', is_required: true },
      { question_type: 'multiple_choice', title: 'How long have you been with us?', is_required: false, options: ['Under a month', '1–6 months', '6–12 months', 'Over a year'] },
      { question_type: 'yes_no', title: 'May we contact you about your answer?', is_required: false },
      { question_type: 'email', title: 'Your email, if so', is_required: false, placeholder: 'you@company.com' },
    ],
  },
  {
    id: 'event',
    label: 'Event feedback',
    blurb: 'Close the loop after a talk, workshop or conference.',
    keywords: ['event', 'conference', 'workshop', 'talk', 'session', 'attend', 'webinar'],
    formTitle: 'Event feedback',
    questions: [
      { question_type: 'short_text', title: 'What is your name?', is_required: false, placeholder: 'Jane' },
      { question_type: 'email', title: 'What is your email?', is_required: true, placeholder: 'you@company.com' },
      { question_type: 'rating', title: 'How would you rate the event overall?', is_required: true, settings: { max_rating: 5, shape: 'star' } },
      { question_type: 'multiple_choice', title: 'Which session was most useful?', is_required: true, options: ['Opening keynote', 'Workshops', 'Panel discussion', 'Closing remarks'] },
      { question_type: 'long_text', title: 'What should we do differently next time?', is_required: false },
      { question_type: 'yes_no', title: 'Would you attend again?', is_required: true },
    ],
  },
];

/** The template whose keywords the goal hits hardest; discovery if none do. */
export function matchTemplate(goal: string): ResearchTemplate {
  const text = goal.toLowerCase();
  let best: { template: ResearchTemplate; score: number } | null = null;

  for (const template of RESEARCH_TEMPLATES) {
    const score = template.keywords.reduce((n, kw) => (text.includes(kw) ? n + 1 : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { template, score };
  }

  return best?.template ?? RESEARCH_TEMPLATES.find(t => t.id === 'discovery')!;
}

/** Titles the form after the goal itself when the goal is short enough to read. */
export function titleFor(goal: string, template: ResearchTemplate): string {
  const trimmed = goal.trim().replace(/\s+/g, ' ');
  if (!trimmed) return template.formTitle;
  if (trimmed.length <= 60) return trimmed[0].toUpperCase() + trimmed.slice(1);
  return template.formTitle;
}
