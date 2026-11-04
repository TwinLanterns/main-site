// lib/ops/db.ts
//
// Server-side reads for /ops plus the audit helper. Pilot scale (tens of
// operators), so a page loads its whole project in one parallel batch
// rather than paginating. Contact details are only selected for roles
// allowed to see them — reviewers never receive them, not even hidden.

import { getSupabaseServerClient } from "@/lib/supabase-server";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { canSeeContacts, projectScope, type Actor } from "./auth";
import type { TemplateStep } from "./onboarding";

export function db() {
  return getSupabaseServerClient();
}

/** True when supabase/ops_core.sql hasn't been run yet. */
export function isMissingTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "")));
}

export async function audit(
  actor: Actor,
  action: string,
  entity: string,
  entityId: string,
  projectId: string | null,
  detail: Record<string, unknown> = {},
) {
  const { error } = await db().from("ops_audit_events").insert({
    actor_id: actor.id,
    actor_label: actor.label,
    action,
    entity,
    entity_id: entityId,
    project_id: projectId,
    detail,
  });
  // The change itself already happened; a lost audit row is logged loudly
  // rather than undoing it.
  if (error) console.error("ops audit insert failed", action, entityId, error);
}

/* --------------------------------- types --------------------------------- */

export interface Project {
  id: string;
  code: string;
  name: string;
  customer_alias: string;
  stage: string;
  location_category: string;
  task_scope: string;
  starts_on: string | null;
  ends_on: string | null;
  manager_id: string | null;
  target_seconds: number | null;
  target_source: string;
  notes: string;
  /** Absent until supabase/ops_signups.sql has been run. */
  signup_program?: string | null;
}

export interface Person {
  name: string;
  phone: string;
  email: string;
  sourced_by: string;
  intake_ref: string;
}

export interface Enrollment {
  id: string;
  person_id: string;
  project_id: string;
  anonymous_code: string;
  source_operator_id: string | null;
  lead_stage: string;
  collection_stage: string;
  record_status: string;
  lead_source: string;
  channel: string;
  outreach_owner: string;
  onboarding_owner: string;
  manager_id: string | null;
  availability: string;
  location_category: string;
  last_contact_at: string | null;
  next_action: string;
  next_action_due: string | null;
  start_date: string | null;
  target_end_date: string | null;
  target_seconds: number | null;
  target_source: string;
  readiness_confirmed_label: string;
  readiness_confirmed_at: string | null;
  readiness_override_reason: string;
  imported_status: string;
  imported_status_as_of: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  /** Only present for roles allowed to see contacts. */
  ops_people?: Person | null;
}

export interface Production {
  id: string;
  enrollment_id: string | null;
  source_operator_id: string;
  calendar_date: string;
  commit_quantity: number | null;
  submitted_seconds: number | null;
  accepted_seconds: number | null;
  device_id: string | null;
  device_id_original: string | null;
  operational_status: string;
  equipment_status: string;
  source_tab: string;
  source_row: number;
  source_as_of: string;
  import_id: string;
}

export interface Session {
  id: string;
  project_id: string;
  enrollment_id: string;
  film_shift_id: string | null;
  manager_id: string | null;
  state: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  timezone: string;
  coordination_mode: string;
  task_label: string;
  room: string;
  device_id: string;
  checkin_at: string | null;
  checkin_by_label: string;
  checkin_note: string;
  session_checks: Record<string, { status: string; at: string; by: string }>;
  actual_start: string | null;
  actual_end: string | null;
  duration_seconds: number | null;
  duration_source: string;
  upload_status: string;
  review_status: string;
  approved_duration_seconds: number | null;
  review_source: string;
  instructions_version: string;
  notes: string;
  created_at: string;
}

export interface OpsFile {
  id: string;
  session_id: string | null;
  enrollment_id: string | null;
  original_path: string;
  original_filename: string;
  proposed_filename: string;
  recording_date: string | null;
  room: string;
  task_label: string;
  capture_mode: string;
  take_number: number | null;
  media_duration_seconds: number | null;
  duration_source: string;
  submission_state: string;
  submission_evidence: string;
  review_state: string;
  review_source: string;
  review_date: string | null;
  naming_rule_version: string;
  validation_status: string;
  validation_notes: { level: string; message: string }[];
  created_at: string;
}

