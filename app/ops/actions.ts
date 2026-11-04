"use server";

// app/ops/actions.ts
//
// Every mutation in /ops. Each action: authenticates (requireActor), checks
// the record's project against the actor's scope (never trusting an id from
// the form), validates, writes, then records an audit event. Returns an
// ActionResult for useActionState — never raw rows.

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { OpsAuthError, projectScope, requireActor, requireProject, type Actor, type Role } from "@/lib/ops/auth";
import { audit, db, nextAnonymousCode } from "@/lib/ops/db";
import { FieldError, checked, oneOf, optDate, optNumber, optUuid, phoneField, required, str, uuid, type ActionResult } from "@/lib/ops/form";
import { isFormulaLike } from "@/lib/ops/csv";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { HOUSEHOLD_GUIDE_TEMPLATE, onboardingProgress, type TemplateStep } from "@/lib/ops/onboarding";
import { GUIDE_RULE_VERSION, normalizePath, validateFilePath } from "@/lib/ops/naming";
import { normalizePhone } from "@/lib/ops/phone";
import { hoursToSeconds, parseDuration } from "@/lib/ops/duration";
import { hashPassword, generatePassword, verifyPassword } from "@/lib/ops/password";
import { OPS_COOKIE_NAME, OPS_COOKIE_OPTIONS, createTeamToken } from "@/lib/ops/team-token";
import { safeOpsPath } from "@/lib/ops/google-sso";
import { rateLimitKey } from "@/lib/rate-limit";
import { OPS_PROJECT_COOKIE } from "@/lib/ops/request";
import { shiftTimeToUtc } from "@/lib/shift-time";
import {
  COLLECTION_STAGES,
  COORDINATION_MODES,
  FILE_SUBMISSION_STATES,
  ISSUE_CATEGORIES,
  LEAD_STAGES,
  REVIEW_STATES,
  SESSION_STATES,
  UPLOAD_STATES,
} from "@/lib/ops/stages";

const keys = <T extends object>(o: T) => Object.keys(o) as (keyof T & string)[];

async function run(fn: () => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    const r = await fn();
    revalidatePath("/ops", "layout");
    return r ?? { ok: true };
  } catch (err) {
    if (err instanceof FieldError || err instanceof OpsAuthError) return { ok: false, error: err.message };
    console.error("ops action failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new FieldError("Record not found.");
  return res.data;
}

/** Loads a row's project_id and checks the actor may touch it. */
async function scopedRow(actor: Actor, table: string, id: string): Promise<string> {
  const row = must(await db().from(table).select("project_id").eq("id", id).maybeSingle<{ project_id: string }>());
  await requireProject(actor, row.project_id);
  return row.project_id;
}

async function enrollmentProject(actor: Actor, enrollmentId: string) {
  return scopedRow(actor, "ops_enrollments", enrollmentId);
}

const EDITORS: Role[] = ["leadership", "manager"];

/** Session/file review states that record a customer's decision. */
const CUSTOMER_DECISIONS = ["customer_accepted", "customer_rejected", "partial"];

/** Whether a person has an enrollment in a project the actor may see. */
async function personInScope(actor: Actor, personId: string): Promise<boolean> {
  const scope = await projectScope(actor);
  if (!scope) return true;
  if (!scope.length) return false;
  const { data, error } = await db().from("ops_enrollments").select("id").eq("person_id", personId).in("project_id", scope).limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

/* --------------------------------- auth ---------------------------------- */

export async function login(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (await rateLimitKey(`ops-login:${ip}`, 5, 15 * 60 * 1000)) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }
  const email = (fd.get("email") as string | null)?.trim().toLowerCase().slice(0, 200) ?? "";
  const password = (fd.get("password") as string | null)?.slice(0, 200) ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return { ok: false, error: "Server misconfigured." };
  if (!email || !password) return { ok: false, error: "Enter your email and password." };

  const { data, error } = await db()
    .from("team_members")
    .select("id, password_hash, active")
    // Exact match: emails are stored lowercased. (A LIKE pattern would let
    // "*" match any account.)
    .eq("email", email)
    .maybeSingle<{ id: string; password_hash: string; active: boolean }>();
  if (error) {
    console.error("ops login lookup failed", error);
    return { ok: false, error: "Sign-in is unavailable (has supabase/ops_core.sql been run?)." };
  }
  // Same message either way: don't reveal which emails have accounts.
  const ok = data?.active && (await verifyPassword(password, data.password_hash));
  if (!ok || !data) return { ok: false, error: "Invalid email or password." };

  (await cookies()).set(OPS_COOKIE_NAME, await createTeamToken(secret, data.id, data.password_hash), OPS_COOKIE_OPTIONS);
  await db().from("team_members").update({ last_login_at: new Date().toISOString() }).eq("id", data.id);

  redirect(safeOpsPath(fd.get("from")));
}

export async function logout() {
  const jar = await cookies();
  jar.set(OPS_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  // The shared admin login also opens /ops, so signing out here ends it
  // too. Otherwise /ops/login would send the user straight back in.
  jar.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  redirect("/ops/login");
}

/* --------------------------------- team ---------------------------------- */

export async function createTeamMember(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership"]);
    const name = required(fd, "name", "Name", 200);
    const email = required(fd, "email", "Email", 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FieldError("Enter a valid email.");
    const role = oneOf(fd, "role", ["leadership", "manager", "reviewer"] as const);
    const password = generatePassword();
    const { data, error } = await db()
      .from("team_members")
      .insert({ name, email, role, password_hash: await hashPassword(password) })
      .select("id")
      .single();
    if (error) throw new FieldError(error.code === "23505" ? "Someone already has that email." : error.message);
    await audit(actor, "team_member.created", "team_member", data.id, null, { name, role });
    return { ok: true, message: `Account created for ${name}. Share this password privately — it won't be shown again.`, secret: password };
  });
}

export async function setTeamMemberActive(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership"]);
    const id = uuid(fd, "id");
    const active = checked(fd, "active");
    must(await db().from("team_members").update({ active }).eq("id", id).select("id").maybeSingle());
    await audit(actor, active ? "team_member.reactivated" : "team_member.deactivated", "team_member", id, null);
  });
}

