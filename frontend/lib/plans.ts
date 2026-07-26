'use client';

import { useStoredState } from './local-store';

/** Cheapest plan first — the order the pricing cards render in. */
export type PlanId = 'free' | 'basic' | 'plus' | 'business' | 'enterprise';

export type Billing = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Price per month, USD. `null` on Enterprise, which is quoted. */
  monthly: number | null;
  /** Per-month price when billed yearly — how Typeform quotes its plans. */
  yearly: number | null;
  /** Responses per month. `null` means uncapped. */
  responseLimit: number | null;
  seats: number | null;
  /** Bullets on the card: what this tier adds over the one below it. */
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For getting a form in front of people today.',
    monthly: 0,
    yearly: 0,
    responseLimit: 10,
    seats: 1,
    features: [
      'Unlimited forms and questions',
      'All 8 question types',
      'Summary + response views',
      'CSV export',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'For one person collecting steadily.',
    monthly: 29,
    yearly: 25,
    responseLimit: 100,
    seats: 1,
    features: [
      '100 responses / month',
      'Remove Teraform branding',
      'Custom thank-you screens',
      'Redirect on completion',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    tagline: 'For small teams that share a workspace.',
    monthly: 59,
    yearly: 50,
    responseLimit: 1_000,
    seats: 3,
    features: [
      '1,000 responses / month',
      '3 seats',
      'Custom subdomain',
      'Drop-off rates',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For teams that run on form data.',
    monthly: 99,
    yearly: 83,
    responseLimit: 10_000,
    seats: 5,
    features: [
      '10,000 responses / month',
      '5 seats',
      'Conversion tracking',
      'Salesforce + HubSpot',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For organisations with procurement.',
    monthly: null,
    yearly: null,
    responseLimit: null,
    seats: null,
    features: [
      'Unlimited responses and seats',
      'SSO / SAML',
      'Dedicated success manager',
      '99.9% uptime SLA',
    ],
  },
];

export const PLAN_ORDER: PlanId[] = PLANS.map(p => p.id);

export function planById(id: PlanId): Plan {
  return PLANS.find(p => p.id === id) ?? PLANS[0];
}

/** True when `id` is at least as high a tier as `required`. */
export function planAtLeast(id: PlanId, required: PlanId): boolean {
  return PLAN_ORDER.indexOf(id) >= PLAN_ORDER.indexOf(required);
}

export function priceFor(plan: Plan, billing: Billing): number | null {
  return billing === 'yearly' ? plan.yearly : plan.monthly;
}

/** Headline discount shown on the billing toggle, from the real card prices. */
export const YEARLY_SAVING_PCT = (() => {
  const plus = planById('plus');
  if (!plus.monthly || !plus.yearly) return 0;
  return Math.round((1 - plus.yearly / plus.monthly) * 100);
})();

interface StoredSubscription {
  planId: PlanId;
  billing: Billing;
}

const DEFAULT_SUBSCRIPTION: StoredSubscription = { planId: 'free', billing: 'yearly' };

export function useSubscription() {
  const [sub, setSub] = useStoredState<StoredSubscription>('subscription', DEFAULT_SUBSCRIPTION);

  return {
    plan: planById(sub.planId),
    planId: sub.planId,
    billing: sub.billing,
    setPlan: (planId: PlanId) => setSub(prev => ({ ...prev, planId })),
    setBilling: (billing: Billing) => setSub(prev => ({ ...prev, billing })),
  };
}

export function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-US');
}
