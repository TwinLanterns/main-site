"use client";

import type { Project, TeamMember } from "@/lib/ops/db";
import { createProject, updateProject } from "../actions";
import ActionForm from "./ActionForm";
import { SIGNUP_PROGRAMS } from "@/lib/ops/signups";
import { Field, input } from "./ui";

/** Create a project, or edit one when `project` is given. */
export default function NewProjectForm({ team, project }: { team: TeamMember[]; project?: Project }) {
  const p = project;
  return (
    <ActionForm action={p ? updateProject : createProject} submit={p ? "Save project" : "Create project"} reset={!p}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!p && (
          <Field name="Project code">
            <input name="code" required placeholder="HH-PILOT-1" className={input} />
          </Field>
        )}
        <Field name="Name">
          <input name="name" required defaultValue={p?.name} placeholder="Household collection pilot" className={input} />
        </Field>
        <Field name="Customer alias (approved)">
          <input name="customer_alias" defaultValue={p?.customer_alias} placeholder="Egocentric data partner A" className={input} />
        </Field>
        <Field name="Stage">
          <select name="stage" defaultValue={p?.stage ?? "pilot"} className={input}>
            <option value="pilot">Pilot</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field name="Location category">
          <input name="location_category" defaultValue={p?.location_category} placeholder="Household (US)" className={input} />
        </Field>
        <Field name="Project manager">
          <select name="manager_id" defaultValue={p?.manager_id ?? ""} className={input}>
            <option value="">— none yet —</option>
            {team
              .filter((t) => t.active)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.role})
                </option>
              ))}
          </select>
        </Field>
        {(!p || "signup_program" in p) && (
          <Field name="Sign-up program">
            <select name="signup_program" defaultValue={p?.signup_program ?? ""} className={input}>
              <option value="">— none —</option>
              {Object.entries(SIGNUP_PROGRAMS).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field name="Starts">
          <input type="date" name="starts_on" defaultValue={p?.starts_on ?? ""} className={input} />
        </Field>
        <Field name="Ends">
          <input type="date" name="ends_on" defaultValue={p?.ends_on ?? ""} className={input} />
        </Field>
        <Field name="Documented target (hours)">
          <input
            name="target_hours"
            inputMode="decimal"
            defaultValue={p?.target_seconds != null ? String(p.target_seconds / 3600) : ""}
            placeholder="blank if none documented"
            className={input}
          />
        </Field>
        <Field name="Target source" className="sm:col-span-2">
          <input name="target_source" defaultValue={p?.target_source} placeholder="Required if a target is set" className={input} />
        </Field>
        <Field name="Task scope" className="sm:col-span-2 lg:col-span-3">
          <textarea name="task_scope" rows={2} defaultValue={p?.task_scope} className={input} />
        </Field>
      </div>
    </ActionForm>
  );
}