export async function resetTeamPassword(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership"]);
    const id = uuid(fd, "id");
    const password = generatePassword();
    must(await db().from("team_members").update({ password_hash: await hashPassword(password) }).eq("id", id).select("id").maybeSingle());
    await audit(actor, "team_member.password_reset", "team_member", id, null);
    return { ok: true, message: "New password — share it privately; it won't be shown again.", secret: password };
  });
}

/* ------------------------------- projects -------------------------------- */

export async function createProject(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership"]);
    const code = required(fd, "code", "Project code", 40).toUpperCase();
    const target = hoursToSeconds(str(fd, "target_hours", 20));
    if (target === "invalid") throw new FieldError("Target hours must be a number.");
    const row = {
      code,
      name: required(fd, "name", "Name", 200),
      customer_alias: str(fd, "customer_alias", 120),
      stage: oneOf(fd, "stage", ["pilot", "active", "paused", "closed"] as const),
      location_category: str(fd, "location_category", 120),
      task_scope: str(fd, "task_scope", 1000),
      starts_on: optDate(fd, "starts_on"),
      ends_on: optDate(fd, "ends_on"),
      manager_id: optUuid(fd, "manager_id"),
      target_seconds: target,
      target_source: str(fd, "target_source", 300),
    };
    if (target !== null && !row.target_source) throw new FieldError("Say where the target comes from.");
    const { data, error } = await db().from("ops_projects").insert(row).select("id").single();
    if (error) throw new FieldError(error.code === "23505" ? "That project code is taken." : error.message);
    await audit(actor, "project.created", "project", data.id, data.id, { code });
  });
}

export async function updateProject(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership"]);
    const id = uuid(fd, "id");
    const target = hoursToSeconds(str(fd, "target_hours", 20));
    if (target === "invalid") throw new FieldError("Target hours must be a number.");
    const patch = {
      name: required(fd, "name", "Name", 200),
      customer_alias: str(fd, "customer_alias", 120),
      stage: oneOf(fd, "stage", ["pilot", "active", "paused", "closed"] as const),
      location_category: str(fd, "location_category", 120),
      task_scope: str(fd, "task_scope", 1000),
      starts_on: optDate(fd, "starts_on"),
      ends_on: optDate(fd, "ends_on"),
      manager_id: optUuid(fd, "manager_id"),
      target_seconds: target,
      target_source: str(fd, "target_source", 300),
    };
    if (target !== null && !patch.target_source) throw new FieldError("Say where the target comes from.");
    must(await db().from("ops_projects").update(patch).eq("id", id).select("id").maybeSingle());
    await audit(actor, "project.updated", "project", id, id, patch);
  });
}

export async function assignToProject(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership"]);
    const project_id = uuid(fd, "project_id");
    const team_member_id = uuid(fd, "team_member_id");
    if (checked(fd, "remove")) {
      await db().from("ops_project_assignments").delete().eq("project_id", project_id).eq("team_member_id", team_member_id);
      await audit(actor, "project.unassigned", "team_member", team_member_id, project_id);
      return;
    }
    const { error } = await db().from("ops_project_assignments").upsert({ project_id, team_member_id });
    if (error) throw new Error(error.message);
    await audit(actor, "project.assigned", "team_member", team_member_id, project_id);
  });
}

/* ------------------------------ people / CRM ----------------------------- */

/**
 * New lead for a project. Dedupes on normalized phone: a match is reported
 * back and only linked when the user explicitly confirms (link_person_id).
 * Names alone never match.
 */
