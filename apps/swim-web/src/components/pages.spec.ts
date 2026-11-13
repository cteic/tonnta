import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { bathingWatersByCounty } from '@tonnta/data';
import { ThemeProvider } from '@tonnta/web-shell';

import { BeachFactsView } from './beach-facts-view';
import { BeachList } from './beach-list';
import { FactsNotice } from './facts-notice';
import { SwimFooter } from './swim-footer';

vi.mock('@tonnta/web-shell', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ThemePicker: () => null,
}));

function render(element: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, { initialThemeId: 'dawn-v1', children: element })
  );
}

describe('Swim site pages', () => {
  it('lists every bathing water by county and nothing outside Ireland', () => {
    const html = render(createElement(BeachList, { groups: bathingWatersByCounty() }));
    expect(html).toContain('href="/s/donabate-balcarrick-beach"');
    expect(html).toContain('Co. Dublin');
    expect(html.match(/href="\/s\//g)).toHaveLength(154);
    expect(html).not.toMatch(/Cotillo|Corralejo|Fuerteventura/);
  });

  it('shows each fact with its source and no verdict', () => {
    const html = render(
      createElement(BeachFactsView, {
        name: 'Donabate, Balcarrick Beach',
        place: 'Fingal County Council, Co. Dublin',
        checkedAt: '10:45',
        rows: [
          {
            label: 'Bathing season',
            value: 'Outside the bathing season',
            source: 'EPA',
            tone: 'notice',
          },
        ],
        profileUrl: 'https://www.beaches.ie/profile.pdf',
      })
    );
    expect(html).toContain('Outside the bathing season');
    expect(html).toContain('Source: EPA');
    expect(html).toContain('data-tone="notice"');
    expect(html).toContain('href="https://www.beaches.ie/profile.pdf"');
  });

  it('says on every page that it is not advice', () => {
    expect(render(createElement(FactsNotice))).toContain('does not say whether it is safe to swim');
    const footer = render(createElement(SwimFooter));
    expect(footer).toContain('facts, not advice');
    expect(footer).toContain('112 or 999');
    expect(footer).toContain('href="https://www.beaches.ie/"');
  });
});
