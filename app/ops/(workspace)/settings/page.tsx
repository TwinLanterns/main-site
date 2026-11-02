// app/ops/(workspace)/settings/page.tsx

import type { Metadata } from "next";
import { pageData } from "@/lib/ops/page";
import { db } from "@/lib/ops/db";
import { GUIDE_RULE_VERSION } from "@/lib/ops/naming";
import { assignToProject, createDeliveryProfile, createTeamMember, resetTeamPassword, setTeamMemberActive } from "../../actions";
import ActionForm from "../../_components/ActionForm";
import NewProjectForm from "../../_components/NewProjectForm";
import { Badge, Empty, Field, PageHeader, Panel, fmtDate, ghostButton, input, todayPT } from "../../_components/ui";

export const metadata: Metadata = { title: "Project settings" };

export default async function SettingsPage() {
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  const leader = actor.role === "leadership";
  const canEdit = actor.role !== "reviewer";
  const { data: assignments } = leader
    ? await db().from("ops_project_assignments").select("team_member_id").eq("project_id", project.id)
    : { data: [] };
  const assigned = new Set((assignments ?? []).map((a) => a.team_member_id as string));

  return (
    <div className="space-y-5">
      <PageHeader title="Project settings" sub={`${project.code} · ${project.name}`} />

      {leader && (
        <Panel title="Project">
          <NewProjectForm team={ws.team} project={project} />
        </Panel>
      )}

      <Panel title="Delivery profiles">
        <p className="mb-3 text-sm text-neutral-600">
          Where and how this project wants files delivered. A new version takes effect from its date and closes the previous one, so older batches keep the destination and rule they were delivered under. No storage provider is connected. Uploads are confirmed manually with evidence.
        </p>
        {ws.profiles.length ? (
          <ul className="mb-4 space-y-2 text-sm">
            {ws.profiles.map((p) => (
              <li key={p.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{p.version}</span>
                  <Badge tone="amber">{p.destination_type.toUpperCase()}</Badge>
                  <span>{p.destination_label}</span>
                  <Badge>{p.integration_status === "connected" ? "Connected" : "Not connected"}</Badge>
                  <span className="text-xs text-neutral-500">
                    {fmtDate(p.effective_from)} – {p.effective_to ? fmtDate(p.effective_to) : "current"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Naming {p.naming_rule_version} · Folders {p.folder_rule || "—"} · Instructions {p.upload_instructions_version || "—"} · Verification {p.verification_method.replace(/_/g, " ")} · Owner {p.owner || "—"}
                </p>
                {p.notes && <p className="mt-1 text-xs text-neutral-500">{p.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No delivery profile yet.</Empty>
        )}
        {canEdit && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-neutral-700">Add a profile version</summary>
            <ActionForm action={createDeliveryProfile} className="mt-3" submit="Add version" reset>
              <input type="hidden" name="project_id" value={project.id} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field name="Version">
                  <input name="version" required placeholder="v2-oss" className={input} />
                </Field>
                <Field name="Destination type">
                  <select name="destination_type" className={input}>
                    <option value="drive">Google Drive</option>
                    <option value="oss">OSS (object storage)</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field name="Description (no URLs or keys)">
                  <input name="destination_label" placeholder="OSS, provider TBD" className={input} />
                </Field>
                <Field name="Effective from">
                  <input type="date" name="effective_from" required defaultValue={todayPT()} className={input} />
                </Field>
                <Field name="Folder rule">
                  <input name="folder_rule" placeholder="operator/MM-DD-YYYY/room/" className={input} />
                </Field>
                <Field name="Naming rule version">
                  <input name="naming_rule_version" required defaultValue={GUIDE_RULE_VERSION} className={input} />
                </Field>
                <Field name="Upload instructions version">
                  <input name="upload_instructions_version" placeholder="household-guide-v1 §upload" className={input} />
                </Field>
                <Field name="Verification method">
                  <input name="verification_method" defaultValue="manual_confirmation" className={input} />
                </Field>
                <Field name="Owner">
                  <input name="owner" className={input} />
                </Field>
                <Field name="Notes" className="sm:col-span-2 lg:col-span-3">
                  <input name="notes" className={input} />
                </Field>
              </div>
            </ActionForm>
          </details>
        )}
      </Panel>

      {leader && (
        <Panel title="Team accounts">
          <p className="mb-3 text-sm text-neutral-600">
            Leadership sees everything. Managers and reviewers see only projects they&apos;re assigned to, and reviewers never see operator contact details. Confirm someone&apos;s role before creating their account.
          </p>
          {ws.team.length ? (
            <ul className="mb-4 divide-y divide-neutral-200 text-sm">
              {ws.team.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="w-40 text-neutral-900">{t.name}</span>
                  <span className="w-56 text-neutral-600">{t.email}</span>
                  <Badge>{t.role}</Badge>
                  {!t.active && <Badge tone="bad">Deactivated</Badge>}
                  {t.role !== "leadership" && (
                    <ActionForm action={assignToProject} inline submit={assigned.has(t.id) ? `Remove from ${project.code}` : `Assign to ${project.code}`} submitClassName={ghostButton}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="team_member_id" value={t.id} />
                      {assigned.has(t.id) && <input type="hidden" name="remove" value="on" />}
                    </ActionForm>
                  )}
                  <ActionForm action={setTeamMemberActive} inline submit={t.active ? "Deactivate" : "Reactivate"} submitClassName={ghostButton}>
                    <input type="hidden" name="id" value={t.id} />
                    {!t.active && <input type="hidden" name="active" value="on" />}
                  </ActionForm>
                  <ActionForm action={resetTeamPassword} inline submit="Reset password" submitClassName={ghostButton}>
                    <input type="hidden" name="id" value={t.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No team accounts yet. You&apos;re signed in with the shared admin login.</Empty>
          )}
          <ActionForm action={createTeamMember} inline submit="Create account" reset>
            <Field name="Name">
              <input name="name" required className={input} />
            </Field>
            <Field name="Email">
              <input name="email" type="email" required className={input} />
            </Field>
            <Field name="Role">
              <select name="role" defaultValue="manager" className={input}>
                <option value="leadership">Leadership</option>
                <option value="manager">Project manager</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </Field>
          </ActionForm>
          <p className="mt-2 text-xs text-neutral-500">A random password is generated and shown once. Send it privately, not by email or chat.</p>
        </Panel>
      )}
    </div>
  );
}
