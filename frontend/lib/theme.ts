/**
 * Turns a form's stored theme_config into the CSS custom properties the
 * respondent components style themselves from.
 *
 * Typeform separates theme (colour / font / radius) from layout, which is why
 * the harvested :root exposed a `--sampler-theme-border-radius`. We mirror that
 * split: geometry lives in globals.css, colour is injected per form here.
 */
import type { ThemeConfig } from './types';
import { defaultTheme } from './design-tokens';

/** Parses #rgb / #rrggbb into an `r, g, b` string usable inside rgba(). */
function toRgbTriplet(hex: string): string {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return '4, 69, 175'; // default blue
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Picks black or white text for a given background, by perceived luminance. */
export function readableOn(hex: string): string {
  const [r, g, b] = toRgbTriplet(hex).split(',').map(v => parseInt(v, 10));
  // Rec. 709 luma
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.6 ? '#1c1c1c' : '#ffffff';
}

export type ThemeVars = React.CSSProperties & Record<`--${string}`, string>;

export function buildThemeVars(theme?: ThemeConfig | null): ThemeVars {
  const primary = theme?.primaryColor || defaultTheme.primary;
  const background = theme?.backgroundColor || defaultTheme.background;
  const font = theme?.fontFamily || defaultTheme.fontFamily;

  const primaryRgb = toRgbTriplet(primary);
  // Text colour tracks the background so custom themes stay legible.
  const text = readableOn(background) === '#ffffff' ? '#ffffff' : defaultTheme.text;
  const textRgb = toRgbTriplet(text === '#ffffff' ? '#ffffff' : defaultTheme.text);

  return {
    '--tf-primary': primary,
    '--tf-primary-rgb': primaryRgb,
    '--tf-primary-text': readableOn(primary),
    '--tf-bg': background,
    '--tf-text': text,
    '--tf-text-rgb': textRgb,
    '--tf-placeholder': `rgba(${textRgb}, 0.4)`,
    '--tf-choice-bg': `rgba(${primaryRgb}, 0.06)`,
    '--tf-choice-border': `rgba(${primaryRgb}, 0.3)`,
    '--tf-choice-hover-bg': `rgba(${primaryRgb}, 0.14)`,
    '--tf-choice-key-bg': `rgba(${primaryRgb}, 0.12)`,
    '--tf-underline': `rgba(${primaryRgb}, 0.45)`,
    '--tf-underline-focus': primary,
    '--tf-font': `${font}, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  } as ThemeVars;
}
