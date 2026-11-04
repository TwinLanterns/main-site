// app/ops/(workspace)/signups/page.tsx
//
// The public program sign-ups this project recruits from (the same rows
// /admin lists per program), with a one-click "Add to CRM" that makes each
// one a New lead here. Leadership + project managers only: the list shows
// applicants' contact details.

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { loadSignups } from "@/lib/ops/signups-db";
import { SIGNUP_PROGRAMS, isSignupProgram } from "@/lib/ops/signups";
import { addSignups } from "../../actions";
import ActionForm from "../../_components/ActionForm";
import { accentButton, fmtDate, quietButton } from "../../_components/ui";

export const metadata: Metadata = { title: "Sign-ups" };

const FILTERS = [
  { key: "new", label: "Not in CRM" },
  { key: "added", label: "In this project" },
  { key: "all", label: "All" },
] as const;

const th = "px-3 py-2 text-left text-xs font-normal text-muted";
const td = "px-3 py-2.5 align-top text-sm";

export default async function SignupsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await pageData();
  if (!data) return null;
  const { project, actor } = data;
  const leader = actor.role === "leadership";

  const header = (sub: string) => (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign-ups</h1>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </header>
  );

  if (actor.role === "reviewer") {
    return <div className="space-y-6 font-normal">{header("Sign-ups include applicants' contact details, so they aren't shown to reviewers.")}</div>;
  }

  const program = project.signup_program;
  if (!isSignupProgram(program)) {
    const columnMissing = !("signup_program" in project);
    return (
      <div className="space-y-6 font-normal">
        {header(`${project.code} isn't linked to a sign-up program yet.`)}
        <section className="rounded-md border border-ops-line bg-ops-raised px-6 py-8">
          <h2 className="text-lg font-semibold text-ink">Link a sign-up program</h2>
          <p className="mt-1.5 max-w-lg text-sm text-neutral-600">
            {columnMissing
              ? "Run supabase/ops_signups.sql once in the Supabase SQL editor, then choose this project's program in Project settings."
              : leader
                ? "Choose which public program this project recruits from, and its applicants will be listed here."
                : "Ask leadership to choose which public program this project recruits from."}
          </p>
          {leader && !columnMissing && (
            <Link href="/ops/settings" className={`${accentButton} mt-5`}>
              Open Project settings
            </Link>
          )}
        </section>
      </div>
    );
  }

  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.show)?.key ?? "new";
  const { rows, error } = await loadSignups(program, project.id);
  const label = SIGNUP_PROGRAMS[program].label;
  const inProject = rows.filter((r) => r.enrollment);
  const notIn = rows.filter((r) => !r.enrollment);
  const qualifiedNew = notIn.filter((r) => r.qualified);
  const shown = filter === "new" ? notIn : filter === "added" ? inProject : rows;
  const counts = { new: notIn.length, added: inProject.length, all: rows.length };

  return (
    <div className="space-y-6 font-normal">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {header(`People who applied to the ${label} program. Adding someone creates a New lead in ${project.code}.`)}
        {qualifiedNew.length > 0 && (
          <ActionForm action={addSignups} inline submit={`Add ${qualifiedNew.length} qualified to CRM`} submitClassName={accentButton} confirm={`Add ${qualifiedNew.length} qualified sign-ups to ${project.code} as new leads?`}>
            <input type="hidden" name="project_id" value={project.id} />
            {qualifiedNew.map((r) => (
              <input key={r.ref} type="hidden" name="ref" value={r.ref} />
            ))}
          </ActionForm>
        )}
      </div>

      <nav aria-label="Filter sign-ups" className="flex gap-1 border-b border-ops-line">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "new" ? "/ops/signups" : `/ops/signups?show=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${filter === f.key ? "border-amber text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {f.label} <span className="tabular-nums text-muted">{counts[f.key]}</span>
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="text-sm text-red-300">Couldn&apos;t load sign-ups: {error}</p>
      ) : shown.length === 0 ? (
        <p className="py-6 text-sm text-muted">
          {filter === "new" ? (rows.length ? "Everyone who signed up is already in this project." : "Nobody has signed up for this program yet.") : filter === "added" ? "Nobody from this program has been added yet." : "Nobody has signed up for this program yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="border-b border-ops-line">
              <tr>
                <th scope="col" className={th}>Name</th>
                <th scope="col" className={th}>Contact</th>
                <th scope="col" className={th}>Location</th>
                <th scope="col" className={th}>Signed up</th>
                <th scope="col" className={th}>Screening</th>
                <th scope="col" className={`${th} text-right`}>
                  <span className="sr-only">CRM</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ops-line">
              {shown.map((r) => (
                <tr key={r.ref}>
                  <td className={`${td} text-ink`}>{r.name}</td>
                  <td className={`${td} text-neutral-700`}>
                    {r.email && (
                      <a href={`mailto:${r.email}`} className="block hover:text-ink">
                        {r.email}
                      </a>
                    )}
                    {r.phone && <span className="block tabular-nums text-muted">{r.phone}</span>}
                  </td>
                  <td className={`${td} text-neutral-700`}>{r.location || "—"}</td>
                  <td className={`${td} tabular-nums text-neutral-700`}>{fmtDate(r.createdAt)}</td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700" title={r.reasons.join("; ") || undefined}>
                      <span aria-hidden className={`size-1.5 rounded-full ${r.qualified ? "bg-emerald-400" : "bg-neutral-400"}`} />
                      {r.qualified ? "Qualified" : "Didn't qualify"}
                    </span>
                  </td>
                  <td className={`${td} text-right`}>
                    {r.enrollment ? (
                      <Link href={`/ops/operators/${r.enrollment.id}`} className="font-medium tabular-nums text-ink underline-offset-2 hover:underline">
                        {r.enrollment.code} →
                      </Link>
                    ) : (
                      <ActionForm action={addSignups} inline submit="Add to CRM" submitClassName={quietButton}>
                        <input type="hidden" name="project_id" value={project.id} />
                        <input type="hidden" name="ref" value={r.ref} />
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