export async function addLead(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const project_id = uuid(fd, "project_id");
    await requireProject(actor, project_id);

    const phoneOriginal = phoneField(fd, "phone");
    const phone = phoneOriginal ? normalizePhone(phoneOriginal) : "";
    if (phoneOriginal && phone === null) throw new FieldError("Phone number isn't recognizable — check the digits.");
    let personId: string | null = null;
    let linkedExisting = false;
    if (phone) {
      const { data: matches, error } = await db().from("ops_people").select("id").eq("phone", phone).is("merged_into", null);
      if (error) throw new Error(error.message);
      if (matches?.length) {
        if (!checked(fd, "confirm_same_person")) {
          return {
            ok: false,
            error: "That phone number already belongs to a person record. If you've confirmed it's the same person, tick “Same person as the existing record” and submit again — they'll be added to this project under their existing record.",
          };
        }
        personId = matches[0].id as string;
        linkedExisting = true;
      }
    }

    if (!personId) {
      const { data, error } = await db()
        .from("ops_people")
        .insert({
          name: required(fd, "name", "Name", 200),
          phone: phone ?? "",
          phone_original: phoneOriginal,
          email: str(fd, "email", 200),
          sourced_by: required(fd, "sourced_by", "Sourced by", 120),
          intake_ref: str(fd, "intake_ref", 60),
          notes: "",
        })
        .select("id")
        .single();
      if (error) throw new FieldError(error.code === "23505" ? "That intake ID is already used." : error.message);
      personId = data.id as string;
      await audit(actor, "person.created", "person", personId, project_id, { intake_ref: str(fd, "intake_ref", 60) });
    }

    const code = await nextAnonymousCode(project_id);
    const { data: enr, error } = await db()
      .from("ops_enrollments")
      .insert({
        person_id: personId,
        project_id,
        anonymous_code: code,
        lead_stage: oneOf(fd, "lead_stage", keys(LEAD_STAGES)),
        lead_source: str(fd, "lead_source", 120),
        channel: str(fd, "channel", 120),
        outreach_owner: str(fd, "outreach_owner", 120),
        onboarding_owner: str(fd, "onboarding_owner", 120),
        availability: str(fd, "availability", 300),
        next_action: str(fd, "next_action", 300),
        next_action_due: optDate(fd, "next_action_due"),
        notes: str(fd, "notes", 2000),
      })
      .select("id")
      .single();
    if (error) throw new FieldError(error.code === "23505" ? "This person is already on this project." : error.message);
    await audit(actor, "enrollment.created", "enrollment", enr.id, project_id, { code, linked_existing_person: linkedExisting });
    return { ok: true, message: `Added as ${code}.` };
  });
}

const ENROLLMENT_TEXT_FIELDS = [
  "lead_source",
  "channel",
  "outreach_owner",
  "onboarding_owner",
  "availability",
  "location_category",
  "next_action",
  "target_source",
  "notes",
] as const;

export async function updateEnrollment(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const id = uuid(fd, "id");
    const project_id = await enrollmentProject(actor, id);

    const patch: Record<string, unknown> = {};
    for (const f of ENROLLMENT_TEXT_FIELDS) if (fd.has(f)) patch[f] = str(fd, f, f === "notes" ? 2000 : 300);
    if (fd.has("lead_stage")) patch.lead_stage = oneOf(fd, "lead_stage", keys(LEAD_STAGES));
    if (fd.has("collection_stage")) patch.collection_stage = oneOf(fd, "collection_stage", keys(COLLECTION_STAGES));
    if (fd.has("manager_id")) patch.manager_id = optUuid(fd, "manager_id");
    for (const f of ["next_action_due", "start_date", "target_end_date"] as const) if (fd.has(f)) patch[f] = optDate(fd, f);
    if (fd.has("target_hours")) {
      const t = hoursToSeconds(str(fd, "target_hours", 20));
      if (t === "invalid") throw new FieldError("Target hours must be a number.");
      patch.target_seconds = t;
      if (t !== null && !str(fd, "target_source", 300)) throw new FieldError("Say where the target comes from.");
    }
    if (Object.keys(patch).length === 0) throw new FieldError("Nothing to update.");

    // Recording requires an explicit activation first.
    if (patch.collection_stage === "recording") {
      const cur = must(await db().from("ops_enrollments").select("readiness_confirmed_at, record_status").eq("id", id).maybeSingle<{ readiness_confirmed_at: string | null; record_status: string }>());
      if (!cur.readiness_confirmed_at && cur.record_status !== "confirmed") {
        throw new FieldError("Confirm readiness (or confirm the imported record) before marking Recording.");
      }
    }
    patch.updated_at = new Date().toISOString();
    must(await db().from("ops_enrollments").update(patch).eq("id", id).select("id").maybeSingle());
    const { updated_at: _u, ...changed } = patch;
    void _u;
    await audit(actor, "enrollment.updated", "enrollment", id, project_id, changed);
  });
}

/** Manually logged outreach. Nothing is sent from here. */
export async function logContact(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const id = uuid(fd, "id");
    const project_id = await enrollmentProject(actor, id);
    const date = optDate(fd, "contacted_on") ?? new Date().toISOString().slice(0, 10);
    const note = required(fd, "note", "What happened", 1000);
    const channel = str(fd, "contact_channel", 40) || "text";
    const nextStage = str(fd, "lead_stage", 40);
    const patch: Record<string, unknown> = { last_contact_at: `${date}T12:00:00Z`, updated_at: new Date().toISOString() };
    if (nextStage) patch.lead_stage = oneOf(fd, "lead_stage", keys(LEAD_STAGES));
    must(await db().from("ops_enrollments").update(patch).eq("id", id).select("id").maybeSingle());
    await audit(actor, "contact.logged", "enrollment", id, project_id, { contacted_on: date, channel, note, lead_stage: patch.lead_stage ?? null, entry: "manual log" });
  });
}

