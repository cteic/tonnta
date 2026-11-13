import type { ReactNode } from 'react';

import { FactsNotice } from './facts-notice';
import { SwimFooter } from './swim-footer';
import { SwimHeader } from './swim-header';

interface PageFrameProps {
  context?: string;
  children: ReactNode;
}

export function PageFrame({ context, children }: PageFrameProps) {
  return (
    <>
      {context === undefined ? <SwimHeader /> : <SwimHeader context={context} />}
      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '24px 16px 8px',
          display: 'grid',
          gap: 20,
        }}
      >
        <FactsNotice />
        {children}
      </main>
      <SwimFooter />
    </>
  );
}
