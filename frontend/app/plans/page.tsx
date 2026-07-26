'use client';

import { useEffect, useState } from 'react';
import { Check, Gem, Minus } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import {
  PLANS, PLAN_ORDER, YEARLY_SAVING_PCT, formatLimit, planAtLeast, priceFor,
  useSubscription, type Billing, type Plan,
} from '@/lib/plans';
import { api } from '@/lib/api';

/** Feature grid. Anything derived from `planAtLeast` inherits down the tiers. */
const COMPARISON: { label: string; value: (p: Plan) => string | boolean }[] = [
  { label: 'Responses / month', value: p => formatLimit(p.responseLimit) },
  { label: 'Seats', value: p => (p.seats === null ? 'Unlimited' : String(p.seats)) },
  { label: 'Forms and questions', value: () => 'Unlimited' },
  { label: 'All 8 question types', value: () => true },
  { label: 'Summary + response views', value: () => true },
  { label: 'CSV export', value: () => true },
  { label: 'Remove Teraform branding', value: p => planAtLeast(p.id, 'basic') },
  { label: 'Redirect on completion', value: p => planAtLeast(p.id, 'basic') },
  { label: 'HubSpot + Stripe', value: p => planAtLeast(p.id, 'plus') },
  { label: 'Custom subdomain', value: p => planAtLeast(p.id, 'plus') },
  { label: 'Drop-off rates', value: p => planAtLeast(p.id, 'plus') },
  { label: 'Salesforce', value: p => planAtLeast(p.id, 'business') },
  { label: 'Conversion tracking', value: p => planAtLeast(p.id, 'business') },
  { label: 'Priority support', value: p => planAtLeast(p.id, 'business') },
  { label: 'SSO / SAML', value: p => p.id === 'enterprise' },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={15} className="mx-auto text-[#177767]" />;
  if (value === false) return <Minus size={15} className="mx-auto text-[#c4c1c5]" />;
  return <span className="text-[14px] text-[#3c323e]">{value}</span>;
}

function PriceTag({ plan, billing }: { plan: Plan; billing: Billing }) {
  const price = priceFor(plan, billing);
  if (price === null) {
    return <p className="text-[26px] font-normal leading-none text-[#3c323e]">Custom</p>;
  }
  return (
    <p className="flex items-baseline gap-1.5">
      <span className="text-[30px] font-normal leading-none text-[#3c323e]">${price}</span>
      <span className="text-[13px] text-[#655d67]">
        {price === 0 ? 'forever' : billing === 'yearly' ? '/ mo, billed yearly' : '/ month'}
      </span>
    </p>
  );
}