/** Workbook rows arrive unconfirmed; a person confirms they're a real, eligible operator (or a placeholder). */
export async function confirmImportedRecord(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const id = uuid(fd, "id");
    const project_id = await enrollmentProject(actor, id);
    const status = oneOf(fd, "record_status", ["confirmed", "placeholder"] as const);
    const note = required(fd, "note", "Basis for this decision", 500);
    must(await db().from("ops_enrollments").update({ record_status: status, updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle());
    await audit(actor, `enrollment.record_${status}`, "enrollment", id, project_id, { note });
  });
}

export async function linkShiftCode(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const enrollment = uuid(fd, "enrollment_id");
    const project_id = await enrollmentProject(actor, enrollment);
    const codeId = optUuid(fd, "code_id");
    const { person_id } = must(await db().from("ops_enrollments").select("person_id").eq("id", enrollment).maybeSingle<{ person_id: string }>());
    if (codeId) {
      // Codes aren't project-scoped, so don't let a manager take one that's
      // linked to someone outside their projects.
      const code = must(await db().from("film_shift_codes").select("person_id").eq("id", codeId).maybeSingle<{ person_id: string | null }>());
      if (code.person_id && code.person_id !== person_id && !(await personInScope(actor, code.person_id))) {
        throw new OpsAuthError("That code is linked to someone on a project you're not assigned to.");
      }
    }
    // Clear any previous link for this person, then set the new one.
    await db().from("film_shift_codes").update({ person_id: null }).eq("person_id", person_id);
    if (codeId) must(await db().from("film_shift_codes").update({ person_id }).eq("id", codeId).select("id").maybeSingle());
    await audit(actor, codeId ? "shift_code.linked" : "shift_code.unlinked", "enrollment", enrollment, project_id, { code_id: codeId });
  });
}

/* ------------------------------- onboarding ------------------------------ */

export async function installGuideTemplate(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const project_id = uuid(fd, "project_id");
    await requireProject(actor, project_id);
    const t = HOUSEHOLD_GUIDE_TEMPLATE;
    const { data, error } = await db()
      .from("ops_onboarding_templates")
      .insert({ project_id, version: t.version, name: t.name, steps: t.steps, source_reference: t.source })
      .select("id")
      .single();
    if (error) throw new FieldError(error.code === "23505" ? "That template version is already installed." : error.message);
    await audit(actor, "onboarding_template.installed", "onboarding_template", data.id, project_id, { version: t.version });
  });
}

export async function setStep(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const enrollment_id = uuid(fd, "enrollment_id");
    const template_id = uuid(fd, "template_id");
    const project_id = await enrollmentProject(actor, enrollment_id);
    const tpl = must(await db().from("ops_onboarding_templates").select("project_id, steps").eq("id", template_id).maybeSingle<{ project_id: string; steps: TemplateStep[] }>());
    if (tpl.project_id !== project_id) throw new FieldError("Template belongs to another project.");
    const step_key = str(fd, "step_key", 60);
    if (!tpl.steps.some((s) => s.key === step_key)) throw new FieldError("Unknown step.");
    const status = oneOf(fd, "status", ["pending", "completed", "blocked", "not_applicable"] as const);
    const reason = str(fd, "reason", 500);
    if ((status === "blocked" || status === "not_applicable") && !reason) throw new FieldError("Give a reason for blocked / not applicable.");
    const row = {
      enrollment_id,
      template_id,
      step_key,
      status,
      reason,
      owner: str(fd, "owner", 120),
      due_on: optDate(fd, "due_on"),
      evidence_reference: str(fd, "evidence_reference", 300),
      completed_by_label: status === "completed" ? actor.label : "",
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db().from("ops_onboarding_steps").upsert(row, { onConflict: "enrollment_id,template_id,step_key" });
    if (error) throw new Error(error.message);
    await audit(actor, "onboarding_step.set", "enrollment", enrollment_id, project_id, { step_key, status, reason, evidence_reference: row.evidence_reference });
  });
}

/**
 * Readiness is a manager's explicit decision. Blocked unless every
 * applicable required onboarding step is completed — or an override reason
 * is given, which is recorded.
 */
