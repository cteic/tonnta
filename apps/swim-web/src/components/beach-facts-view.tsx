'use client';

import { useAppTheme } from '@tonnta/web-shell';

import type { FactRow } from '@/lib/beach-fact-rows';

interface BeachFactsViewProps {
  name: string;
  place: string;
  rows: readonly FactRow[];
  checkedAt: string;
  profileUrl?: string | undefined;
}

export function BeachFactsView({ name, place, rows, checkedAt, profileUrl }: BeachFactsViewProps) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <section aria-labelledby="beach-title" style={{ display: 'grid', gap: 16 }}>
      <header>
        <h1 id="beach-title" style={{ margin: 0, fontSize: 26 }}>
          {name}
        </h1>
        <p style={{ margin: '4px 0 0', color: tokens.textSoft }}>{place}</p>
      </header>
      <dl style={{ margin: 0, display: 'grid', gap: 10 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            data-tone={row.tone}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${row.tone === 'notice' ? tokens.dangerBorder : tokens.border}`,
              background: row.tone === 'notice' ? tokens.dangerBg : tokens.surface,
            }}
          >
            <dt style={{ fontSize: 13, color: tokens.textSoft }}>{row.label}</dt>
            <dd style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 600 }}>{row.value}</dd>
            {row.detail === undefined ? null : (
              <dd style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5 }}>{row.detail}</dd>
            )}
            <dd style={{ margin: '6px 0 0', fontSize: 12, color: tokens.textSubtle }}>
              Source: {row.source}
            </dd>
          </div>
        ))}
      </dl>
      <p style={{ margin: 0, fontSize: 13, color: tokens.textSubtle }}>
        Sources checked at {checkedAt}.
        {profileUrl === undefined ? null : (
          <>
            {' '}
            <a href={profileUrl} style={{ color: tokens.textSoft }}>
              EPA bathing water profile
            </a>
            .
          </>
        )}
      </p>
    </section>
  );
}
