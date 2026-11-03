// app/ops/(workspace)/operators/page.tsx
//
// Operator CRM: Potential Operators / Onboarding / Current Operators over
// one canonical person record + per-project enrollment. Table and board
// views read the same rows; moving a card persists through updateEnrollment
// and writes an audit event.

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { crmTab, productionFor, sumSeconds, type CrmTab } from "@/lib/ops/derive";
import { onboardingProgress } from "@/lib/ops/onboarding";
import { COLLECTION_STAGES, LEAD_STAGES, PIPELINE, isKey } from "@/lib/ops/stages";
import { formatHours } from "@/lib/ops/duration";
import { maskPhone } from "@/lib/ops/phone";
import type { Enrollment, Workspace } from "@/lib/ops/db";
import { loadShifts } from "@/lib/ops/db";
import { addLead, updateEnrollment } from "../../actions";
import ActionForm from "../../_components/ActionForm";
import { Badge, Empty, Field, PageHeader, Panel, Table, fmtDate, fmtDateTime, ghostButton, input, td } from "../../_components/ui";

export const metadata: Metadata = { title: "Operator CRM" };

const TABS: { key: CrmTab; label: string }[] = [
  { key: "potential", label: "Potential Operators" },
  { key: "onboarding", label: "Onboarding" },
  { key: "current", label: "Current Operators" },
  { key: "unconfirmed", label: "Imported · needs confirmation" },
  { key: "closed", label: "Declined / withdrawn / archived" },
];

const stageLabel = (s: string) => (isKey(LEAD_STAGES, s) ? LEAD_STAGES[s] : s);
const collectionLabel = (s: string) => (isKey(COLLECTION_STAGES, s) ? COLLECTION_STAGES[s] : s);