export async function confirmReadiness(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const id = uuid(fd, "id");
    const template_id = uuid(fd, "template_id");
    const project_id = await enrollmentProject(actor, id);
    const tpl = must(await db().from("ops_onboarding_templates").select("project_id, steps, version").eq("id", template_id).maybeSingle<{ project_id: string; steps: TemplateStep[]; version: string }>());
    if (tpl.project_id !== project_id) throw new FieldError("Template belongs to another project.");
    const { data: records, error } = await db().from("ops_onboarding_steps").select("step_key, status, reason").eq("enrollment_id", id).eq("template_id", template_id);
    if (error) throw new Error(error.message);
    const progress = onboardingProgress(tpl.steps, records ?? []);
    const override = str(fd, "override_reason", 500);
    if (!progress.allRequiredDone && !override) {
      throw new FieldError(`${progress.outstanding.length} required step(s) outstanding: ${progress.outstanding.map((s) => s.label).join("; ")}. Complete them or give an override reason.`);
    }
    const now = new Date().toISOString();
    must(
      await db()
        .from("ops_enrollments")
        .update({
          readiness_confirmed_by: actor.id,
          readiness_confirmed_label: actor.label,
          readiness_confirmed_at: now,
          readiness_override_reason: progress.allRequiredDone ? "" : override,
          lead_stage: "activated",
          record_status: "confirmed",
          updated_at: now,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle(),
    );
    await audit(actor, "enrollment.readiness_confirmed", "enrollment", id, project_id, {
      template_version: tpl.version,
      completed: progress.completed,
      applicable: progress.applicable,
      override_reason: progress.allRequiredDone ? null : override,
    });
  });
}

/* -------------------------------- sessions ------------------------------- */

function pacific(fd: FormData, dateKey: string, timeKey: string): string | null {
  const d = str(fd, dateKey, 10);
  const t = str(fd, timeKey, 5);
  if (!d && !t) return null;
  const at = shiftTimeToUtc(d, t);
  if (!at) throw new FieldError("Enter a date and time.");
  return at.toISOString();
}

export async function createSession(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const enrollment_id = uuid(fd, "enrollment_id");
    const project_id = await enrollmentProject(actor, enrollment_id);
    const film_shift_id = optUuid(fd, "film_shift_id");

    let scheduled_start = pacific(fd, "date", "start");
    let scheduled_end = pacific(fd, "date", "end");
    let device_id = str(fd, "device_id", 80);
    if (film_shift_id) {
      const shift = must(await db().from("film_shifts").select("starts_at, ends_at, camera").eq("id", film_shift_id).maybeSingle<{ starts_at: string; ends_at: string; camera: string }>());
      scheduled_start = shift.starts_at;
      scheduled_end = shift.ends_at;
      device_id = device_id || shift.camera;
    } else if (scheduled_start && scheduled_end && scheduled_end <= scheduled_start) {
      scheduled_end = new Date(Date.parse(scheduled_end) + 86_400_000).toISOString();
    }

    const { data, error } = await db()
      .from("ops_sessions")
      .insert({
        project_id,
        enrollment_id,
        film_shift_id,
        manager_id: optUuid(fd, "manager_id") ?? actor.id,
        state: film_shift_id ? "confirmed" : "planned",
        scheduled_start,
        scheduled_end,
        coordination_mode: oneOf(fd, "coordination_mode", keys(COORDINATION_MODES)),
        task_label: str(fd, "task_label", 120),
        room: str(fd, "room", 80),
        device_id,
        instructions_version: str(fd, "instructions_version", 80),
        notes: str(fd, "notes", 1000),
      })
      .select("id")
      .single();
    if (error) throw new FieldError(error.code === "23505" ? "That shift already has a session." : error.message);
    await audit(actor, "session.created", "session", data.id, project_id, { enrollment_id, film_shift_id });
  });
}

