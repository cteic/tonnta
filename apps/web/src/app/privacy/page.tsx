import type { Metadata } from 'next';

import { indexingMetadata } from '@/lib/page-metadata';

const BASE_METADATA: Metadata = {
  title: 'Privacy policy',
  description:
    'What Tonnta stores, where it goes and how to delete it. No accounts, no ads, nothing sold.',
  alternates: { canonical: '/privacy' },
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...BASE_METADATA, ...(await indexingMetadata()) };
}

const UPDATED = '22 October 2026';
const CONTACT = 'contact@cteic.ie';

const PAGE: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '48px 20px 96px',
  color: '#C9D4D2',
  fontSize: 16,
  lineHeight: 1.6,
};

const HEADING: React.CSSProperties = {
  fontFamily: "'Clash Display', sans-serif",
  fontWeight: 700,
  color: '#E8ECEB',
};

const MUTED: React.CSSProperties = { color: '#6E8A90', fontSize: 14 };

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ ...HEADING, fontSize: 22, margin: '0 0 12px' }}>{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main style={PAGE}>
      <h1 style={{ ...HEADING, fontSize: 36, margin: 0 }}>Privacy policy</h1>
      <p style={MUTED}>Last updated {UPDATED}</p>

      <p>
        Tonnta is made by Comhairle Teicneolaíochta Teoranta (cteic), an Irish company, which is the
        data controller for the Tonnta website, the Tonnta app for iOS and Android, and its
        home-screen widgets. There are no accounts. We do not sell data, show ads, or track you
        across other apps and sites.
      </p>

      <Section title="Without telling us anything">
        <p>
          The verdict, the forecast, the tide and the widgets work without any personal data. Your
          device asks our servers, and the app asks Open-Meteo, for conditions at a surf spot. Like
          any web request, these carry your IP address, which our hosting provider logs briefly for
          security and operations.
        </p>
      </Section>

      <Section title="Kept on your device">
        <p>
          The session diary, your theme and your display mode are saved in your browser or app
          storage. They never leave your device. Clearing site data or deleting the app removes
          them.
        </p>
      </Section>

      <Section title="Surf alerts">
        <p>If you turn on alerts, we store:</p>
        <ul>
          <li>
            the push subscription your browser creates, which is an address and keys we use to send
            you a notification
          </li>
          <li>the spot you follow and your wave and wind thresholds</li>
          <li>when you subscribed and when we last alerted you</li>
        </ul>
        <p>
          We delete this when you turn alerts off, or when your browser tells us the subscription no
          longer exists.
        </p>
      </Section>

      <Section title="Tonnta Pro">
        <p>
          A Pro purchase is linked to the email address you give at checkout. We store that email,
          your plan, its status and its dates. Payment is handled by our checkout provider, and we
          never see your card details.
        </p>
        <p>
          To restore Pro on a new device, you enter your email and we send you a single-use link
          that expires. Opening it links that device&apos;s alerts to your purchase.
        </p>
      </Section>

      <Section title="App analytics and crash reports">
        <p>The iOS and Android app sends PostHog, our analytics provider, in the United States:</p>
        <ul>
          <li>which screens you open, and when the app opens and closes</li>
          <li>a few named actions, such as viewing the outlook or scrubbing the chart</li>
          <li>crash and error reports</li>
        </ul>
        <p>
          These are tied to a random identifier on your device, not to your name or email. We do not
          record your screen, your taps or your location.
        </p>
      </Section>

      <Section title="Who processes data for us">
        <ul>
          <li>Cloudflare: hosting, our database and request logs</li>
          <li>PostHog: app analytics and crash reports</li>
          <li>Resend: the email that carries a Pro restore link</li>
          <li>Expo: delivers app updates to your device</li>
          <li>Open-Meteo: forecast data requested by the app</li>
          <li>Our checkout provider: Pro payments</li>
        </ul>
        <p>
          Some of these process data outside the European Economic Area, under the safeguards the
          GDPR requires for such transfers.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under the GDPR you can ask to see, correct or delete the data we hold about you, or object
          to how we use it. Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we will reply
          within one month. You can also complain to the Data Protection Commission at
          dataprotection.ie.
        </p>
      </Section>

      <Section title="Changes">
        <p>If this policy changes, we update this page and the date at the top.</p>
      </Section>
    </main>
  );
}
