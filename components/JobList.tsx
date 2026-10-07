import Link from "next/link";
import { JOBS } from "@/lib/jobs";

// Sleek, scannable list of open roles. One row per job, apply button on the
// right. Server component — no state.
export default function JobList({ className = "" }: { className?: string }) {
  return (
    <ul className={`divide-y divide-line border-y border-line ${className}`}>
      {JOBS.map((job) => (
        <li key={job.slug}>
          <div className="group grid items-center gap-x-8 gap-y-5 py-7 sm:py-8 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]">
            <div>
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${job.dot}`} />
                <h3 className="display text-[clamp(1.5rem,2.6vw,2rem)]">
                  {job.title}
                </h3>
              </div>
              <p className="mt-3 max-w-[52ch] text-[15.5px] leading-relaxed text-muted">
                {job.blurb}
              </p>
              <Link
                href={job.detailsHref}
                className="mt-3 inline-block text-[14px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Role details
              </Link>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[14.5px]">
              <dt className="text-muted">Pay</dt>
              <dd className="font-medium">{job.pay}</dd>
              <dt className="text-muted">Hours</dt>
              <dd>{job.commitment}</dd>
              <dt className="text-muted">Gear</dt>
              <dd>{job.setup}</dd>
            </dl>

            <Link
              href={job.applyHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[16px] text-white transition-colors hover:bg-flame md:justify-self-end"
            >
              Sign up
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