export async function updateSession(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership", "manager", "reviewer"]);
    const id = uuid(fd, "id");
    const project_id = await scopedRow(actor, "ops_sessions", id);
    const op = str(fd, "op", 30);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };

    if (actor.role === "reviewer" && op !== "review") throw new OpsAuthError("Reviewers can only record reviews.");

    if (op === "state") {
      patch.state = oneOf(fd, "state", keys(SESSION_STATES));
    } else if (op === "checkin") {
      patch.checkin_at = now;
      patch.checkin_by_label = actor.label;
      patch.checkin_note = str(fd, "checkin_note", 500);
    } else if (op === "check") {
      const key = str(fd, "step_key", 60);
      const status = oneOf(fd, "status", ["completed", "blocked", "pending"] as const);
      const cur = must(await db().from("ops_sessions").select("session_checks").eq("id", id).maybeSingle<{ session_checks: Record<string, unknown> }>());
      patch.session_checks = { ...cur.session_checks, [key]: { status, at: now, by: actor.label } };
    } else if (op === "duration") {
      const d = parseDuration(str(fd, "duration", 20));
      if (!d.ok) throw new FieldError(`Duration: ${d.error}`);
      patch.duration_seconds = d.seconds;
      patch.duration_source = oneOf(fd, "duration_source", ["measured", "self_reported", "unknown"] as const);
      if (d.seconds !== null && patch.duration_source === "unknown") throw new FieldError("Say whether the duration was measured or self-reported.");
    } else if (op === "upload") {
      patch.upload_status = oneOf(fd, "upload_status", keys(UPLOAD_STATES));
      const evidence = str(fd, "evidence", 300);
      if (patch.upload_status !== "not_uploaded" && !evidence) throw new FieldError("Note the evidence (who reported it, where it was checked).");
      if (evidence) {
        const cur = must(await db().from("ops_sessions").select("notes").eq("id", id).maybeSingle<{ notes: string }>());
        patch.notes = [cur.notes, `${now.slice(0, 10)} upload ${patch.upload_status} (${actor.label}): ${evidence}`].filter(Boolean).join("\n").slice(-4000);
      }
    } else if (op === "review") {
      const status = oneOf(fd, "review_status", keys(REVIEW_STATES));
      if (actor.role === "reviewer") {
        // Reviewers record internal review only: they can't set a customer
        // decision, or overwrite one a manager already recorded.
        if (CUSTOMER_DECISIONS.includes(status)) throw new OpsAuthError("Customer decisions are recorded by managers, with a source.");
        const cur = must(await db().from("ops_sessions").select("review_status").eq("id", id).maybeSingle<{ review_status: string }>());
        if (CUSTOMER_DECISIONS.includes(cur.review_status)) throw new OpsAuthError("This session already has a customer decision; only a manager can change it.");
      }
      patch.review_status = status;
      patch.review_source = str(fd, "review_source", 300);
      if (["customer_accepted", "customer_rejected", "partial"].includes(status) && !patch.review_source) {
        throw new FieldError("Customer decisions need a source (who decided, where it's recorded).");
      }
      const approved = parseDuration(str(fd, "approved_duration", 20));
      if (!approved.ok) throw new FieldError(`Approved duration: ${approved.error}`);
      patch.approved_duration_seconds = ["customer_accepted", "partial"].includes(status) ? approved.seconds : null;
    } else {
      throw new FieldError("Unknown update.");
    }

    const { error } = await db().from("ops_sessions").update(patch).eq("id", id);
    if (error) {
      if (/approved_le_duration/.test(error.message)) throw new FieldError("Approved duration can't exceed the session's recorded duration (record the duration first).");
      throw new Error(error.message);
    }
    const { updated_at: _u, ...changed } = patch;
    void _u;
    await audit(actor, `session.${op}`, "session", id, project_id, changed);
  });
}

/* --------------------------------- files --------------------------------- */

/** Adds manifest rows from pasted paths. Originals are stored verbatim. */
export async function addFiles(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const project_id = uuid(fd, "project_id");
    await requireProject(actor, project_id);
    const session_id = optUuid(fd, "session_id");
    let enrollment_id = optUuid(fd, "enrollment_id");
    if (session_id) {
      const s = must(await db().from("ops_sessions").select("project_id, enrollment_id").eq("id", session_id).maybeSingle<{ project_id: string; enrollment_id: string }>());
      if (s.project_id !== project_id) throw new FieldError("Session belongs to another project.");
      enrollment_id = s.enrollment_id;
    }

    // Read raw and refuse oversize input rather than truncating it, which
    // would drop paths and store a half-path. Each line is checked on its own.
    const raw = fd.get("paths");
    const text = typeof raw === "string" ? raw : "";
    if (text.length > 200_000) throw new FieldError("Too much text at once. Paste at most 500 paths.");
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) throw new FieldError("Paste at least one file path.");
    if (lines.length > 500) throw new FieldError("500 paths at a time, please.");
    const tooLong = lines.findIndex((l) => l.length > 400);
    if (tooLong !== -1) throw new FieldError(`Line ${tooLong + 1} is longer than 400 characters.`);
    const formula = lines.findIndex((l) => isFormulaLike(l));
    if (formula !== -1) throw new FieldError(`Line ${formula + 1} starts with =, +, - or @.`);

    const [{ data: enrollments }, { data: existing }] = await Promise.all([
      fetchAllRows((from, to) => db().from("ops_enrollments").select("id, anonymous_code, source_operator_id").eq("project_id", project_id).order("id").range(from, to)),
      fetchAllRows((from, to) => db().from("ops_files").select("id, original_path").eq("project_id", project_id).order("id").range(from, to)),
    ]);
    const known = new Set<string>();
    const byFolder = new Map<string, string>();
    for (const e of enrollments ?? []) {
      known.add(e.anonymous_code as string);
      byFolder.set(e.anonymous_code as string, e.id as string);
      if (e.source_operator_id) {
        known.add(e.source_operator_id as string);
        byFolder.set(e.source_operator_id as string, e.id as string);
      }
    }
    const existingPaths = new Set((existing ?? []).map((r) => r.original_path as string));

    let skipped = 0;
    const rows = [];
    for (const line of lines) {
      const path = normalizePath(line);
      if (existingPaths.has(path)) {
        skipped++;
        continue;
      }
      const v = validateFilePath(path, { knownOperators: known, existingPaths });
      existingPaths.add(path);
      rows.push({
        project_id,
        session_id,
        enrollment_id: enrollment_id ?? (v.parsed.operatorFolder ? byFolder.get(v.parsed.operatorFolder) ?? null : null),
        original_path: path,
        original_filename: v.parsed.filename,
        proposed_filename: v.suggestion ?? "",
        recording_date: v.parsed.date,
        room: v.parsed.rooms.join("+"),
        task_label: v.parsed.task ?? "",
        capture_mode: v.parsed.mode ?? "",
        take_number: v.parsed.take,
        naming_rule_version: GUIDE_RULE_VERSION,
        validation_status: v.status,
        validation_notes: v.issues,
      });
    }
    if (rows.length) {
      const { error } = await db().from("ops_files").insert(rows);
      if (error) throw new Error(error.message);
    }
    await audit(actor, "files.added", "project", project_id, project_id, { added: rows.length, skipped_existing: skipped, session_id });
    return { ok: true, message: `${rows.length} added${skipped ? ` · ${skipped} already in the manifest (possible conflict, not re-added)` : ""}.` };
  });
}

