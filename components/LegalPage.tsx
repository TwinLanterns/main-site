import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";

const wrap = "mx-auto w-full max-w-[760px] px-5";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="pb-24 pt-36 sm:pt-44">
      <article className={wrap}>
        <p className="label">Legal</p>
        <h1 className="display mt-5 text-[clamp(2.4rem,6vw,4rem)]">{title}</h1>
        <p className="mt-4 text-[14px] text-muted">
          Effective {LEGAL.effectiveDate}
        </p>
        {intro ? (
          <p className="mt-6 text-[16px] leading-relaxed text-muted">{intro}</p>
        ) : null}
        <div className="mt-10 space-y-10">{children}</div>
      </article>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[20px] font-medium">{title}</h2>
      <div className="mt-3 space-y-3 text-[15.5px] leading-relaxed text-muted [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}
