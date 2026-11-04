// app/ops/(workspace)/page.tsx — Overview + "Needs action" for the manager.
//
// Presentation only lives here; every figure comes from lib/ops (metrics,
// forecast, derive) exactly as before. /demo keeps the shared StatCard.

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { pageData } from "@/lib/ops/page";
import { loadShifts } from "@/lib/ops/db";
import { overviewCards, uploadAlerts, type Card } from "@/lib/ops/metrics";
import { forecastScenario } from "@/lib/ops/forecast";
import { crmTab, forecastInputs } from "@/lib/ops/derive";
import { LEAD_STAGES, NO_RECENT_UPLOAD_DAYS, OFFBOARD_REVIEW_DAYS, isKey } from "@/lib/ops/stages";
import { accentButton, fmtDate, fmtDateTime, ptDay, quietButton, todayPT } from "../_components/ui";

export const metadata: Metadata = { title: "Overview" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Display labels; definitions still come from lib/ops/metrics. */
const LABELS: Record<string, string> = {
  active: "Recording operators",
  recorded: "Recorded sessions",
  submitted: "Submitted",
  accepted: "Customer-accepted",
  forecast: "Forecast remaining",
  followups: "Open follow-ups",
};
/** Metrics whose meaning is ambiguous enough to keep an inline definition. */
const DISCLOSED = new Set(["accepted", "forecast"]);
/** Unknown here means "can't be computed yet", shown as a dash, not zero. */
const DASH_WHEN_UNKNOWN = new Set(["accepted", "forecast"]);

function displayValue(c: Card) {
  if (!c.unknown) return c.value;
  return DASH_WHEN_UNKNOWN.has(c.key) ? "—" : "0 h";
}

type DotTone = "accent" | "bad" | "good" | "muted";
const dotTones: Record<DotTone, string> = {
  accent: "bg-amber",
  bad: "bg-red-400",
  good: "bg-emerald-400",
  muted: "bg-neutral-400",
};

function Status({ tone, children }: { tone: DotTone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-neutral-700">
      <span aria-hidden className={`size-1.5 rounded-full ${dotTones[tone]}`} />
      {children}
    </span>
  );
}

/** Label with its definition in a hover/focus tooltip. */
function Hint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="group relative inline-flex">
      <span tabIndex={0} className="cursor-help text-sm text-muted underline decoration-dim decoration-dotted underline-offset-4 outline-none focus-visible:text-ink">
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-20 mt-2 w-64 rounded-md border border-ops-line bg-ops-raised p-2.5 text-xs leading-relaxed text-neutral-700 opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {hint}
      </span>
    </span>
  );
}

function MetricLabel({ c }: { c: Card }) {
  const text = LABELS[c.key] ?? c.label;
  return DISCLOSED.has(c.key) ? <span className="text-sm text-muted">{text}</span> : <Hint label={text} hint={c.definition} />;
}

function Figure({ value, size }: { value: string; size: "lg" | "sm" }) {
  const unit = / h$/.test(value);
  const n = unit ? value.slice(0, -2) : value;
  return (
    <span className={`tabular-nums tracking-tight text-ink ${size === "lg" ? "text-4xl font-semibold" : "text-xl font-medium"}`}>
      {n}
      {unit && <span className={`ml-1 font-normal text-muted ${size === "lg" ? "text-lg" : "text-sm"}`}>h</span>}
    </span>
  );
}

function Definition({ text }: { text: string }) {
  return (
    <details className="mt-1.5 text-xs text-muted">
      <summary className="cursor-pointer select-none hover:text-ink">Definition</summary>
      <p className="mt-1 max-w-xs leading-relaxed text-neutral-600">{text}</p>
    </details>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-ops-line pt-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-xs text-muted hover:text-ink">
      {children} →
    </Link>
  );
}

function None({ children }: { children: ReactNode }) {
  return <p className="py-1 text-sm text-muted">{children}</p>;
}

