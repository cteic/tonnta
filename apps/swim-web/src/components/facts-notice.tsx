'use client';

import { useAppTheme } from '@tonnta/web-shell';

import { SITE_NAME } from '@/lib/site';

/** The standing line on every page: what the site is, and what it is not. */
export const FACTS_NOTICE = `${SITE_NAME} shows facts from the EPA and weather models. It does not say whether it is safe to swim. Local signs, lifeguards and beaches.ie have the latest notices.`;

export function FactsNotice() {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <p
      role="note"
      style={{
        margin: 0,
        padding: '12px 14px',
        fontSize: 14,
        lineHeight: 1.5,
        border: `1px solid ${tokens.border}`,
        borderRadius: 10,
        background: tokens.surface,
      }}
    >
      {FACTS_NOTICE}
    </p>
  );
}
