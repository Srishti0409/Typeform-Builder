'use client';

import type { Question } from '@/lib/types';
import type { AnswerValue } from '@/lib/validation';
import TextField from './TextField';
import ChoiceField from './ChoiceField';
import DropdownField from './DropdownField';
import RatingField from './RatingField';

/**
 * Maps a question type onto its input component. Single place to register a new
 * type, so neither the orchestrator nor the builder preview needs to know the
 * per-type rendering rules.
 */
export default function AnswerField(props: {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  /** Advance to the next question — used by inputs that auto-advance. */
  onAdvance: () => void;
}) {
  const { question } = props;

  switch (question.question_type) {
    case 'short_text':
    case 'long_text':
    case 'email':
    case 'number':
      return (
        <TextField
          question={question}
          value={props.value}
          onChange={props.onChange}
          onEnter={props.onAdvance}
        />
      );

    case 'multiple_choice':
    case 'yes_no':
      return <ChoiceField {...props} />;

    case 'dropdown':
      return <DropdownField {...props} />;

    case 'rating':
      return <RatingField {...props} />;

    default:
      return null;
  }
}
