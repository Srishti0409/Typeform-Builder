/**
 * Surfaces this build shows but does not run.
 *
 * They stay visible and dimmed — the `.oos` class in globals.css, which is
 * `opacity: .5` plus `cursor: not-allowed` — rather than being deleted, so the app
 * still reads like Typeform without implying it does something it can't.
 *
 * The wiring behind each one is left intact, so flipping a flag back to true is
 * all it takes to restore the feature.
 */
export const ENABLED: Record<'aiAssist' | 'automations' | 'researchFlow', boolean> = {
  /**
   * Anything that drafts questions for you: the workspace suggestion banner, the
   * sidebar's "Ask Typeform AI" box, the "New form" goal composer, the builder's
   * "Chat to create" bar, and the Add content dialog's "Create with AI" tab.
   */
  aiAssist: false,
  automations: false,
  researchFlow: false,
};

/** One wording for everything switched off, so the tooltips agree. */
export const UNAVAILABLE = 'Not available in this build';
