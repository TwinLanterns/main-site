// app/ops/(workspace)/issues/page.tsx — task queue + operational exceptions.

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { ISSUE_CATEGORIES, isKey } from "@/lib/ops/stages";
import { completeTask, createIssue, createTask, updateIssue } from "../../actions";
import ActionForm from "../../_components/ActionForm";
import { Badge, Empty, Field, PageHeader, Panel, fmtDate, fmtDateTime, ghostButton, input, todayPT } from "../../_components/ui";

export const metadata: Metadata = { title: "Tasks and Issues" };

export default async function IssuesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  const canEdit = actor.role !== "reviewer";
  const sp = await searchParams;
  const mine = sp.mine === "1";
  const today = todayPT();
  const codeOf = new Map(ws.enrollments.map((e) => [e.id, e.anonymous_code]));
  const tasks = ws.tasks.filter((t) => !mine || t.assignee.toLowerCase() === actor.label.toLowerCase());
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done").slice(0, 20);

  const refLink = (id: string | null) =>
    id ? (
      <Link href={`/ops/operators/${id}`} className="font-mono text-xs underline">
        {codeOf.get(id)}
      </Link>
    ) : null;

  return (
    <div className="space-y-5">
      <PageHeader title="Tasks and Issues" sub="In-app tasks only. No email or text reminders are sent.">
        <Link href={mine ? "/ops/issues" : "/ops/issues?mine=1"} className={ghostButton}>
          {mine ? "Show all tasks" : `Assigned to ${actor.label}`}
        </Link>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={`Open tasks (${open.length})`}>
          {canEdit && (
            <ActionForm action={createTask} inline className="mb-4" submit="Add" reset>
              <input type="hidden" name="project_id" value={project.id} />
              <Field name="Task" className="min-w-48 flex-1">
                <input name="title" required className={input} />
              </Field>
              <Field name="Operator">
                <select name="enrollment_id" defaultValue="" className={input}>
                  <option value="">—</option>
                  {ws.enrollments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.anonymous_code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="Assignee">
                <input name="assignee" list="team-names" className={`${input} w-32`} />
              </Field>
              <Field name="Due">
                <input type="date" name="due_at" className={input} />
              </Field>
              <datalist id="team-names">
                {ws.team.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>
            </ActionForm>
          )}
          {open.length ? (
            <ul className="divide-y divide-neutral-200 text-sm">
              {open.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="flex-1">{t.title}</span>
                  {refLink(t.enrollment_id)}
                  <span className="text-xs text-neutral-500">{t.assignee || "unassigned"}</span>
                  {t.due_at && <Badge tone={t.due_at < today ? "bad" : "neutral"}>due {fmtDate(t.due_at)}</Badge>}
                  {canEdit && (
                    <ActionForm action={completeTask} inline submit="Done" submitClassName={ghostButton}>
                      <input type="hidden" name="id" value={t.id} />
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No open tasks.</Empty>
          )}
          {done.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-neutral-500">Recently completed ({done.length})</summary>
              <ul className="mt-2 space-y-1 text-xs text-neutral-500">
                {done.map((t) => (
                  <li key={t.id}>
                    <span className="line-through">{t.title}</span> · {t.completed_by_label} {fmtDateTime(t.completed_at)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Panel>

        <Panel title="Open an issue">
          <ActionForm action={createIssue} submit="Open issue" reset>
            <input type="hidden" name="project_id" value={project.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="Category">
                <select name="category" className={input}>
                  {Object.entries(ISSUE_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="Operator">
                <select name="enrollment_id" defaultValue="" className={input}>
                  <option value="">—</option>
                  {ws.enrollments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.anonymous_code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="File">
                <select name="file_id" defaultValue="" className={input}>
                  <option value="">—</option>
                  {ws.files.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.original_filename}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="Owner">
                <input name="owner" list="team-names" className={input} />
              </Field>
              <Field name="What happened" className="sm:col-span-2">
                <textarea name="description" required rows={3} className={input} />
              </Field>
            </div>
          </ActionForm>
        </Panel>
      </div>

      <Panel title={`Issues (${ws.issues.filter((i) => i.status !== "resolved").length} open)`}>
        {ws.issues.length === 0 ? (
          <Empty>No issues recorded.</Empty>
        ) : (
          <ul className="space-y-3">
            {ws.issues.map((i) => (
              <li key={i.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={i.status === "resolved" ? "good" : i.status === "in_progress" ? "info" : "amber"}>{i.status.replace("_", " ")}</Badge>
                  <Badge>{isKey(ISSUE_CATEGORIES, i.category) ? ISSUE_CATEGORIES[i.category] : i.category}</Badge>
                  {refLink(i.enrollment_id)}
                  {i.file_id && <span className="font-mono text-xs text-neutral-500">{ws.files.find((f) => f.id === i.file_id)?.original_filename}</span>}
                  <span className="text-xs text-neutral-500">
                    opened {fmtDateTime(i.opened_at)} by {i.created_by_label}
                    {i.resolved_at && ` · resolved ${fmtDateTime(i.resolved_at)}`}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-neutral-900">{i.description}</p>
                {i.action_taken && <p className="mt-1 text-sm text-neutral-600">Action: {i.action_taken}</p>}
                {i.result && <p className="text-sm text-neutral-600">Result: {i.result}</p>}
                {canEdit && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800">Update / resolve</summary>
                    <ActionForm action={updateIssue} className="mt-2" submit="Save">
                      <input type="hidden" name="id" value={i.id} />
                      <div className="grid gap-2 sm:grid-cols-4">
                        <Field name="Status">
                          <select name="status" defaultValue={i.status} className={input}>
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </Field>
                        <Field name="Owner">
                          <input name="owner" defaultValue={i.owner} className={input} />
                        </Field>
                        <Field name="Action taken">
                          <input name="action_taken" defaultValue={i.action_taken} className={input} />
                        </Field>
                        <Field name="Actual result">
                          <input name="result" defaultValue={i.result} className={input} />
                        </Field>
                      </div>
                    </ActionForm>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