export default function PlansPage() {
  const { plan: current, planId, billing, setPlan, setBilling } = useSubscription();
  const [pending, setPending] = useState<Plan | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  const { showToast, toastNode } = useToast();

  // Real usage, so the quota on the cards means something.
  useEffect(() => {
    let cancelled = false;
    api.forms
      .list()
      .then(forms => {
        if (!cancelled) setUsed(forms.reduce((sum, f) => sum + f.response_count, 0));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const limit = current.responseLimit;
  const overLimit = limit !== null && used !== null && used > limit;

  function ctaFor(plan: Plan) {
    if (plan.id === planId) return 'Your plan';
    if (plan.id === 'enterprise') return 'Contact sales';
    return PLAN_ORDER.indexOf(plan.id) > PLAN_ORDER.indexOf(planId) ? 'Upgrade' : 'Downgrade';
  }

  return (
    <WorkspaceShell active="plans" maxWidth={1180}>
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-[34px] font-normal leading-tight text-[#3c323e]">
          Plans that grow with your forms
        </h1>
        <p className="mx-auto mt-2 max-w-[520px] text-[15px] text-[#655d67]">
          Every plan includes unlimited forms and all eight question types. Change or cancel
          whenever you like.
        </p>

        {/* Billing period */}
        <div className="mt-6 inline-flex overflow-hidden rounded-xl border border-[rgba(81,76,84,0.18)] bg-white">
          {(['monthly', 'yearly'] as Billing[]).map((period, i) => (
            <button
              key={period}
              onClick={() => setBilling(period)}
              className={`flex items-center gap-2 px-4 py-2 text-[14px] transition-colors ${
                i === 1 ? 'border-l border-[rgba(81,76,84,0.18)]' : ''
              } ${
                billing === period
                  ? 'bg-[rgba(87,84,91,0.08)] font-medium text-[#3c323e]'
                  : 'text-[#655d67] hover:bg-[rgba(87,84,91,0.04)]'
              }`}
            >
              {period === 'monthly' ? 'Monthly' : 'Yearly'}
              {period === 'yearly' && (
                <span className="rounded-md border border-[#c0e4de] bg-[#f4faf8] px-1.5 py-0.5 text-[11px] font-medium text-[#095145]">
                  Save {YEARLY_SAVING_PCT}%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Where this workspace actually stands */}
        {used !== null && (
          <p className="mt-4 text-[14px] text-[#655d67]">
            You are on <span className="font-medium text-[#3c323e]">{current.name}</span> and have
            collected <span className="font-medium text-[#3c323e]">{used.toLocaleString('en-US')}</span>{' '}
            {used === 1 ? 'response' : 'responses'} against a cap of {formatLimit(limit)}.
            {overLimit && <span className="text-[#be185d]"> Over the cap — upgrade to keep collecting.</span>}
          </p>
        )}
      </div>

      {/* Plan cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLANS.map(plan => {
          const isCurrent = plan.id === planId;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-xl border bg-white p-5 transition-shadow ${
                isCurrent
                  ? 'border-[#177767] shadow-[0_0_0_3px_rgba(23,119,103,0.1)]'
                  : 'border-[rgba(81,76,84,0.12)] hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[17px] font-semibold text-[#3c323e]">{plan.name}</h2>
                {isCurrent && (
                  <span className="flex items-center gap-1 rounded-md border border-[#c0e4de] bg-[#f4faf8] px-2 py-0.5 text-[11px] font-medium text-[#095145]">
                    <Gem size={10} />
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 min-h-[40px] text-[13px] leading-snug text-[#847e85]">{plan.tagline}</p>

              <div className="mt-3">
                <PriceTag plan={plan} billing={billing} />
              </div>

              <button
                onClick={() => !isCurrent && setPending(plan)}
                disabled={isCurrent}
                className={`mt-4 rounded-lg py-2 text-[14px] font-semibold transition-colors ${
                  isCurrent
                    ? 'cursor-default border border-[rgba(81,76,84,0.18)] text-[#847e85]'
                    : plan.id === 'enterprise'
                      ? 'border border-[rgba(81,76,84,0.18)] text-[#3c323e] hover:bg-[rgba(87,84,91,0.05)]'
                      : 'bg-[#127a63] text-white hover:bg-[#0f6552]'
                }`}
              >
                {ctaFor(plan)}
              </button>

              <ul className="mt-4 flex flex-col gap-2 border-t border-[rgba(86,82,90,0.08)] pt-4">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#655d67]">
                    <Check size={13} className="mt-0.5 flex-shrink-0 text-[#177767]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      <h2 className="mt-12 text-[20px] font-normal text-[#3c323e]">Compare every plan</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[rgba(81,76,84,0.12)] bg-white">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[rgba(86,82,90,0.1)]">
              <th className="w-[240px] px-4 py-3 text-[13px] font-medium text-[#655d67]">Feature</th>
              {PLANS.map(p => (
                <th
                  key={p.id}
                  className={`px-4 py-3 text-center text-[14px] font-semibold ${
                    p.id === planId ? 'text-[#095145]' : 'text-[#3c323e]'
                  }`}
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map(row => (
              <tr key={row.label} className="border-b border-[rgba(86,82,90,0.06)] last:border-0">
                <th scope="row" className="px-4 py-2.5 text-[14px] font-normal text-[#655d67]">
                  {row.label}
                </th>
                {PLANS.map(p => (
                  <td
                    key={p.id}
                    className={`px-4 py-2.5 text-center ${p.id === planId ? 'bg-[#fbfdfc]' : ''}`}
                  >
                    <Cell value={row.value(p)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-[13px] text-[#847e85]">
        Prices are illustrative and no payment is taken — switching plans changes this
        workspace’s limits (response cap, seats and which integrations may connect) immediately.
      </p>

      {pending && (
        <Modal onClose={() => setPending(null)} label={`Switch to ${pending.name}`}>
          <h2 className="text-[17px] font-semibold text-[#3c323e]">
            Switch to {pending.name}?
          </h2>
          <p className="mt-1 text-sm text-[#655d67]">{pending.tagline}</p>

          <dl className="mt-4 flex flex-col gap-2 rounded-lg bg-[rgba(87,84,91,0.04)] px-3 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#655d67]">Price</dt>
              <dd className="font-medium text-[#3c323e]">
                {priceFor(pending, billing) === null
                  ? 'Quoted by sales'
                  : `$${priceFor(pending, billing)} / month${billing === 'yearly' ? ', billed yearly' : ''}`}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#655d67]">Responses / month</dt>
              <dd className="font-medium text-[#3c323e]">{formatLimit(pending.responseLimit)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#655d67]">Seats</dt>
              <dd className="font-medium text-[#3c323e]">
                {pending.seats === null ? 'Unlimited' : pending.seats}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-[13px] text-[#847e85]">
            No card is charged in this build. The new limits apply straight away.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setPending(null)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-[#655d67] transition-colors hover:bg-[rgba(87,84,91,0.06)]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setPlan(pending.id);
                showToast(`You're on ${pending.name}`);
                setPending(null);
              }}
              className="rounded-lg bg-[#127a63] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0f6552]"
            >
              Switch to {pending.name}
            </button>
          </div>
        </Modal>
      )}
      {toastNode}
    </WorkspaceShell>
  );
}
