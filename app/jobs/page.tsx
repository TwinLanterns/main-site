import type { Metadata } from "next";
import JobList from "@/components/JobList";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Open roles — Twin Lanterns",
  description:
    "Three paid, part-time roles open now: task filming, GoPro home collection, and speech recording. Sign up in two minutes.",
};

const wrap = "mx-auto w-full max-w-[1100px] px-5";

export default function JobsPage() {
  return (
    <main className="pb-24 pt-36 sm:pt-44">
      <div className={wrap}>
        <Reveal>
          <p className="label">Open roles</p>
          <h1 className="display mt-5 max-w-[14ch] text-[clamp(2.6rem,6vw,4.6rem)]">
            Three ways to get paid with us.
          </h1>
          <p className="mt-6 max-w-[50ch] text-[17px] leading-relaxed text-muted">
            Part-time, paid, no résumé. Pick a role, sign up in two minutes,
            and we&apos;ll be in touch.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <JobList className="mt-14" />
        </Reveal>

        <p className="mt-8 text-[14px] text-muted">
          Know someone who&apos;d be a fit?{" "}
          <a
            href="/earn/refer"
            className="text-ink underline underline-offset-4"
          >
            Become an ambassador
          </a>{" "}
          and earn when they qualify.
        </p>
      </div>
    </main>
  );
}
