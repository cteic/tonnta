'use client';

import { useState } from 'react';

import type { BathingWater } from '@tonnta/types';
import { useAppTheme } from '@tonnta/web-shell';

import { beachPath } from '@/lib/site';

interface CountyGroup {
  county: string;
  waters: BathingWater[];
}

interface BeachListProps {
  groups: readonly CountyGroup[];
}

function matches(water: BathingWater, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return `${water.name} ${water.county}`.toLowerCase().includes(needle);
}

export function BeachList({ groups }: BeachListProps) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const [query, setQuery] = useState('');
  const visible = groups
    .map((group) => ({ ...group, waters: group.waters.filter((water) => matches(water, query)) }))
    .filter((group) => group.waters.length > 0);

  return (
    <section aria-labelledby="beach-list-title" style={{ display: 'grid', gap: 16 }}>
      <h1 id="beach-list-title" style={{ margin: 0, fontSize: 24 }}>
        EPA bathing waters
      </h1>
      <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
        Find a bathing water
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Beach or county"
          style={{
            font: 'inherit',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${tokens.border}`,
            background: tokens.surface,
            color: tokens.text,
          }}
        />
      </label>
      {visible.length === 0 ? <p>No bathing water matches “{query}”.</p> : null}
      {visible.map((group) => (
        <div key={group.county}>
          <h2 style={{ margin: '8px 0', fontSize: 16, color: tokens.textSoft }}>
            Co. {group.county}
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
            {group.waters.map((water) => (
              <li key={water.id}>
                <a href={beachPath(water.slug)} style={{ color: tokens.text }}>
                  {water.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
