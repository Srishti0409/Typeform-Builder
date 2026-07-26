/**
 * Turns a plain-language goal ("collect feedback about our coffee subscription")
 * into a concrete starter form.
 *
 * This is deterministic keyword matching, NOT a language model — there is no AI
 * service behind this build. It reads the goal for recognisable intents and
 * assembles a question set from a rule table, which is enough to make the
 * "describe your form" entry point genuinely productive: every question it
 * emits is a real question created through the normal API.
 */
import type { QuestionType, QuestionSettings } from './types';

export interface PlannedQuestion {
  question_type: QuestionType;
  title: string;
  description?: string;
  is_required?: boolean;
  placeholder?: string;
  options?: string[];
  settings?: QuestionSettings;
}

export interface FormPlan {
  title: string;
  questions: PlannedQuestion[];
}

/** Reusable question fragments, keyed so overlapping rules don't duplicate them. */
const Q: Record<string, PlannedQuestion> = {
  name: {
    question_type: 'short_text',
    title: 'What’s your name?',
    is_required: true,
    placeholder: 'Jane Smith',
  },
  email: {
    question_type: 'email',
    title: 'What’s your email address?',
    description: 'We’ll only use this to follow up.',
    is_required: true,
    placeholder: 'name@example.com',
  },
  company: {
    question_type: 'short_text',
    title: 'Which company do you work for?',
    placeholder: 'Acme Inc.',
  },
  satisfaction: {
    question_type: 'rating',
    title: 'Overall, how satisfied are you?',
    description: '1 = Very dissatisfied, 5 = Very satisfied',
    is_required: true,
    settings: { max_rating: 5, shape: 'star' },
  },
  liked: {
    question_type: 'multiple_choice',
    title: 'What did you like most?',
    options: ['Quality', 'Speed', 'Price', 'Support'],
    settings: { allow_multiple: true },
  },
  improve: {
    question_type: 'long_text',
    title: 'What could we do better?',
    placeholder: 'Share as much detail as you like',
  },
  recommend: {
    question_type: 'yes_no',
    title: 'Would you recommend us to a friend or colleague?',
    is_required: true,
  },
  heardAbout: {
    question_type: 'dropdown',
    title: 'How did you hear about us?',
    options: ['Search', 'Social media', 'Friend or colleague', 'Advertising', 'Other'],
  },
  session: {
    question_type: 'dropdown',
    title: 'Which session will you attend?',
    options: ['Morning', 'Afternoon', 'Evening'],
    is_required: true,
  },
  guests: {
    question_type: 'number',
    title: 'How many guests are you bringing?',
    settings: { limit_min: true, min: 0, limit_max: true, max: 10 },
  },
  dietary: {
    question_type: 'short_text',
    title: 'Any dietary requirements?',
    placeholder: 'Vegetarian, allergies, none…',
  },
  role: {
    question_type: 'short_text',
    title: 'Which role are you applying for?',
    is_required: true,
    placeholder: 'Frontend Engineer',
  },
  experience: {
    question_type: 'dropdown',
    title: 'How many years of experience do you have?',
    options: ['Less than 1', '1–3', '3–5', '5–10', 'More than 10'],
  },
  motivation: {
    question_type: 'long_text',
    title: 'Why do you want to join us?',
    is_required: true,
    placeholder: 'Tell us what draws you to this role',
  },
  product: {
    question_type: 'dropdown',
    title: 'Which product would you like?',
    options: ['Option A', 'Option B', 'Option C'],
    is_required: true,
  },
  quantity: {
    question_type: 'number',
    title: 'How many would you like?',
    is_required: true,
    settings: { limit_min: true, min: 1, limit_max: true, max: 99 },
  },
  usage: {
    question_type: 'multiple_choice',
    title: 'How often do you use it?',
    options: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
  },
  opinion: {
    question_type: 'long_text',
    title: 'What’s your view on this topic?',
    placeholder: 'Share your thinking',
  },
  interest: {
    question_type: 'multiple_choice',
    title: 'Which topics interest you most?',
    options: ['Research', 'Product', 'Design', 'Engineering'],
    settings: { allow_multiple: true },
  },
};

