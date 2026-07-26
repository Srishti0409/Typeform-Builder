/**
 * Design tokens measured from the live Typeform application.
 *
 * These are not eyeballed values. They were extracted with Playwright by
 * walking the rendered DOM of the real Typeform renderer and reading
 * getComputedStyle() off every visible element, plus mining the stylesheets
 * for :hover/:focus rules and @keyframes (interaction and motion never show up
 * in a static computed-style snapshot).
 *
 * Provenance:
 *   respondent geometry + motion — form.typeform.com public form renderer,
 *     harvested at viewport 1512x900 @2x
 *   spacing scale + radii        — Typeform's own `--spacing-*` /
 *     `--sampler-*-radius-*` custom properties, read off :root
 *
 * Layout/typography/motion are theme-independent, so they are fixed here.
 * Colour, font family and border radius ARE theme-driven in Typeform (see
 * `--sampler-theme-border-radius`), so they live in the theme layer and are
 * overridable per form via Form.theme_config.
 */

/** Typeform's spacing scale, read from its own --spacing-* custom properties. */
export const spacing = {
  50: 4,
  100: 8,
  150: 12,
  250: 20,
  300: 24,
  400: 32,
  450: 36,
  500: 40,
  550: 44,
  600: 48,
} as const;

/**
 * Respondent (public fill) geometry, measured at a 1512px viewport.
 * The content column is exactly 720px wide and horizontally centred:
 * measured x=396 === (1512 - 720) / 2.
 */
export const respondent = {
  /** Content column width. Measured: input width exactly 720px. */
  blockWidth: 720,

  /** Question number badge, sitting in the gutter left of the column. */
  badge: {
    width: 16,
    height: 19,
    fontSize: 11,
    fontWeight: 700,
    /** Measured x=370 against a column at x=396. */
    gutterOffset: 26,
  },

  /** Question headline. Measured 26px/30px, weight 400 — not bold. */
  title: { fontSize: 26, lineHeight: 30, fontWeight: 400 },

  /** Help/description text and field labels. */
  label: { fontSize: 20, lineHeight: 26, fontWeight: 400 },

  /** Text/email/number input: underline only, oversized type. */
  input: { height: 50, fontSize: 26, fontWeight: 400, borderBottomWidth: 1 },

  /** Long text. */
  textarea: { fontSize: 26, minHeight: 50 },

  /** The OK / submit affordance. */
  okButton: { height: 40, fontSize: 18, fontWeight: 600, paddingX: 8 },

  /** Choice rows for multiple choice / dropdown / yes-no. */
  choice: { height: 44, gap: 8, minWidth: 256, fontSize: 18, fontWeight: 400 },

  /** The A/B/C keyboard-shortcut badge inside each choice row. */
  choiceKey: { size: 24, fontSize: 12, fontWeight: 600, radius: 4 },

  /** Top progress bar: 3px tall, inset 6px, 4px from top, fully rounded. */
  progress: { height: 3, inset: 6, top: 4, radius: 32 },

  /** Paired prev/next control, bottom right. Measured 32x32 at x=1242/1276. */
  navButton: { size: 32, gap: 2 },

  /** Vertical rhythm between stacked elements, measured from element rects. */
  gap: { titleToBody: 72, labelToInput: 8, betweenFields: 32, bodyToButton: 32 },
} as const;

/**
 * Motion. Mined from Typeform's @keyframes and computed transitions.
 * The signature question change is a 20px vertical slide crossfaded with
 * opacity — NOT a horizontal slide.
 */
export const motion = {
  /** easeOutCubic — Typeform's transition curve for every interactive state. */
  ease: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  /** Used for sheets/overlays sliding in. */
  easeSheet: 'cubic-bezier(0.32, 0.72, 0, 1)',

  /** Measured: background-color/color/border-color 0.25s. */
  hoverDuration: 250,
  /** Measured: `width 0.2s ease-in-out` on the progress indicator. */
  progressDuration: 200,

  /** @keyframes slideIn/slideOut translate by exactly 20px. */
  slideDistance: 20,
  /** Question enter/exit duration. */
  questionDuration: 400,
} as const;

/** Radii, from Typeform's --sampler-*-radius-* custom properties. */
export const radius = {
  none: 0,
  xsm: 2,
  sm: 4,
  md: 8,
  xmd: 12,
  xxmd: 16,
  lg: 20,
  circle: '100%',
  /** Theme-controlled; 4px is Typeform's default. */
  theme: 4,
} as const;

/**
 * Default respondent theme. Typeform's out-of-the-box form theme is a light
 * surface with near-black text and a blue accent; a form's stored
 * theme_config overrides any of these at render time.
 */
export const defaultTheme = {
  background: '#FFFFFF',
  text: '#3D3D3D',
  primary: '#0445AF',
  primaryText: '#FFFFFF',
  /** Derived: choice rows use the accent at low alpha over the background. */
  choiceBg: 'rgba(4, 69, 175, 0.06)',
  choiceBorder: 'rgba(4, 69, 175, 0.25)',
  choiceHoverBg: 'rgba(4, 69, 175, 0.12)',
  placeholder: 'rgba(61, 61, 61, 0.4)',
  fontFamily: 'Inter',
} as const;

export type RespondentTheme = {
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  backgroundImage?: string;
};
