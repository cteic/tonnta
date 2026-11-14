'use client';

import { useAppTheme } from './themes/theme-context';

export interface ShellLink {
  label: string;
  href: string;
}

interface ShellFooterProps {
  /** Shown first, in order, one per line. */
  links: readonly ShellLink[];
  /** The closing line: product identity, data credits and safety notice. */
  notice: string;
}

export function ShellFooter({ links, notice }: ShellFooterProps) {
  const { theme } = useAppTheme();
  const { tokens } = theme;

  return (
    <footer
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 24px 40px',
        borderTop: `1px solid ${tokens.border}`,
      }}
    >
      {links.map((link) => (
        <p key={link.href} style={{ margin: '0 0 10px', fontSize: 13 }}>
          <a href={link.href} style={{ color: tokens.textSoft }}>
            {link.label}
          </a>
        </p>
      ))}
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: tokens.textSubtle }}>{notice}</p>
    </footer>
  );
}
