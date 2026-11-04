// app/ops/(workspace)/operators/[id]/page.tsx
//
// One operator on one project, traced end to end: sourcing → onboarding →
// readiness → shifts/sessions → workbook production → files → issues →
// forecast. Activity shows only events actually recorded in this app.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageData } from "@/lib/ops/page";
import { db, loadShiftCodes, type AuditEvent } from "@/lib/ops/db";
import { crmTab, forecastInputs, productionFor, sumSeconds } from "@/lib/ops/derive";
import { forecastOperator } from "@/lib/ops/forecast";
import { onboardingProgress } from "@/lib/ops/onboarding";
import { formatHMS, formatHours } from "@/lib/ops/duration";
import { COLLECTION_STAGES, ISSUE_CATEGORIES, LEAD_STAGES, REVIEW_STATES, SESSION_STATES, isKey } from "@/lib/ops/stages";
import {
  confirmImportedRecord,
  confirmReadiness,
  createIssue,
  createTask,
  linkShiftCode,
  logContact,
  saveAssumption,
  setStep,
  updateEnrollment,
} from "../../../actions";
import ActionForm from "../../../_components/ActionForm";
import { Badge, Empty, Field, PageHeader, Panel, Table, fmtDate, fmtDateTime, ghostButton, input, td, todayPT } from "../../../_components/ui";

