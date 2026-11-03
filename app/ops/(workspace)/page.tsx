// app/ops/(workspace)/page.tsx — Overview + "Needs action" for the manager.

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { loadShifts } from "@/lib/ops/db";
import { overviewCards, uploadAlerts } from "@/lib/ops/metrics";
import { forecastScenario } from "@/lib/ops/forecast";
import { crmTab, forecastInputs } from "@/lib/ops/derive";
import { LEAD_STAGES, NO_RECENT_UPLOAD_DAYS, OFFBOARD_REVIEW_DAYS, isKey } from "@/lib/ops/stages";
import { Badge, Empty, Field, PageHeader, Panel, StatCard, fmtDate, fmtDateTime, ghostButton, input, ptDay, todayPT } from "../_components/ui";

export const metadata: Metadata = { title: "Overview" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await pageData();
  if (!data) return null;
  const { ws, project } = data;
  const sp = await searchParams;
  const from = typeof sp.from === "string" && DATE_RE.test(sp.from) ? sp.from : "";
  const to = typeof sp.to === "string" && DATE_RE.test(sp.to) ? sp.to : "";
  const asOf = typeof sp.asof === "string" && DATE_RE.test(sp.asof) ? sp.asof : todayPT();
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
  const filesToReview = ws.files.filter((f) => f.validation_status === "invalid" || f.review_state === "not_reviewed");
  const managerName = ws.team.find((t) => t.id === project.manager_id)?.name;

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        sub={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{project.code}</span>
            {project.customer_alias && <span>Customer: {project.customer_alias}</span>}
            <span>Manager: {managerName ?? "not assigned"}</span>
            {project.location_category && <span>{project.location_category}</span>}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-line bg-shell px-4 py-2.5 text-sm text-neutral-700">
        <Badge tone="info">Manual CSV snapshot</Badge>
        {lastImport ? (
          <span>
            Production data from <strong className="font-medium text-neutral-900">{lastImport.source_tab || lastImport.source_filename}</strong>, source as of {fmtDate(lastImport.source_as_of)} · imported {fmtDateTime(lastImport.imported_at)} by {lastImport.actor_label}.
            Not a live connection to the spreadsheet.
          </span>
        ) : (
          <span>No production import yet. Workbook figures appear after an import in Imports.</span>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <Field name="From">
          <input type="date" name="from" defaultValue={from} className={input} />
        </Field>
        <Field name="To">
          <input type="date" name="to" defaultValue={to} className={input} />
        </Field>
        <Field name="Upload-alert as-of date">
          <input type="date" name="asof" defaultValue={asOf} className={input} />
        </Field>
        <button className={ghostButton} type="submit">
          Apply
        </button>
        {(from || to || sp.asof) && (
          <Link href="/ops" className="text-sm text-neutral-500 underline">
            Clear
          </Link>
        )}
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <StatCard {...c} key={c.key} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={`Leads awaiting first contact (${leadsToContact.length})`} actions={<Link className="text-xs underline text-neutral-500" href="/ops/operators">Operator CRM</Link>}>
          {leadsToContact.length ? (
            <ul className="divide-y divide-line text-sm">
              {leadsToContact.map(({ e }) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/ops/operators/${e.id}`} className="font-mono text-neutral-900 underline-offset-2 hover:underline">
                    {e.anonymous_code}
                  </Link>
                  <span className="text-neutral-600">{e.ops_people?.name}</span>
                  <Badge>{isKey(LEAD_STAGES, e.lead_stage) ? LEAD_STAGES[e.lead_stage] : e.lead_stage}</Badge>
                  <span className="text-xs text-neutral-500">Outreach: {e.outreach_owner || "unassigned"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No new leads waiting for outreach.</Empty>
          )}
        </Panel>

        <Panel title={`Follow-ups due (${followUpsDue.length})`}>
          {followUpsDue.length ? (
            <ul className="divide-y divide-line text-sm">
              {followUpsDue.map(({ e }) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/ops/operators/${e.id}`} className="font-mono underline-offset-2 hover:underline">
                    {e.anonymous_code}
                  </Link>
                  <span className="flex-1 text-neutral-700">{e.next_action || "—"}</span>
                  <Badge tone={e.next_action_due! < today ? "bad" : "amber"}>Due {fmtDate(e.next_action_due)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No next actions due today or earlier.</Empty>
          )}
        </Panel>

        <Panel title={`Onboarding blockers (${blockedSteps.length})`} actions={<Link className="text-xs underline text-neutral-500" href="/ops/onboarding">Onboarding</Link>}>
          {blockedSteps.length ? (
            <ul className="divide-y divide-line text-sm">
              {blockedSteps.map((s) => (
                <li key={s.id} className="py-2">
                  <Link href={`/ops/operators/${s.enrollment_id}`} className="font-mono underline-offset-2 hover:underline">
                    {codeOf.get(s.enrollment_id)}
                  </Link>{" "}
                  · {ws.templates.find((t) => t.id === s.template_id)?.steps.find((t) => t.key === s.step_key)?.label ?? s.step_key}
                  <p className="text-xs text-neutral-500">{s.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No blocked onboarding steps.</Empty>
          )}
        </Panel>

        <Panel title="Shift coverage (from /shifts)" actions={<Link className="text-xs underline text-neutral-500" href="/ops/sessions">Recording Operations</Link>}>
          {shifts === null ? (
            <Empty>{ws.contactsVisible ? "Couldn't load the shift board." : "Shift bookings aren't shown to reviewers."}</Empty>
          ) : upcomingShifts.length ? (
            <ul className="divide-y divide-line text-sm">
              {upcomingShifts.slice(0, 8).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{fmtDateTime(s.starts_at)}</span>
                  <span className="text-neutral-600">{s.camera}</span>
                  {!s.taken ? (
                    <Badge tone="amber">Unfilled</Badge>
                  ) : s.enrollment_id ? (
                    <Badge tone={s.session_id ? "good" : "neutral"}>
                      {codeOf.get(s.enrollment_id)} {s.session_id ? "· session logged" : "· no session yet"}
                    </Badge>
                  ) : (
                    <Badge title="Link this filmer's shift code on their operator page">Booked · not linked to an operator</Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No upcoming shifts posted. Post them in /admin → Shifts.</Empty>
          )}
        </Panel>

        <Panel title={`Upload follow-up flags (${alerts.length})`}>
          <p className="mb-3 text-xs text-neutral-500">
            Computed from workbook operator-days with submitted time, as of {fmtDate(asOf)}. Workbook legend: active within {NO_RECENT_UPLOAD_DAYS} days, offboard after {OFFBOARD_REVIEW_DAYS}. These are follow-up flags. Nobody is offboarded automatically, and daily aggregates are only accurate to the day.
          </p>
          {alerts.length ? (
            <ul className="divide-y divide-line text-sm">
              {alerts.map((a) => {
                const e = current.find((x) => x.source_operator_id === a.sourceOperatorId);
                return (
                  <li key={a.sourceOperatorId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/ops/operators/${e?.id}`} className="font-mono underline-offset-2 hover:underline">
                      {e?.anonymous_code ?? a.sourceOperatorId}
                    </Link>
                    <span className="text-neutral-600">{a.lastUploadDate ? `Last submitted ${fmtDate(a.lastUploadDate)} (${a.daysSince} days)` : "No submitted time on record"}</span>
                    <Badge tone={a.level === "offboarding_review_due" ? "bad" : "amber"}>
                      {a.level === "offboarding_review_due" ? "Offboarding review due" : a.level === "never" ? "No uploads recorded" : "No recent upload"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No flags for current operators.</Empty>
          )}
        </Panel>

        <Panel title="Today and overdue">
          <ul className="space-y-1.5 text-sm text-neutral-700">
            <li>
              <Link className="underline" href="/ops/sessions">
                {todaySessions.length} session(s) scheduled today
              </Link>
            </li>
            <li>
              <Link className="underline" href="/ops/issues">
                {overdueTasks.length} overdue task(s) · {ws.issues.filter((i) => i.status !== "resolved").length} open issue(s)
              </Link>
            </li>
            <li>
              <Link className="underline" href="/ops/files">
                {filesToReview.length} file(s) failing naming checks or not yet reviewed
              </Link>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel title="Recent activity in this workspace">
        <p className="mb-3 text-xs text-neutral-500">Changes made in this app since it was set up. Nothing here is backfilled from earlier spreadsheets.</p>
        {ws.audit.length ? (
          <ul className="divide-y divide-line text-sm">
            {ws.audit.slice(0, 12).map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3 py-1.5">
                <span className="w-40 shrink-0 text-xs text-neutral-500">{fmtDateTime(a.created_at)}</span>
                <span className="text-neutral-800">{a.actor_label}</span>
                <span className="font-mono text-xs text-neutral-600">{a.action}</span>
                {a.entity === "enrollment" && codeOf.get(a.entity_id) && (
                  <Link href={`/ops/operators/${a.entity_id}`} className="font-mono text-xs underline">
                    {codeOf.get(a.entity_id)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No activity recorded yet.</Empty>
        )}
      </Panel>
    </div>
  );
}
