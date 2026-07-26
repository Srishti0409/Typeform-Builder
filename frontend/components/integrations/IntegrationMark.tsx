'use client';

import type { Integration } from '@/lib/integrations';
import { readableOn } from '@/lib/theme';

/**
 * Stands in for an app's logo: its brand colour with a monogram, legible either
 * way round because the foreground is picked from the background's luminance.
 * No remote asset, so the catalogue renders offline.
 */
export default function IntegrationMark({
  integration,
  size = 40,
}: {
  integration: Integration;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="flex flex-shrink-0 items-center justify-center rounded-[10px] font-semibold leading-none"
      style={{
        width: size,
        height: size,
        backgroundColor: integration.color,
        color: readableOn(integration.color),
        fontSize: Math.round(size * 0.36),
      }}
    >
      {integration.mark}
    </span>
  );
}
