/**
 * Pricing constants — the plan approved on the Path-to-revenue issue.
 * Checkout URLs arrive when the merchant of record is picked; until then the
 * buttons render a coming-shortly state.
 */

export const PRICE_ANNUAL_EUR = 14.9;
export const PRICE_FOUNDER_EUR = 39;
export const FOUNDER_CAP = 100;

export const CHECKOUT_URL_ANNUAL = process.env.NEXT_PUBLIC_CHECKOUT_URL_ANNUAL ?? '';
export const CHECKOUT_URL_FOUNDER = process.env.NEXT_PUBLIC_CHECKOUT_URL_FOUNDER ?? '';

/**
 * Alert worker origin. Also defined in the alert opt-in branch's site.ts —
 * consolidate there once both PRs merge.
 */
export const PRO_API_URL =
  process.env.NEXT_PUBLIC_ALERTS_URL ?? 'https://tonnta-worker.pete-9c4.workers.dev';

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