const row = "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2";
const code = "font-medium tabular-nums text-ink underline-offset-2 hover:underline";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  const sp = await searchParams;
  const from = typeof sp.from === "string" && DATE_RE.test(sp.from) ? sp.from : "";
  const to = typeof sp.to === "string" && DATE_RE.test(sp.to) ? sp.to : "";
  const asOfParam = typeof sp.asof === "string" && DATE_RE.test(sp.asof) ? sp.asof : "";
  const asOf = asOfParam || todayPT();
  const today = todayPT();

  const inRange = (d: string | null) => !!d && (!from || d >= from) && (!to || d <= to);
  const production = ws.production.filter((p) => inRange(p.calendar_date));
  const sessions = from || to ? ws.sessions.filter((s) => inRange(ptDay(s.actual_start ?? s.scheduled_start ?? s.created_at))) : ws.sessions;
  const period = from || to ? `${from ? fmtDate(from) : "start"} – ${to ? fmtDate(to) : "now"}` : "all dates";

  const scenario = forecastScenario(forecastInputs(ws.enrollments, ws.production, ws.assumptions), { includePipeline: false, includePaused: false });
  const cards = overviewCards({
    enrollments: ws.enrollments,
    production,
    sessions,
    openIssues: ws.issues.filter((i) => i.status !== "resolved").length,
    openTasksOverdue: ws.tasks.filter((t) => t.status === "open" && t.due_at && t.due_at < today).length,
    forecastRemainingSeconds: scenario.includedCount ? scenario.forecastRecordedSeconds : null,
    forecastIncluded: scenario.includedCount,
    period,
  });
  const card = (key: string) => cards.find((c) => c.key === key)!;
  const primary = ["recorded", "submitted"].map(card);
  const secondary = ["active", "accepted", "forecast", "followups"].map(card);

  const lastImport = ws.imports[0];
  const shifts = ws.contactsVisible ? await loadShifts(ws) : null;
  const upcomingShifts = (shifts ?? []).filter((s) => s.upcoming);
  const codeOf = new Map(ws.enrollments.map((e) => [e.id, e.anonymous_code]));

  const tabbed = ws.enrollments.map((e) => ({ e, tab: crmTab(e) }));
  const leadsToContact = tabbed.filter(({ e, tab }) => tab === "potential" && ["new_lead", "outreach_pending"].includes(e.lead_stage));
  const followUpsDue = tabbed.filter(({ e, tab }) => tab !== "closed" && e.next_action_due && e.next_action_due <= today);
  const blockedSteps = ws.steps.filter((s) => s.status === "blocked");
  const current = tabbed.filter(({ tab }) => tab === "current").map(({ e }) => e);
  const alerts = uploadAlerts(ws.production, current.map((e) => e.source_operator_id).filter((x): x is string => !!x), asOf).filter((a) => a.level !== "ok");
  const todaySessions = ws.sessions.filter((s) => s.scheduled_start && ptDay(s.scheduled_start) === today);
  const overdueTasks = ws.tasks.filter((t) => t.status === "open" && t.due_at && t.due_at < today);
  const openIssues = ws.issues.filter((i) => i.status !== "resolved").length;
  const filesToReview = ws.files.filter((f) => f.validation_status === "invalid" || f.review_state === "not_reviewed");
  const managerName = ws.team.find((t) => t.id === project.manager_id)?.name;

  const leader = actor.role === "leadership";
  const canEdit = actor.role !== "reviewer";
  const hasData = ws.imports.length > 0 || ws.enrollments.length > 0 || ws.sessions.length > 0 || ws.production.length > 0;

  const subtitle = [project.code, project.customer_alias, managerName ? `Managed by ${managerName}` : "No manager assigned", project.location_category].filter(Boolean);

  const shiftSection = (
    <Section title="Shift coverage" action={<SectionLink href={canEdit ? "/ops/shifts" : "/ops/sessions"}>{canEdit ? "Shift board" : "Recording"}</SectionLink>}>
      {shifts === null ? (
        <None>{ws.contactsVisible ? "Couldn't load the shift board." : "Shift bookings aren't shown to reviewers."}</None>
      ) : upcomingShifts.length ? (
        <ul className="divide-y divide-ops-line text-sm">
          {upcomingShifts.slice(0, 8).map((s) => (
            <li key={s.id} className={row}>
              <span className="tabular-nums text-ink">{fmtDateTime(s.starts_at)}</span>
              <span className="flex-1 text-neutral-600">{s.camera}</span>
              {!s.taken ? (
                <Status tone="accent">Unfilled</Status>
              ) : s.enrollment_id ? (
                <Status tone={s.session_id ? "good" : "muted"}>
                  {codeOf.get(s.enrollment_id)} · {s.session_id ? "session logged" : "no session yet"}
                </Status>
              ) : (
                <span title="Link this filmer's shift code on their operator page">
                  <Status tone="muted">Booked, not linked to an operator</Status>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <None>
          No upcoming shifts.{" "}
          {canEdit && (
            <Link className="text-ink underline underline-offset-4" href="/ops/shifts">
              Post shifts
            </Link>
          )}
        </None>
      )}
    </Section>
  );

  const activitySection = (
    <Section title="Recent activity">
      {ws.audit.length ? (
        <ul className="divide-y divide-ops-line text-sm">
          {ws.audit.slice(0, 12).map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 py-1.5">
              <span className="w-32 shrink-0 text-xs tabular-nums text-muted">{fmtDateTime(a.created_at)}</span>
              <span className="text-ink">{a.actor_label}</span>
              <span className="text-neutral-600">{a.action.replace(/[._]/g, " ")}</span>
              {a.entity === "enrollment" && codeOf.get(a.entity_id) && (
                <Link href={`/ops/operators/${a.entity_id}`} className={code}>
                  {codeOf.get(a.entity_id)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <None>Nothing yet.</None>
      )}
    </Section>
  );

  return (
    <div className="space-y-6 font-normal">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{project.name}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle.join(" · ")}</p>
        </div>

        {hasData && (
          <form method="get" className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center rounded-md border border-ops-line bg-ops-raised px-1 transition-colors focus-within:border-amber">
              <label htmlFor="ov-from" className="sr-only">
                From
              </label>
              <input id="ov-from" type="date" name="from" defaultValue={from} className={dateInput} />
              <span aria-hidden className="px-1 text-muted">
                –
              </span>
              <label htmlFor="ov-to" className="sr-only">
                To
              </label>
              <input id="ov-to" type="date" name="to" defaultValue={to} className={dateInput} />
            </div>
            {asOfParam && <input type="hidden" name="asof" value={asOfParam} />}
            <button type="submit" className={quietButton}>
              Apply
            </button>
            {(from || to) && (
              <Link href={asOfParam ? `/ops?asof=${asOfParam}` : "/ops"} className="text-sm text-muted hover:text-ink">
                Clear
              </Link>
            )}
          </form>
        )}
      </header>

      {!hasData ? (
        <section className="rounded-md border border-ops-line bg-ops-raised px-6 py-10 sm:px-10">
          <h2 className="text-lg font-semibold text-ink">Nothing to report yet</h2>
          <p className="mt-1.5 max-w-lg text-sm text-neutral-600">
            {leader
              ? "Import the production workbook to bring in operators and hours, or add your first operator by hand."
              : canEdit
                ? "Add your first operator to start tracking this project. Leadership can also import the production workbook."
                : "Figures appear here once leadership imports data or operators are added."}
          </p>
          {canEdit && (
            <div className="mt-5 flex flex-wrap gap-2">
              {leader ? (
                <>
                  <Link href="/ops/import" className={accentButton}>
                    Import workbook
                  </Link>
                  <Link href="/ops/operators" className={quietButton}>
                    Add first operator
                  </Link>
                </>
              ) : (
                <Link href="/ops/operators" className={accentButton}>
                  Add first operator
                </Link>
              )}
            </div>
          )}
        </section>
      ) : (
        <>
          {lastImport ? (
            <p className="text-sm text-muted">
              Last import: <span className="text-neutral-700">{lastImport.source_tab || lastImport.source_filename}</span>, data as of {fmtDate(lastImport.source_as_of)}, imported {fmtDateTime(lastImport.imported_at)} by {lastImport.actor_label}.
              {leader && (
                <>
                  {" "}
                  <Link href="/ops/import" className="text-ink underline underline-offset-4">
                    Import again
                  </Link>
                </>
              )}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-700">
              <span>No data imported yet.</span>
              {leader && (
                <Link href="/ops/import" className={accentButton}>
                  Import workbook
                </Link>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {primary.map((c) => (
              <div key={c.key} className="rounded-md border border-ops-line bg-ops-raised px-5 py-4">
                <MetricLabel c={c} />
                <div className="mt-2">
                  <Figure value={displayValue(c)} size="lg" />
                </div>
              </div>
            ))}
          </div>

          <dl className="grid grid-cols-2 border-y border-ops-line sm:grid-cols-4 sm:divide-x sm:divide-ops-line">
            {secondary.map((c) => (
              <div key={c.key} className="px-0 py-3 sm:px-4 sm:first:pl-0">
                <dt>
                  <MetricLabel c={c} />
                  {c.estimate && <span className="ml-1.5 text-xs text-muted">· estimate</span>}
                </dt>
                <dd className="mt-1">
                  <Figure value={displayValue(c)} size="sm" />
                  {DISCLOSED.has(c.key) && <Definition text={c.definition} />}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {hasData ? (
        <div className="grid gap-x-10 gap-y-6 xl:grid-cols-2">
          <Section title="Today" action={<SectionLink href="/ops/sessions">Recording</SectionLink>}>
            <ul className="divide-y divide-ops-line text-sm">
              <li className={row}>
                <Link href="/ops/sessions" className="text-neutral-700 hover:text-ink">Sessions scheduled today</Link>
                <span className="tabular-nums text-ink">{todaySessions.length}</span>
              </li>
              <li className={row}>
                <Link href="/ops/issues" className="text-neutral-700 hover:text-ink">Overdue tasks</Link>
                <span className="tabular-nums text-ink">{overdueTasks.length}</span>
              </li>
              <li className={row}>
                <Link href="/ops/issues" className="text-neutral-700 hover:text-ink">Open issues</Link>
                <span className="tabular-nums text-ink">{openIssues}</span>
              </li>
              <li className={row}>
                <Link href="/ops/files" className="text-neutral-700 hover:text-ink">Files to review or rename</Link>
                <span className="tabular-nums text-ink">{filesToReview.length}</span>
              </li>
            </ul>
          </Section>

          <Section title="Follow-ups due">
            {followUpsDue.length ? (
              <ul className="divide-y divide-ops-line text-sm">
                {followUpsDue.map(({ e }) => (
                  <li key={e.id} className={row}>
                    <Link href={`/ops/operators/${e.id}`} className={code}>
                      {e.anonymous_code}
                    </Link>
                    <span className="flex-1 text-neutral-700">{e.next_action || "—"}</span>
                    <Status tone={e.next_action_due! < today ? "bad" : "accent"}>Due {fmtDate(e.next_action_due)}</Status>
                  </li>
                ))}
              </ul>
            ) : (
              <None>Nothing due today or earlier.</None>
            )}
          </Section>

          <Section title="Leads awaiting first contact" action={<SectionLink href="/ops/operators">Operator CRM</SectionLink>}>
            {leadsToContact.length ? (
              <ul className="divide-y divide-ops-line text-sm">
                {leadsToContact.map(({ e }) => (
                  <li key={e.id} className={row}>
                    <Link href={`/ops/operators/${e.id}`} className={code}>
                      {e.anonymous_code}
                    </Link>
                    <span className="flex-1 text-neutral-700">{e.ops_people?.name}</span>
                    <span className="text-xs text-muted">
                      {isKey(LEAD_STAGES, e.lead_stage) ? LEAD_STAGES[e.lead_stage] : e.lead_stage} · {e.outreach_owner || "unassigned"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <None>No new leads waiting.</None>
            )}
          </Section>

          <Section title="Onboarding blockers" action={<SectionLink href="/ops/onboarding">Onboarding</SectionLink>}>
            {blockedSteps.length ? (
              <ul className="divide-y divide-ops-line text-sm">
                {blockedSteps.map((s) => (
                  <li key={s.id} className="py-2">
                    <Link href={`/ops/operators/${s.enrollment_id}`} className={code}>
                      {codeOf.get(s.enrollment_id)}
                    </Link>{" "}
                    <span className="text-neutral-700">· {ws.templates.find((t) => t.id === s.template_id)?.steps.find((t) => t.key === s.step_key)?.label ?? s.step_key}</span>
                    {s.reason && <p className="text-xs text-muted">{s.reason}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <None>No blocked steps.</None>
            )}
          </Section>

          {shiftSection}

          <Section title="Upload follow-ups">
            <p className="mb-1 text-xs text-muted">
              Current operators with no submitted time in {NO_RECENT_UPLOAD_DAYS}+ days, as of {fmtDate(asOf)}. Review for offboarding after {OFFBOARD_REVIEW_DAYS}. Nobody is offboarded automatically.
            </p>
            {alerts.length ? (
              <ul className="divide-y divide-ops-line text-sm">
                {alerts.map((a) => {
                  const e = current.find((x) => x.source_operator_id === a.sourceOperatorId);
                  return (
                    <li key={a.sourceOperatorId} className={row}>
                      <Link href={`/ops/operators/${e?.id}`} className={code}>
                        {e?.anonymous_code ?? a.sourceOperatorId}
                      </Link>
                      <span className="flex-1 text-neutral-600">{a.lastUploadDate ? `Last submitted ${fmtDate(a.lastUploadDate)} (${a.daysSince} days)` : "No submitted time on record"}</span>
                      <Status tone={a.level === "offboarding_review_due" ? "bad" : "accent"}>
                        {a.level === "offboarding_review_due" ? "Offboarding review due" : a.level === "never" ? "No uploads recorded" : "No recent upload"}
                      </Status>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <None>No flags for current operators.</None>
            )}
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer select-none hover:text-ink">Change as-of date</summary>
              <form method="get" className="mt-2 flex flex-wrap items-center gap-2">
                {from && <input type="hidden" name="from" value={from} />}
                {to && <input type="hidden" name="to" value={to} />}
                <label htmlFor="ov-asof" className="sr-only">
                  As-of date
                </label>
                <div className="flex h-9 items-center rounded-md border border-ops-line bg-ops-raised px-1 focus-within:border-amber">
                  <input id="ov-asof" type="date" name="asof" defaultValue={asOf} className={dateInput} />
                </div>
                <button type="submit" className={quietButton}>
                  Apply
                </button>
                {asOfParam && (
                  <Link href={from || to ? `/ops?${new URLSearchParams({ ...(from && { from }), ...(to && { to }) })}` : "/ops"} className="hover:text-ink">
                    Reset to today
                  </Link>
                )}
              </form>
            </details>
          </Section>
        </div>
      ) : (
        <div className="grid gap-x-10 gap-y-6 xl:grid-cols-2">{shiftSection}</div>
      )}

      {activitySection}
    </div>
  );
}

const dateInput =
  "h-full bg-transparent px-2 text-sm tabular-nums text-ink [color-scheme:dark] focus-visible:outline-none";