export const metadata: Metadata = { title: "Operator" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const label = <T extends object>(o: T, k: string) => (isKey(o, k) ? (o[k] as string) : k);
const stepTone = { completed: "good", blocked: "bad", not_applicable: "neutral", pending: "amber" } as const;

export default async function OperatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  // Only enrollments in the actor's current, in-scope project are loaded,
  // so an id from another project simply isn't found.
  const e = ws.enrollments.find((x) => x.id === id);
  if (!e) notFound();
  const canEdit = actor.role !== "reviewer";

  const tab = crmTab(e);
  const tpl = ws.templates.find((t) => t.active) ?? null;
  const myStepRows = ws.steps.filter((s) => s.enrollment_id === e.id && s.template_id === tpl?.id);
  const progress = tpl ? onboardingProgress(tpl.steps, myStepRows) : null;
  const prod = productionFor(e, ws.production);
  const submitted = sumSeconds(prod, "submitted_seconds");
  const accepted = sumSeconds(prod, "accepted_seconds");
  const sessions = ws.sessions.filter((s) => s.enrollment_id === e.id);
  const files = ws.files.filter((f) => f.enrollment_id === e.id || sessions.some((s) => s.id === f.session_id));
  const issues = ws.issues.filter((i) => i.enrollment_id === e.id);
  const tasks = ws.tasks.filter((t) => t.enrollment_id === e.id);
  const assumption = ws.assumptions.find((a) => a.enrollment_id === e.id);
  const fInput = forecastInputs([e], ws.production, ws.assumptions)[0];
  const forecast = fInput ? forecastOperator(fInput, { includePipeline: true, includePaused: true }) : null;

  const [{ data: activity }, allCodes] = await Promise.all([
    db().from("ops_audit_events").select("id, actor_label, action, entity, entity_id, detail, created_at").eq("entity", "enrollment").eq("entity_id", e.id).order("created_at", { ascending: false }).limit(100),
    canEdit ? loadShiftCodes() : Promise.resolve([]),
  ]);
  // Managers only see codes that are unlinked or linked to someone on this
  // project; linkShiftCode enforces the same rule server-side.
  const projectPeople = new Set(ws.enrollments.map((x) => x.person_id));
  const codes = actor.role === "leadership" ? allCodes : allCodes.filter((c) => !c.person_id || projectPeople.has(c.person_id));
  const linkedCode = codes.find((c) => c.person_id === e.person_id);

  return (
    <div className="space-y-5">
      <Link href="/ops/operators" className="text-sm text-neutral-500 underline">
        ← Operator CRM
      </Link>
      <PageHeader
        title={e.anonymous_code}
        sub={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone="amber">{project.code}</Badge>
            <Badge>{label(LEAD_STAGES, e.lead_stage)}</Badge>
            <Badge tone={e.collection_stage === "recording" ? "good" : "neutral"}>Collection: {label(COLLECTION_STAGES, e.collection_stage)}</Badge>
            {e.record_status !== "confirmed" && <Badge tone="amber">{e.record_status === "placeholder" ? "Possible placeholder" : "Unconfirmed import"}</Badge>}
            {e.source_operator_id && <Badge>Workbook ID {e.source_operator_id}</Badge>}
            <span className="text-xs">List: {tab}</span>
          </span>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {ws.contactsVisible && e.ops_people && (
          <Panel title="Private contact (internal only)">
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="text-xs text-neutral-500">Name as supplied</dt>
                <dd>{e.ops_people.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Phone</dt>
                <dd className="font-mono">{e.ops_people.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Email</dt>
                <dd>{e.ops_people.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Sourced by · intake ID</dt>
                <dd>
                  {e.ops_people.sourced_by || "—"} {e.ops_people.intake_ref && `· ${e.ops_people.intake_ref}`}
                </dd>
              </div>
            </dl>
            {e.ops_people.phone && (
              <p className="mt-3 text-xs text-neutral-500">
                <a href={`sms:${e.ops_people.phone}`} className="underline">
                  Open in a text app
                </a>{" "}
                (nothing is sent or logged by this link; log the contact below once it actually happens).
              </p>
            )}
          </Panel>
        )}

        <Panel title="Production (workbook daily aggregates)">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-neutral-500">Submitted</dt>
              <dd className="text-lg">{submitted.known ? formatHours(submitted.seconds) : "—"}</dd>
              <dd className="text-xs text-neutral-500">{submitted.known} operator-days</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Customer-accepted</dt>
              <dd className="text-lg">{accepted.known ? formatHours(accepted.seconds) : "Unknown"}</dd>
              <dd className="text-xs text-neutral-500">{accepted.known} of {submitted.known} days have a value</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Target</dt>
              <dd>{e.target_seconds !== null ? `${formatHours(e.target_seconds)} (${e.target_source})` : "None documented"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Sessions logged</dt>
              <dd>{sessions.length}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Forecast">
          {forecast && forecast.capacitySeconds !== null ? (
            <div className="space-y-1 text-sm">
              <p>
                {formatHours(assumption!.daily_seconds)}/day × {assumption!.remaining_recording_days} days = capacity {formatHours(forecast.capacitySeconds)}
              </p>
              {forecast.remainingTargetSeconds !== null && <p>Remaining to target: {formatHours(forecast.remainingTargetSeconds)}</p>}
              <p className="text-neutral-900">
                Estimated remaining recorded: <strong className="font-medium">{formatHours(forecast.forecastRecordedSeconds)}</strong> <Badge tone="info">Estimate</Badge>
              </p>
              <p className="text-xs text-neutral-500">{forecast.reason} Source: {assumption!.assumption_source}</p>
            </div>
          ) : (
            <Empty>No documented daily rate yet. Add one below or on Production Forecasts.</Empty>
          )}
        </Panel>
      </div>

      {canEdit && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Pipeline and ownership">
            <ActionForm action={updateEnrollment} submit="Save">
              <input type="hidden" name="id" value={e.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="Sourcing stage">
                  <select name="lead_stage" defaultValue={e.lead_stage} className={input}>
                    {Object.entries(LEAD_STAGES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field name="Collection stage">
                  <select name="collection_stage" defaultValue={e.collection_stage} className={input}>
                    {Object.entries(COLLECTION_STAGES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field name="Outreach owner">
                  <input name="outreach_owner" defaultValue={e.outreach_owner} className={input} />
                </Field>
                <Field name="Onboarding owner">
                  <input name="onboarding_owner" defaultValue={e.onboarding_owner} className={input} />
                </Field>
                <Field name="Project manager">
                  <select name="manager_id" defaultValue={e.manager_id ?? ""} className={input}>
                    <option value="">—</option>
                    {ws.team.filter((t) => t.active).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field name="Availability">
                  <input name="availability" defaultValue={e.availability} className={input} />
                </Field>
                <Field name="Lead source">
                  <input name="lead_source" defaultValue={e.lead_source} className={input} />
                </Field>
                <Field name="Channel / campaign">
                  <input name="channel" defaultValue={e.channel} className={input} />
                </Field>
                <Field name="Next action">
                  <input name="next_action" defaultValue={e.next_action} className={input} />
                </Field>
                <Field name="Next action due">
                  <input type="date" name="next_action_due" defaultValue={e.next_action_due ?? ""} className={input} />
                </Field>
                <Field name="Recording start">
                  <input type="date" name="start_date" defaultValue={e.start_date ?? ""} className={input} />
                </Field>
                <Field name="Target end">
                  <input type="date" name="target_end_date" defaultValue={e.target_end_date ?? ""} className={input} />
                </Field>
                <Field name="Target hours (documented)">
                  <input name="target_hours" defaultValue={e.target_seconds !== null ? String(e.target_seconds / 3600) : ""} className={input} />
                </Field>
                <Field name="Target source">
                  <input name="target_source" defaultValue={e.target_source} className={input} />
                </Field>
                <Field name="Location category (coarse)">
                  <input name="location_category" defaultValue={e.location_category} placeholder="e.g. Southern California" className={input} />
                </Field>
                <Field name="Notes" className="sm:col-span-2">
                  <textarea name="notes" rows={2} defaultValue={e.notes} className={input} />
                </Field>
              </div>
            </ActionForm>
          </Panel>

          <div className="space-y-4">
            <Panel title="Log a contact">
              <p className="mb-3 text-xs text-neutral-500">Record outreach that actually happened. This app doesn&apos;t send texts.</p>
              <ActionForm action={logContact} submit="Log contact" reset>
                <input type="hidden" name="id" value={e.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field name="Date">
                    <input type="date" name="contacted_on" defaultValue={todayPT()} className={input} />
                  </Field>
                  <Field name="Channel">
                    <select name="contact_channel" className={input}>
                      <option value="text">Text</option>
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="in_person">In person</option>
                    </select>
                  </Field>
                  <Field name="New stage (optional)">
                    <select name="lead_stage" defaultValue="" className={input}>
                      <option value="">Unchanged</option>
                      {Object.entries(LEAD_STAGES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field name="What happened" className="sm:col-span-3">
                    <input name="note" required placeholder="Texted intro; replied interested, available weekends" className={input} />
                  </Field>
                </div>
              </ActionForm>
            </Panel>

            {e.record_status !== "confirmed" && (
              <Panel title="Confirm imported record">
                <p className="mb-3 text-xs text-neutral-500">
                  Created from workbook row(s). Workbook status: {e.imported_status || "—"} as of {fmtDate(e.imported_status_as_of)}.
                </p>
                <ActionForm action={confirmImportedRecord} submit="Record decision">
                  <input type="hidden" name="id" value={e.id} />
                  <Field name="Decision">
                    <select name="record_status" className={input}>
                      <option value="confirmed">Real, eligible operator</option>
                      <option value="placeholder">Placeholder, not a person</option>
                    </select>
                  </Field>
                  <Field name="Basis">
                    <input name="note" required placeholder="Confirmed with Carlos on…" className={input} />
                  </Field>
                </ActionForm>
              </Panel>
            )}

            <Panel title="Shift board access">
              <p className="mb-3 text-xs text-neutral-500">
                Link this person&apos;s /shifts access code so their bookings show up here. Codes are managed on the Shift board.
              </p>
              <ActionForm action={linkShiftCode} inline submit="Save link" submitClassName={ghostButton}>
                <input type="hidden" name="enrollment_id" value={e.id} />
                <label className="sr-only" htmlFor="code_id">
                  Shift code holder
                </label>
                <select id="code_id" name="code_id" defaultValue={linkedCode?.id ?? ""} className={`${input} w-64`}>
                  <option value="">— not linked —</option>
                  {codes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.person_id && c.person_id !== e.person_id ? " (linked to someone else)" : ""}
                    </option>
                  ))}
                </select>
              </ActionForm>
            </Panel>
          </div>
        </div>
      )}

      <Panel title={tpl ? `Onboarding: ${tpl.name} (${tpl.version})` : "Onboarding"}>
        {!tpl || !progress ? (
          <Empty>
            No onboarding template is installed for this project. <Link href="/ops/onboarding" className="underline">Install one</Link>.
          </Empty>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              {progress.completed} of {progress.applicable} applicable required steps completed
              {progress.blocked.length > 0 && <span className="text-red-300"> · {progress.blocked.length} blocked</span>}. Readiness isn&apos;t inferred from this count. A manager confirms it below.
            </p>
            <ul className="divide-y divide-line rounded-[14px] border border-line">
              {tpl.steps
                .filter((s) => s.scope === "onboarding")
                .map((s) => {
                  const r = myStepRows.find((x) => x.step_key === s.key);
                  const status = r?.status ?? "pending";
                  return (
                    <li key={s.key} className="p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-neutral-900">
                          {s.label} {!s.required && <span className="text-xs text-neutral-500">(optional)</span>}
                        </span>
                        <Badge tone={stepTone[status]}>{status.replace("_", " ")}</Badge>
                      </div>
                      {s.note && <p className="mt-1 text-xs text-neutral-500">{s.note}</p>}
                      {r && (
                        <p className="mt-1 text-xs text-neutral-500">
                          {r.completed_at && `Completed ${fmtDateTime(r.completed_at)} by ${r.completed_by_label} (entered in this app). `}
                          {r.reason && `Reason: ${r.reason}. `}
                          {r.evidence_reference && `Evidence: ${r.evidence_reference}. `}
                          {r.owner && `Owner: ${r.owner}. `}
                          {r.due_on && `Due ${fmtDate(r.due_on)}.`}
                        </p>
                      )}
                      {canEdit && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800">Update</summary>
                          <ActionForm action={setStep} className="mt-2" submit="Save step">
                            <input type="hidden" name="enrollment_id" value={e.id} />
                            <input type="hidden" name="template_id" value={tpl.id} />
                            <input type="hidden" name="step_key" value={s.key} />
                            <div className="grid gap-2 sm:grid-cols-5">
                              <Field name="Status">
                                <select name="status" defaultValue={status} className={input}>
                                  <option value="pending">Pending</option>
                                  <option value="completed">Completed</option>
                                  <option value="blocked">Blocked</option>
                                  <option value="not_applicable">Not applicable</option>
                                </select>
                              </Field>
                              <Field name="Reason (blocked / n/a)">
                                <input name="reason" defaultValue={r?.reason} className={input} />
                              </Field>
                              <Field name="Evidence reference">
                                <input name="evidence_reference" defaultValue={r?.evidence_reference} placeholder="Where it's recorded" className={input} />
                              </Field>
                              <Field name="Owner">
                                <input name="owner" defaultValue={r?.owner} className={input} />
                              </Field>
                              <Field name="Due">
                                <input type="date" name="due_on" defaultValue={r?.due_on ?? ""} className={input} />
                              </Field>
                            </div>
                          </ActionForm>
                        </details>
                      )}
                    </li>
                  );
                })}
            </ul>
            <p className="text-xs text-neutral-500">
              Per-session checks ({tpl.steps.filter((s) => s.scope === "session").map((s) => s.label).join(", ")}) are recorded on each session in Recording Operations, not once here.
            </p>

            <div className="rounded-[14px] border border-line p-3">
              <h3 className="text-sm font-medium text-neutral-900">Readiness for scheduled recording</h3>
              {e.readiness_confirmed_at ? (
                <p className="mt-1 text-sm text-emerald-300">
                  Confirmed {fmtDateTime(e.readiness_confirmed_at)} by {e.readiness_confirmed_label}.
                  {e.readiness_override_reason && <span className="text-amber"> Override: {e.readiness_override_reason}</span>}
                </p>
              ) : canEdit ? (
                <ActionForm action={confirmReadiness} className="mt-2" submit="Confirm ready to record">
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="template_id" value={tpl.id} />
                  {!progress.allRequiredDone && (
                    <Field name="Override reason (required while steps are outstanding)">
                      <input name="override_reason" className={input} />
                    </Field>
                  )}
                </ActionForm>
              ) : (
                <p className="mt-1 text-sm text-neutral-500">Not confirmed.</p>
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Recording sessions" actions={<Link href="/ops/sessions" className="text-xs underline text-neutral-500">Recording Operations</Link>}>
        {sessions.length ? (
          <Table head={["When", "State", "Mode", "Task / room", "Duration", "Upload", "Review"]}>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className={td}>
                  <Link href={`/ops/sessions#s-${s.id}`} className="underline-offset-2 hover:underline">
                    {s.scheduled_start ? fmtDateTime(s.scheduled_start) : "Unscheduled"}
                  </Link>
                </td>
                <td className={td}>
                  <Badge>{label(SESSION_STATES, s.state)}</Badge>
                </td>
                <td className={td}>{s.coordination_mode.replace("_", " ")}</td>
                <td className={td}>{[s.task_label, s.room].filter(Boolean).join(" · ") || "—"}</td>
                <td className={td}>{s.duration_seconds !== null ? `${formatHMS(s.duration_seconds)} (${s.duration_source.replace("_", " ")})` : "—"}</td>
                <td className={td}>{s.upload_status.replace(/_/g, " ")}</td>
                <td className={td}>{label(REVIEW_STATES, s.review_status)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No sessions logged in this app yet.</Empty>
        )}
      </Panel>

      <Panel title="Workbook operator-days">
        {prod.length ? (
          <Table head={["Date", "Commit (unit unconfirmed)", "Submitted", "Accepted", "Device", "Sheet status", "Source"]}>
            {prod.map((r) => (
              <tr key={r.id}>
                <td className={td}>{fmtDate(r.calendar_date)}</td>
                <td className={td}>{r.commit_quantity ?? "—"}</td>
                <td className={td}>{formatHMS(r.submitted_seconds)}</td>
                <td className={td}>{r.accepted_seconds === null ? <span className="text-neutral-500">Unknown</span> : formatHMS(r.accepted_seconds)}</td>
                <td className={td}>{r.device_id ?? "—"}</td>
                <td className={td}>{r.operational_status || "—"}</td>
                <td className={`${td} text-xs text-neutral-500`}>
                  {r.source_tab} row {r.source_row} · as of {fmtDate(r.source_as_of)}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No workbook rows for this operator.</Empty>
        )}
      </Panel>

      <Panel title="Files" actions={<Link href="/ops/files" className="text-xs underline text-neutral-500">Files and Review</Link>}>
        {files.length ? (
          <ul className="divide-y divide-line text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="font-mono text-xs">{f.original_path}</span>
                <Badge tone={f.validation_status === "valid" ? "good" : f.validation_status === "warning" ? "amber" : "bad"}>{f.validation_status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No files in the manifest for this operator.</Empty>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Issues">
          {issues.length ? (
            <ul className="mb-4 divide-y divide-line text-sm">
              {issues.map((i) => (
                <li key={i.id} className="py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={i.status === "resolved" ? "good" : "amber"}>{i.status.replace("_", " ")}</Badge>
                    <Badge>{label(ISSUE_CATEGORIES, i.category)}</Badge>
                    <span className="text-xs text-neutral-500">opened {fmtDate(i.opened_at)}</span>
                  </div>
                  <p className="mt-1">{i.description}</p>
                  {i.action_taken && <p className="text-xs text-neutral-500">Action: {i.action_taken}</p>}
                  {i.result && <p className="text-xs text-neutral-500">Result: {i.result}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No issues recorded.</Empty>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-neutral-600">Flag an issue</summary>
            <ActionForm action={createIssue} className="mt-2" submit="Open issue" reset>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="enrollment_id" value={e.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Field name="Category">
                  <select name="category" className={input}>
                    {Object.entries(ISSUE_CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field name="Owner">
                  <input name="owner" className={input} />
                </Field>
                <Field name="What happened" className="sm:col-span-2">
                  <textarea name="description" required rows={2} className={input} />
                </Field>
              </div>
            </ActionForm>
          </details>
        </Panel>

        <Panel title="Tasks">
          {tasks.length ? (
            <ul className="mb-4 divide-y divide-line text-sm">
              {tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className={t.status === "done" ? "text-neutral-500 line-through" : ""}>{t.title}</span>
                  <span className="text-xs text-neutral-500">
                    {t.assignee || "unassigned"} · {t.due_at ? `due ${fmtDate(t.due_at)}` : "no due date"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No tasks.</Empty>
          )}
          {canEdit && (
            <ActionForm action={createTask} inline className="mt-3" submit="Add task" reset>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="enrollment_id" value={e.id} />
              <Field name="Task" className="min-w-48 flex-1">
                <input name="title" required className={input} />
              </Field>
              <Field name="Assignee">
                <input name="assignee" className={input} />
              </Field>
              <Field name="Due">
                <input type="date" name="due_at" className={input} />
              </Field>
            </ActionForm>
          )}
        </Panel>
      </div>

      {canEdit && (
        <Panel title="Forecast assumption">
          <p className="mb-3 text-xs text-neutral-500">Use an observed rate or a documented plan, and say which. Leave the acceptance rate blank unless one is supported.</p>
          <ActionForm action={saveAssumption} submit="Save assumption">
            <input type="hidden" name="enrollment_id" value={e.id} />
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Field name="Horizon start">
                <input type="date" name="horizon_start" defaultValue={assumption?.horizon_start ?? todayPT()} className={input} />
              </Field>
              <Field name="Horizon end">
                <input type="date" name="horizon_end" defaultValue={assumption?.horizon_end ?? ""} className={input} />
              </Field>
              <Field name="Daily recording hours">
                <input name="daily_hours" defaultValue={assumption ? String(assumption.daily_seconds / 3600) : ""} className={input} />
              </Field>
              <Field name="Remaining recording days">
                <input name="remaining_days" defaultValue={assumption?.remaining_recording_days ?? ""} className={input} />
              </Field>
              <Field name="Acceptance rate (0–1, optional)">
                <input name="acceptance_rate" defaultValue={assumption?.assumed_acceptance_rate ?? ""} className={input} />
              </Field>
              <Field name="Source">
                <input name="assumption_source" defaultValue={assumption?.assumption_source} placeholder="Observed W42 avg / agreed plan" className={input} />
              </Field>
            </div>
          </ActionForm>
        </Panel>
      )}

      <Panel title="Activity (recorded in this app)">
        {(activity as AuditEvent[] | null)?.length ? (
          <ol className="space-y-2 text-sm">
            {(activity as AuditEvent[]).map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3">
                <span className="w-40 shrink-0 text-xs text-neutral-500">{fmtDateTime(a.created_at)}</span>
                <span>{a.actor_label}</span>
                <span className="font-mono text-xs text-neutral-600">{a.action}</span>
                <span className="text-xs text-neutral-500">{summarize(a.detail)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>No changes recorded yet. Events appear here as people use the app; nothing is reconstructed from current status.</Empty>
        )}
      </Panel>
    </div>
  );
}

function summarize(detail: Record<string, unknown>) {
  return Object.entries(detail)
    .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
    .join(" · ");
}
