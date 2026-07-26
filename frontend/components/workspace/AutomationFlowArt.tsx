'use client';

import { ArrowDown, Clock, Mail, Send, Users } from 'lucide-react';

/**
 * The illustration beside the Automations empty state: a form on a phone, and the
 * chain of actions a rule fires afterwards.
 *
 * Drawn entirely in CSS — no bitmap asset — so it scales cleanly and ships
 * nothing extra.
 */

/** One step in the flow column. */
function Step({
  icon,
  tint,
  label,
  barWidths,
}: {
  icon: React.ReactNode;
  tint: string;
  /** Given a label, the card names the step; otherwise it shows placeholder bars. */
  label?: string;
  barWidths?: [number, number?];
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_2px_10px_rgba(60,50,62,0.09)]">
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: tint }}
      >
        {icon}
      </span>
      {label ? (
        <span className="text-[15px] font-medium text-[#3c323e]">{label}</span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          {barWidths?.map((w, i) =>
            w == null ? null : (
              <span
                key={i}
                className="h-2 rounded-full bg-[rgba(87,84,91,0.13)]"
                style={{ width: `${w}%` }}
              />
            )
          )}
        </span>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-start pl-[26px]">
      <ArrowDown size={16} className="text-[#3c323e]" />
    </div>
  );
}

export default function AutomationFlowArt() {
  return (
    <div
      aria-hidden
      className="relative overflow-hidden rounded-3xl p-8"
      style={{
        background:
          'linear-gradient(150deg, #efd0f7 0%, #f3ddf6 38%, #fbeee4 72%, #fdf6ec 100%)',
      }}
    >
      <div className="flex items-start gap-6">
        {/* Phone showing the form's thank-you screen */}
        <div className="relative w-[210px] flex-shrink-0 rounded-[30px] bg-[#3c323e] p-[7px] shadow-[0_16px_40px_rgba(60,50,62,0.28)]">
          <div className="overflow-hidden rounded-[24px] bg-[#fdf6ec]">
            {/* Brand strip standing in for the header image */}
            <div
              className="flex h-[112px] items-start justify-center pt-3"
              style={{
                background:
                  'linear-gradient(165deg, #6f4a35 0%, #8d5f42 45%, #b98860 100%)',
              }}
            >
              <span className="text-[10px] font-semibold tracking-[0.14em] text-white/90">
                ROAST &amp; GRIND
              </span>
            </div>
            <div className="px-4 pb-8 pt-4">
              <p className="text-[19px] font-semibold leading-[1.15] text-[#8a3f18]">
                Thanks for
                <br />
                filling out our
                <br />
                form!
              </p>
            </div>
          </div>
        </div>

        {/* The chain of actions */}
        <div className="min-w-0 flex-1 pt-6">
          <Step
            icon={<Send size={17} className="text-[#2b62c4]" />}
            tint="#dbe8fb"
            label="Form completed"
          />
          <Connector />
          <Step
            icon={<Mail size={17} className="text-[#6b4bc4]" />}
            tint="#e6e0fb"
            barWidths={[74]}
          />
          <Connector />
          <Step
            icon={<Clock size={17} className="text-[#177767]" />}
            tint="#d9f0e8"
            barWidths={[62]}
          />
          <Connector />
          <Step
            icon={<Users size={17} className="text-[#b45309]" />}
            tint="#fbe8d2"
            barWidths={[68]}
          />
        </div>
      </div>
    </div>
  );
}
