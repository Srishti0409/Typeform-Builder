'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Form } from '@/lib/types';
import { buildThemeVars } from '@/lib/theme';
import { validateAnswer, coerceAnswer, isEmpty, type AnswerValue } from '@/lib/validation';
import ProgressBar from './ProgressBar';
import QuestionScreen from './QuestionScreen';
import WelcomeScreen from './WelcomeScreen';
import ThankYouScreen from './ThankYouScreen';
import NavButtons from './NavButtons';

type Phase = 'welcome' | 'question' | 'done';
type Direction = 'fwd' | 'back';

/** Matches the 0.22s exit animation in globals.css. */
const EXIT_MS = 220;

/**
 * Drives the public one-question-at-a-time experience: navigation, the
 * direction-aware slide/fade transition, client validation, and submission.
 *
 * The server re-validates everything on submit; when it disagrees we jump the
 * respondent back to the offending question rather than showing a generic error.
 */
export default function FormFill({
  form,
  preview = false,
}: {
  form: Form;
  /**
   * Runs the flow for the creator instead of a respondent: it fills its parent
   * rather than the viewport, and submitting shows the ending without recording
   * anything. Everything else — navigation, transitions, validation — is the
   * respondent's code path, so a preview cannot drift from the real thing.
   */
  preview?: boolean;
}) {
  const questions = useMemo(
    () => [...form.questions].sort((a, b) => a.order_index - b.order_index),
    [form.questions]
  );

  // A preview opens on the first question: the welcome screen is generated from
  // the form's title rather than authored here, so there is nothing on it for the
  // creator to check.
  const [phase, setPhase] = useState<Phase>(preview ? 'question' : 'welcome');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [anim, setAnim] = useState<string>('tf-enter-fwd');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Stamped when the respondent actually starts, not at render time.
  const startedAt = useRef<number>(0);
  // Guards against a double advance while the exit animation is mid-flight.
  const transitioning = useRef(false);

  /**
   * Mirror of `answers` that is always current.
   *
   * Fields that auto-advance (rating, choice, dropdown) call onAdvance from a
   * setTimeout or a window listener, so the callback they hold can be a render
   * behind. Validating against that stale copy made a just-answered question
   * fail as "required". Reading through this ref keeps advance()/submit() honest
   * and lets them stay referentially stable.
   */
  const answersRef = useRef<Record<string, AnswerValue>>({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const themeVars = useMemo(() => buildThemeVars(form.theme_config), [form.theme_config]);
  const current = questions[index];

  const progress = useMemo(() => {
    if (phase === 'welcome') return 0;
    if (phase === 'done') return 100;
    if (questions.length === 0) return 0;
    return (index / questions.length) * 100;
  }, [phase, index, questions.length]);

  /** Slides to a neighbouring question, honouring the exit/enter choreography. */
  const goTo = useCallback(
    (target: number, dir: Direction) => {
      if (transitioning.current) return;
      if (target < 0 || target >= questions.length) return;
      transitioning.current = true;
      setAnim(dir === 'fwd' ? 'tf-exit-fwd' : 'tf-exit-back');
      setTimeout(() => {
        setIndex(target);
        setAnim(dir === 'fwd' ? 'tf-enter-fwd' : 'tf-enter-back');
        transitioning.current = false;
      }, EXIT_MS);
    },
    [questions.length]
  );

  const submit = useCallback(async () => {
    // A preview must never create a response, and works on unpublished drafts
    // (which have no live slug to post to).
    if (preview) {
      setPhase('done');
      setAnim('tf-enter-fwd');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Only send answers the respondent actually gave; the server treats missing
    // required questions as validation failures anyway.
    const latest = answersRef.current;
    const payload = questions
      .filter(q => !isEmpty(latest[q.id]))
      .map(q => ({ question_id: q.id, answer_value: coerceAnswer(q, latest[q.id]) }));

    try {
      await api.public.submit(form.slug, {
        answers: payload,
        completion_time_seconds: startedAt.current
          ? Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
          : undefined,
      });
      setPhase('done');
      setAnim('tf-enter-fwd');
    } catch (err) {
      const serverErrors = err instanceof ApiError ? err.validationErrors : null;
      if (serverErrors) {
        setErrors(serverErrors);
        // Land the respondent on the first question the server rejected.
        const firstBad = questions.findIndex(q => serverErrors[q.id]);
        if (firstBad >= 0) {
          setIndex(firstBad);
          setAnim('tf-enter-back');
        }
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [questions, form.slug, preview]);

  /** Validates the current question, then advances or submits. */
  const advance = useCallback(() => {
    if (!current || transitioning.current || submitting) return;

    const message = validateAnswer(current, answersRef.current[current.id]);
    if (message) {
      setErrors(prev => ({ ...prev, [current.id]: message }));
      return;
    }
    setErrors(prev => {
      const next = { ...prev };
      delete next[current.id];
      return next;
    });

    if (index === questions.length - 1) void submit();
    else goTo(index + 1, 'fwd');
  }, [current, index, questions.length, goTo, submit, submitting]);

  const back = useCallback(() => goTo(index - 1, 'back'), [goTo, index]);

  const setValue = useCallback(
    (v: AnswerValue) => {
      if (!current) return;
      // Write through synchronously so an advance fired in the same tick as the
      // change (choice fields do this) already sees the new answer.
      answersRef.current = { ...answersRef.current, [current.id]: v };
      setAnswers(prev => ({ ...prev, [current.id]: v }));
      // Clear the error as soon as they start correcting it.
      setErrors(prev => {
        if (!prev[current.id]) return prev;
        const next = { ...prev };
        delete next[current.id];
        return next;
      });
    },
    [current]
  );

  // Global keyboard navigation. Inputs handle their own Enter, so skip those to
  // avoid advancing twice for one keypress.
  useEffect(() => {
    if (phase !== 'question') return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      // Fields own their own keys: inputs handle Enter, and the dropdown uses the
      // arrows to move through its options. Hijacking either skipped questions.
      const inField = !!target && /input|textarea|select/i.test(target.tagName);
      if (inField) return;

      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        advance();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        back();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, advance, back]);

  const startFill = useCallback(() => {
    startedAt.current = Date.now();
    setPhase('question');
    setAnim('tf-enter-fwd');
  }, []);

  return (
    <div
      style={{
        ...themeVars,
        backgroundColor: 'var(--tf-bg)',
        fontFamily: 'var(--tf-font)',
        // Screens size themselves against this, so a framed preview fills its
        // container while the public page still fills the window.
        ...(preview ? { ['--tf-screen-h' as string]: '100%' } : {}),
      }}
      className={preview ? 'relative h-full w-full overflow-y-auto' : 'relative min-h-screen w-full'}
    >
      {phase === 'question' && (
        <ProgressBar value={progress} anchor={preview ? 'absolute' : 'fixed'} />
      )}

      {phase === 'welcome' && (
        <WelcomeScreen
          title={form.title}
          description={form.description}
          questionCount={questions.length}
          onStart={startFill}
        />
      )}

      {phase === 'question' && current && (
        <>
          <QuestionScreen
            key={current.id}
            question={current}
            index={index}
            value={answers[current.id]}
            error={errors[current.id] ?? null}
            onChange={setValue}
            onAdvance={advance}
            isLast={index === questions.length - 1}
            submitting={submitting}
            animationClass={anim}
          />
          <NavButtons
            onPrev={back}
            onNext={advance}
            canPrev={index > 0}
            canNext={index < questions.length - 1}
            anchor={preview ? 'absolute' : 'fixed'}
          />
        </>
      )}

      {phase === 'question' && !current && (
        <div className="flex h-full min-h-[240px] items-center justify-center">
          <p style={{ color: 'var(--tf-text)' }}>This form has no questions yet.</p>
        </div>
      )}

      {phase === 'done' && (
        <ThankYouScreen title={form.thank_you_title} message={form.thank_you_message} />
      )}

      {submitError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg animate-fadeIn"
          style={{ backgroundColor: '#d92d20' }}
        >
          {submitError}
        </div>
      )}
    </div>
  );
}
