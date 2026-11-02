// app/ops/(workspace)/files/page.tsx
//
// File manifest + naming checks. Originals are kept verbatim; a suggested
// name is manifest metadata only — nothing in storage is renamed. Passing
// the naming check says nothing about footage quality or acceptance.

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { GUIDE_RULE_VERSION, ROOMS, UNCONFIRMED_RULES } from "@/lib/ops/naming";
import { FILE_SUBMISSION_STATES, REVIEW_STATES, isKey } from "@/lib/ops/stages";
import { addFiles, updateFile } from "../../actions";
import ActionForm from "../../_components/ActionForm";
import { Badge, Empty, Field, PageHeader, Panel, fmtDate, ghostButton, input } from "../../_components/ui";

export const metadata: Metadata = { title: "Files and Review" };

const label = <T extends object>(o: T, k: string) => (isKey(o, k) ? (o[k] as string) : k);

export default async function FilesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  const canEdit = actor.role !== "reviewer";
  const sp = await searchParams;
  const filter = typeof sp.status === "string" ? sp.status : "";
  const files = ws.files.filter((f) => !filter || f.validation_status === filter);
  const codeOf = new Map(ws.enrollments.map((e) => [e.id, e.anonymous_code]));
  const profile = ws.profiles.find((p) => !p.effective_to) ?? ws.profiles[0];
  const counts = { valid: 0, warning: 0, invalid: 0 } as Record<string, number>;
  for (const f of ws.files) counts[f.validation_status]++;

  return (
    <div className="space-y-5">
      <PageHeader title="Files and Review" sub="Manifest metadata and rule-based filename checks. No storage integration is connected, so files are listed, not opened or moved.">
        {ws.files.length > 0 && (
          <a href={`/api/ops/files/export?project=${project.id}`} className={ghostButton}>
            Export manifest CSV
          </a>
        )}
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Naming rule">
          <p className="text-sm text-neutral-800">
            <code className="font-mono text-xs">operator/MM-DD-YYYY/room/task-name-Static|Movement-NN.mp4</code>
          </p>
          <p className="mt-1 text-xs text-neutral-500">Version: {GUIDE_RULE_VERSION}. From the household Onboarding Video Guide. Not yet confirmed as the customer&apos;s requirement.</p>
          <p className="mt-2 text-xs text-neutral-500">Rooms: {ROOMS.join(", ")} (cross-room joined with “+”).</p>
          <h3 className="mt-3 text-xs font-medium uppercase tracking-wider text-amber">Unconfirmed, so these only warn</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-neutral-600">
            {UNCONFIRMED_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Delivery profile in effect">
          {profile ? (
            <dl className="space-y-1 text-sm">
              <div>
                {profile.destination_type.toUpperCase()} · {profile.destination_label || "destination not described"} <Badge>{profile.integration_status === "connected" ? "Connected" : "Not connected · manual confirmation"}</Badge>
              </div>
              <div className="text-xs text-neutral-500">
                Version {profile.version} from {fmtDate(profile.effective_from)} · naming {profile.naming_rule_version} · instructions {profile.upload_instructions_version || "—"}
              </div>
              {profile.folder_rule && <div className="text-xs text-neutral-500">Folders: {profile.folder_rule}</div>}
            </dl>
          ) : (
            <Empty>
              No delivery profile yet. Configure one in <Link href="/ops/settings" className="underline">Project settings</Link>.
            </Empty>
          )}
        </Panel>
        <Panel title="Manifest status">
          <div className="flex flex-wrap gap-2 text-sm">
            {[["", `All (${ws.files.length})`], ["valid", `Pass (${counts.valid})`], ["warning", `Warnings (${counts.warning})`], ["invalid", `Fail (${counts.invalid})`]].map(([k, v]) => (
              <Link key={k} href={k ? `/ops/files?status=${k}` : "/ops/files"} className={`${ghostButton} ${filter === k ? "border-amber" : ""}`}>
                {v}
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {canEdit && (
        <Panel title="Add files to the manifest">
          <p className="mb-3 text-xs text-neutral-500">
            Paste one path per line, exactly as received. Each path is checked against the rule above and stored unchanged. Paths already in the manifest are skipped and reported.
          </p>
          <ActionForm action={addFiles} submit="Check and add" reset>
            <input type="hidden" name="project_id" value={project.id} />
            <div className="grid gap-3 lg:grid-cols-4">
              <Field name="Paths" className="lg:col-span-3">
                <textarea name="paths" rows={5} required placeholder="OP-001/10-23-2026/kitchen/laundry-to-basket-Static-01.mp4" className={`${input} font-mono text-xs`} />
              </Field>
              <div className="space-y-3">
                <Field name="Recording session (optional)">
                  <select name="session_id" defaultValue="" className={input}>
                    <option value="">— none —</option>
                    {ws.sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {codeOf.get(s.enrollment_id)} · {s.scheduled_start ? fmtDate(s.scheduled_start) : "unscheduled"} {s.task_label}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="text-xs text-neutral-500">Without a session, files are linked to the operator from the folder name when it matches.</p>
              </div>
            </div>
          </ActionForm>
        </Panel>
      )}

      {files.length === 0 ? (
        <Empty>{ws.files.length ? "No files with that status." : "The manifest is empty. Add paths above. Video files themselves are not needed."}</Empty>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-xs text-neutral-900">{f.original_path}</code>
                <Badge tone={f.validation_status === "valid" ? "good" : f.validation_status === "warning" ? "amber" : "bad"}>
                  {f.validation_status === "valid" ? "Naming check passed" : f.validation_status === "warning" ? "Passed with warnings" : "Naming check failed"}
                </Badge>
                {f.enrollment_id && (
                  <Link href={`/ops/operators/${f.enrollment_id}`} className="font-mono text-xs underline">
                    {codeOf.get(f.enrollment_id)}
                  </Link>
                )}
                {f.session_id && <Badge tone="info">Session linked</Badge>}
                <Badge>{label(FILE_SUBMISSION_STATES, f.submission_state)}</Badge>
                <Badge tone={f.review_state === "customer_accepted" ? "good" : f.review_state.endsWith("failed") || f.review_state.endsWith("rejected") ? "bad" : "neutral"}>
                  {f.review_state.startsWith("internal") ? "Human review: " : ""}
                  {label(REVIEW_STATES, f.review_state)}
                </Badge>
              </div>
              {f.validation_notes.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  {f.validation_notes.map((n, i) => (
                    <li key={i} className={n.level === "error" ? "text-red-300" : "text-amber"}>
                      {n.level === "error" ? "✕" : "!"} {n.message}
                    </li>
                  ))}
                </ul>
              )}
              {f.proposed_filename && (
                <p className="mt-1.5 text-xs text-neutral-600">
                  Suggested: <code className="font-mono text-neutral-900">{f.proposed_filename}</code> (manifest only; the stored file isn&apos;t renamed)
                </p>
              )}
              {(f.submission_evidence || f.review_source) && (
                <p className="mt-1 text-xs text-neutral-500">
                  {f.submission_evidence && `Delivery evidence: ${f.submission_evidence}. `}
                  {f.review_source && `Review source: ${f.review_source}${f.review_date ? ` (${fmtDate(f.review_date)})` : ""}.`}
                </p>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800">Update</summary>
                <div className="mt-2 grid gap-3 lg:grid-cols-3">
                  {canEdit && (
                    <ActionForm action={updateFile} submit="Save proposed name" submitClassName={ghostButton}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="op" value="proposed" />
                      <Field name="Proposed corrected path">
                        <input name="proposed_filename" defaultValue={f.proposed_filename} className={`${input} font-mono text-xs`} />
                      </Field>
                    </ActionForm>
                  )}
                  {canEdit && (
                    <ActionForm action={updateFile} submit="Save delivery state" submitClassName={ghostButton}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="op" value="submission" />
                      <Field name="Delivery state">
                        <select name="submission_state" defaultValue={f.submission_state} className={input}>
                          {Object.entries(FILE_SUBMISSION_STATES).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field name="Evidence (required past pending)">
                        <input name="submission_evidence" defaultValue={f.submission_evidence} placeholder="Batch ref, who confirmed, date" className={input} />
                      </Field>
                    </ActionForm>
                  )}
                  <ActionForm action={updateFile} submit="Save review" submitClassName={ghostButton}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="op" value="review" />
                    <Field name="Review">
                      <select name="review_state" defaultValue={f.review_state} className={input}>
                        <option value="not_reviewed">Not reviewed</option>
                        <option value="internal_passed">Human review passed</option>
                        <option value="internal_failed">Human review failed</option>
                        {canEdit && <option value="customer_accepted">Customer accepted</option>}
                        {canEdit && <option value="customer_rejected">Customer rejected</option>}
                      </select>
                    </Field>
                    <Field name="Source (required for customer decisions)">
                      <input name="review_source" defaultValue={f.review_source} className={input} />
                    </Field>
                    <Field name="Review date">
                      <input type="date" name="review_date" defaultValue={f.review_date ?? ""} className={input} />
                    </Field>
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
