import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ShellFooter } from './shell-footer';
import { PRELOADED_FONTS } from './shell-root';
import { SpotMenu } from './spot-menu';
import { ThemeProvider } from './themes/theme-context';

describe('Web shell', () => {
  it('renders the footer links in order, then the notice', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ShellFooter
          links={[
            { label: 'Beach checks', href: '/log?spot=donabate' },
            { label: 'Open the swimming app', href: 'https://snamh.app/' },
          ]}
          notice="Sea state is advice, not a lifeguard."
        />
      </ThemeProvider>
    );
    const order = ['/log?spot=donabate', 'https://snamh.app/', 'not a lifeguard'].map((text) =>
      html.indexOf(text)
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('renders the spot menu closed until opened', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <SpotMenu activeSpotId="donabate" onSelect={() => undefined} />
      </ThemeProvider>
    );
    expect(html).toContain('aria-label="Change spot"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="menu"');
  });

  it('preloads only fonts served from the site root', () => {
    expect(PRELOADED_FONTS.every((href) => href.startsWith('/fonts/'))).toBe(true);
  });
});