export interface Issue {
  id: string;
  enrollment_id: string | null;
  session_id: string | null;
  file_id: string | null;
  category: string;
  owner: string;
  status: string;
  description: string;
  action_taken: string;
  result: string;
  opened_at: string;
  resolved_at: string | null;
  created_by_label: string;
}

export interface Task {
  id: string;
  enrollment_id: string | null;
  session_id: string | null;
  title: string;
  assignee: string;
  due_at: string | null;
  status: string;
  completed_at: string | null;
  completed_by_label: string;
  created_by_label: string;
  created_at: string;
}

export interface Template {
  id: string;
  version: string;
  name: string;
  steps: TemplateStep[];
  source_reference: string;
  active: boolean;
}

export interface StepRow {
  id: string;
  enrollment_id: string;
  template_id: string;
  step_key: string;
  status: "pending" | "completed" | "blocked" | "not_applicable";
  reason: string;
  owner: string;
  due_on: string | null;
  evidence_reference: string;
  completed_by_label: string;
  completed_at: string | null;
  updated_at: string;
}

export interface Assumption {
  enrollment_id: string;
  horizon_start: string;
  horizon_end: string;
  daily_seconds: number;
  remaining_recording_days: number;
  assumed_acceptance_rate: number | null;
  assumption_source: string;
  updated_by_label: string;
  updated_at: string;
}

export interface DeliveryProfile {
  id: string;
  version: string;
  destination_type: string;
  destination_label: string;
  folder_rule: string;
  naming_rule_version: string;
  upload_instructions_version: string;
  verification_method: string;
  integration_status: string;
  owner: string;
  effective_from: string;
  effective_to: string | null;
  notes: string;
}

export interface ImportRow {
  id: string;
  kind: string;
  source_filename: string;
  source_tab: string;
  source_as_of: string;
  imported_at: string;
  actor_label: string;
  row_counts: Record<string, number>;
  rejected_rows: { row: number; column?: string; reason: string }[];
  source_totals: { label: string; raw: string }[];
  discrepancies: { scope: string; sourceRaw: string; sourceValue: string; recomputed: string }[];
}