function matches(e: Enrollment, q: string) {
  if (!q) return true;
  const hay = [e.anonymous_code, e.source_operator_id, e.ops_people?.name, e.lead_source, e.channel, e.outreach_owner, e.onboarding_owner, e.ops_people?.sourced_by, e.next_action, e.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function progressFor(ws: Workspace, e: Enrollment) {
  const tpl = ws.templates.find((t) => t.active);
  if (!tpl) return null;
  return onboardingProgress(tpl.steps, ws.steps.filter((s) => s.enrollment_id === e.id && s.template_id === tpl.id));
}

export default async function OperatorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "potential") as CrmTab;
  const view = sp.view === "board" ? "board" : "table";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const canEdit = actor.role !== "reviewer";

  const counts = Object.fromEntries(TABS.map((t) => [t.key, 0])) as Record<CrmTab, number>;
  for (const e of ws.enrollments) counts[crmTab(e)]++;
  const rows = ws.enrollments.filter((e) => crmTab(e) === tab && matches(e, q));
  const managerName = (id: string | null) => ws.team.find((t) => t.id === id)?.name ?? "—";

  const shifts = tab === "current" && ws.contactsVisible ? await loadShifts(ws) : null;
  const nextShift = (id: string) => shifts?.find((s) => s.enrollment_id === id && s.upcoming);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ tab, view, ...(q ? { q } : {}), ...patch });
    return `/ops/operators?${p}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Operator CRM" sub={`${project.name}. A sourced lead is not an active operator: leads never count toward current operator or production totals.`} />

      <nav aria-label="Operator lists" className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={qs({ tab: t.key })}
            aria-current={t.key === tab ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${t.key === tab ? "border-amber text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
          >
            {t.label} <span className="text-neutral-500">({counts[t.key]})</span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="view" value={view} />
          <Field name="Search">
            <input name="q" defaultValue={q} placeholder="code, name, source, owner…" className={`${input} w-64`} />
          </Field>
          <button className={ghostButton} type="submit">
            Search
          </button>
        </form>
        {tab === "potential" && (
          <div className="flex gap-1 text-sm">
            <Link href={qs({ view: "table" })} aria-current={view === "table" ? "page" : undefined} className={`${ghostButton} ${view === "table" ? "border-amber" : ""}`}>
              Table
            </Link>
            <Link href={qs({ view: "board" })} aria-current={view === "board" ? "page" : undefined} className={`${ghostButton} ${view === "board" ? "border-amber" : ""}`}>
              Board
            </Link>
          </div>
        )}
      </div>

      {canEdit && tab === "potential" && (
        <details className="rounded-[22px] border border-line bg-shell">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-neutral-900">Add a potential operator</summary>
          <div className="border-t border-line p-4">
            <p className="mb-3 text-xs text-neutral-500">
              Enter only what you actually know. A new lead starts at “New lead” or “Outreach pending”. Mark them contacted only after you&apos;ve logged a real contact. The phone number stays in the protected person record and never reaches the demo.
            </p>
            <ActionForm action={addLead} submit="Add lead" reset>
              <input type="hidden" name="project_id" value={project.id} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field name="Name (as supplied)">
                  <input name="name" required className={input} />
                </Field>
                <Field name="Phone">
                  <input name="phone" inputMode="tel" className={input} />
                </Field>
                <Field name="Email">
                  <input name="email" type="email" className={input} />
                </Field>
                <Field name="Intake ID (optional)">
                  <input name="intake_ref" placeholder="lead-carlos-001" className={input} />
                </Field>
                <Field name="Sourced by">
                  <input name="sourced_by" required placeholder="Carlos / Neal" className={input} />
                </Field>
                <Field name="Lead source">
                  <input name="lead_source" placeholder="Personal network" className={input} />
                </Field>
                <Field name="Channel / campaign">
                  <input name="channel" className={input} />
                </Field>
                <Field name="Stage">
                  <select name="lead_stage" defaultValue="outreach_pending" className={input}>
                    {PIPELINE.map((s) => (
                      <option key={s} value={s}>
                        {stageLabel(s)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field name="Outreach owner">
                  <input name="outreach_owner" className={input} />
                </Field>
                <Field name="Onboarding owner">
                  <input name="onboarding_owner" className={input} />
                </Field>
                <Field name="Next action">
                  <input name="next_action" placeholder="Text to introduce the pilot" className={input} />
                </Field>
                <Field name="Next action due">
                  <input type="date" name="next_action_due" className={input} />
                </Field>
                <Field name="Availability" className="sm:col-span-2">
                  <input name="availability" className={input} />
                </Field>
                <Field name="Notes" className="sm:col-span-2">
                  <input name="notes" className={input} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" name="confirm_same_person" /> Same person as the existing record with this phone (only after confirming)
              </label>
            </ActionForm>
          </div>
        </details>
      )}

      {tab === "potential" && view === "board" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {PIPELINE.map((stage) => {
            const col = rows.filter((e) => e.lead_stage === stage);
            return (
              <section key={stage} aria-label={stageLabel(stage)} className="rounded-[22px] border border-line bg-shell">
                <h2 className="border-b border-line px-3 py-2 label">
                  {stageLabel(stage)} ({col.length})
                </h2>
                <ul className="space-y-2 p-2">
                  {col.map((e) => (
                    <li key={e.id} className="rounded-[14px] border border-line bg-white p-2.5 text-sm">
                      <Link href={`/ops/operators/${e.id}`} className="font-mono text-neutral-900 hover:underline">
                        {e.anonymous_code}
                      </Link>
                      {e.ops_people?.name && <p className="text-neutral-700">{e.ops_people.name}</p>}
                      <p className="text-xs text-neutral-500">{e.next_action || "No next action"}</p>
                      {canEdit && (
                        <ActionForm action={updateEnrollment} inline submit="Move" submitClassName={ghostButton} className="mt-2">
                          <input type="hidden" name="id" value={e.id} />
                          <label className="sr-only" htmlFor={`stage-${e.id}`}>
                            Move {e.anonymous_code} to stage
                          </label>
                          <select id={`stage-${e.id}`} name="lead_stage" defaultValue={e.lead_stage} className={`${input} w-36`}>
                            {Object.entries(LEAD_STAGES).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </ActionForm>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : rows.length === 0 ? (
        <Empty>{q ? "Nothing matches that search." : tab === "potential" ? "No potential operators yet. Add one above or import a lead sheet." : "Nobody in this list yet."}</Empty>
      ) : tab === "potential" || tab === "closed" ? (
        <Table head={["Code", "Name", "Phone", "Source", "Sourced by", "Outreach", "Onboarding", "Stage", "Last contact", "Next action", "Due", "Availability"]}>
          {rows.map((e) => (
            <tr key={e.id}>
              <td className={td}>
                <Link href={`/ops/operators/${e.id}`} className="font-mono underline-offset-2 hover:underline">
                  {e.anonymous_code}
                </Link>
              </td>
              <td className={td}>{e.ops_people?.name ?? "—"}</td>
              <td className={`${td} font-mono text-xs`}>{e.ops_people?.phone ? maskPhone(e.ops_people.phone) : "—"}</td>
              <td className={td}>{[e.lead_source, e.channel].filter(Boolean).join(" · ") || "—"}</td>
              <td className={td}>{e.ops_people?.sourced_by || "—"}</td>
              <td className={td}>{e.outreach_owner || "—"}</td>
              <td className={td}>{e.onboarding_owner || "—"}</td>
              <td className={td}>
                <Badge>{stageLabel(e.lead_stage)}</Badge>
              </td>
              <td className={td}>{fmtDate(e.last_contact_at)}</td>
              <td className={td}>{e.next_action || "—"}</td>
              <td className={td}>{fmtDate(e.next_action_due)}</td>
              <td className={td}>{e.availability || "—"}</td>
            </tr>
          ))}
        </Table>
      ) : tab === "onboarding" ? (
        <Table head={["Code", "Name", "Stage", "Required steps", "Blocked", "Onboarding owner", "Next action", "Due"]}>
          {rows.map((e) => {
            const p = progressFor(ws, e);
            return (
              <tr key={e.id}>
                <td className={td}>
                  <Link href={`/ops/operators/${e.id}`} className="font-mono underline-offset-2 hover:underline">
                    {e.anonymous_code}
                  </Link>
                </td>
                <td className={td}>{e.ops_people?.name ?? "—"}</td>
                <td className={td}>
                  <Badge>{stageLabel(e.lead_stage)}</Badge>
                </td>
                <td className={td}>{p ? `${p.completed} / ${p.applicable} complete` : "No template installed"}</td>
                <td className={td}>{p?.blocked.length ? <Badge tone="bad">{p.blocked.length} blocked</Badge> : "—"}</td>
                <td className={td}>{e.onboarding_owner || "—"}</td>
                <td className={td}>{e.next_action || "—"}</td>
                <td className={td}>{fmtDate(e.next_action_due)}</td>
              </tr>
            );
          })}
        </Table>
      ) : tab === "current" ? (
        <Table head={["Code", "Manager", "Readiness", "Next shift", "Recording status", "Last submitted", "Commit (unit unconfirmed)", "Submitted", "Accepted", "Device", "Next action"]}>
          {rows.map((e) => {
            const prod = productionFor(e, ws.production);
            const sub = sumSeconds(prod, "submitted_seconds");
            const acc = sumSeconds(prod, "accepted_seconds");
            const last = [...prod].reverse().find((r) => r.submitted_seconds);
            const device = [...prod].reverse().find((r) => r.device_id)?.device_id;
            const commit = prod.filter((r) => r.commit_quantity !== null);
            const shift = nextShift(e.id);
            return (
              <tr key={e.id}>
                <td className={td}>
                  <Link href={`/ops/operators/${e.id}`} className="font-mono underline-offset-2 hover:underline">
                    {e.anonymous_code}
                  </Link>
                </td>
                <td className={td}>{managerName(e.manager_id)}</td>
                <td className={td}>
                  {e.readiness_confirmed_at ? (
                    <Badge tone="good" title={`Confirmed by ${e.readiness_confirmed_label}`}>
                      Confirmed {fmtDate(e.readiness_confirmed_at)}
                    </Badge>
                  ) : (
                    <Badge title="Record confirmed, readiness not recorded in this app">Not recorded</Badge>
                  )}
                </td>
                <td className={td}>{shift ? fmtDateTime(shift.starts_at) : "—"}</td>
                <td className={td}>
                  <Badge tone={e.collection_stage === "recording" ? "good" : "neutral"}>{collectionLabel(e.collection_stage)}</Badge>
                </td>
                <td className={td}>{last ? fmtDate(last.calendar_date) : "—"}</td>
                <td className={td}>{commit.length ? commit.reduce((s, r) => s + Number(r.commit_quantity), 0) : "—"}</td>
                <td className={td}>{sub.known ? formatHours(sub.seconds) : "—"}</td>
                <td className={td}>{acc.known ? formatHours(acc.seconds) : <span className="text-neutral-500">Unknown</span>}</td>
                <td className={td}>{device ?? "—"}</td>
                <td className={td}>{e.next_action || "—"}</td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Panel title="Imported from the production workbook, not yet confirmed">
          <p className="mb-3 text-sm text-neutral-600">
            These records were created from workbook rows. Each needs a person to confirm it&apos;s a real, eligible operator, or mark it as a placeholder (e.g. “Household_a6”), before it counts anywhere. Their sheet status is kept with its as-of date. It isn&apos;t proof of recent uploads.
          </p>
          <Table head={["Code", "Workbook operator ID", "Workbook status (as of)", "Record", "Submitted (workbook)"]}>
            {rows.map((e) => {
              const sub = sumSeconds(productionFor(e, ws.production), "submitted_seconds");
              return (
                <tr key={e.id}>
                  <td className={td}>
                    <Link href={`/ops/operators/${e.id}`} className="font-mono underline-offset-2 hover:underline">
                      {e.anonymous_code}
                    </Link>
                  </td>
                  <td className={`${td} font-mono text-xs`}>{e.source_operator_id ?? "—"}</td>
                  <td className={td}>{e.imported_status ? `${e.imported_status} (${fmtDate(e.imported_status_as_of)})` : "—"}</td>
                  <td className={td}>
                    <Badge tone="amber">{e.record_status === "placeholder" ? "Possible placeholder" : "Unconfirmed"}</Badge>
                  </td>
                  <td className={td}>{sub.known ? formatHours(sub.seconds) : "—"}</td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      )}
    </div>
  );
}
