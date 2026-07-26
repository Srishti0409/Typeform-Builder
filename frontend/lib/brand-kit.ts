'use client';

import { useStoredState } from './local-store';
import { defaultTheme } from './design-tokens';
import { api } from './api';
import type { ThemeConfig } from './types';

export interface BrandKit {
  name: string;
  /** Data URL. Kept client-side: `theme_config` is not a place for binaries. */
  logo: string | null;
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  /** Theme new forms with this kit the moment they are created. */
  applyToNewForms: boolean;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  name: 'My brand',
  logo: null,
  primaryColor: defaultTheme.primary,
  backgroundColor: defaultTheme.background,
  fontFamily: defaultTheme.fontFamily,
  applyToNewForms: false,
};

/**
 * Only fonts that resolve without a network request — the respondent flow ships
 * no webfonts, so offering Montserrat here would silently render as Helvetica.
 */
export const BRAND_FONTS: { name: string; stack: string }[] = [
  { name: 'Inter', stack: 'Inter, system-ui, sans-serif' },
  { name: 'Segoe UI', stack: '"Segoe UI", system-ui, sans-serif' },
  { name: 'Helvetica', stack: 'Helvetica, Arial, sans-serif' },
  { name: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { name: 'Trebuchet MS', stack: '"Trebuchet MS", sans-serif' },
  { name: 'Georgia', stack: 'Georgia, serif' },
  { name: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
  { name: 'Courier New', stack: '"Courier New", Courier, monospace' },
];

/** Ready-made pairings, so a kit can be set up in one click. */
export const BRAND_PALETTES: { name: string; primaryColor: string; backgroundColor: string }[] = [
  { name: 'Classic', primaryColor: '#0445AF', backgroundColor: '#FFFFFF' },
  { name: 'Forest', primaryColor: '#177767', backgroundColor: '#F4FAF8' },
  { name: 'Violet', primaryColor: '#4B3F9E', backgroundColor: '#F7F2FD' },
  { name: 'Ember', primaryColor: '#C0562A', backgroundColor: '#FDF5EF' },
  { name: 'Midnight', primaryColor: '#E8E3DA', backgroundColor: '#2B232D' },
];

/** The kit as a form theme — colour and type are exactly `theme_config`'s job. */
export function brandKitTheme(kit: BrandKit): ThemeConfig {
  return {
    primaryColor: kit.primaryColor,
    backgroundColor: kit.backgroundColor,
    fontFamily: kit.fontFamily,
  };
}

/**
 * Themes a just-created form with the kit, when the kit is set to do that.
 * Shared by every path that creates a form (the dashboard, Research Flow).
 */
export async function applyKitToNewForm(kit: BrandKit, formId: string): Promise<void> {
  if (!kit.applyToNewForms) return;
  await api.forms.update(formId, {
    theme_config: brandKitTheme(kit) as unknown as Record<string, unknown>,
  });
}

/** A data URL this big is a localStorage quota risk; 512 KB is generous for a logo. */
export const MAX_LOGO_BYTES = 512 * 1024;

export function useBrandKit() {
  return useStoredState<BrandKit>('brand-kit', DEFAULT_BRAND_KIT);
}