export interface AuditEvent {
  id: number;
  actor_label: string;
  action: string;
  entity: string;
  entity_id: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export interface Workspace {
  projects: Project[];
  project: Project | null;
  team: TeamMember[];
  enrollments: Enrollment[];
  production: Production[];
  sessions: Session[];
  files: OpsFile[];
  issues: Issue[];
  tasks: Task[];
  templates: Template[];
  steps: StepRow[];
  assumptions: Assumption[];
  profiles: DeliveryProfile[];
  imports: ImportRow[];
  audit: AuditEvent[];
  contactsVisible: boolean;
}

export type WorkspaceResult = { ok: true; ws: Workspace } | { ok: false; setupNeeded: boolean; error: string };

const ENROLLMENT_COLUMNS =
  "id, person_id, project_id, anonymous_code, source_operator_id, lead_stage, collection_stage, record_status, lead_source, channel, outreach_owner, onboarding_owner, manager_id, availability, location_category, last_contact_at, next_action, next_action_due, start_date, target_end_date, target_seconds, target_source, readiness_confirmed_label, readiness_confirmed_at, readiness_override_reason, imported_status, imported_status_as_of, notes, created_at, updated_at";

/**
 * Everything /ops shows for one project the actor may see. `projectId`
 * comes from the URL, so it's checked against the actor's scope here and
 * silently replaced with their first project if it's out of scope.
 */
export async function loadWorkspace(actor: Actor, projectId: string | undefined): Promise<WorkspaceResult> {
  const supabase = db();
  const scope = await projectScope(actor).catch((err: Error) => err);
  if (scope instanceof Error) {
    return { ok: false, setupNeeded: isMissingTable({ message: scope.message }), error: scope.message };
  }

  let projectQuery = supabase.from("ops_projects").select("*").order("created_at", { ascending: true });
  if (scope) projectQuery = projectQuery.in("id", scope.length ? scope : ["00000000-0000-0000-0000-000000000000"]);
  const [{ data: projects, error: projectsError }, { data: team, error: teamError }] = await Promise.all([
    projectQuery,
    supabase.from("team_members").select("id, name, email, role, active").order("name"),
  ]);
  if (projectsError || teamError) {
    const err = (projectsError ?? teamError)!;
    return { ok: false, setupNeeded: isMissingTable(err), error: err.message };
  }

  const list = (projects ?? []) as Project[];
  const project = list.find((p) => p.id === projectId) ?? list[0] ?? null;
  const contactsVisible = canSeeContacts(actor);
  const empty: Workspace = {
    projects: list,
    project,
    team: (team ?? []).map((t) => (actor.role === "leadership" ? t : { ...t, email: "" })) as TeamMember[],
    enrollments: [],
    production: [],
    sessions: [],
    files: [],
    issues: [],
    tasks: [],
    templates: [],
    steps: [],
    assumptions: [],
    profiles: [],
    imports: [],
    audit: [],
    contactsVisible,
  };
  if (!project) return { ok: true, ws: empty };

  const pid = project.id;
  // Lists that can pass PostgREST's 1,000-row cap are paged (fetchAllRows),
  // each ordered by a unique column last so pages can't shift.
  const results = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("ops_enrollments")
        .select(contactsVisible ? `${ENROLLMENT_COLUMNS}, ops_people (name, phone, email, sourced_by, intake_ref)` : ENROLLMENT_COLUMNS)
        .eq("project_id", pid)
        .order("anonymous_code")
        .order("id")
        .range(from, to),
    ),
    fetchAllRows((from, to) => supabase.from("ops_daily_production").select("*").eq("project_id", pid).order("calendar_date").order("id").range(from, to)),
    fetchAllRows((from, to) =>
      supabase.from("ops_sessions").select("*").eq("project_id", pid).order("scheduled_start", { ascending: true, nullsFirst: false }).order("id").range(from, to),
    ),
    // private_storage_reference / remote_object_key deliberately not selected.
    fetchAllRows((from, to) =>
      supabase
        .from("ops_files")
        .select("id, session_id, enrollment_id, original_path, original_filename, proposed_filename, recording_date, room, task_label, capture_mode, take_number, media_duration_seconds, duration_source, submission_state, submission_evidence, review_state, review_source, review_date, naming_rule_version, validation_status, validation_notes, created_at")
        .eq("project_id", pid)
        .order("original_path")
        .order("id")
        .range(from, to),
    ),
    fetchAllRows((from, to) => supabase.from("ops_issues").select("*").eq("project_id", pid).order("opened_at", { ascending: false }).order("id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("ops_tasks").select("*").eq("project_id", pid).order("due_at", { ascending: true, nullsFirst: false }).order("id").range(from, to)),
    supabase.from("ops_onboarding_templates").select("*").eq("project_id", pid).order("created_at"),
    supabase.from("ops_delivery_profiles").select("*").eq("project_id", pid).order("effective_from", { ascending: false }),
    supabase.from("ops_imports").select("*").eq("project_id", pid).order("imported_at", { ascending: false }).limit(50),
    supabase.from("ops_audit_events").select("id, actor_label, action, entity, entity_id, detail, created_at").eq("project_id", pid).order("created_at", { ascending: false }).limit(300),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, setupNeeded: isMissingTable(failed.error), error: failed.error.message };

  const enrollments = (results[0].data ?? []) as unknown as Enrollment[];
  const ids = enrollments.map((e) => e.id);
  const [steps, assumptions] = ids.length
    ? await Promise.all([
        fetchAllRows((from, to) => supabase.from("ops_onboarding_steps").select("*").in("enrollment_id", ids).order("id").range(from, to)),
        fetchAllRows((from, to) => supabase.from("ops_forecast_assumptions").select("*").in("enrollment_id", ids).order("enrollment_id").range(from, to)),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (steps.error || assumptions.error) {
    const err = (steps.error ?? assumptions.error)!;
    return { ok: false, setupNeeded: isMissingTable(err), error: err.message };
  }

  return {
    ok: true,
    ws: {
      ...empty,
      enrollments,
      production: (results[1].data ?? []) as Production[],
      sessions: (results[2].data ?? []) as Session[],
      files: (results[3].data ?? []) as OpsFile[],
      issues: (results[4].data ?? []) as Issue[],
      tasks: (results[5].data ?? []) as Task[],
      templates: (results[6].data ?? []) as Template[],
      profiles: (results[7].data ?? []) as DeliveryProfile[],
      imports: (results[8].data ?? []) as ImportRow[],
      audit: (results[9].data ?? []) as AuditEvent[],
      steps: (steps.data ?? []) as StepRow[],
      assumptions: (assumptions.data ?? []) as Assumption[],
    },
  };
}

/** Next free OP-### code in a project. */
export async function nextAnonymousCode(projectId: string): Promise<string> {
  const { data, error } = await fetchAllRows((from, to) =>
    db().from("ops_enrollments").select("anonymous_code, id").eq("project_id", projectId).order("id").range(from, to),
  );
  if (error) throw new Error(error.message);
  const max = (data ?? []).reduce((m, r) => {
    const n = /^OP-(\d+)$/.exec(r.anonymous_code as string);
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `OP-${String(max + 1).padStart(3, "0")}`;
}

/* --------------------------------- shifts -------------------------------- */

export interface ShiftRow {
  id: string;
  starts_at: string;
  ends_at: string;
  camera: string;
  location: string;
  notes: string;
  taken: boolean;
  /** Hasn't ended yet. */
  upcoming: boolean;
  /** Booking holder's name — only for roles that may see contacts. */
  holder: string | null;
  /** Enrollment in the current project the booking resolves to, if linked. */
  enrollment_id: string | null;
  session_id: string | null;
}

/**
 * Shifts from the existing /shifts board (film_shifts), from a week ago on.
 * A booking resolves to an operator through its email → the shift code with
 * that email → the code's linked person → their enrollment here.
 */
export async function loadShifts(ws: Workspace): Promise<ShiftRow[] | null> {
  const supabase = db();
  const now = Date.now();
  const since = new Date(now - 7 * 86_400_000).toISOString();
  const [shifts, codes] = await Promise.all([
    supabase.from("film_shifts").select("id, starts_at, ends_at, camera, location, notes, film_shift_signups (name, email)").gt("ends_at", since).order("starts_at"),
    supabase.from("film_shift_codes").select("email, person_id").not("person_id", "is", null),
  ]);
  if (shifts.error) {
    console.error("film_shifts load failed", shifts.error);
    return null;
  }
  const personByEmail = new Map((codes.data ?? []).map((c) => [String(c.email).toLowerCase(), c.person_id as string]));
  const enrollmentByPerson = new Map(ws.enrollments.map((e) => [e.person_id, e.id]));
  const sessionByShift = new Map(ws.sessions.filter((s) => s.film_shift_id).map((s) => [s.film_shift_id!, s.id]));

  return (shifts.data ?? []).map((s) => {
    const raw = s.film_shift_signups as unknown;
    const signup = (Array.isArray(raw) ? raw[0] : raw) as { name: string; email: string } | null | undefined;
    const person = signup ? personByEmail.get(signup.email.toLowerCase()) : undefined;
    return {
      id: s.id as string,
      starts_at: s.starts_at as string,
      ends_at: s.ends_at as string,
      camera: s.camera as string,
      location: s.location as string,
      notes: s.notes as string,
      taken: Boolean(signup),
      upcoming: Date.parse(s.ends_at as string) > now,
      holder: signup && ws.contactsVisible ? signup.name : null,
      enrollment_id: person ? enrollmentByPerson.get(person) ?? null : null,
      session_id: sessionByShift.get(s.id as string) ?? null,
    };
  });
}

/** Shift codes, for linking a filmer's code to their operator record. */
export async function loadShiftCodes() {
  const { data, error } = await db().from("film_shift_codes").select("id, name, person_id").order("name");
  if (error) return [];
  return data as { id: string; name: string; person_id: string | null }[];
}
