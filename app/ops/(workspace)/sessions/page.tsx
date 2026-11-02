// app/ops/(workspace)/sessions/page.tsx
//
// Recording Operations: a day list of sessions plus the existing /shifts
// bookings they can be created from. Recording, upload, internal review
// and customer acceptance are separate fields and stay independent.

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { loadShifts, type Session } from "@/lib/ops/db";
import { crmTab } from "@/lib/ops/derive";
import { formatHMS } from "@/lib/ops/duration";
import { ROOMS } from "@/lib/ops/naming";
import { COORDINATION_MODES, REVIEW_STATES, SESSION_STATES, UPLOAD_STATES, isKey } from "@/lib/ops/stages";
import { SHIFT_TIME_ZONE_LABEL } from "@/lib/shift-time";
import { createIssue, createSession, updateSession } from "../../actions";
import ActionForm from "../../_components/ActionForm";
import { Badge, Empty, Field, PageHeader, Panel, fmtDate, fmtDateTime, ghostButton, input, ptDay } from "../../_components/ui";

export const metadata: Metadata = { title: "Recording Operations" };

const label = <T extends object>(o: T, k: string) => (isKey(o, k) ? (o[k] as string) : k);

export default async function SessionsPage() {
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  const canEdit = actor.role !== "reviewer";
  const shifts = ws.contactsVisible ? await loadShifts(ws) : null;
  const codeOf = new Map(ws.enrollments.map((e) => [e.id, e.anonymous_code]));
  const recordable = ws.enrollments.filter((e) => crmTab(e) === "current");
  const sessionSteps = ws.templates.find((t) => t.active)?.steps.filter((s) => s.scope === "session") ?? [];

  const byDay = new Map<string, Session[]>();
  for (const s of ws.sessions) {
    const k = s.scheduled_start ? ptDay(s.scheduled_start) : "unscheduled";
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const days = [...byDay.keys()].sort((a, b) => (a === "unscheduled" ? 1 : b === "unscheduled" ? -1 : b.localeCompare(a)));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recording Operations"
        sub={`Times in ${SHIFT_TIME_ZONE_LABEL}. A completed recording isn't the same as uploaded, internally passed, or customer accepted. Each is tracked on its own. Check-ins are manual entries.`}
      />

      {shifts && (
        <Panel title="Bookings from the shift board (/shifts)">
          <p className="mb-3 text-xs text-neutral-500">
            The existing shift board is unchanged. Bookings resolve to an operator once their shift code is linked on the operator page. Create a session from a booking to track it here.
          </p>
          {shifts.length === 0 ? (
            <Empty>No shifts in the last week or upcoming.</Empty>
          ) : (
            <ul className="divide-y divide-neutral-200 text-sm">
              {shifts.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="w-44">{fmtDateTime(s.starts_at)}</span>
                  <span className="w-24 text-neutral-600">{s.camera}</span>
                  <span className="flex-1 text-neutral-600">{s.location}</span>
                  {!s.taken ? (
                    <Badge tone="amber">Unfilled</Badge>
                  ) : s.session_id ? (
                    <a href={`#s-${s.session_id}`} className="underline">
                      <Badge tone="good">Session for {codeOf.get(s.enrollment_id ?? "") ?? "operator"}</Badge>
                    </a>
                  ) : s.enrollment_id ? (
                    canEdit && (
                      <ActionForm action={createSession} inline submit={`Create session for ${codeOf.get(s.enrollment_id)}`} submitClassName={ghostButton}>
                        <input type="hidden" name="enrollment_id" value={s.enrollment_id} />
                        <input type="hidden" name="film_shift_id" value={s.id} />
                        <input type="hidden" name="coordination_mode" value="on_site" />
                      </ActionForm>
                    )
                  ) : (
                    <Badge>Booked by {s.holder ?? "someone"} · shift code not linked to an operator</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {canEdit && (
        <details className="rounded-lg border border-neutral-200 bg-neutral-50">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-neutral-900">Schedule a session manually</summary>
          <div className="border-t border-neutral-200 p-4">
            {recordable.length === 0 ? (
              <Empty>Only current operators (readiness confirmed) can be scheduled.</Empty>
            ) : (
              <ActionForm action={createSession} submit="Create session" reset>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Field name="Operator">
                    <select name="enrollment_id" required className={input}>
                      {recordable.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.anonymous_code}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field name="Date">
                    <input type="date" name="date" className={input} />
                  </Field>
                  <Field name="Start">
                    <input type="time" name="start" className={input} />
                  </Field>
                  <Field name="End">
                    <input type="time" name="end" className={input} />
                  </Field>
                  <Field name="Coordination">
                    <select name="coordination_mode" className={input}>
                      {Object.entries(COORDINATION_MODES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field name="Device">
                    <input name="device_id" className={input} />
                  </Field>
                  <Field name="Task">
                    <input name="task_label" className={input} />
                  </Field>
                  <Field name="Room">
                    <select name="room" className={input} defaultValue="">
                      <option value="">—</option>
                      {ROOMS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </Field>
                  <Field name="Instructions version">
                    <input name="instructions_version" placeholder="household-guide-v1" className={input} />
                  </Field>
                  <Field name="Notes" className="sm:col-span-3">
                    <input name="notes" className={input} />
                  </Field>
                </div>
              </ActionForm>
            )}
          </div>
        </details>
      )}

      {days.length === 0 ? (
        <Empty>No sessions yet. Imported workbook rows are daily totals, not sessions, so they don&apos;t appear here.</Empty>
      ) : (
        days.map((day) => (
          <Panel key={day} title={day === "unscheduled" ? "Unscheduled" : fmtDate(day)}>
            <ul className="space-y-3">
              {byDay.get(day)!.map((s) => (
                <li key={s.id} id={`s-${s.id}`} className="scroll-mt-20 rounded-md border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/ops/operators/${s.enrollment_id}`} className="font-mono text-neutral-900 underline-offset-2 hover:underline">
                      {codeOf.get(s.enrollment_id)}
                    </Link>
                    <span className="text-sm text-neutral-600">{s.scheduled_start ? `${fmtDateTime(s.scheduled_start)} – ${s.scheduled_end ? fmtDateTime(s.scheduled_end) : "?"}` : "No scheduled window"}</span>
                    <Badge tone={s.state === "completed" ? "good" : s.state === "missed" || s.state === "canceled" ? "bad" : "neutral"}>{label(SESSION_STATES, s.state)}</Badge>
                    <Badge>{label(COORDINATION_MODES, s.coordination_mode)}</Badge>
                    <Badge tone={s.upload_status === "transfer_verified" ? "good" : "neutral"}>Upload: {label(UPLOAD_STATES, s.upload_status)}</Badge>
                    <Badge tone={s.review_status.startsWith("customer_accepted") ? "good" : "neutral"}>Review: {label(REVIEW_STATES, s.review_status)}</Badge>
                    {s.film_shift_id && <Badge tone="info">From /shifts</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {[s.task_label && `Task ${s.task_label}`, s.room && `Room ${s.room}`, s.device_id && `Device ${s.device_id}`, s.instructions_version && `Instructions ${s.instructions_version}`]
                      .filter(Boolean)
                      .join(" · ") || "No task details"}
                    {" · "}Duration {s.duration_seconds !== null ? `${formatHMS(s.duration_seconds)} (${s.duration_source.replace("_", " ")})` : "not recorded"}
                    {s.approved_duration_seconds !== null && ` · Approved ${formatHMS(s.approved_duration_seconds)} (source: ${s.review_source})`}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Check-in: {s.checkin_at ? `${fmtDateTime(s.checkin_at)} by ${s.checkin_by_label} (manual)${s.checkin_note ? `: ${s.checkin_note}` : ""}` : "none"}
                  </p>
                  {sessionSteps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sessionSteps.map((st) => {
                        const c = s.session_checks?.[st.key];
                        return (
                          <Badge key={st.key} tone={c?.status === "completed" ? "good" : c?.status === "blocked" ? "bad" : "neutral"} title={c ? `${c.status} by ${c.by}, ${fmtDateTime(c.at)}` : "not recorded"}>
                            {st.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  {s.notes && <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-neutral-500">{s.notes}</pre>}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800">Update session</summary>
                    <div className="mt-3 grid gap-4 lg:grid-cols-2">
                      {canEdit && (
                        <>
                          <ActionForm action={updateSession} inline submit="Set state" submitClassName={ghostButton}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="op" value="state" />
                            <Field name="State">
                              <select name="state" defaultValue={s.state} className={input}>
                                {Object.entries(SESSION_STATES).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </ActionForm>
                          <ActionForm action={updateSession} inline submit="Record check-in now" submitClassName={ghostButton}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="op" value="checkin" />
                            <Field name="Check-in note" className="flex-1">
                              <input name="checkin_note" placeholder="Operator confirmed camera charged" className={input} />
                            </Field>
                          </ActionForm>
                          {sessionSteps.length > 0 && (
                            <ActionForm action={updateSession} inline submit="Record check" submitClassName={ghostButton}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="op" value="check" />
                              <Field name="Pre-session check">
                                <select name="step_key" className={input}>
                                  {sessionSteps.map((st) => (
                                    <option key={st.key} value={st.key}>
                                      {st.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field name="Result">
                                <select name="status" className={input}>
                                  <option value="completed">Completed</option>
                                  <option value="blocked">Blocked</option>
                                  <option value="pending">Pending</option>
                                </select>
                              </Field>
                            </ActionForm>
                          )}
                          <ActionForm action={updateSession} inline submit="Save duration" submitClassName={ghostButton}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="op" value="duration" />
                            <Field name="Duration (h:mm:ss)">
                              <input name="duration" defaultValue={s.duration_seconds !== null ? formatHMS(s.duration_seconds) : ""} className={`${input} w-28`} />
                            </Field>
                            <Field name="Source">
                              <select name="duration_source" defaultValue={s.duration_source} className={input}>
                                <option value="measured">Measured</option>
                                <option value="self_reported">Self-reported</option>
                                <option value="unknown">Unknown</option>
                              </select>
                            </Field>
                          </ActionForm>
                          <ActionForm action={updateSession} inline submit="Save upload" submitClassName={ghostButton}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="op" value="upload" />
                            <Field name="Upload">
                              <select name="upload_status" defaultValue={s.upload_status} className={input}>
                                {Object.entries(UPLOAD_STATES).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field name="Evidence" className="flex-1">
                              <input name="evidence" placeholder="Operator texted; folder seen in Drive" className={input} />
                            </Field>
                          </ActionForm>
                        </>
                      )}
                      <ActionForm action={updateSession} inline submit="Save review" submitClassName={ghostButton}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="op" value="review" />
                        <Field name="Review">
                          <select name="review_status" defaultValue={s.review_status} className={input}>
                            {Object.entries(REVIEW_STATES)
                              .filter(([k]) => canEdit || (!k.startsWith("customer") && k !== "partial"))
                              .map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                          </select>
                        </Field>
                        <Field name="Decision source">
                          <input name="review_source" defaultValue={s.review_source} placeholder="Required for customer decisions" className={input} />
                        </Field>
                        <Field name="Approved (h:mm:ss)">
                          <input name="approved_duration" className={`${input} w-28`} />
                        </Field>
                      </ActionForm>
                      <ActionForm action={createIssue} inline submit="Flag issue" submitClassName={ghostButton} reset>
                        <input type="hidden" name="project_id" value={project.id} />
                        <input type="hidden" name="session_id" value={s.id} />
                        <input type="hidden" name="enrollment_id" value={s.enrollment_id} />
                        <Field name="Category">
                          <select name="category" className={input}>
                            <option value="recording_quality">Recording quality</option>
                            <option value="equipment">Equipment</option>
                            <option value="scheduling">Scheduling</option>
                            <option value="upload">Upload</option>
                            <option value="other">Other</option>
                          </select>
                        </Field>
                        <Field name="What happened" className="flex-1">
                          <input name="description" required className={input} />
                        </Field>
                      </ActionForm>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}
    </div>
  );
}