/**
 * Intent rules, checked in order. Every match contributes its questions; the
 * first match also names the form.
 */
const RULES: { match: RegExp; title: string; keys: string[] }[] = [
  {
    match: /feedback|satisf|review|rating|nps|how (did|was)|experience/,
    title: 'Customer Feedback',
    keys: ['satisfaction', 'liked', 'improve', 'recommend'],
  },
  {
    match: /event|registration|register|rsvp|conference|webinar|workshop|meetup|ticket/,
    title: 'Event Registration',
    keys: ['name', 'email', 'session', 'guests', 'dietary'],
  },
  {
    match: /job|applicat|hiring|candidate|recruit|resume|cv|role/,
    title: 'Job Application',
    keys: ['name', 'email', 'role', 'experience', 'motivation'],
  },
  {
    match: /order|purchase|buy|checkout|shop|product request/,
    title: 'Order Form',
    keys: ['name', 'email', 'product', 'quantity'],
  },
  {
    match: /lead|signup|sign up|waitlist|newsletter|subscribe|contact us|enquir|inquir|demo/,
    title: 'Lead Capture',
    keys: ['name', 'email', 'company', 'heardAbout'],
  },
  {
    match: /research|study|opinion|academic|literature|expert|interview|poll/,
    title: 'Research Survey',
    keys: ['interest', 'opinion', 'email'],
  },
  {
    match: /survey|questionnaire|quiz|usage|market/,
    title: 'Survey',
    keys: ['usage', 'liked', 'improve'],
  },
];

/** Sensible default when the goal matches nothing we recognise. */
const FALLBACK_KEYS = ['name', 'email', 'improve'];

const MAX_QUESTIONS = 7;

/** Trims a goal down to something usable as a form title. */
function titleFromGoal(goal: string): string {
  const cleaned = goal
    .replace(/^\s*(i\s+want\s+to|i'd\s+like\s+to|help\s+me|create|build|make|a|an)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'New form';
  const words = cleaned.split(' ').slice(0, 7).join(' ');
  const short = words.replace(/[.,;:!?]+$/, '');
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/**
 * Builds a form plan from a free-text goal.
 * Always returns at least two questions so the result is immediately usable.
 */
export function planFormFromGoal(goal: string): FormPlan {
  const text = goal.toLowerCase();
  const matched = RULES.filter(r => r.match.test(text));

  // Preserve rule order and drop repeats across overlapping intents.
  const keys: string[] = [];
  for (const rule of matched) {
    for (const k of rule.keys) if (!keys.includes(k)) keys.push(k);
  }
  if (keys.length === 0) keys.push(...FALLBACK_KEYS);

  // An explicit mention of email should guarantee we collect one.
  if (/email|e-mail|contact/.test(text) && !keys.includes('email')) keys.unshift('email');

  const questions = keys
    .slice(0, MAX_QUESTIONS)
    .map(k => Q[k])
    .filter((q): q is PlannedQuestion => Boolean(q));

  // Prefer the goal's own wording for the title, falling back to the intent name.
  const derived = titleFromGoal(goal);
  const title = derived === 'New form' && matched[0] ? matched[0].title : derived;

  return { title, questions };
}

/** Starter goals offered by the composer's "+" menu. */
export const GOAL_TEMPLATES: { label: string; goal: string }[] = [
  { label: 'Customer feedback', goal: 'Collect feedback about our service so we can improve it' },
  { label: 'Event registration', goal: 'Register attendees for our upcoming conference' },
  { label: 'Job application', goal: 'Accept applications for an open engineering role' },
  { label: 'Lead capture', goal: 'Capture leads and contact details from our website' },
  { label: 'Research survey', goal: 'Gather expert opinions on recent studies for a literature review' },
  { label: 'Product order', goal: 'Take product orders with quantity and contact details' },
];