export async function updateFile(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership", "manager", "reviewer"]);
    const id = uuid(fd, "id");
    const project_id = await scopedRow(actor, "ops_files", id);
    const op = str(fd, "op", 30);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (actor.role === "reviewer" && op !== "review") throw new OpsAuthError("Reviewers can only record reviews.");

    if (op === "proposed") {
      // Manifest metadata only — the stored object is not renamed.
      patch.proposed_filename = str(fd, "proposed_filename", 300);
    } else if (op === "submission") {
      patch.submission_state = oneOf(fd, "submission_state", keys(FILE_SUBMISSION_STATES));
      patch.submission_evidence = str(fd, "submission_evidence", 300);
      if (patch.submission_state !== "pending_upload" && !patch.submission_evidence) throw new FieldError("Record the evidence (reference, who confirmed, when).");
    } else if (op === "review") {
      const state = oneOf(fd, "review_state", ["not_reviewed", "internal_passed", "internal_failed", "customer_accepted", "customer_rejected"] as const);
      if (actor.role === "reviewer") {
        if (CUSTOMER_DECISIONS.includes(state)) throw new OpsAuthError("Customer decisions are recorded by managers, with a source.");
        const cur = must(await db().from("ops_files").select("review_state").eq("id", id).maybeSingle<{ review_state: string }>());
        if (CUSTOMER_DECISIONS.includes(cur.review_state)) throw new OpsAuthError("This file already has a customer decision; only a manager can change it.");
      }
      patch.review_state = state;
      patch.review_source = str(fd, "review_source", 300);
      patch.review_date = optDate(fd, "review_date") ?? new Date().toISOString().slice(0, 10);
      if (state.startsWith("customer") && !patch.review_source) throw new FieldError("Customer decisions need a source.");
    } else {
      throw new FieldError("Unknown update.");
    }
    const { error } = await db().from("ops_files").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    const { updated_at: _u, ...changed } = patch;
    void _u;
    await audit(actor, `file.${op}`, "file", id, project_id, changed);
  });
}

/* ----------------------------- tasks & issues ---------------------------- */

async function refsInProject(project_id: string, fd: FormData) {
  const refs = { enrollment_id: optUuid(fd, "enrollment_id"), session_id: optUuid(fd, "session_id"), file_id: optUuid(fd, "file_id") };
  const checks: [string, string | null][] = [["ops_enrollments", refs.enrollment_id], ["ops_sessions", refs.session_id], ["ops_files", refs.file_id]];
  for (const [table, id] of checks) {
    if (!id) continue;
    const row = must(await db().from(table).select("project_id").eq("id", id).maybeSingle<{ project_id: string }>());
    if (row.project_id !== project_id) throw new FieldError("Linked record belongs to another project.");
  }
  return refs;
}

export async function createTask(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const project_id = uuid(fd, "project_id");
    await requireProject(actor, project_id);
    const { enrollment_id, session_id } = await refsInProject(project_id, fd);
    const { data, error } = await db()
      .from("ops_tasks")
      .insert({ project_id, enrollment_id, session_id, title: required(fd, "title", "Task", 300), assignee: str(fd, "assignee", 120), due_at: optDate(fd, "due_at"), created_by_label: actor.label })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await audit(actor, "task.created", "task", data.id, project_id, { enrollment_id, session_id });
  });
}

export async function completeTask(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const id = uuid(fd, "id");
    const project_id = await scopedRow(actor, "ops_tasks", id);
    const reopen = checked(fd, "reopen");
    const { error } = await db()
      .from("ops_tasks")
      .update(reopen ? { status: "open", completed_at: null, completed_by_label: "" } : { status: "done", completed_at: new Date().toISOString(), completed_by_label: actor.label })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await audit(actor, reopen ? "task.reopened" : "task.completed", "task", id, project_id);
  });
}

export async function createIssue(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership", "manager", "reviewer"]);
    const project_id = uuid(fd, "project_id");
    await requireProject(actor, project_id);
    const refs = await refsInProject(project_id, fd);
    const { data, error } = await db()
      .from("ops_issues")
      .insert({ project_id, ...refs, category: oneOf(fd, "category", keys(ISSUE_CATEGORIES)), owner: str(fd, "owner", 120), description: required(fd, "description", "Description", 2000), created_by_label: actor.label })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await audit(actor, "issue.opened", "issue", data.id, project_id, refs);
  });
}

