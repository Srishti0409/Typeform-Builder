import {
  Type, AlignLeft, CheckSquare, List, Mail, Hash, ToggleLeft, Star,
  Phone, MapPin, Link2, Image, Scale, Gauge, BarChart3, ListOrdered,
  Grid3X3, Calendar, PenLine, Quote, PanelTop, Contact, Upload, CreditCard,
} from 'lucide-react';
import type { Question, QuestionType } from './types';

/** Groupings used by the element picker, in the order Typeform shows them. */
export const ELEMENT_CATEGORIES = [
  'Contact info',
  'Choice',
  'Rating & ranking',
  'Text & Video',
  'Other',
] as const;

export type ElementCategory = (typeof ELEMENT_CATEGORIES)[number];

/**
 * Question type registry — label, icon and blurb for each supported type.
 *
 * Lives here rather than in the builder so the builder, the preview pane and the
 * results summary can all share it without depending on each other.
 */
export const QUESTION_TYPES: {
  type: QuestionType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: ElementCategory;
  /** Extra words the element picker's search should match on. */
  keywords?: string[];
}[] = [
  { type: 'short_text',      label: 'Short Text',      icon: <Type size={14} />,        description: 'Single-line text answer',    category: 'Text & Video', keywords: ['name', 'input', 'line'] },
  { type: 'long_text',       label: 'Long Text',       icon: <AlignLeft size={14} />,   description: 'Multi-line text answer',     category: 'Text & Video', keywords: ['paragraph', 'comment', 'feedback', 'textarea'] },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: <CheckSquare size={14} />, description: 'Select one or more options',  category: 'Choice',       keywords: ['radio', 'options', 'select', 'pick'] },
  { type: 'dropdown',        label: 'Dropdown',        icon: <List size={14} />,        description: 'Choose from a list',         category: 'Choice',       keywords: ['select', 'list', 'combobox'] },
  { type: 'yes_no',          label: 'Yes/No',          icon: <ToggleLeft size={14} />,  description: 'Binary choice',              category: 'Choice',       keywords: ['boolean', 'toggle', 'true false'] },
  { type: 'email',           label: 'Email',           icon: <Mail size={14} />,        description: 'Valid email address',        category: 'Contact info', keywords: ['mail', 'address', 'contact'] },
  { type: 'number',          label: 'Number',          icon: <Hash size={14} />,        description: 'Numeric value',              category: 'Other',        keywords: ['numeric', 'quantity', 'age', 'amount'] },
  { type: 'rating',          label: 'Rating',          icon: <Star size={14} />,        description: 'Star rating scale',          category: 'Rating & ranking', keywords: ['stars', 'score', 'satisfaction'] },
];

export function getTypeInfo(type: QuestionType) {
  return QUESTION_TYPES.find(t => t.type === type) ?? QUESTION_TYPES[0];
}

/** Icon tint per category, so type icons scan the way Typeform's do. */
export const CATEGORY_TINT: Record<ElementCategory, { bg: string; fg: string }> = {
  'Contact info':     { bg: '#fdeceb', fg: '#c0392b' },
  'Choice':           { bg: '#eaf1fd', fg: '#2b62c4' },
  'Rating & ranking': { bg: '#e9f6ef', fg: '#177767' },
  'Text & Video':     { bg: '#eef0fd', fg: '#4b3f9e' },
  'Other':            { bg: '#fdf3e7', fg: '#b45309' },
};

export function getTypeTint(type: QuestionType) {
  return CATEGORY_TINT[getTypeInfo(type).category];
}

/** The ghost text a type's answer field shows when nothing is authored. */
export function defaultPlaceholder(type: QuestionType): string {
  if (type === 'email') return 'name@example.com';
  // The dropdown is a type-to-filter combobox, so its ghost text says so.
  if (type === 'dropdown') return 'Type or select an option';
  return 'Type your answer here...';
}

/**
 * What the answer field actually shows as ghost text. Shared by the builder
 * canvas and the respondent's field, so editing the placeholder on the right
 * shows up on the canvas exactly as the respondent will see it.
 */
export function effectivePlaceholder(
  question: Pick<Question, 'question_type' | 'placeholder'>,
): string {
  return question.placeholder?.trim() || defaultPlaceholder(question.question_type);
}

/**
 * Elements Typeform offers that this build does not implement.
 *
 * The picker still lists them — omitting them entirely would misrepresent the
 * product — but they are inert, matching how the rest of the app treats
 * out-of-scope features.
 */
export const UNSUPPORTED_ELEMENTS: {
  label: string;
  icon: React.ReactNode;
  category: ElementCategory;
}[] = [
  { label: 'Contact Info',       icon: <Contact size={14} />,     category: 'Contact info' },
  { label: 'Phone Number',       icon: <Phone size={14} />,       category: 'Contact info' },
  { label: 'Address',            icon: <MapPin size={14} />,      category: 'Contact info' },
  { label: 'Website',            icon: <Link2 size={14} />,       category: 'Contact info' },
  { label: 'Picture Choice',     icon: <Image size={14} />,       category: 'Choice' },
  { label: 'Legal',              icon: <Scale size={14} />,       category: 'Choice' },
  { label: 'Checkbox',           icon: <CheckSquare size={14} />, category: 'Choice' },
  { label: 'Net Promoter Score', icon: <Gauge size={14} />,       category: 'Rating & ranking' },
  { label: 'Opinion Scale',      icon: <BarChart3 size={14} />,   category: 'Rating & ranking' },
  { label: 'Ranking',            icon: <ListOrdered size={14} />, category: 'Rating & ranking' },
  { label: 'Matrix',             icon: <Grid3X3 size={14} />,     category: 'Rating & ranking' },
  { label: 'Video and Audio',    icon: <PanelTop size={14} />,    category: 'Text & Video' },
  { label: 'Statement',          icon: <Quote size={14} />,       category: 'Other' },
  { label: 'Date',               icon: <Calendar size={14} />,    category: 'Other' },
  { label: 'Signature',          icon: <PenLine size={14} />,     category: 'Other' },
  { label: 'File Upload',        icon: <Upload size={14} />,      category: 'Other' },
  { label: 'Payment',            icon: <CreditCard size={14} />,  category: 'Other' },
];