export async function updateIssue(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const id = uuid(fd, "id");
    const project_id = await scopedRow(actor, "ops_issues", id);
    const status = oneOf(fd, "status", ["open", "in_progress", "resolved"] as const);
    const patch = {
      status,
      owner: str(fd, "owner", 120),
      action_taken: str(fd, "action_taken", 2000),
      result: str(fd, "result", 2000),
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    };
    if (status === "resolved" && (!patch.action_taken || !patch.result)) throw new FieldError("Record the action taken and the actual result before resolving.");
    const { error } = await db().from("ops_issues").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(actor, `issue.${status}`, "issue", id, project_id, patch);
  });
}

/* -------------------------------- forecast ------------------------------- */

export async function saveAssumption(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const enrollment_id = uuid(fd, "enrollment_id");
    const project_id = await enrollmentProject(actor, enrollment_id);
    if (checked(fd, "clear")) {
      await db().from("ops_forecast_assumptions").delete().eq("enrollment_id", enrollment_id);
      await audit(actor, "forecast_assumption.cleared", "enrollment", enrollment_id, project_id);
      return;
    }
    const daily = hoursToSeconds(str(fd, "daily_hours", 20));
    if (daily === null || daily === "invalid") throw new FieldError("Daily recording hours must be a number.");
    const days = optNumber(fd, "remaining_days", { min: 0, max: 366 });
    if (days === null || !Number.isInteger(days)) throw new FieldError("Remaining recording days must be a whole number.");
    const rate = optNumber(fd, "acceptance_rate", { min: 0, max: 1 });
    const horizon_start = optDate(fd, "horizon_start");
    const horizon_end = optDate(fd, "horizon_end");
    if (!horizon_start || !horizon_end) throw new FieldError("Set the horizon start and end.");
    if (horizon_end < horizon_start) throw new FieldError("Horizon end is before its start.");
    const row = {
      enrollment_id,
      horizon_start,
      horizon_end,
      daily_seconds: daily,
      remaining_recording_days: days,
      assumed_acceptance_rate: rate,
      assumption_source: required(fd, "assumption_source", "Source of the assumption", 300),
      updated_by_label: actor.label,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db().from("ops_forecast_assumptions").upsert(row);
    if (error) throw new Error(error.message);
    await audit(actor, "forecast_assumption.saved", "enrollment", enrollment_id, project_id, row);
  });
}

/* --------------------------- delivery profiles --------------------------- */

export async function createDeliveryProfile(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(EDITORS);
    const project_id = uuid(fd, "project_id");
    await requireProject(actor, project_id);
    const label = str(fd, "destination_label", 200);
    if (/https?:\/\/|[a-z0-9-]+\.(com|net|io|cn)\b|key|secret|token/i.test(label)) {
      throw new FieldError("Describe the destination (e.g. “OSS, provider TBD”) — no URLs, endpoints or credentials here.");
    }
    const effective_from = optDate(fd, "effective_from");
    if (!effective_from) throw new FieldError("Effective-from date is required.");
    const row = {
      project_id,
      version: required(fd, "version", "Version", 40),
      destination_type: oneOf(fd, "destination_type", ["drive", "oss", "other"] as const),
      destination_label: label,
      folder_rule: str(fd, "folder_rule", 300),
      naming_rule_version: required(fd, "naming_rule_version", "Naming rule version", 120),
      upload_instructions_version: str(fd, "upload_instructions_version", 120),
      verification_method: str(fd, "verification_method", 120) || "manual_confirmation",
      owner: str(fd, "owner", 120),
      effective_from,
      notes: str(fd, "notes", 1000),
    };
    // Close the profile that was in effect, rather than editing it.
    const { error: closeError } = await db()
      .from("ops_delivery_profiles")
      .update({ effective_to: effective_from })
      .eq("project_id", project_id)
      .is("effective_to", null)
      .lt("effective_from", effective_from);
    if (closeError) throw new Error(closeError.message);
    const { data, error } = await db().from("ops_delivery_profiles").insert(row).select("id").single();
    if (error) throw new FieldError(error.code === "23505" ? "That version already exists." : error.message);
    await audit(actor, "delivery_profile.created", "delivery_profile", data.id, project_id, row);
  });
}

/* ------------------------------- inquiries ------------------------------- */

export async function updateInquiry(_: ActionResult | null, fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["leadership"]);
    const id = uuid(fd, "id");
    const patch = {
      stage: oneOf(fd, "stage", ["new", "contacted", "scoping", "pilot", "closed_won", "closed_lost", "not_a_fit"] as const),
      owner: str(fd, "owner", 120),
      next_action_at: optDate(fd, "next_action_at"),
    };
    const { error } = await db().from("data_requests").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(actor, "inquiry.updated", "inquiry", id, null, patch);
  });
}

/* -------------------------------- project -------------------------------- */

export async function selectProject(fd: FormData) {
  const actor = await requireActor();
  const id = optUuid(fd, "project_id");
  if (id) await requireProject(actor, id);
  (await cookies()).set(OPS_PROJECT_COOKIE, id ?? "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/ops", maxAge: 60 * 60 * 24 * 90 });
  revalidatePath("/ops", "layout");
}
